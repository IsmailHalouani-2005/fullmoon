'use client';

import Image from 'next/image';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { GameState, ServerToClientEvents, ClientToServerEvents, Player, Phase } from '@/types/game';
import { ROLES, RoleId, PowerId, isInWolfCamp } from "@/types/roles";
import { distributeRoles, distributeCustomRoles } from '@/lib/roleDistribution';
import { doc, getDoc, collection, query, onSnapshot, addDoc } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import RoleInfoModal from '@/components/room/edit/RoleInfoModal';
import RoleCard from '@/components/game/RoleCard';
import PlayerCircleNode from '@/components/game/PlayerCircleNode';
import LoadingScreen from '@/components/room/LoadingScreen';
import LoversModal from '@/components/game/LoversModal';
import InfectedModal from '@/components/game/InfectedModal';

export default function RoomPage() {
    const params = useParams();
    const roomCode = params.code as string;
    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);
    const [game, setGame] = useState<GameState | null>(null);
    const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
    const [rolesConfig, setRolesConfig] = useState<Partial<Record<RoleId, number>> | null>(null);
    const [groupConfig, setGroupConfig] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [activeChatTab, setActiveChatTab] = useState<'day' | 'night'>('day');
    const [activePower, setActivePower] = useState<string | null>(null);
    const [powerTargets, setPowerTargets] = useState<string[]>([]);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatScrollContainerRef = useRef<HTMLDivElement>(null);
    const [isChatAutoScrollEnabled, setIsChatAutoScrollEnabled] = useState(true);

    const handleChatScroll = () => {
        if (!chatScrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
        // Check if we are at the bottom (allow 50px threshold)
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setIsChatAutoScrollEnabled(isAtBottom);
    };

    // Chat State
    interface ChatMessage {
        senderId: string;
        senderName: string;
        text: string;
        time: number;
        chatType?: 'day' | 'night' | 'system' | 'lover' | 'highlighted' | 'poisoned';
    }
    const getCampColor = (camp: string) => {
        switch (camp) {
            case 'VILLAGE': return 'text-green-400';
            case 'LOUPS': return 'text-red-500';
            case 'SOLO': return 'text-purple-400';
            default: return 'text-white';
        }
    };
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");


    const mePlayer = useMemo(() => {
        if (!user || !game?.players) return null;
        const p = game.players.find(p => p.id === user.uid) || null;
        return p;
    }, [user, game?.players]);

    // Auto-scroll effect
    useEffect(() => {
        if (isChatAutoScrollEnabled) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, activeChatTab, isChatAutoScrollEnabled]);

    // Invitations State
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isPlayersListOpen, setIsPlayersListOpen] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [invitedFriends, setInvitedFriends] = useState<string[]>([]);
    const [friendsOnlinePresence, setFriendsOnlinePresence] = useState<Record<string, boolean>>({});

    // UI State
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [gameOverData, setGameOverData] = useState<{ winner: string; players: Player[] } | null>(null);
    const [hasSeenLoverModal, setHasSeenLoverModal] = useState(false);
    const [hasSeenInfectedModal, setHasSeenInfectedModal] = useState(false);
    const [showAllumetteConfirm, setShowAllumetteConfirm] = useState(false);

    // --- SORCIÈRE MODALS ---
    const [witchHealTarget, setWitchHealTarget] = useState<string | null>(null);
    const [witchPoisonTarget, setWitchPoisonTarget] = useState<string | null>(null);

    // Photo de profil lue depuis Firestore (pour les comptes email/password sans photoURL dans Firebase Auth)
    // undefined = fetch pas encore fait, null = fetch fait mais aucune photo, string = URL de la photo
    const [firestorePhotoURL, setFirestorePhotoURL] = useState<string | null | undefined>(undefined);
    // Photos des joueurs lues depuis Firestore users/{uid} (pour les comptes email/password avec Base64)
    const [playerAvatars, setPlayerAvatars] = useState<Record<string, string>>({});

    // 1. Attendre que Firebase nous dise QUI est connecté + lire le photoURL Firestore
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/');
            } else {
                setUser(currentUser);
                // Lire le photoURL depuis Firestore (utile pour les comptes email/password)
                if (!currentUser.photoURL) {
                    try {
                        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
                        if (userSnap.exists()) {
                            setFirestorePhotoURL(userSnap.data().photoURL || null);
                        } else {
                            setFirestorePhotoURL(null); // doc introuvable → débloquer
                        }
                    } catch (e) {
                        console.warn("Impossible de récupérer le photoURL Firestore", e);
                        setFirestorePhotoURL(null); // erreur → débloquer quand même
                    }
                } else {
                    // Compte Google : pas besoin de fetch, débloquer immédiatement
                    setFirestorePhotoURL(null);
                }
            }
        });
        return () => unsubscribe();
    }, [router]);

    /** Ne jamais envoyer une photo Base64 via socket — trop lourde. On passe undefined à la place. */
    const getSafeAvatarUrl = (url: string | null | undefined) => {
        if (!url || url.startsWith('data:')) return undefined;
        return url;
    };

    // Charge les photos depuis Firestore pour les joueurs dont l'avatarUrl est absent (Base64 stripé)
    useEffect(() => {
        if (!game?.players) return;
        // On récupère uniquement ceux qui ne sont pas encore chargés ou qui ont une valeur vide/invalide
        const toFetch = game.players.filter(p => !playerAvatars[p.id]);

        if (toFetch.length === 0) return;

        toFetch.forEach(async (p) => {
            try {
                // Éviter de fetcher plusieurs fois le même joueur en même temps
                if (playerAvatars[p.id]) return;

                const snap = await getDoc(doc(db, "users", p.id));
                if (snap.exists()) {
                    const photo = snap.data().photoURL || '';
                    setPlayerAvatars(prev => ({ ...prev, [p.id]: photo }));
                } else {
                    // Marquer comme traité même si vide pour éviter le re-fetch
                    setPlayerAvatars(prev => ({ ...prev, [p.id]: "" }));
                }
            } catch (e) {
                console.error("Erreur avatar fetch", e);
            }
        });
    }, [game?.players]);

    /** Retourne la meilleure photo disponible pour un uid donné */
    const getPlayerAvatar = (playerId: string, fallbackUrl?: string) =>
        playerAvatars[playerId] || fallbackUrl || "/assets/images/icones/Photo_Profil-transparent.png";

    // 2. Se connecter au Serveur de Jeu (Socket.io)
    useEffect(() => {
        if (!user || !roomCode) return;

        // Attendre que la photo Firestore soit chargée (undefined = toujours en cours)
        // null = chargée mais vide, string = chargée avec URL → les deux débloquent le socket
        if (firestorePhotoURL === undefined) return;
        const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        let socketUrl = baseUrl;

        // En local, si aucune URL n'est définie, on pointe vers 3001
        if (!process.env.NEXT_PUBLIC_SOCKET_URL && baseUrl.includes('localhost')) {
            socketUrl = 'http://localhost:3001';
        }
        socketUrl = socketUrl.replace(/\/$/, '');

        console.log(`[DIAGNOSTIC] Connecting to Socket at ${socketUrl} for room ${roomCode}`);
        const newSocket = io(socketUrl, {
            query: {
                roomCode: roomCode,
                userId: user.uid,
                username: user.displayName || user.email?.split('@')[0] || "Anonyme",
                avatarUrl: getSafeAvatarUrl(user.photoURL || firestorePhotoURL) || "/assets/images/icones/Photo_Profil-transparent.png"
            }
        });

        // Écouter les mises à jour du jeu
        newSocket.on('update_game', (gameState) => {
            console.log("Mise à jour reçue du serveur :", gameState);
            setGame(gameState);
            if (gameState.chatMessages) {
                setChatMessages(gameState.chatMessages);
            }
        });

        newSocket.on('game_over', (payload) => {
            setGameOverData(payload);
        });

        newSocket.on('chat_message', (msg) => {
            console.log(`[CLIENT_RECEIVE_CHAT] Received message from ${msg.senderName} (Type: ${msg.chatType}):`, msg);
            setChatMessages(prev => [...prev, msg]);
        });

        newSocket.on('room_shutdown', (reason) => {
            alert(reason);
            router.push('/play');
        });

        // Rejoindre officiellement la salle UNIQUEMENT quand le socket est bien connecté
        newSocket.on('connect', () => {
            console.log("Socket connecté, envoi de join_game...");
            newSocket.emit('join_game', {
                roomCode,
                userId: user.uid,
                username: user.displayName || user.email?.split('@')[0] || "Anonyme",
                avatarUrl: getSafeAvatarUrl(user.photoURL || firestorePhotoURL)
            });
        });

        // Gestion de la reconnexion automatique par Socket.io
        newSocket.on('reconnect', () => {
            console.log("Socket reconnecté, ré-envoi de join_game...");
            newSocket.emit('join_game', {
                roomCode,
                userId: user.uid,
                username: user.displayName || user.email?.split('@')[0] || "Anonyme",
                avatarUrl: getSafeAvatarUrl(user.photoURL || firestorePhotoURL)
            });
        });

        setSocket(newSocket);

        // Nettoyage quand on quitte la page
        return () => {
            newSocket.disconnect();
        };
    }, [user, roomCode, firestorePhotoURL]);

    // 3. Récupérer la configuration de la room depuis Firestore The Lobby (En temps réel)
    useEffect(() => {
        if (!roomCode) return;
        const unsubscribe = onSnapshot(doc(db, "groups", roomCode), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setGroupConfig(data);
                if (data.rolesCount) {
                    setRolesConfig(data.rolesCount);
                }
            }
        }, (err) => {
            console.error("Erreur lors de la récupération de la configuration du village:", err);
        });

        return () => unsubscribe();
    }, [roomCode]);

    // 4. Récupérer les amis pour le panneau d'invitation
    useEffect(() => {
        if (!user) return;
        const qFriends = query(collection(db, "users", user.uid, "friends"));
        const unsubscribe = onSnapshot(qFriends, (snapshot) => {
            const friendsData = snapshot.docs.map(docSnap => ({
                id: docSnap.id, // friendId
                ...docSnap.data()
            }));
            setFriends(friendsData);
        });
        return () => unsubscribe();
    }, [user]);

    // 4b. Écouter la présence en ligne des amis (Firebase Realtime Database)
    useEffect(() => {
        if (friends.length === 0) return;
        const rtdb = getDatabase();
        const unsubscribers: (() => void)[] = [];

        friends.forEach(friend => {
            const presenceRef = ref(rtdb, `presence/${friend.id}`);
            const unsub = onValue(presenceRef, (snapshot) => {
                const isOnline = snapshot.val() === true;
                setFriendsOnlinePresence(prev => ({ ...prev, [friend.id]: isOnline }));
            });
            unsubscribers.push(unsub);
        });

        return () => unsubscribers.forEach(u => u());
    }, [friends]);

    // 5. Demander confirmation avant de quitter la page (fermeture ou refresh)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "Êtes-vous sûr de vouloir quitter le village ? Vous serez déconnecté.";
            return e.returnValue;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Helper pour quitter proprement avec le bouton UI "Retour" ou "Home"
    const handleSafeLeave = () => {
        setShowLeaveConfirm(true);
    };

    const confirmLeave = async () => {
        setShowLeaveConfirm(false);
        if (user && roomCode) {
            try {
                // Remove player from group in DB before leaving
                const groupRef = doc(db, "groups", roomCode);
                const groupSnap = await getDoc(groupRef);

                if (groupSnap.exists()) {
                    const groupData = groupSnap.data();
                    if (groupData.players && groupData.players.length <= 1) {
                        const { deleteDoc } = await import('firebase/firestore');
                        await deleteDoc(groupRef);
                    } else {
                        const updatedPlayers = groupData.players.filter((p: any) => p.uid !== user.uid);
                        const { updateDoc } = await import('firebase/firestore');
                        await updateDoc(groupRef, { players: updatedPlayers });
                    }
                }

                // Clear user's currentGroupId
                const { updateDoc } = await import('firebase/firestore');
                await updateDoc(doc(db, "users", user.uid), {
                    currentGroupId: null
                });
            } catch (error) {
                console.error("Error cleaning up player before leaving:", error);
            }
        }
        router.push('/play');
    };

    // ⚠️ HOOKS AVANT TOUT RETURN CONDITIONNEL

    // LOBBY : use dynamic distribution based on J, following the logic in lib/roleDistribution.ts
    const dynamicRolesConfig = useMemo(() => {
        const J = game?.players.length ?? 0;
        if (J < 5) return rolesConfig || {};

        if (groupConfig?.isCustom && rolesConfig) {
            return distributeCustomRoles(J, rolesConfig);
        } else {
            return distributeRoles(J);
        }
    }, [game?.players.length, rolesConfig, groupConfig?.isCustom]);

    // PARTIE : compte les rôles réels depuis game.players (source de vérité absolue)
    const gameRolesConfig = useMemo(() => {
        if (!game?.players) return null;
        const counts: Partial<Record<RoleId, number>> = {};
        for (const player of game.players) {
            if (player.role) {
                counts[player.role as RoleId] = (counts[player.role as RoleId] ?? 0) + 1;
            }
        }
        return Object.keys(counts).length > 0 ? counts : null;
    }, [game?.players]);

    if (!user || !game) {
        return <LoadingScreen roomCode={roomCode} />;
    }

    // Source affichée dans la grille : dynamique en LOBBY, rôles distribués sinon
    const displayedRolesConfig = game.phase === 'LOBBY'
        ? dynamicRolesConfig
        : (game.rolesCount || gameRolesConfig);

    const isHost = game.hostId === user.uid;

    // La phase de Nuit est désormais gérée dans le rendu principal du composant

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !socket || !user || !game) return;

        const me = game.players.find(p => p.id === user.uid);
        if (me && !me.isAlive) return; // Un mort ne parle plus (sauf ongle système peut-être plus tard, mais simplifions)

        const camp = me?.role ? ROLES[me.role as RoleId]?.camp : 'UNKNOWN';
        console.log(`[CLIENT_SEND_CHAT] Text: "${chatInput}" | Sender: ${me?.name} | Role: ${me?.role} | Camp: ${camp} | Tab: ${activeChatTab}`);

        socket.emit('chat_message', {
            senderId: user.uid,
            senderName: user.displayName || user.email?.split('@')[0] || "Anonyme",
            text: chatInput,
            time: Date.now(),
            chatType: activeChatTab
        }, (response) => {
        });
        setIsChatAutoScrollEnabled(true);
        setChatInput("");
    };

    const copyInviteLink = () => {
        const link = `${window.location.origin}/room/${roomCode}`;
        navigator.clipboard.writeText(link);
        alert("Lien copié dans le presse-papiers !");
    };

    const copySecretCode = () => {
        if (!game?.secretCode) return;
        navigator.clipboard.writeText(game.secretCode);
        alert("Code secret copié dans le presse-papiers !");
    };

    const handleInviteFriend = async (friendId: string, friendPseudo: string) => {
        if (!user || !roomCode) return;
        try {
            const notifRef = collection(db, "users", friendId, "notifications");
            await addDoc(notifRef, {
                type: "group_invite",
                groupId: roomCode, // le code du salon = l'ID du groupe
                fromUserId: user.uid,
                fromPseudo: user.displayName || user.email?.split('@')[0] || "Anonyme",
                fromPhotoURL: user.photoURL || "/assets/images/icones/Photo_Profil-transparent.png",
                createdAt: new Date().toISOString(),
                read: false
            });
            setInvitedFriends(prev => [...prev, friendId]);
            alert(`Invitation envoyée à ${friendPseudo}.`);
        } catch (error) {
            console.error("Error sending invite", error);
            alert("Erreur lors de l'envoi de l'invitation.");
        }
    };

    const confirmAllumette = () => {
        socket?.emit('use_power', { powerId: 'ALLUMETTE' });
        setShowAllumetteConfirm(false);
    };

    const handlePowerClick = (powerId: string) => {
        if (powerId === 'ALLUMETTE') {
            setShowAllumetteConfirm(true);
            return;
        }

        if (activePower === powerId) {
            setActivePower(null);
            setPowerTargets([]);
        } else {
            setActivePower(powerId);
            setPowerTargets([]);
        }
    };

    const handlePlayerClick = (playerId: string) => {
        const me = game?.players.find(p => p.id === user?.uid);

        if (!activePower) {
            socket?.emit("vote_player", playerId);
            return;
        }

        const roleDef = me?.role ? ROLES[me.role as RoleId] : null;
        const power = roleDef?.powers?.find(p => p.id === activePower);

        if (!power) return;

        // Cupidon needs 2 targets
        if (activePower === 'COUP_DE_COEUR') {
            if (powerTargets.includes(playerId)) {
                setPowerTargets(prev => prev.filter(id => id !== playerId));
            } else if (powerTargets.length < 1) {
                setPowerTargets([playerId]);
            } else if (powerTargets.length === 1) {
                const p1 = powerTargets[0];
                const p2 = playerId;
                socket?.emit('use_power', { powerId: 'COUP_DE_COEUR', targetId: p1, targetId2: p2 });
                setActivePower(null);
                setPowerTargets([]);
            }
        } else if (activePower === 'POTION_SOIN') {
            if (playerId !== game.wolfVictimId) {
                // Not ideal to use alert here still, maybe a custom temporary error?
                // Let's stick to the prompt replacement for now, as requested "small modal asking if he wants to save"
                alert("Vous ne pouvez utiliser cette potion que sur la victime des loups.");
                return;
            }
            setWitchHealTarget(playerId);
        } else if (activePower === 'POTION_POISON') {
            if (me && playerId === me.id) {
                alert("Vous ne pouvez pas vous empoisonner vous-même.");
                return;
            }
            setWitchPoisonTarget(playerId);
        } else if (activePower === 'ESSENCE') {
            const targetPlayer = game.players.find(p => p.id === playerId);
            if (me && playerId === me.id) {
                // Not ideal but matches the current codebase style
                alert("Vous ne pouvez pas vous arroser vous-même !");
                return;
            }
            if (targetPlayer && targetPlayer.effects.includes('gasoline')) {
                alert("Ce joueur est déjà aspergé d'essence !");
                return;
            }
            socket?.emit('use_power', { powerId: activePower as PowerId, targetId: playerId });
            setActivePower(null);
            setPowerTargets([]);
        } else if (activePower === 'POISON_TOXIQUE') {
            if (me && playerId === me.id) {
                alert("Vous ne pouvez pas vous empoisonner vous-même !");
                return;
            }
            if (playerId === game.lastPoisonedId) {
                alert("Vous ne pouvez pas empoisonner le même joueur deux nuits de suite !");
                return;
            }
            socket?.emit('use_power', { powerId: activePower as PowerId, targetId: playerId });
            setActivePower(null);
            setPowerTargets([]);
        } else {
            // Single target powers
            socket?.emit('use_power', { powerId: activePower as PowerId, targetId: playerId });
            setActivePower(null);
            setPowerTargets([]);
        }
    };

    // --- ECRAN DU LOBBY & JEU ---
    const currentPhase = game?.phase as string;

    return (
        <div className={`h-screen max-h-screen overflow-hidden flex font-montserrat transition-colors duration-1000 ${currentPhase === 'NIGHT' ? 'bg-[#1a1b26] text-slate-200' : 'bg-[#fafafa] text-slate-900'}`}>
            {/* --- SIDEBAR GAUCHE --- */}
            <aside className={`w-100 flex flex-col p-4 transition-colors duration-1000 ${currentPhase === 'NIGHT' ? 'bg-[#16161e] border-r border-[#2a2b3d]' : 'bg-[#fafafa]'}`}>
                {/* Ligne du haut : Home, Params, Amis */}
                <div className={`flex justify-between items-center bg-transparent border-3 rounded-lg px-3 py-1 mb-6 transition-colors duration-1000 ${currentPhase === 'NIGHT' ? 'bg-[#1f202e] border-slate-600 text-white' : 'bg-white border-dark text-slate-900'}`}>
                    <button onClick={handleSafeLeave} className="hover:opacity-70 transition-opacity flex items-center justify-center p-1">
                        <Image src={currentPhase === 'NIGHT' ? '/assets/images/icones/home-icon_white.png' : '/assets/images/icones/home-icon_black.png'} alt="Accueil" width={22} height={22} />
                    </button>
                    <div className="flex gap-4">
                        <button className="hover:opacity-70 transition-opacity flex items-center justify-center p-1">
                            <Image src={currentPhase === 'NIGHT' ? '/assets/images/icones/parametre-icon_white.png' : '/assets/images/icones/parametre-icon_black.png'} alt="Paramètres" width={22} height={22} />
                        </button>
                        <button onClick={() => { if (!isPlayersListOpen) { setIsPlayersListOpen(true); setIsInviteOpen(false); } else { setIsPlayersListOpen(false); } }} className="hover:opacity-70 transition-opacity flex items-center justify-center p-1">
                            <Image src={currentPhase === 'NIGHT' ? '/assets/images/icones/friends-icon_white.png' : '/assets/images/icones/friends-icon_black.png'} alt="Joueurs" width={22} height={22} />
                        </button>
                    </div>
                </div>

                {/* Grille des rôles au-dessus du chat */}
                <div className={`font-montserrat border-3 rounded-lg pt-4 pb-6 px-4 mb-6 flex flex-wrap gap-4 justify-start transition-colors duration-1000 bg-transparent ${currentPhase === 'NIGHT' ? ' border-slate-600 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : ' border-dark shadow-md'}`}>
                    {(displayedRolesConfig && Object.keys(displayedRolesConfig).length > 0) ? (
                        Object.entries(displayedRolesConfig).map(([rId, totalCount]) => {
                            const roleDef = ROLES[rId as RoleId];
                            if (!roleDef || !totalCount || (totalCount as number) <= 0) return null;

                            // Calculate alive count for this role from the new secure deadRolesCount object
                            const deadCount = (game.deadRolesCount?.[rId as RoleId]) || 0;
                            const aliveCount = (totalCount as number) - deadCount;
                            const isDead = game.phase !== 'LOBBY' && aliveCount <= 0;

                            return (
                                <div
                                    key={rId}
                                    className={`relative group cursor-pointer w-12 h-12 transition-all ${isDead ? 'grayscale opacity-50' : ''}`}
                                    onClick={() => setSelectedRole(rId as RoleId)}
                                >
                                    <Image src={roleDef.image} alt={roleDef.label} fill className="object-contain" />
                                    {(totalCount as number) > 1 || (game.phase !== 'LOBBY' && (totalCount as number) > 0) ? (
                                        <div className={`absolute -bottom-1 -right-1 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold border-2 shadow-sm z-20 ${isDead ? 'bg-slate-500 text-slate-200 border-slate-400' : 'bg-slate-800 text-white border-white'}`}>
                                            {game.phase === 'LOBBY' ? totalCount : aliveCount}
                                        </div>
                                    ) : null}
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                                        {roleDef.label} {game.phase !== 'LOBBY' ? `(${aliveCount}/${totalCount})` : ''}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-[10px] uppercase font-bold text-slate-500 italic px-2">En attente de joueurs...</p>
                    )}
                </div>

                {/* Zone de Chat (Flex-1) */}
                <div className={`flex-1 font-montserrat border-3 rounded-xl flex flex-col overflow-hidden relative min-h-0 transition-colors duration-1000 ${currentPhase === 'NIGHT' ? 'bg-[#1f202e] border-slate-600' : 'bg-[#FCF8E8] border-dark'}`}>

                    {/* Chat Tabs */}
                    <div className={`flex border-b-3 ${currentPhase === 'NIGHT' ? 'border-slate-600' : 'border-dark'}`}>
                        <button
                            onClick={() => setActiveChatTab('day')}
                            className={`flex-1 py-2 text-xs sm:text-sm font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-1 ${activeChatTab === 'day' ? (currentPhase === 'NIGHT' ? 'bg-[#D1A07A] text-dark' : 'bg-[#D1A07A] text-dark') : (currentPhase === 'NIGHT' ? 'bg-transparent text-slate-400 hover:bg-slate-700' : 'bg-transparent text-slate-500 hover:bg-slate-200')}`}
                        >
                            <Image src="/assets/images/icones/sun-icon.png" alt="" width={14} height={14} /> Jour
                        </button>
                        <button
                            onClick={() => setActiveChatTab('night')}
                            className={`flex-1 py-2 text-xs sm:text-sm font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-1 ${activeChatTab === 'night' ? (currentPhase === 'NIGHT' ? 'bg-slate-900 text-white' : 'bg-slate-800 text-white') : (currentPhase === 'NIGHT' ? 'bg-transparent text-slate-400 hover:bg-slate-700' : 'bg-transparent text-slate-500 hover:bg-slate-200')}`}
                        >
                            <Image src="/assets/images/icones/moon-icon.png" alt="" width={14} height={14} /> Nuit
                        </button>
                    </div>

                    <div
                        ref={chatScrollContainerRef}
                        onScroll={handleChatScroll}
                        className="flex-1 overflow-y-auto p-4 space-y-2 relative z-10 w-full flex flex-col"
                    >
                        <div className="mt-auto"></div>
                        {chatMessages.filter(msg => {
                            if (msg.chatType === 'system' || msg.chatType === 'lover' || msg.chatType === 'highlighted') return true;
                            if (msg.chatType === 'night') {
                                const isMeWolf = mePlayer?.role && isInWolfCamp(mePlayer.role as RoleId);
                                const isPetiteFille = mePlayer?.role === 'PETITE_FILLE';
                                const isMeSender = msg.senderId === user?.uid;
                                const show = (activeChatTab === 'night' && (isMeWolf || isPetiteFille)) || (isMeSender && isMeWolf);
                                console.log(`[CLIENT_RENDER_CHAT] msg: "${msg.text}" | tab: ${activeChatTab} | isMeWolf: ${isMeWolf} | isPF: ${isPetiteFille} | show: ${show}`);
                                return show;
                            }
                            return activeChatTab === 'day';
                        }).map((msg, idx) => {
                            const senderIndex = game.players.findIndex(p => p.id === msg.senderId);
                            const senderPlayer = senderIndex !== -1 ? game.players[senderIndex] : null;
                            const senderNumber = senderIndex + 1;

                            const avatar = getPlayerAvatar(msg.senderId, senderPlayer?.avatarUrl);

                            // Joueur actuel pour la mention (Nom, "Joueur X", ou "JX")
                            const myIndex = game.players.findIndex(p => p.id === user.uid);
                            const myPlayer = myIndex !== -1 ? game.players[myIndex] : null;
                            const myNumber = myIndex + 1;

                            // Highlight strict : @Pseudo ou @Chiffre ou Chiffre seul
                            const numberRegex = new RegExp(`(^|\\s)${myNumber}(\\s|$)`);
                            const isMentioned = mePlayer && (
                                msg.text.includes(`@${mePlayer.name}`) ||
                                msg.text.includes(`@${myNumber}`) ||
                                numberRegex.test(msg.text)
                            );

                            if (msg.chatType === 'system') {
                                return (
                                    <div key={idx} className="flex justify-center w-full py-1">
                                        <span className={`text-xs font-medium italic px-3 py-1 rounded-full shadow-sm text-center ${currentPhase === 'NIGHT' ? 'bg-slate-900 text-white' : 'bg-slate-200/50 text-slate-500'}`}>
                                            {msg.text}
                                        </span>
                                    </div>
                                );
                            }

                            if (msg.chatType === 'lover') {
                                return (
                                    <div key={idx} className="flex justify-center w-full py-2">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-[#ff69b4]/20 border border-[#ff69b4]/50 rounded-lg shadow-[0_0_15px_rgba(255,105,180,0.4)] animate-pulse">
                                            <span className="text-[#ff69b4] drop-shadow-md text-lg">💘</span>
                                            <span className="text-sm font-bold text-[#ff69b4] drop-shadow-md text-center">
                                                {msg.text}
                                            </span>
                                            <span className="text-[#ff69b4] drop-shadow-md text-lg">💘</span>
                                        </div>
                                    </div>
                                );
                            }

                            if (msg.chatType === 'highlighted') {
                                return (
                                    <div key={idx} className="flex justify-center w-full py-2">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-lg shadow-[0_0_15px_rgba(255,165,0,0.4)] ">
                                            <div className="relative w-5 h-5 drop-shadow-md shrink-0">
                                                <Image src="/assets/images/icones/powers/feu.png" alt="Feu" fill className="object-contain" />
                                            </div>
                                            <span className="text-sm font-bold text-orange-400 drop-shadow-md text-center">
                                                {msg.text}
                                            </span>
                                            <div className="relative w-5 h-5 drop-shadow-md shrink-0">
                                                <Image src="/assets/images/icones/powers/feu.png" alt="Feu" fill className="object-contain" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (msg.chatType === 'poisoned') {
                                return (
                                    <div key={idx} className="flex justify-center w-full py-2">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-purple-900/40 border border-purple-500/50 rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                                            <div className="relative w-6 h-6 drop-shadow-md shrink-0">
                                                <Image src="/assets/images/icones/powers/Effet_Empoisonnement.png" alt="Poison" fill className="object-contain" />
                                            </div>
                                            <span className="text-sm font-semibold text-purple-300 drop-shadow-sm text-center">
                                                {msg.text}
                                            </span>
                                            <div className="relative w-6 h-6 drop-shadow-md shrink-0">
                                                <Image src="/assets/images/icones/powers/Effet_Empoisonnement.png" alt="Poison" fill className="object-contain" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={idx} className={`flex items-start gap-2 w-full p-2 rounded-lg transition-all ${isMentioned ? (currentPhase === 'NIGHT' ? 'bg-amber-900/50 ring-2 ring-amber-500' : 'bg-amber-200 ring-2 ring-amber-500') : (currentPhase === 'NIGHT' ? 'bg-slate-800' : 'bg-white border border-slate-200 shadow-sm')}`}>
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-slate-300 -mt-0.5">
                                        <Image src={avatar} alt={msg.senderName} fill className="object-cover" />
                                    </div>
                                    <div className="flex-1 text-[13px] leading-snug overflow-hidden">
                                        <span className={`font-extrabold ${currentPhase === 'NIGHT' ? 'text-white' : 'text-slate-900'}`}>{msg.senderName}{msg.senderId !== 'loup_anim' ? ` ${senderNumber}` : ''} : </span>
                                        <span className={`break-words hyphens-auto ${currentPhase === 'NIGHT' ? 'text-white' : 'text-slate-700'} ${isMentioned ? 'font-medium' : ''}`} style={{ wordBreak: 'break-word', hyphens: 'auto' }} lang="fr">{msg.text}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>
                    {/* Input Chat */}
                    {(() => {
                        const isDeadPlayer = mePlayer ? !mePlayer.isAlive : false;
                        const isMePetiteFille = mePlayer?.role === 'PETITE_FILLE';

                        // Condition de parole stricte : Les morts se taisent. Les petites filles se taisent la nuit.
                        const canChat = game ? (!isDeadPlayer && (
                            currentPhase === 'LOBBY' ||
                            (activeChatTab === 'day' && currentPhase !== 'NIGHT') ||
                            (activeChatTab === 'night' && currentPhase === 'NIGHT' && mePlayer?.role && isInWolfCamp(mePlayer.role as RoleId))
                        )) : false;

                        return (
                            <form onSubmit={handleSendMessage} className={`p-3 flex items-center gap-2 relative z-10 transition-colors duration-1000 ${currentPhase === 'NIGHT' ? 'bg-[#1f202e]' : 'bg-[#FCF8E8]'}`}>
                                {mePlayer?.effects?.includes('poisoned') ? (
                                    <div className="flex-1 rounded-lg px-4 py-3 text-sm flex items-center gap-2 bg-purple-900/10 border border-purple-500/30 text-purple-600 font-bold shadow-inner">
                                        <Image src="/assets/images/icones/powers/Effet_Empoisonnement.png" alt="Poison" width={20} height={20} />
                                        Le poison vous mutile. Vous ne pouvez pas parler aujourd'hui.
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            maxLength={300}
                                            disabled={!canChat}
                                            className={`flex-1 rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors duration-500
                                                ${currentPhase === 'NIGHT' ? 'bg-slate-800 text-white shadow-[0_0_10px_-1px_#000] focus:border-slate-500 placeholder-slate-500' : 'bg-white shadow-[0_0_10px_-1px_#E0C09C] focus:border-slate-500 text-slate-900'}
                                                ${!canChat ? 'opacity-50 cursor-not-allowed italic' : ''}
                                            `}
                                            placeholder={!canChat ? (isMePetiteFille && activeChatTab === 'night' ? "Chut... Écoutez les loups en silence." : "Vous ne pouvez pas parler...") : (activeChatTab === 'night' ? "Hurlez avec les loups..." : "Écrivez au village...")}
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                        />
                                        <button type="submit" disabled={!canChat} className={`p-2 flex items-center justify-center transition-colors ${canChat ? (currentPhase === 'NIGHT' ? 'text-slate-400 hover:text-white' : 'text-slate-800 hover:text-slate-600') : 'text-slate-500/50 cursor-not-allowed'}`}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </form>
                        );
                    })()}
                </div>
            </aside>

            {/* --- ZONE CENTRALE DROITE (Cercle des joueurs) --- */}
            <main className={`flex-1 relative overflow-hidden flex flex-col items-center justify-center p-8 ${currentPhase === 'NIGHT' ? 'bg-dark text-white' : 'bg-white text-dark'}`}>

                {/* Image de fond léger pour l'ambiance */}
                <div
                    className={`absolute inset-0 pointer-events-none bg-center bg-no-repeat bg-cover transition-opacity duration-1000 ${currentPhase === 'NIGHT' ? 'opacity-5' : 'opacity-[0.03]'}`}
                    style={{ backgroundImage: "url('/assets/images/icones/village_batiments.png')" }}
                />

                {/* Le conteneur du cercle (Responsive en pourcentage pour s'adapter à l'écran) */}
                <div className="relative w-full max-w-[800px] aspect-square max-h-[80vh] flex items-center justify-center">

                    {/* Boîte Centrale des Infos */}
                    {currentPhase === 'LOBBY' ? (
                        <div className="bg-primary font-montserrat border-2 border-dark  sm:p-10 text-center flex flex-col items-center shadow-md w-[80%] max-w-[400px] z-50 rounded-lg">
                            <h2 className="text-4xl sm:text-3xl font-extrabold tracking-widest mb-1 text-slate-900 font-enchanted">EN ATTENTE DES JOUEURS</h2>
                            <p className=" text-sm text-slate-600 mb-5 font-bold">({game.players.length} / {dynamicRolesConfig ? Object.values(dynamicRolesConfig).reduce((a, b) => a + (b || 0), 0) : '?'} joueurs)</p>

                            <p className="text-sm text-slate-500 mb-2">Invitez d'autres joueurs pour remplir le village</p>

                            <div className="flex items-center gap-2 bg-[#D1A07A] text-dark px-6 py-3 rounded-lg w-full cursor-pointer hover:bg-[#b08465] transition-colors shadow-[0_0_10px_-1px_#2D3436]" onClick={copyInviteLink}>
                                <span className="flex-1 font-bold text-sm truncate text-left">{typeof window !== 'undefined' ? `${window.location.host}/room/${roomCode}` : roomCode}</span>
                                <Image src="/assets/images/icones/copy_paste-icon.png" alt="Copier" width={20} height={20} className="ml-2 flex-shrink-0" />
                            </div>

                            {/* Section Code Secret (Uniquement pour l'Hôte si Village Privé) */}
                            {isHost && (game.isPrivate || groupConfig?.isPrivate) && (
                                <div className="mt-2 w-full flex flex-col items-center">
                                    <p className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Code Secret (Privé)</p>
                                    <div className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-lg w-3/4 shadow-inner">
                                        <span className="flex-1 text-sm tracking-widest text-center">{game.secretCode || groupConfig?.secretCode}</span>
                                        <button onClick={() => {
                                            const code = game.secretCode || groupConfig?.secretCode;
                                            if (!code) return;
                                            navigator.clipboard.writeText(code);
                                            alert("Code secret copié dans le presse-papiers !");
                                        }} className="text-slate-300 hover:text-white transition-colors" title="Copier le code"><Image src="/assets/images/icones/copy_paste-icon_white.png" alt="Copier" width={18} height={18} /></button>
                                    </div>
                                </div>
                            )}

                            <p className=" text-xs text-slate-500 my-2 uppercase font-bold tracking-widest">ou</p>

                            <button onClick={() => { if (!isInviteOpen) { setIsInviteOpen(true); setIsPlayersListOpen(false); } else { setIsInviteOpen(false); } }} className="bg-dark text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-black transition-colors shadow-md flex items-center justify-center gap-2 w-full ">
                                Invitez directement vos amis
                            </button>

                            {/* Bouton Commencer la Partie (En Dessous du cercle si host & >= 5) */}
                            <div className="bg-transparent mt-4 w-full flex justify-center z-20 font-enchanted">
                                {isHost && game.players.length >= 5 ? (
                                    <button
                                        onClick={async () => {
                                            const startPayload = dynamicRolesConfig ? {
                                                rolesCount: dynamicRolesConfig,
                                                isCustom: groupConfig?.isCustom
                                            } : undefined;
                                            console.log("[DIAGNOSTIC] Emitting start_game with payload:", JSON.stringify(startPayload));
                                            socket?.emit('start_game', startPayload);
                                            // Persister dans Firestore pour que le Quick Join sache que la partie est lancée
                                            try {
                                                const { updateDoc } = await import('firebase/firestore');
                                                await updateDoc(doc(db, "groups", roomCode), { gameStarted: true });
                                            } catch (e) { console.warn("Could not update gameStarted", e); }
                                        }}
                                        className="bg-transparent border-2 border-dark px-6 py-2 text-lg font-extrabold tracking-widest hover:bg-dark hover:text-white transition-colors text-dark rounded-lg cursor-pointer"
                                    >
                                        COMMENCER LA PARTIE
                                    </button>
                                ) : (
                                    <div className="text-sm italic font-montserrat pointer-events-none text-slate-500">
                                        En attente de l'hôte (min. 5 joueurs)...
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : currentPhase === 'ROLE_REVEAL' ? (
                        <div className="flex flex-col items-center justify-center z-200 font-montserrat perspective-1000">
                            <h2 className="text-4xl sm:text-2xl font-extrabold tracking-widest mb-2 text-slate-900 font-enchanted drop-shadow-md">Découvrez votre Rôle</h2>

                            <RoleCard
                                roleId={user && game.players.find(p => p.id === user.uid)?.role ? game.players.find(p => p.id === user.uid)!.role! : undefined}
                                isCardFlipped={isCardFlipped}
                                onFlip={() => setIsCardFlipped(true)}
                                isMayor={user ? game.mayorId === user.uid : false}
                                className="w-[180px] sm:w-[240px]"
                            />

                            <p className="mt-2 text-sm text-slate-600 font-bold bg-white/70 px-4 py-2 rounded-full shadow-sm animate-pulse">
                                {!isCardFlipped ? "Cliquez sur la carte pour la retourner" : "La partie commence bientôt..."}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center z-20 font-montserrat text-center bg-transparent p-8 min-w-[300px]">
                            <h2 className={`text-4xl font-extrabold tracking-widest font-enchanted drop-shadow-sm ${currentPhase === 'NIGHT' ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-slate-900'}`}>
                                {(game.phase as string) === 'MAYOR_ELECTION' ? 'Élection du Maire' :
                                    (game.phase as string) === 'NIGHT' ? 'La Nuit Tombe' :
                                        (game.phase as string) === 'DAY_DISCUSSION' ? 'Le Jour se Lève' :
                                            (game.phase as string) === 'DAY_VOTE' ? 'Le Bûcher' :
                                                (game.phase as string) === 'HUNTER_SHOT' ? 'Le Dernier Tir' : 'Fin de Partie'}
                            </h2>
                            <h5 className={`text-sm tracking-widest mb-2 italic drop-shadow-sm ${currentPhase === 'NIGHT' ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-slate-900'}`}>
                                {(game.phase as string) === 'MAYOR_ELECTION' ? "Votez un joueur pour qu'il devienne le Maire" :
                                    (game.phase as string) === 'NIGHT' ? "Utilisez vos pouvoirs" :
                                        (game.phase as string) === 'DAY_DISCUSSION' ? "Discutez et débattez entre vous" :
                                            (game.phase as string) === 'DAY_VOTE' ? "Votez pour le joueur à exécuter" :
                                                (game.phase as string) === 'HUNTER_SHOT' ? "Le Chasseur prépare son arme..." : "Fin de Partie"}
                            </h5>
                            <div className="text-3xl font-extrabold text-[#D1A07A] drop-shadow-md mt-4">
                                {game.timer}s
                            </div>
                            <p className={`text-sm font-bold uppercase tracking-widest ${currentPhase === 'NIGHT' ? 'text-slate-400' : 'text-slate-600'}`}>Temps Restant</p>

                            {/* Rappel du rôle du joueur */}
                            {(user && game.players.find(p => p.id === user.uid)?.role) && (() => {
                                const mePlayer = game.players.find(p => p.id === user.uid)!;
                                const myRole = mePlayer.role!;
                                const roleDef = ROLES[myRole];
                                return (
                                    <div className="mt-5 flex flex-col items-center">
                                        <div
                                            className="flex flex-col items-center opacity-80 hover:opacity-100 transition-opacity cursor-pointer bg-black/5 dark:bg-white/5 px-5 py-3 rounded-lg backdrop-blur-sm border border-black/10 dark:border-white/10"
                                            onClick={() => setSelectedRole(myRole)}
                                        >
                                            <p className={`text-[10px] uppercase font-bold font-montserrat tracking-widest mb-2 ${currentPhase === 'NIGHT' ? 'text-slate-400' : 'text-slate-500'}`}>Votre rôle <br /> <span className="text-slate-300 text-[8px]">(cliquez)</span></p>
                                            <div className={`relative w-10 h-10 drop-shadow-md ${currentPhase === 'NIGHT' ? 'animate-pulse' : ''}`}>
                                                <Image src={roleDef.image || "/assets/images/icones/Carte_Role.png"} alt={roleDef.label} fill className="object-contain" />
                                            </div>
                                            <p className={`font-extrabold mt-2 text-xs tracking-wide ${currentPhase === 'NIGHT' ? (roleDef.camp === 'LOUPS' ? 'text-red-400' : (roleDef.camp === 'VILLAGE' ? 'text-green-400' : 'text-purple-400')) : (getCampColor(roleDef.camp))}`}>{roleDef.label}</p>
                                        </div>

                                        {/* Power Icons Section */}
                                        {((roleDef.powers || []).length > 0 && (currentPhase === 'NIGHT' || currentPhase === 'HUNTER_SHOT')) && (
                                            <div className="mt-1 flex gap-4">
                                                {(roleDef.powers || []).map(power => {
                                                    const usedPowers = mePlayer.usedPowers || [];
                                                    const isUsedOneTime = power.type === 'one-time' && usedPowers.includes(power.id);
                                                    const isUsedThisNight = game.nightActions?.some(a => a.sourceId === user?.uid && a.powerId === power.id);
                                                    const isUsed = isUsedOneTime || (power.type === 'active' && isUsedThisNight);

                                                    // Sorcière : si une potion est utilisée cette nuit, bloquer l'autre pendant cette nuit
                                                    const usedPotionThisNight = game.nightActions?.some(a => a.sourceId === user.uid && (a.powerId === 'POTION_SOIN' || a.powerId === 'POTION_POISON'));
                                                    const isPotion = power.id === 'POTION_SOIN' || power.id === 'POTION_POISON';
                                                    const isTemporarilyBlocked = isPotion && usedPotionThisNight && !game.nightActions.some(a => a.powerId === power.id); // L'autre potion est bloquée

                                                    // GML Specific: canGMLKill logic
                                                    let canGMLKill = true;
                                                    let gmlDisableMessage = "Seconde attaque (Carnage)";
                                                    if (power.id === 'GRIFFURE_MORTELLE') {
                                                        const initialWolvesCount = (game.rolesCount?.['LOUP_GAROU'] || 0) +
                                                            (game.rolesCount?.['LOUP_ALPHA'] || 0) +
                                                            (game.rolesCount?.['GRAND_MECHANT_LOUP'] || 0) +
                                                            (game.rolesCount?.['LOUP_INFECT'] || 0);

                                                        let currentWolvesAlive = 0;
                                                        game.players.forEach(p => {
                                                            if (p.isAlive && (p.role === 'LOUP_GAROU' || p.role === 'LOUP_ALPHA' || p.role === 'GRAND_MECHANT_LOUP' || p.role === 'LOUP_INFECT')) {
                                                                currentWolvesAlive++;
                                                            }
                                                        });

                                                        if (initialWolvesCount <= 1) {
                                                            canGMLKill = false;
                                                            gmlDisableMessage = "Carnage bloqué : Vous avez commencé la partie seul.";
                                                        } else if (currentWolvesAlive < initialWolvesCount) {
                                                            canGMLKill = false;
                                                            gmlDisableMessage = "Carnage perdu : Un loup de la meute est mort.";
                                                        }
                                                    }

                                                    // Only show/enable FUSIL during HUNTER_SHOT, others during NIGHT
                                                    const isTimingCorrect = power.id === 'FUSIL'
                                                        ? currentPhase === 'HUNTER_SHOT'
                                                        : (power.timing === 'night' && currentPhase === 'NIGHT');

                                                    // Pyromane Specific:
                                                    let canPyromaneUse = true;
                                                    let pyromaneDisableMessage = "";
                                                    if (mePlayer.role === 'PYROMANE') {
                                                        const hasGasolineAlive = game.players.some(p => p.isAlive && p.effects.includes('gasoline'));
                                                        const usedEssenceTonight = game.nightActions?.some(a => a.sourceId === user?.uid && a.powerId === 'ESSENCE');
                                                        const usedAllumetteTonight = game.nightActions?.some(a => a.sourceId === user?.uid && a.powerId === 'ALLUMETTE');

                                                        if (power.id === 'ALLUMETTE') {
                                                            if (!hasGasolineAlive) {
                                                                canPyromaneUse = false;
                                                                pyromaneDisableMessage = "Personne n'est arrosé !";
                                                            } else if (usedEssenceTonight) {
                                                                canPyromaneUse = false;
                                                                pyromaneDisableMessage = "Vous avez déjà arrosé ce soir";
                                                            }
                                                        } else if (power.id === 'ESSENCE') {
                                                            if (usedAllumetteTonight) {
                                                                canPyromaneUse = false;
                                                                pyromaneDisableMessage = "Incendie déjà amorcé";
                                                            }
                                                        }
                                                    }

                                                    const isPoisonedBlocked = mePlayer?.effects?.includes('poisoned');
                                                    const canUse = !isUsed && !isTemporarilyBlocked && !isPoisonedBlocked && isTimingCorrect && (power.id === 'FUSIL' ? true : mePlayer.isAlive) && canGMLKill && canPyromaneUse;
                                                    const isActive = activePower === power.id;

                                                    // If the power isn't relevant to this moment at all, skip rendering it? 
                                                    // User said "only visible during night", but Hunter shot is special.
                                                    if (!isTimingCorrect && currentPhase !== 'NIGHT') return null;

                                                    return (
                                                        (power.icon != "") ? (
                                                            <div
                                                                key={power.id}
                                                                className={`relative z-[1000] group flex flex-col items-center cursor-pointer transition-all ${!canUse ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-110'}`}
                                                                onClick={() => canUse && handlePowerClick(power.id)}
                                                            >
                                                                <div className={`w-10 h-10 rounded-full border-2 p-1 flex items-center justify-center transition-colors ${isActive ? 'border-[#D1A07A] bg-[#D1A07A]/20 shadow-[0_0_10px_#D1A07A]' : 'border-slate-600 bg-black/20'}`}>
                                                                    <Image src={power.icon} alt={power.label} width={32} height={32} className="object-contain" />
                                                                </div>
                                                                {/* Tooltip or Label */}
                                                                <span className="absolute -bottom-6 w-max bg-black/80 text-white text-[8px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {power.id === 'GRIFFURE_MORTELLE' ? gmlDisableMessage : (mePlayer.role === 'PYROMANE' && pyromaneDisableMessage ? pyromaneDisableMessage : power.label)}
                                                                </span>
                                                                {isActive && (
                                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                                                                )}
                                                            </div>
                                                        ) : ""
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Helper text for Cupidon */}
                                        {activePower === 'COUP_DE_COEUR' && (
                                            <div className="mt-3 text-[#ff69b4] font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-[#ff69b4]/50">
                                                {powerTargets.length === 0 ? "Choisissez le premier amoureux" : "Choisissez le deuxième amoureux"}
                                            </div>
                                        )}

                                        {/* Helper text for Grand Méchant Loup */}
                                        {activePower === 'GRIFFURE_MORTELLE' && (
                                            <div className="mt-3 text-[#7f1d1d] font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-[#7f1d1d]/50">
                                                Choisissez une autre victime à tuer
                                            </div>
                                        )}

                                        {/* Helper text for Loup Infecte */}
                                        {activePower === 'MORSURE_INFECTE' && (
                                            <div className="mt-3 text-red-500 font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-red-500/50">
                                                Cliquez sur la victime des loups pour qu'elle soit infectée
                                            </div>
                                        )}

                                        {/* Helper text for Loup Blanc */}
                                        {currentPhase === 'NIGHT' && mePlayer?.role === 'LOUP_BLANC' && !mePlayer?.effects?.includes('infected') && !activePower && (
                                            <div className="mt-3 text-red-500 font-bold text-xs sm:text-xs animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-red-500/50 text-center">
                                                Votez pour tuer un Loup-Garou. <br /> Si vous ciblez un autre rôle, l'attaque échouera.
                                            </div>
                                        )}

                                        {/* Helper text for Assassin */}
                                        {currentPhase === 'NIGHT' && mePlayer?.role === 'ASSASSIN' && !mePlayer?.effects?.includes('infected') && !activePower && (
                                            <div className="mt-3 text-slate-300 font-bold text-xs sm:text-xs animate-pulse drop-shadow-md bg-black/60 px-3 py-1 rounded-full border border-slate-500/50 text-center">
                                                Votez pour assassiner un joueur. <br /> Votre cible mourra de façon certaine.
                                            </div>
                                        )}

                                        {/* Helper text for Pyromane (Essence) */}
                                        {activePower === 'ESSENCE' && (
                                            <div className="mt-3 text-orange-400 font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-orange-500/50 text-center">
                                                Choisissez un joueur à arroser d'essence
                                            </div>
                                        )}

                                        {/* Helper text for Empoisonneur */}
                                        {activePower === 'POISON_TOXIQUE' && (
                                            <div className="mt-3 text-purple-400 font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-purple-500/50 text-center">
                                                Choisissez un joueur à empoisonner
                                            </div>
                                        )}

                                        {/* Feedback text for Pyromane (Allumette activée) */}
                                        {/* On vérifie si l'action ALLUMETTE est dans les actions de nuit du joueur */}
                                        {currentPhase === 'NIGHT' && mePlayer?.role === 'PYROMANE' && game.nightActions?.some(a => a.sourceId === user?.uid && a.powerId === 'ALLUMETTE') && (
                                            <div className="mt-3 text-red-500 font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/60 px-3 py-1 rounded-full border border-red-500/50 text-center">
                                                Incendie programmé pour cette nuit ! 🔥
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Affichage des Joueurs en Cercle */}
                    {game.players.map((player, index) => (
                        <PlayerCircleNode
                            key={player.id}
                            player={player}
                            index={index}
                            totalPlayers={game.players.length}
                            game={game}
                            currentPhase={currentPhase as Phase}
                            currentUser={user}
                            onVote={handlePlayerClick}
                            getPlayerAvatar={getPlayerAvatar}
                            activePower={activePower}
                            powerTargets={powerTargets}
                            wolfVictimId={game.wolfVictimId}
                            gmlVictimId={game.gmlVictimId}
                            infectedVictimId={game.infectedVictimId}
                            nightActions={game.nightActions}
                        />
                    ))}

                </div>



            </main>

            {/* Pop-up d'information sur le rôle (Plein Écran) */}
            {selectedRole && ROLES[selectedRole] && (
                <RoleInfoModal role={ROLES[selectedRole]!} onClose={() => setSelectedRole(null)} />
            )}

            {/* Modal des Amoureux */}
            {(() => {
                const amILover = game?.lovers?.includes(mePlayer?.id || '');
                if (amILover && !hasSeenLoverModal) {
                    const partnerId = game.lovers?.find((id: string) => id !== mePlayer?.id);
                    // Si Cupidon s'est lié lui-même (p1===p2), partnerId sera undefined ou le même
                    const actualPartnerId = partnerId || mePlayer?.id;
                    const partner = game.players.find((p: any) => p.id === actualPartnerId);

                    if (partner) {
                        const isSameCamp = game?.areLoversSameCamp ?? true;

                        return (
                            <LoversModal
                                isOpen={true}
                                onClose={() => setHasSeenLoverModal(true)}
                                loverName={partner.name}
                                isSameCamp={isSameCamp}
                            />
                        );
                    }
                }
                return null;
            })()}

            {/* Modal Infected */}
            {(() => {
                const amIInfected = mePlayer?.effects?.includes('infected');
                if (amIInfected && !hasSeenInfectedModal) {
                    return (
                        <InfectedModal
                            isOpen={true}
                            onClose={() => setHasSeenInfectedModal(true)}
                        />
                    );
                }
                return null;
            })()}

            {/* Modal Confirmation de départ */}
            {showLeaveConfirm && (
                <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
                    <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-xl max-w-sm text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                        <h2 className="text-2xl font-enchanted tracking-wider text-red-500 mb-4">Quitter le village ?</h2>
                        <p className="text-slate-300 text-sm mb-8">
                            Êtes-vous sûr de vouloir abandonner votre village ?
                            <br /><br />
                            <span className="text-yellow-500 font-bold">Vous serez déconnecté de la partie.</span>
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowLeaveConfirm(false)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded shadow transition-colors flex-1"
                            >
                                Rester
                            </button>
                            <button
                                onClick={confirmLeave}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow transition-colors flex-1 uppercase text-sm tracking-wide"
                            >
                                Quitter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pop-up Modale de FIN DE PARTIE */}
            {gameOverData && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-6 backdrop-blur-md font-montserrat animation-fade-in">
                    <div className="text-center max-w-2xl w-full p-10">
                        <h1 className="text-6xl sm:text-7xl font-enchanted text-[#D1A07A] mb-2 drop-shadow-lg tracking-widest uppercase">Fin de la Partie</h1>

                        <div className="my-8 py-8 border-y-2 border-slate-700/50 bg-slate-900/50 rounded-2xl shadow-2xl">
                            <h2 className={`text-4xl sm:text-5xl font-extrabold tracking-widest mb-4 uppercase drop-shadow-md 
                                ${gameOverData.winner === 'VILLAGEOIS' ? 'text-green-500' :
                                    gameOverData.winner === 'LOUPS' ? 'text-red-500' :
                                        gameOverData.winner === 'AMOUR' ? 'text-[#ff69b4]' :
                                            'text-blue-400'}`}
                            >
                                Victoire {gameOverData.winner === 'VILLAGEOIS' ? 'du Village' : gameOverData.winner === 'LOUPS' ? 'des Loups-Garous' : gameOverData.winner === 'AMOUR' ? 'des Amoureux' : 'en Solo'} !
                            </h2>

                            {gameOverData.winner !== 'VILLAGEOIS' && gameOverData.winner !== 'LOUPS' && gameOverData.winner !== 'AMOUR' && (
                                <p className="text-xl text-slate-300 font-bold mb-6">
                                    Le rôle <span className="text-[#D1A07A] uppercase">{ROLES[gameOverData.winner as RoleId]?.label || gameOverData.winner}</span> a triomphé !
                                </p>
                            )}

                            {gameOverData.winner === 'AMOUR' && (
                                <p className="text-xl text-slate-300 font-bold mb-6">
                                    L'amour triomphe toujours ! Le couple a survécu malgré ses différences.
                                </p>
                            )}

                            <div className="flex flex-wrap justify-center gap-6 mt-8 px-4">
                                {gameOverData.players.map(p => (
                                    <div key={p.id} className="flex flex-col items-center">
                                        <div className="relative w-24 h-24 rounded-full border-4 border-[#D1A07A] shadow-[0_0_15px_rgba(209,160,122,0.4)] overflow-hidden mb-3">
                                            <Image src={getPlayerAvatar(p.id, p.avatarUrl)} alt={p.name} fill className="object-cover" />
                                        </div>
                                        <span className="font-bold text-white text-lg tracking-wide">{p.name}</span>
                                        <span className="text-xs text-[#D1A07A] font-bold uppercase tracking-widest mt-1 bg-black/40 px-2 py-1 rounded">
                                            {ROLES[p.role as RoleId]?.label || p.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="text-slate-400 text-sm mb-8 italic">Le village retombe dans le silence...</p>

                        <button
                            onClick={confirmLeave}
                            className="bg-[#D1A07A] text-slate-900 hover:bg-white text-xl font-extrabold px-10 py-4 rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(209,160,122,0.3)] uppercase tracking-widest"
                        >
                            Quitter le village
                        </button>
                    </div>
                </div>
            )}

            {/* Panneau latéral droit (Inviter des amis) */}
            {isInviteOpen && (
                <div className="absolute top-0 right-0 w-80 h-full bg-white border-l-4 border-slate-800 shadow-2xl z-50 flex flex-col font-montserrat transition-transform animate-in slide-in-from-right">
                    <div className="p-6 bg-[#FCF8E8] border-b-2 border-slate-800 flex justify-between items-center shrink-0">
                        <h3 className="font-enchanted text-3xl font-extrabold text-slate-800 tracking-wide mt-1">Vos Amis</h3>
                        <button onClick={() => setIsInviteOpen(false)} className="text-slate-500 hover:text-slate-800 text-3xl font-bold transition-colors leading-none">&times;</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {(() => {
                            const onlineFriends = friends.filter(f => friendsOnlinePresence[f.id] === true);
                            if (onlineFriends.length === 0) return (
                                <p className="text-center text-slate-500 text-sm font-medium mt-8 italic">Aucun ami en ligne pour le moment.</p>
                            );
                            return onlineFriends.map(friend => {
                                const isInRoom = game.players.some(p => p.id === friend.id);
                                const isInvited = invitedFriends.includes(friend.id);

                                return (
                                    <div key={friend.id} className={`flex items-center justify-between p-3 rounded-xl border-2 shadow-sm transition-shadow ${isInRoom ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-slate-50 border-slate-200 hover:shadow'}`}>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-300 flex-shrink-0">
                                                <Image src={friend.photoURL || "/assets/images/icones/Photo_Profil-transparent.png"} alt={friend.pseudo || "Ami"} fill className="object-cover" />
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm truncate">{friend.pseudo || "Joueur"}</span>
                                        </div>
                                        {isInRoom ? (
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">
                                                Rejoint
                                            </span>
                                        ) : isInvited ? (
                                            <span className="text-[10px] text-amber-600 bg-amber-100 font-bold px-2 py-1.5 rounded-lg uppercase tracking-wider">
                                                En attente
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleInviteFriend(friend.id, friend.pseudo || "Joueur")}
                                                className="bg-[#D1A07A] hover:bg-[#b08465] text-dark font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                                            >
                                                Inviter
                                            </button>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}

            {/* Panneau latéral droit (Liste des Joueurs) */}
            {isPlayersListOpen && (
                <div className="absolute top-0 right-0 w-80 h-full bg-white border-l-4 border-slate-800 shadow-2xl z-50 flex flex-col font-montserrat transition-transform animate-in slide-in-from-right">
                    <div className="p-6 bg-[#FCF8E8] border-b-2 border-slate-800 flex justify-between items-center shrink-0">
                        <h3 className="font-enchanted text-3xl font-extrabold text-slate-800 tracking-wide mt-1">Joueurs ({game.players.length})</h3>
                        <button onClick={() => setIsPlayersListOpen(false)} className="text-slate-500 hover:text-slate-800 text-3xl font-bold transition-colors leading-none">&times;</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {game.players.map((player, index) => (
                            <div key={player.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border-2 border-slate-200 shadow-sm relative">
                                <span className="font-extrabold text-[#D1A07A] font-sans text-lg w-6 text-center shrink-0">#{index + 1}</span>
                                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-300 flex-shrink-0">
                                    <Image src={getPlayerAvatar(player.id, player.avatarUrl)} alt={player.name} fill className="object-cover" />
                                </div>
                                <div className="flex flex-col justify-center overflow-hidden flex-1">
                                    <span className="font-bold text-slate-700 text-sm truncate">{player.name}</span>
                                    {player.id === game.hostId ? (
                                        <span className="text-[10px] text-amber-700 font-extrabold uppercase tracking-widest mt-0.5">Hôte</span>
                                    ) : player.id === user.uid ? (
                                        <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest mt-0.5">Vous</span>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- MODAL POTION DE VIE --- */}
            {witchHealTarget && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4 font-montserrat" onClick={() => { setWitchHealTarget(null); setActivePower(null); }}>
                    <div className="bg-[#2C3338] text-white max-w-sm w-full rounded-2xl p-6 border-2 border-[#D1A07A] shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-enchanted font-extrabold text-[#D1A07A] mb-4">Potion de Vie</h3>
                        <p className="text-sm text-slate-300 mb-6">
                            Voulez-vous vraiment sauver <span className="font-bold text-white">{game?.players.find(p => p.id === witchHealTarget)?.name}</span> de la mort ciblée par les loups ?
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => { setWitchHealTarget(null); setActivePower(null); }}
                                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors text-sm font-bold"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => {
                                    socket?.emit('use_power', { powerId: 'POTION_SOIN', targetId: witchHealTarget });
                                    setWitchHealTarget(null);
                                    setActivePower(null);
                                    setPowerTargets([]);
                                }}
                                className="px-4 py-2 rounded-lg bg-[#D1A07A] text-dark hover:bg-[#b08465] transition-colors text-sm font-extrabold"
                            >
                                Oui, Sauver
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL POTION DE MORT --- */}
            {witchPoisonTarget && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4 font-montserrat" onClick={() => { setWitchPoisonTarget(null); setActivePower(null); }}>
                    <div className="bg-[#2C3338] text-white max-w-sm w-full rounded-2xl p-6 border-2 border-purple-500 shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-enchanted font-extrabold text-purple-400 mb-4">Potion de Mort</h3>
                        <p className="text-sm text-slate-300 mb-6">
                            Voulez-vous vraiment empoisonner <span className="font-bold text-white">{game?.players.find(p => p.id === witchPoisonTarget)?.name}</span> ? Cette action est irréversible.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => { setWitchPoisonTarget(null); setActivePower(null); }}
                                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors text-sm font-bold"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => {
                                    socket?.emit('use_power', { powerId: 'POTION_POISON', targetId: witchPoisonTarget });
                                    setWitchPoisonTarget(null);
                                    setActivePower(null);
                                    setPowerTargets([]);
                                }}
                                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors text-sm font-extrabold"
                            >
                                Oui, Empoisonner
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- MODAL ALLUMETTE (Pyromane) --- */}
            {showAllumetteConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4 font-montserrat" onClick={() => setShowAllumetteConfirm(false)}>
                    <div className="bg-[#2C3338] text-white max-w-sm w-full rounded-2xl p-6 border-2 border-orange-500 shadow-[0_0_30px_rgba(255,165,0,0.3)] relative text-center flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <div className="relative w-12 h-12 mb-4 animate-pulse duration-700 drop-shadow-lg">
                            <Image src="/assets/images/icones/powers/feu.png" alt="Feu" fill className="object-contain" />
                        </div>
                        <h3 className="text-2xl font-enchanted font-extrabold text-orange-400 mb-4 tracking-wider">Briser les Cendres</h3>
                        <p className="text-sm text-slate-300 mb-6">
                            Voulez-vous vraiment déclencher l'incendie général ?<br />
                            <span className="font-bold text-orange-400">Tous les joueurs aspergés d'essence mourront simultanément.</span>
                        </p>
                        <div className="flex justify-center gap-4 mt-2">
                            <button
                                onClick={() => setShowAllumetteConfirm(false)}
                                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors text-sm font-bold"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmAllumette}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.5)] text-sm font-extrabold flex items-center gap-2"
                            >
                                TOUT BRÛLER
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
