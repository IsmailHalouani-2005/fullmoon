import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents, GameState, Player, ChatMessage, Phase } from "../types/game";
import { ROLES, RoleId, Camp, isInWolfCamp } from '../types/roles';
import { distributeRoles, distributeCustomRoles, getCountsForJ } from '../lib/roleDistribution';
import { io } from './index';


// Shared games state so the HTTP layer can serve live stats
let _games: Record<string, GameState> = {};

/** Returns live connected player counts per room (for /api/rooms-live) */
export function getRoomStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [roomCode, game] of Object.entries(_games)) {
        stats[roomCode] = game.players.length;
    }
    return stats;
}

export function setupGameLogic(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    const games: Record<string, GameState> = _games;
    const disconnectTimeouts: Record<string, NodeJS.Timeout> = {};
    const gameTimers: Record<string, NodeJS.Timeout> = {};

    io.on("connection", (socket) => {
        const roomCode = socket.handshake.query.roomCode as string;
        const userId = socket.handshake.query.userId as string;
        const username = socket.handshake.query.username as string;
        const avatarUrl = socket.handshake.query.avatarUrl as string | undefined;

        if (!roomCode || !userId) {
            socket.disconnect();
            return;
        }

        console.log(`[SOCKET] Connexion de ${username} (ID: ${userId}) dans ${roomCode} `);

        socket.on("join_game", (payload) => {
            socket.join(roomCode);
            if (!games[roomCode]) {
                games[roomCode] = {
                    roomCode,
                    phase: 'LOBBY',
                    players: [],
                    hostId: userId,
                    timer: 0,
                    mayorId: null,
                    dayCount: 1,
                    votes: {},
                    nightActions: [],
                    chatMessages: [],
                    lastActivity: Date.now()
                };
            }
            games[roomCode].lastActivity = Date.now();
            if (disconnectTimeouts[userId]) {
                clearTimeout(disconnectTimeouts[userId]);
                delete disconnectTimeouts[userId];
            }

            const game = games[roomCode];
            const existingPlayer = game.players.find(p => p.id === userId);

            if (!existingPlayer) {
                const joiningName = payload?.username || username;
                game.players.push({
                    id: payload?.userId || userId,
                    socketId: socket.id,
                    name: joiningName,
                    avatarUrl: payload?.avatarUrl || avatarUrl,
                    isAlive: true,
                    role: null,
                    votesAgainst: 0,
                    hasVoted: null,
                    usedPowers: [],
                    effects: []
                });

                const joinMsg: ChatMessage = {
                    senderId: 'system',
                    senderName: 'Système',
                    text: `${joiningName} a rejoint le village.`,
                    time: Date.now(),
                    chatType: 'system'
                };
                game.chatMessages.push(joinMsg);
                io.to(roomCode).emit("chat_message", joinMsg);
            } else {
                existingPlayer.socketId = socket.id;
                existingPlayer.name = payload?.username || username;
                if (payload?.avatarUrl) existingPlayer.avatarUrl = payload.avatarUrl;
                // Ensure new fields exist for old player objects
                if (!existingPlayer.usedPowers) existingPlayer.usedPowers = [];
                if (!existingPlayer.effects) existingPlayer.effects = [];
            }

            // JOIN WOLF ROOM (For secure night chat)
            const player = game.players.find(p => p.id === userId);
            if (player && isInWolfCamp(player.role)) {
                socket.join(`wolf_room_${roomCode}`);
                console.log(`[SOCKET] ${player.name} joined wolf_room_${roomCode}`);
            }

            emitGameState(roomCode, game, io);
        });

        socket.on("start_game", (config) => {
            const game = games[roomCode];
            if (game && game.hostId === userId && game.phase === 'LOBBY') {
                const playerCount = game.players.length;
                let roles: RoleId[] = [];

                const configTotal = config?.rolesCount
                    ? Object.values(config.rolesCount).reduce((s, c) => s + (c as number || 0), 0)
                    : 0;
                console.log(`[DIAGNOSTIC] Room ${roomCode}: Start Game with ${playerCount} players.`);
                console.log(`[DIAGNOSTIC] Config received: `, JSON.stringify(config?.rolesCount));

                const { A, B, C } = getCountsForJ(playerCount);
                console.log(`[DIAGNOSTIC] Target Counts: Village = ${A}, Wolves = ${B}, Solos = ${C} `);

                let distrib;
                if (config?.isCustom) {
                    console.log(`[DIAGNOSTIC] Using CUSTOM distribution for ${playerCount} players.`);
                    distrib = distributeCustomRoles(playerCount, config.rolesCount || {});
                } else {
                    console.log(`[DIAGNOSTIC] Using DEFAULT distribution for ${playerCount} players.`);
                    distrib = distributeRoles(playerCount);
                }

                for (const [rId, count] of Object.entries(distrib)) {
                    for (let i = 0; i < (count as number); i++) {
                        roles.push(rId as RoleId);
                    }
                }

                // Final shuffle for assignment
                roles.sort(() => Math.random() - 0.5);
                console.log(`[DIAGNOSTIC] Final Balanced Roles Array: `, JSON.stringify(roles));

                game.players.forEach((player, index) => {
                    player.role = roles[index];
                    player.isAlive = true;
                    player.votesAgainst = 0;
                    player.hasVoted = null;
                    player.usedPowers = [];
                    player.effects = [];
                    // Also join the Wolf Room if applicable
                    if (isInWolfCamp(player.role)) {
                        const s = io.sockets.sockets.get(player.socketId);
                        if (s) {
                            s.join(`wolf_room_${roomCode}`);
                            console.log(`[START_GAME] Joined wolf_room for ${player.name}`);
                        }
                    }
                    player.isMute = false;
                    delete player.deadAt;
                });

                // Calculate and store the actual roles distributed for the UI grid
                const distributedRoles: Partial<Record<RoleId, number>> = {};
                roles.forEach(r => {
                    distributedRoles[r] = (distributedRoles[r] ?? 0) + 1;
                });
                game.rolesCount = distributedRoles;

                game.nightActions = [];

                game.lastActivity = Date.now();
                startPhase(roomCode, 'ROLE_REVEAL', games, gameTimers, io);
            }
        });

        socket.on("chat_message", (payload, callback) => {
            const game = games[roomCode];
            if (!game) {
                if (callback) callback({ status: 'error', reason: 'Room not found' });
                return;
            }
            const sender = game.players.find(p => p.id === payload.senderId);
            if (!sender || !sender.isAlive) {
                if (callback) callback({ status: 'error', reason: 'Sender not found or dead' });
                return;
            }

            const isNightMsg = payload.chatType === 'night';
            const explicitSenderWolf = sender.role === 'LOUP_GAROU' || sender.role === 'LOUP_ALPHA' || sender.role === 'GRAND_MECHANT_LOUP' || sender.role === 'LOUP_INFECT';
            const senderInWolfCamp = isInWolfCamp(sender.role) || explicitSenderWolf;

            console.log(`[SERVER_RECEIVE_CHAT] From: ${sender.name} | Role: ${sender.role} | Type: ${payload.chatType} | isNightMsg: ${isNightMsg} | senderInWolfCamp: ${senderInWolfCamp}`);

            if (isNightMsg) {
                if (game.phase !== 'NIGHT' || !senderInWolfCamp) {
                    console.log(`[CHAT_BLOCKED] Night message from ${sender.name} (Role: ${sender.role}) blocked! Phase: ${game.phase}, InCamp: ${senderInWolfCamp}`);
                    if (callback) callback({ status: 'error', reason: 'Night chat not allowed' });
                    return;
                }
            }
            if (payload.chatType === 'day' && game.phase === 'NIGHT') {
                if (callback) callback({ status: 'error', reason: 'Day chat not allowed at night' });
                return;
            }

            game.lastActivity = Date.now();
            game.chatMessages.push(payload);

            if (isNightMsg) {
                // Emit explicitly to all wolves directly to bypass Socket rooms cache/issues
                console.log(`[SERVER_BROADCAST_WOLF_CHAT] Broadcasting explicitly to all wolves.`);
                game.players.forEach(p => {
                    const explicitWolf = p.role === 'LOUP_GAROU' || p.role === 'LOUP_ALPHA' || p.role === 'GRAND_MECHANT_LOUP' || p.role === 'LOUP_INFECT';
                    if ((isInWolfCamp(p.role) || explicitWolf) && p.socketId) {
                        io.to(p.socketId).emit("chat_message", payload);
                    }
                });
            } else {
                io.to(roomCode).emit("chat_message", payload);
            }

            if (callback) callback({ status: 'success' });
        });

        socket.on("vote_player", (targetId) => {
            const game = games[roomCode];
            if (!game) return;
            game.lastActivity = Date.now();
            const voter = game.players.find(p => p.id === userId);
            const target = game.players.find(p => p.id === targetId);
            if (!voter || !voter.isAlive || !target) return;

            const targetRoleDef = target.role ? ROLES[target.role as RoleId] : null;
            const isTargetWolf = targetRoleDef?.camp === 'LOUPS';

            const isValidNightWolfVote = game.phase === 'NIGHT' && isInWolfCamp(voter.role) && !isTargetWolf;

            if (game.phase === 'MAYOR_ELECTION' || game.phase === 'DAY_VOTE' || isValidNightWolfVote) {

                if (game.votes[userId] === targetId) {
                    delete game.votes[userId];
                    voter.hasVoted = null;
                } else {
                    game.votes[userId] = targetId;
                    voter.hasVoted = targetId;
                }

                game.players.forEach(p => p.votesAgainst = 0);
                for (const [vId, tId] of Object.entries(game.votes)) {
                    const tPlayer = game.players.find(p => p.id === tId);
                    const isMayor = game.mayorId === vId;
                    if (tPlayer) {
                        tPlayer.votesAgainst += (isMayor && game.phase === 'DAY_VOTE') ? 2 : 1;
                    }
                }

                // Update real-time victim for night roles
                if (game.phase === 'NIGHT') {
                    game.wolfVictimId = tallyVotes(game);
                }

                emitGameState(roomCode, game, io);
            }
        });

        socket.on("use_power", (payload) => {
            const game = games[roomCode];
            if (!game) return;
            game.lastActivity = Date.now();
            const caster = game.players.find(p => p.id === userId);
            if (!caster) return;

            // Exception for Hunter: he can be dead but must be in HUNTER_SHOT phase
            if (!caster.isAlive && game.phase !== 'HUNTER_SHOT') return;
            if (game.phase === 'HUNTER_SHOT' && caster.role !== 'CHASSEUR') return;

            const roleDef = caster.role ? ROLES[caster.role] : null;
            const powerIdx = roleDef?.powers?.findIndex(p => p.id === payload.powerId);
            const power = powerIdx !== undefined && powerIdx !== -1 ? roleDef?.powers![powerIdx] : null;

            if (!power) return;

            // Basic validation
            if (power.timing === 'night' && game.phase !== 'NIGHT') return;
            if (game.phase === 'HUNTER_SHOT' && payload.powerId !== 'FUSIL') return;
            if (power.type === 'one-time' && caster.usedPowers.includes(payload.powerId)) return;

            // Witch specific: only one potion per night
            if (payload.powerId === 'POTION_SOIN' || payload.powerId === 'POTION_POISON') {
                const alreadyUsedPotionThisNight = game.nightActions.some(a => a.sourceId === userId && (a.powerId === 'POTION_SOIN' || a.powerId === 'POTION_POISON'));
                if (alreadyUsedPotionThisNight) {
                    socket.emit("error", "Vous ne pouvez utiliser qu'une seule potion par nuit.");
                    return;
                }
            }

            switch (payload.powerId) {
                case 'VISION_LUNAIRE':
                    const target = game.players.find(p => p.id === payload.targetId);
                    if (target) {
                        caster.usedPowers.push('VISION_LUNAIRE');
                        const roleLabel = target.role ? ROLES[target.role].label : "Inconnu";
                        socket.emit("chat_message", {
                            senderId: 'system',
                            senderName: 'Système',
                            text: `Vision: ${target.name} est ${roleLabel}.`,
                            time: Date.now(),
                            chatType: 'system'
                        });
                    }
                    break;
                case 'FUSIL':
                    const victim = game.players.find(p => p.id === payload.targetId);
                    if (victim && victim.isAlive) {
                        victim.isAlive = false;
                        victim.deadAt = 'chasseur';
                        io.to(roomCode).emit("chat_message", {
                            senderId: 'system',
                            senderName: 'Système',
                            text: `Le Chasseur a tiré! ${victim.name} s'écroule. Rôle : ${ROLES[victim.role as RoleId]?.label || 'Inconnu'}.`,
                            time: Date.now(),
                            chatType: 'system'
                        });
                        caster.usedPowers.push('FUSIL');

                        // If we are in HUNTER_SHOT phase, transition to the next phase immediately
                        if (game.phase === 'HUNTER_SHOT') {
                            const vDetails = checkVictory(game);
                            if (vDetails) {
                                triggerGameOver(roomCode, vDetails, games, gameTimers, io);
                            } else {
                                // Decide where to go next
                                const next = game.nextPhase || (game.dayCount > 1 && !game.chatMessages.some(m => m.text.includes("Le village se réveille") && m.time > Date.now() - 60000) ? 'DAY_DISCUSSION' : 'NIGHT');
                                delete game.nextPhase;

                                if (next === 'NIGHT') {
                                    game.players.forEach(p => {
                                        if (p.effects.includes('poisoned')) {
                                            p.isMute = false;
                                            p.effects = p.effects.filter(e => e !== 'poisoned');
                                        }
                                    });
                                }

                                startPhase(roomCode, next as Phase, games, gameTimers, io);
                            }
                        }
                    }
                    break;
                default:
                    // Store other night actions for dawn resolution
                    game.nightActions = game.nightActions.filter(a => a.sourceId !== userId || a.powerId !== payload.powerId);
                    game.nightActions.push({
                        type: 'power',
                        powerId: payload.powerId,
                        sourceId: userId,
                        targetId: payload.targetId,
                        targetId2: payload.targetId2
                    });
                    break;
            }

            emitGameState(roomCode, game, io);
        });

        socket.on("disconnect", () => {
            if (games[roomCode]) {
                const game = games[roomCode];
                if (game) game.lastActivity = Date.now();
                const disconnectingPlayer = game?.players.find(p => p.id === userId);

                if (disconnectingPlayer) {
                    const waitMsg: ChatMessage = {
                        senderId: 'system',
                        senderName: 'Système',
                        text: `${disconnectingPlayer.name} s'est déconnecté(e). Il a 1 minute pour revenir...`,
                        time: Date.now(),
                        chatType: 'system'
                    };
                    game.chatMessages.push(waitMsg);
                    io.to(roomCode).emit("chat_message", waitMsg);
                }

                disconnectTimeouts[userId] = setTimeout(() => {
                    const currentGame = games[roomCode];
                    if (!currentGame) return;
                    const playerIndex = currentGame.players.findIndex(p => p.id === userId);
                    if (playerIndex !== -1) {
                        const disconnectedName = currentGame.players[playerIndex].name;
                        currentGame.players.splice(playerIndex, 1);
                        const leaveMsg: ChatMessage = {
                            senderId: 'system',
                            senderName: 'Système',
                            text: `${disconnectedName} a quitté définitivement le village.`,
                            time: Date.now(),
                            chatType: 'system'
                        };
                        currentGame.chatMessages.push(leaveMsg);
                        io.to(roomCode).emit("chat_message", leaveMsg);
                        if (currentGame.players.length === 0) {
                            delete games[roomCode];
                            if (gameTimers[roomCode]) clearInterval(gameTimers[roomCode]);
                        } else {
                            if (currentGame.hostId === userId) currentGame.hostId = currentGame.players[0].id;
                            emitGameState(roomCode, currentGame, io);
                        }
                    }
                    delete disconnectTimeouts[userId];
                }, 60000);
            }
        });
    });

    startInactivityCheck(games, gameTimers, io);
}

function startInactivityCheck(games: Record<string, GameState>, gameTimers: Record<string, NodeJS.Timeout>, io: Server) {
    setInterval(() => {
        const now = Date.now();
        const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

        for (const [roomCode, game] of Object.entries(games)) {
            if (now - game.lastActivity > INACTIVITY_TIMEOUT) {
                console.log(`[SHUTDOWN] Room ${roomCode} inactive for 10min. Shutting down.`);

                // Inform players
                io.to(roomCode).emit('room_shutdown', 'Le village a été abandonné suite à une inactivité prolongée (10 min).');

                // Kick all players (socket leave)
                const room = io.sockets.adapter.rooms.get(roomCode);
                if (room) {
                    for (const socketId of room) {
                        const socket = io.sockets.sockets.get(socketId);
                        if (socket) {
                            socket.leave(roomCode);
                        }
                    }
                }

                // Cleanup state
                delete games[roomCode];
                if (gameTimers[roomCode]) {
                    clearInterval(gameTimers[roomCode]);
                    delete gameTimers[roomCode];
                }
            }
        }
    }, 60000); // Check every minute
}

function startPhase(roomCode: string, newPhase: Phase, games: Record<string, GameState>, gameTimers: Record<string, NodeJS.Timeout>, io: Server) {
    const game = games[roomCode];
    if (!game) return;

    if (gameTimers[roomCode]) clearInterval(gameTimers[roomCode]);
    game.lastActivity = Date.now();

    if (newPhase !== 'ROLE_REVEAL' && newPhase !== 'GAME_OVER') {
        game.votes = {};
        game.players.forEach(p => p.hasVoted = null);
    }

    game.phase = newPhase;
    let duration = 0;
    switch (newPhase) {
        case 'ROLE_REVEAL': duration = 15; break;
        case 'MAYOR_ELECTION': duration = 45; break;
        case 'NIGHT': duration = 60; break;
        case 'DAY_DISCUSSION': duration = 60; break;
        case 'DAY_VOTE': duration = 30; break;
        case 'HUNTER_SHOT': duration = 10; break;
    }

    if (newPhase === 'DAY_DISCUSSION') {
        game.dayCount += 1;
        const msg: ChatMessage = { senderId: 'system', senderName: 'Système', text: `Début du Jour ${game.dayCount}. Le village se réveille.`, time: Date.now(), chatType: 'system' };
        game.chatMessages.push(msg);
        io.to(roomCode).emit("chat_message", msg);
    }
    if (newPhase === 'NIGHT') {
        const msg: ChatMessage = { senderId: 'system', senderName: 'Système', text: `Le village s'endort...`, time: Date.now(), chatType: 'system' };
        game.chatMessages.push(msg);
        io.to(roomCode).emit("chat_message", msg);
    }

    game.timer = duration;
    emitGameState(roomCode, game, io);

    if (duration > 0) {
        gameTimers[roomCode] = setInterval(() => {
            const currentGame = games[roomCode];
            if (!currentGame) {
                clearInterval(gameTimers[roomCode]);
                return;
            }
            currentGame.timer -= 1;
            emitGameState(roomCode, currentGame, io);
            if (currentGame.timer <= 0) {
                clearInterval(gameTimers[roomCode]);
                handlePhaseEnd(roomCode, currentGame.phase, games, gameTimers, io);
            }
        }, 1000);
    }
}

function handlePhaseEnd(roomCode: string, endedPhase: Phase, games: Record<string, GameState>, gameTimers: Record<string, NodeJS.Timeout>, io: Server) {
    const game = games[roomCode];
    if (!game) return;

    switch (endedPhase) {
        case 'ROLE_REVEAL':
            startPhase(roomCode, 'MAYOR_ELECTION', games, gameTimers, io);
            break;
        case 'MAYOR_ELECTION':
            const electedMayorId = tallyVotes(game, true);
            if (electedMayorId) {
                game.mayorId = electedMayorId;
                const mayorName = game.players.find(p => p.id === electedMayorId)?.name;
                const mayorMsg: ChatMessage = { senderId: 'system', senderName: 'Système', text: `${mayorName} a été élu Maire !`, time: Date.now(), chatType: 'system' };
                game.chatMessages.push(mayorMsg);
                io.to(roomCode).emit("chat_message", mayorMsg);
            }
            startPhase(roomCode, 'NIGHT', games, gameTimers, io);
            break;
        case 'NIGHT':
            let wolfVictimId = tallyVotes(game);
            const deaths: string[] = [];
            let infectedId: string | null = null;
            let protectedId: string | null = null;

            // 1. Process Night Actions
            game.nightActions.forEach(action => {
                const caster = game.players.find(p => p.id === action.sourceId);
                if (!caster || !caster.isAlive) return;

                switch (action.powerId) {
                    case 'POTION_SOIN':
                        if (!caster.usedPowers.includes('POTION_SOIN')) {
                            if (action.targetId === wolfVictimId) {
                                protectedId = action.targetId;
                            }
                            caster.usedPowers.push('POTION_SOIN');
                        }
                        break;
                    case 'POTION_POISON':
                        if (action.targetId && !caster.usedPowers.includes('POTION_POISON')) {
                            deaths.push(action.targetId);
                            caster.usedPowers.push('POTION_POISON');
                        }
                        break;
                    case 'MORSURE_INFECTE':
                        if (action.targetId === wolfVictimId) {
                            infectedId = action.targetId;
                            caster.usedPowers.push('MORSURE_INFECTE');
                        }
                        break;
                    case 'COUP_DE_COEUR':
                        if (action.targetId && action.targetId2) {
                            const p1 = game.players.find(p => p.id === action.targetId);
                            const p2 = game.players.find(p => p.id === action.targetId2);
                            if (p1 && p2) {
                                p1.effects.push('lover');
                                p2.effects.push('lover');
                                caster.usedPowers.push('COUP_DE_COEUR');
                            }
                        }
                        break;
                    case 'LAME_NOIRE':
                    case 'TRAHISON':
                        if (action.targetId) deaths.push(action.targetId);
                        break;
                    case 'ESSENCE':
                        if (action.targetId) {
                            const target = game.players.find(p => p.id === action.targetId);
                            if (target && !target.effects.includes('gasoline')) {
                                target.effects.push('gasoline');
                            }
                        }
                        break;
                    case 'ALLUMETTE':
                        game.players.forEach(p => {
                            if (p.effects.includes('gasoline')) deaths.push(p.id);
                        });
                        break;
                    case 'POISON_TOXIQUE':
                        if (action.targetId) {
                            const target = game.players.find(p => p.id === action.targetId);
                            if (target) {
                                target.isMute = true;
                                target.effects.push('poisoned');
                            }
                        }
                        break;
                }
            });

            // 2. Resolve Wolf Kill vs Infection
            if (wolfVictimId && wolfVictimId !== protectedId) {
                if (infectedId === wolfVictimId) {
                    const victim = game.players.find(p => p.id === wolfVictimId);
                    if (victim) {
                        victim.effects.push('infected');
                        const infectMsg: ChatMessage = { senderId: 'system', senderName: 'Système', text: `Une ombre a envahi l'esprit de quelqu'un...`, time: Date.now(), chatType: 'system' };
                        game.chatMessages.push(infectMsg);
                        io.to(roomCode).emit("chat_message", infectMsg);
                    }
                } else {
                    deaths.push(wolfVictimId);
                }
            }

            // 3. Apply Deaths
            const uniqueDeaths = Array.from(new Set(deaths));
            uniqueDeaths.forEach(dId => {
                const p = game.players.find(player => player.id === dId);
                if (p && p.isAlive) {
                    p.isAlive = false;
                    p.deadAt = 'nuit';
                    // Check for lover death
                    if (p.effects.includes('lover')) {
                        const partner = game.players.find(other => other.id !== p.id && other.effects.includes('lover') && other.isAlive);
                        if (partner) {
                            partner.isAlive = false;
                            partner.deadAt = 'suicide';
                            const roleName = ROLES[partner.role as RoleId]?.label || 'Inconnu';
                            const suicideMsg: ChatMessage = { senderId: 'system', senderName: 'Système', text: `${partner.name} s'est suicidé(e) par amour. Rôle : ${roleName}.`, time: Date.now(), chatType: 'system' };
                            game.chatMessages.push(suicideMsg);
                            io.to(roomCode).emit("chat_message", suicideMsg);
                        }
                    }
                }
            });

            // 4. Reset temporary effects
            game.players.forEach(p => {
                if (p.isAlive) {
                    // Poisoner: mute is for one cycle (Day+Night), so we might need a counter.
                    // For now, let's say it's cleared at the end of the night if it was active during the previous day?
                    // Actually, the user says "one day and night cycle".
                    // Let's handle it by clearing 'poisoned' at start of night if set.
                }
            });

            game.nightActions = [];

            const anyHunterDiedAtNight = uniqueDeaths.some(dId => game.players.find(p => p.id === dId)?.role === 'CHASSEUR');

            if (anyHunterDiedAtNight) {
                game.nextPhase = 'DAY_DISCUSSION';
                startPhase(roomCode, 'HUNTER_SHOT', games, gameTimers, io);
            } else {
                startPhase(roomCode, 'DAY_DISCUSSION', games, gameTimers, io);
            }

            if (uniqueDeaths.length > 0) {
                uniqueDeaths.forEach(dId => {
                    const p = game.players.find(player => player.id === dId);
                    if (p) {
                        const roleName = ROLES[p.role as RoleId]?.label || 'Inconnu';
                        io.to(roomCode).emit("chat_message", { senderId: 'system', senderName: 'Système', text: `Ce matin, on a retrouvé le corps de ${p.name}. Rôle : ${roleName}.`, time: Date.now(), chatType: 'system' });
                    }
                });
            } else {
                io.to(roomCode).emit("chat_message", { senderId: 'system', senderName: 'Système', text: `Personne n'est mort cette nuit.`, time: Date.now(), chatType: 'system' });
            }

            if (!anyHunterDiedAtNight) {
                const vDetailsAtNight = checkVictory(game);
                if (vDetailsAtNight) triggerGameOver(roomCode, vDetailsAtNight, games, gameTimers, io);
            }
            break;
        case 'DAY_DISCUSSION':
            // Clear silences at the end of day? No, user said "cycle of day and night".
            // So if poisoned at night, they are silent for next Day and next Night.
            // Let's clear at the start of Day Discussion if they were poisoned the PREVIOUS night.
            startPhase(roomCode, 'DAY_VOTE', games, gameTimers, io);
            break;
        case 'DAY_VOTE':
            const deadId = tallyVotes(game, false);
            const deathsDay: string[] = [];
            let fouWon = false;
            let deadFouPlayer = null;

            if (deadId) {
                const deadPlayer = game.players.find(p => p.id === deadId);
                if (deadPlayer) {
                    deadPlayer.isAlive = false;
                    deadPlayer.deadAt = 'bûcher';
                    deathsDay.push(deadPlayer.id);

                    const roleLabel = ROLES[deadPlayer.role as RoleId]?.label || 'Inconnu';
                    const deathMsg: ChatMessage = { senderId: 'system', senderName: 'Système', text: `Le village a condamné ${deadPlayer.name} au bûcher. Rôle : ${roleLabel}.`, time: Date.now(), chatType: 'system' };
                    game.chatMessages.push(deathMsg);
                    io.to(roomCode).emit("chat_message", deathMsg);

                    if (deadPlayer.role === 'FOU') {
                        fouWon = true;
                        deadFouPlayer = deadPlayer;
                    }

                    if (deadPlayer.effects.includes('lover')) {
                        const partner = game.players.find(other => other.id !== deadPlayer.id && other.effects.includes('lover') && other.isAlive);
                        if (partner) {
                            partner.isAlive = false;
                            partner.deadAt = 'suicide';
                            const partnerRole = ROLES[partner.role as RoleId]?.label || 'Inconnu';
                            const suicideMsg: ChatMessage = { senderId: 'system', senderName: 'Système', text: `${partner.name} s'est suicidé(e) par amour. Rôle : ${partnerRole}.`, time: Date.now(), chatType: 'system' };
                            game.chatMessages.push(suicideMsg);
                            io.to(roomCode).emit("chat_message", suicideMsg);
                            deathsDay.push(partner.id);
                        }
                    }
                }
            }

            if (fouWon && deadFouPlayer) {
                triggerGameOver(roomCode, { winner: 'FOU', players: [deadFouPlayer] }, games, gameTimers, io);
                return;
            }

            const anyHunterDiedAtDay = deathsDay.some(dId => game.players.find(p => p.id === dId)?.role === 'CHASSEUR');

            if (anyHunterDiedAtDay) {
                game.nextPhase = 'NIGHT';
                startPhase(roomCode, 'HUNTER_SHOT', games, gameTimers, io);
                return;
            }

            const victoryDetails = checkVictory(game);
            if (victoryDetails) triggerGameOver(roomCode, victoryDetails, games, gameTimers, io);
            else {
                // Clear poisons
                game.players.forEach(p => {
                    if (p.effects.includes('poisoned')) {
                        p.isMute = false;
                        p.effects = p.effects.filter(e => e !== 'poisoned');
                    }
                });
                startPhase(roomCode, 'NIGHT', games, gameTimers, io);
            }
            break;
        case 'HUNTER_SHOT':
            if (game.timer <= 0) {
                const vDetails = checkVictory(game);
                if (vDetails) {
                    triggerGameOver(roomCode, vDetails, games, gameTimers, io);
                } else {
                    const next = game.nextPhase || 'NIGHT';
                    delete game.nextPhase;

                    if (next === 'NIGHT') {
                        game.players.forEach(p => {
                            if (p.effects.includes('poisoned')) {
                                p.isMute = false;
                                p.effects = p.effects.filter(e => e !== 'poisoned');
                            }
                        });
                    }

                    startPhase(roomCode, next, games, gameTimers, io);
                }
            }
            break;
    }
}

function tallyVotes(game: GameState, isMayorElection: boolean = false): string | null {
    const counts: Record<string, number> = {};
    for (const [voterId, targetId] of Object.entries(game.votes)) {
        if (!counts[targetId]) counts[targetId] = 0;
        const voter = game.players.find(p => p.id === voterId);

        // During NIGHT, only wolf camp votes count for the primary victim
        if (game.phase === 'NIGHT' && !isInWolfCamp(voter?.role)) continue;

        let weight = 1;
        if (game.mayorId === voterId && !isMayorElection && game.phase === 'DAY_VOTE') weight = 2;
        if (voter?.role === 'LOUP_ALPHA' && game.phase === 'NIGHT') weight = 2;
        // In the future, we can add more logic here for other roles if needed

        counts[targetId] += weight;
    }
    let maxVotes = 0, electedId: string | null = null, isTie = false;
    for (const [targetId, voteCount] of Object.entries(counts)) {
        if (voteCount > maxVotes) { maxVotes = voteCount; electedId = targetId; isTie = false; }
        else if (voteCount === maxVotes) isTie = true;
    }
    return isTie ? null : electedId;
}

function checkVictory(game: GameState): { winner: string, players: Player[] } | null {
    const vivants = game.players.filter(p => p.isAlive);
    const loupsVivants = vivants.filter(p => p.role && (ROLES[p.role as RoleId].camp === 'LOUPS' || p.effects?.includes('infected')));
    const villageoisVivants = vivants.filter(p => !loupsVivants.includes(p) && p.role && (ROLES[p.role as RoleId].camp === 'VILLAGE' || p.role === 'FOU'));
    const solosDangereuxVivants = vivants.filter(p => p.role && ROLES[p.role as RoleId].camp === 'SOLO' && p.role !== 'FOU' && !p.effects?.includes('infected'));

    if (vivants.length === 0) return { winner: 'NONE', players: [] };

    // Solo victory
    if (vivants.length === 1 && solosDangereuxVivants.length === 1) return { winner: solosDangereuxVivants[0].role || 'SOLO', players: [solosDangereuxVivants[0]] };

    // Village victory
    if (loupsVivants.length === 0 && solosDangereuxVivants.length === 0) {
        const allVillageois = game.players.filter(p => p.role && (!isInWolfCamp(p.role as RoleId) && !['LOUP_BLANC', 'ASSASSIN', 'PYROMANE', 'EMPOISONNEUR'].includes(p.role as string) || p.role === 'FOU') && !p.effects?.includes('infected'));
        return { winner: 'VILLAGEOIS', players: allVillageois };
    }

    // Wolf victory
    if (loupsVivants.length >= villageoisVivants.length && solosDangereuxVivants.length === 0) {
        const allLoups = game.players.filter(p => (p.role && isInWolfCamp(p.role as RoleId)) || p.effects?.includes('infected'));
        return { winner: 'LOUPS', players: allLoups };
    }

    return null;
}

function triggerGameOver(roomCode: string, victoryDetails: { winner: string, players: Player[] }, games: Record<string, GameState>, gameTimers: Record<string, NodeJS.Timeout>, io: Server) {
    const game = games[roomCode];
    if (!game) return;
    if (gameTimers[roomCode]) clearInterval(gameTimers[roomCode]);
    setTimeout(() => {
        game.phase = 'GAME_OVER';
        io.to(roomCode).emit('game_over', victoryDetails);
        emitGameState(roomCode, game, io);
    }, 4500);
}

function emitGameState(roomCode: string, game: GameState, io: Server) {
    // We iterate over each socket in the room to send a tailored state
    const sockets = io.sockets.adapter.rooms.get(roomCode);
    if (!sockets) return;

    for (const socketId of sockets) {
        const socket = io.sockets.sockets.get(socketId);
        if (!socket) continue;

        const userId = socket.handshake.query.userId as string;
        const player = game.players.find(p => p.id === userId);
        const playerRole = player?.role;
        const explicitWolf = playerRole === 'LOUP_GAROU' || playerRole === 'LOUP_ALPHA' || playerRole === 'GRAND_MECHANT_LOUP' || playerRole === 'LOUP_INFECT';
        const playerIsWolf = isInWolfCamp(playerRole) || explicitWolf;

        // Calculate actual dead counts across all roles before masking
        const deadRolesCount: Partial<Record<RoleId, number>> = {};
        game.players.forEach(p => {
            if (!p.isAlive && p.role) {
                deadRolesCount[p.role] = (deadRolesCount[p.role] ?? 0) + 1;
            }
        });

        // Tailor the GameState for this specific player
        const tailoredGame: GameState = JSON.parse(JSON.stringify(game));
        tailoredGame.deadRolesCount = deadRolesCount;

        // Security: Filter messages so non-wolf players never even receive night chat data
        tailoredGame.chatMessages = tailoredGame.chatMessages.filter(msg => {
            if (msg.chatType === 'night') return playerIsWolf;
            return true;
        });

        // 0. Mask Roles for privacy (reveal dead players)
        tailoredGame.players.forEach(p => {
            const isTargetSelf = p.id === userId;
            const targetPlayerInGame = game.players.find(gp => gp.id === p.id);
            const isTargetDead = targetPlayerInGame && !targetPlayerInGame.isAlive;
            const explicitTargetWolf = p.role === 'LOUP_GAROU' || p.role === 'LOUP_ALPHA' || p.role === 'GRAND_MECHANT_LOUP' || p.role === 'LOUP_INFECT';
            const isTargetWolf = isInWolfCamp(p.role) || explicitTargetWolf;

            // Show role if: it's me, same wolf pack, target is dead, or game is over
            const shouldReveal = isTargetSelf || (isTargetWolf && playerIsWolf) || isTargetDead || game.phase === 'GAME_OVER';

            if (!shouldReveal) {
                p.role = null;
            }
        });

        // 1. Hide Night Votes and info from other camps
        if (game.phase === 'NIGHT') {
            const visibleVotes: Record<string, string> = {};
            const voteEntries = Object.entries(game.votes);
            for (const [voterId, tId] of voteEntries) {
                const voter = game.players.find(p => p.id === voterId);
                const explicitVoterWolf = voter?.role === 'LOUP_GAROU' || voter?.role === 'LOUP_ALPHA' || voter?.role === 'GRAND_MECHANT_LOUP' || voter?.role === 'LOUP_INFECT';
                const isVoterWolf = isInWolfCamp(voter?.role) || explicitVoterWolf;

                // Wolves see wolf votes. Everyone sees their own vote.
                const condWolves = (isVoterWolf && playerIsWolf);
                const condSelf = voterId === userId;
                const shouldSee = condWolves || condSelf;

                if (game.phase === 'NIGHT') {
                    console.log(`[VOTE_PARTITION] To: ${player?.name} | Voter: ${voter?.name} | IsVoterWolf: ${isVoterWolf} | MeIsWolf: ${playerIsWolf} | ShouldSee: ${shouldSee} (Wolves: ${condWolves}, Self: ${condSelf})`);
                }

                if (shouldSee) {
                    visibleVotes[voterId] = tId;
                }
            }
            tailoredGame.votes = visibleVotes;
            if (voteEntries.length > 0) {
                console.log(`[PARTITION_DEBUG] ${player?.name} (${playerRole}) sees ${Object.keys(visibleVotes).length}/${voteEntries.length} votes. isWolf: ${playerIsWolf}`);
            }

            // Hide other players' nightActions to prevent cheating via network inspection
            tailoredGame.nightActions = tailoredGame.nightActions.filter(action => action.sourceId === userId);

            // Also hide 'hasVoted' property and vote counts for privacy
            tailoredGame.players.forEach(p => {
                const isTargetSelf = p.id === userId;
                const explicitTargetWolf = p.role === 'LOUP_GAROU' || p.role === 'LOUP_ALPHA' || p.role === 'GRAND_MECHANT_LOUP' || p.role === 'LOUP_INFECT';
                const isTargetWolf = isInWolfCamp(p.role) || explicitTargetWolf;
                const isWolfGroup = isTargetWolf && playerIsWolf;

                if (!isTargetSelf && !isWolfGroup) {
                    p.hasVoted = null;
                    p.votesAgainst = 0;
                }
            });

            // Witch, Seer, and Wolf Pack can see the potential victim
            const canSeeVictim = playerRole === 'SORCIERE' || playerRole === 'VOYANTE' || playerRole === 'PETITE_FILLE' || playerIsWolf;
            if (!canSeeVictim) {
                tailoredGame.wolfVictimId = null;
            }
        } else {
            // Not night? Clear victim indicator for all
            tailoredGame.wolfVictimId = null;
        }

        socket.emit('update_game', tailoredGame);
    }
}
