'use client';

import Image from 'next/image';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { GameState, ServerToClientEvents, ClientToServerEvents, Player } from '@/types/game';
import { ROLES, RoleId, PowerId, isInWolfCamp } from "@/types/roles";
import { distributeRoles, distributeCustomRoles } from '@/lib/roleDistribution';
import { doc, getDoc, setDoc, deleteDoc, collection, query, onSnapshot, addDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import RoleInfoModal from '@/components/room/edit/RoleInfoModal';
import EndGame from '../../../components/game/EndGame';
import { GameProvider } from '@/contexts/GameContext';
import ActiveGame from '../../../components/game/ActiveGame';
import LoadingScreen from '@/components/room/LoadingScreen';
import LoversModal from '@/components/game/LoversModal';
import InfectedModal from '@/components/game/InfectedModal';
import VoiceChatManager from '@/components/room/VoiceChatManager';
import PhaseTransitionOverlay from '@/components/game/PhaseTransitionOverlay';

import { useGameAudio } from '@/hooks/useGameAudio';
import { gameFingerprint } from '@/lib/gameFingerprint';
import { filterChatMessages, windowChatMessages, CHAT_WINDOW_SIZE } from '@/lib/chatWindowing';
import { useVisibilityReconnect } from '@/hooks/useVisibilityReconnect';
import type { GroupConfig } from '@/types/group';

export default function RoomPage() {
    const params = useParams();
    const roomCode = params.code as string;
    const router = useRouter();

    const { user: authUser, userData: authUserData, loading: authLoading } = useAuth();
    const toast = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [game, setGame] = useState<GameState | null>(null);
    const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
    const [rolesConfig, setRolesConfig] = useState<Partial<Record<RoleId, number>> | null>(null);
    const [groupConfig, setGroupConfig] = useState<GroupConfig | null>(null);
    const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [activeChatTab, setActiveChatTab] = useState<'day' | 'night'>('day');
    const [activePower, setActivePower] = useState<string | null>(null);
    const [ambianceVolume, setAmbianceVolume] = useState<number>(25);
    const [powerTargets, setPowerTargets] = useState<string[]>([]);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatScrollContainerRef = useRef<HTMLDivElement>(null);
    const [isChatAutoScrollEnabled, setIsChatAutoScrollEnabled] = useState(true);
    // Ref pour lire la longueur du chat sans closure stale dans les handlers socket
    const chatMessagesCountRef = useRef(0);

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
        chatType: 'day' | 'night' | 'system' | 'lover' | 'highlighted' | 'poisoned';
    }

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");


    const mePlayer = useMemo(() => {
        if (!user || !game?.players) return null;
        const p = game.players.find(p => p.id === user.uid) || null;
        return p;
    }, [user, game?.players]);

    // Garder le ref de longueur à jour pour les handlers socket
    useEffect(() => {
        chatMessagesCountRef.current = chatMessages.length;
    }, [chatMessages]);

    // Auto-scroll effect
    useEffect(() => {
        if (isChatAutoScrollEnabled) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, activeChatTab, isChatAutoScrollEnabled]);

    // Invitations State
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isPlayersListOpen, setIsPlayersListOpen] = useState(false);
    const [friends, setFriends] = useState<{ id: string; [key: string]: unknown }[]>([]);
    const [invitedFriends, setInvitedFriends] = useState<string[]>([]);
    const [friendsOnlinePresence, setFriendsOnlinePresence] = useState<Record<string, boolean>>({});

    // UI State
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [gameOverData, setGameOverData] = useState<{ winner: string; players: Player[]; nextRoomCode?: string } | null>(null);
    const [nextRoomCode, setNextRoomCode] = useState<string | null>(null);
    const [hasSeenLoverModal, setHasSeenLoverModal] = useState(false);
    const [hasSeenInfectedModal, setHasSeenInfectedModal] = useState(false);
    const [showAllumetteConfirm, setShowAllumetteConfirm] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);

    // Voice Chat State
    const [isMicroOn, setIsMicroOn] = useState(true);
    const [isHeadphonesOn, setIsHeadphonesOn] = useState(true);
    const [micSensitivity, setMicSensitivity] = useState(70); // 0-100
    const [outputVolume, setOutputVolume] = useState(100);    // 0-100
    const [showSettings, setShowSettings] = useState(false);
    const [speakingPlayers, setSpeakingPlayers] = useState<Set<string>>(new Set());

    const [isValidatingRoom, setIsValidatingRoom] = useState(true);
    const [micPermissionGranted, setMicPermissionGranted] = useState(false);

    // Idle Warning State
    const [showLobbyWarning, setShowLobbyWarning] = useState(false);
    const [showPlayerIdleWarning, setShowPlayerIdleWarning] = useState(false);

    // Audio System
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isMuted: _isMuted, setIsMuted: _setIsMuted, playOneShot } = useGameAudio(game, user?.uid, socket as unknown as { on: (event: string, handler: (payload: unknown) => void) => void; off: (event: string, handler: (payload: unknown) => void) => void } | null, activePower, ambianceVolume);

    // --- SORCIÈRE MODALS ---
    const [witchHealTarget, setWitchHealTarget] = useState<string | null>(null);
    const [witchPoisonTarget, setWitchPoisonTarget] = useState<string | null>(null);

    // Photo de profil lue depuis Firestore (pour les comptes email/password sans photoURL dans Firebase Auth)
    // undefined = fetch pas encore fait, null = fetch fait mais aucune photo, string = URL de la photo
    const [firestorePhotoURL, setFirestorePhotoURL] = useState<string | null | undefined>(undefined);
    // Photos des joueurs lues depuis Firestore users/{uid} (pour les comptes email/password avec Base64)
    const [playerAvatars, setPlayerAvatars] = useState<Record<string, string>>({});
    // Ref pour éviter les doublons de fetch sans closure stale (ne dépend pas du cycle React)
    const fetchedAvatarIdsRef = useRef<Set<string>>(new Set());

    // 1. Synchroniser l'utilisateur depuis le context (pas de listener Firebase séparé)
    useEffect(() => {
        if (authLoading) return;
        if (!authUser) {
            router.push('/');
            return;
        }
        setUser(authUser);
        // photoURL vient directement du userData du context — plus de getDoc bloquant
        setFirestorePhotoURL((authUserData?.photoURL as string | null | undefined) ?? null);
    }, [authUser, authUserData, authLoading, router]);

    /** Ne jamais envoyer une photo Base64 via socket — trop lourde. On passe undefined à la place. */
    const getSafeAvatarUrl = (url: string | null | undefined) => {
        if (!url || url.startsWith('data:')) return undefined;
        return url;
    };

    // Charge les avatars uniquement quand la liste des joueurs change (nouveaux IDs)
    // On utilise une clé stable (IDs triés) pour éviter que la référence game.players
    // (nouvelle à chaque update_game) déclenche un re-fetch toutes les secondes.
    const playerIdsKey = useMemo(
        () => game?.players?.map(p => p.id).sort().join(',') ?? '',
        [game?.players]
    );

    useEffect(() => {
        if (!game?.players) return;
        const toFetch = game.players.filter(p => !fetchedAvatarIdsRef.current.has(p.id));
        if (toFetch.length === 0) return;

        toFetch.forEach(async (p) => {
            // Marquer immédiatement pour éviter les appels concurrents sur le même ID
            fetchedAvatarIdsRef.current.add(p.id);
            try {
                const snap = await getDoc(doc(db, "users", p.id));
                if (snap.exists()) {
                    setPlayerAvatars(prev => ({ ...prev, [p.id]: snap.data().photoURL || '' }));
                } else {
                    setPlayerAvatars(prev => ({ ...prev, [p.id]: '' }));
                }
            } catch (e) {
                // Permettre un retry en cas d'erreur réseau
                fetchedAvatarIdsRef.current.delete(p.id);
                console.error("Erreur avatar fetch", e);
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerIdsKey]); // Ne se déclenche que quand des joueurs rejoignent/quittent

    /** Retourne la meilleure photo disponible pour un uid donné */
    const getPlayerAvatar = (playerId: string, fallbackUrl?: string) =>
        playerAvatars[playerId] || fallbackUrl || "/assets/images/icones/Photo_Profil-transparent.png";

    // 2. Valider le salon dans Firestore AVANT de lancer la connexion Socket
    useEffect(() => {
        if (!user || !roomCode) return;

        const validateRoom = async () => {
            try {
                const groupDoc = await getDoc(doc(db, "groups", roomCode as string));
                if (!groupDoc.exists()) {
                    toast.error("Ce salon n'existe plus ou a été fermé.");
                    router.push('/play');
                    return;
                }

                const data = groupDoc.data();
                const isUserInGroup = data.players?.some((p: { uid: string }) => p.uid === user.uid);

                if (data.phase === 'GAME_OVER' && !isUserInGroup) {
                    toast.warning("Cette partie est terminée. Impossible de la rejoindre en cours.");
                    router.push('/play');
                    return;
                }

                setIsValidatingRoom(false);
            } catch (error) {
                console.error("Erreur de validation du salon:", error);
                setIsValidatingRoom(false); // Faute de mieux, on laisse passer si c'est une erreur réseau
            }
        };

        validateRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, roomCode, router]);

    // 3. Se connecter au Serveur de Jeu (Socket.io)
    useEffect(() => {
        if (!user || !roomCode) return;
        if (firestorePhotoURL === undefined || isValidatingRoom) return;
        if (!groupConfig) return; // Wait until config is loaded
        if (groupConfig.isMicro && !micPermissionGranted) return; // Wait for mic permission

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
        let baseUrl = socketUrl || (typeof window !== 'undefined' ? window.location.origin : '');
        if (!socketUrl && baseUrl.includes('localhost')) {
            baseUrl = 'http://localhost:3001';
        }
        baseUrl = baseUrl.replace(/\/$/, '');
        console.log("Connecting to socket at:", baseUrl);

        const newSocket = io(baseUrl, {
            query: {
                roomCode,
                userId: user.uid,
                username: user.displayName || user.email?.split('@')[0] || "Anonyme",
                avatarUrl: getSafeAvatarUrl(user.photoURL || firestorePhotoURL) || "/assets/images/icones/Photo_Profil-transparent.png",
                type: 'room' // Add type to identify as room connection
            }
        });

        // Écouter les mises à jour du jeu
        newSocket.on('update_game', (newState) => {
            setGame(prev => {
                if (!prev) return newState;
                // Perf : si seul le timer a changé, on réutilise les références existantes
                // pour que React.memo sur PlayerCircleNode puisse bailout par === comparison.
                if (gameFingerprint(prev) === gameFingerprint(newState)) {
                    return { ...prev, timer: newState.timer };
                }
                return newState;
            });
            // Synchroniser le chat UNIQUEMENT si le serveur a plus de messages que le client
            // (cas de première connexion ou reconnexion). Les mises à jour incrémentales
            // arrivent via 'chat_message' — écraser à chaque seconde causerait des re-renders massifs.
            if (newState.chatMessages && newState.chatMessages.length > chatMessagesCountRef.current) {
                setChatMessages(newState.chatMessages);
            }
        });

        newSocket.on('game_over', async (payload) => {
            setGameOverData(payload);
            setIsMicroOn(true);

            // Stocker le code du prochain salon pour le bouton "Rejouer"
            if (payload.nextRoomCode) {
                setNextRoomCode(payload.nextRoomCode);
            }

            // L'hôte crée le prochain salon en Firestore (mêmes paramètres, players: [])
            if (groupConfig?.hostId === user?.uid && payload.nextRoomCode) {
                try {
                    const currentRoomDoc = await getDoc(doc(db, "groups", roomCode as string));
                    if (currentRoomDoc.exists()) {
                        const d = currentRoomDoc.data();
                        await setDoc(doc(db, "groups", payload.nextRoomCode), {
                            name: d.name || 'Village',
                            mode: d.isCustom ? 'Personnalisé' : 'Classique',
                            isPrivate: d.isPrivate || false,
                            isMicro: d.isMicro || false,
                            isMayorEnabled: d.isMayorEnabled !== false,
                            maxPlayers: d.maxPlayers || 16,
                            rolesCount: d.rolesCount || {},
                            isCustom: d.isCustom || false,
                            isVillage: true,
                            hostId: user?.uid,
                            hostPseudo: authUserData?.pseudo || user?.displayName || 'Joueur',
                            hostPhoto: getSafeAvatarUrl(user?.photoURL || firestorePhotoURL) || '',
                            isConfigured: true,
                            players: [],  // Vide → invisible dans /play jusqu'au 1er joueur
                            gameStarted: false,
                            secretCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                            createdAt: new Date().toISOString(),
                        });
                    }
                } catch (e) {
                    console.warn("Could not create next room", e);
                }
            }

            // --- FIREBASE STATS UPDATE ---
            if (!user) return;
            const myPlayerObj = payload.players.find((p: { id: string }) => p.id === user.uid);
            if (!myPlayerObj) return;

            // Simple check to determine if the user won
            let hasWon = false;
            const myRole = ROLES[myPlayerObj.role as RoleId];
            if (payload.winner === 'VILLAGEOIS' && myRole?.camp === 'VILLAGE') hasWon = true;
            if (payload.winner === 'LOUPS' && (myRole?.camp === 'LOUPS' || myPlayerObj.effects?.includes('infected'))) hasWon = true;
            if (payload.winner === 'AMOUR' && myPlayerObj.effects?.includes('lover')) hasWon = true;
            if (payload.winner === myPlayerObj.role) hasWon = true; // Solo win

            try {
                // Update my own stats
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const currentData = userSnap.data();
                    const s = currentData.stats || {
                        wins: 0, losses: 0, gamesPlayed: 0,
                        kills: 0, saves: 0, powerUses: 0, daysSurvived: 0, points: 0,
                        fled: 0, villageWins: 0, villageLosses: 0,
                        werewolfWins: 0, werewolfLosses: 0,
                        soloWins: 0, soloLosses: 0
                    };

                    // Determine camp
                    const isVillage = myRole?.camp === 'VILLAGE' && !myPlayerObj.effects?.includes('infected');
                    const isWolf = myRole?.camp === 'LOUPS' || myPlayerObj.effects?.includes('infected');

                    const updates: Record<string, unknown> = {
                        "stats.wins": (s.wins || 0) + (hasWon ? 1 : 0),
                        "stats.losses": (s.losses || 0) + (!hasWon ? 1 : 0),
                        "stats.gamesPlayed": (s.gamesPlayed || 0) + 1,
                        "stats.kills": (s.kills || 0) + (myPlayerObj.stats?.kills || 0),
                        "stats.saves": (s.saves || 0) + (myPlayerObj.stats?.saves || 0),
                        "stats.powerUses": (s.powerUses || 0) + (myPlayerObj.stats?.powerUses || 0),
                        "stats.daysSurvived": (s.daysSurvived || 0) + (myPlayerObj.stats?.daysSurvived || 0),
                        "stats.points": (s.points || 0) + (myPlayerObj.stats?.points || 0),
                    };

                    if (isVillage) {
                        if (hasWon) updates["stats.villageWins"] = (s.villageWins || 0) + 1;
                        else updates["stats.villageLosses"] = (s.villageLosses || 0) + 1;
                    } else if (isWolf) {
                        if (hasWon) updates["stats.werewolfWins"] = (s.werewolfWins || 0) + 1;
                        else updates["stats.werewolfLosses"] = (s.werewolfLosses || 0) + 1;
                    } else {
                        if (hasWon) updates["stats.soloWins"] = (s.soloWins || 0) + 1;
                        else updates["stats.soloLosses"] = (s.soloLosses || 0) + 1;
                    }

                    // Stats par rôle (pour les statistiques enrichies du profil)
                    if (myPlayerObj.role) {
                        const roleId = myPlayerObj.role as string;
                        const prevRole = (currentData.stats?.roles?.[roleId]) || { wins: 0, losses: 0 };
                        updates[`stats.roles.${roleId}.wins`] = (prevRole.wins || 0) + (hasWon ? 1 : 0);
                        updates[`stats.roles.${roleId}.losses`] = (prevRole.losses || 0) + (!hasWon ? 1 : 0);
                    }

                    await updateDoc(userRef, updates);

                    // Historique de parties — enregistre cette partie dans la sous-collection
                    try {
                        const myRoleDef = ROLES[myPlayerObj.role as RoleId];
                        await addDoc(collection(db, "users", user.uid, "gameHistory"), {
                            roleId: myPlayerObj.role || null,
                            roleLabel: myRoleDef?.label || myPlayerObj.role || 'Inconnu',
                            roleImage: myRoleDef?.image || null,
                            roleCamp: myPlayerObj.effects?.includes('infected') ? 'LOUPS' : (myRoleDef?.camp || 'VILLAGE'),
                            hasWon,
                            winner: payload.winner,
                            points: myPlayerObj.stats?.points || 0,
                            kills: myPlayerObj.stats?.kills || 0,
                            saves: myPlayerObj.stats?.saves || 0,
                            daysSurvived: myPlayerObj.stats?.daysSurvived || 0,
                            playerCount: payload.players.length,
                            playedAt: new Date().toISOString(),
                        });
                    } catch (histErr) {
                        console.warn('[History] Impossible de sauvegarder l\'historique:', histErr);
                    }
                }

                // Si je suis l'hôte, pénaliser les joueurs qui ont fui
                const isHost = groupConfig?.hostId === user.uid;
                if (isHost && payload.disconnectedPlayers && payload.disconnectedPlayers.length > 0) {
                    for (const dPlayer of payload.disconnectedPlayers) {
                        const dUserRef = doc(db, "users", dPlayer.id);
                        // increment() est atomique côté Firestore — pas de getDoc, pas de race condition
                        await updateDoc(dUserRef, {
                            "stats.fled":   increment(1),
                            "stats.points": increment(-2)
                        }).catch(e => console.warn(`Impossible d'appliquer la pénalité à ${dPlayer.name}`, e));
                    }
                }
            } catch (err) {
                console.error("Erreur lors de la mise à jour des stats de fin de partie:", err);
            }
        });

        newSocket.on('chat_message', (msg) => {
            setChatMessages(prev => [...prev, msg]);
        });

        newSocket.on('room_shutdown', async (reason) => {
            toast.warning(reason);
            // Tous les joueurs tentent la suppression côté client (idempotent — le 1er gagne)
            deleteDoc(doc(db, "groups", roomCode as string))
                .catch(() => {}); // Ignore si déjà supprimée
            router.push('/play');
        });

        newSocket.on('lobby_idle_warning', () => {
            setShowLobbyWarning(true);
        });

        newSocket.on('player_idle_warning', () => {
            setShowPlayerIdleWarning(true);
        });

        // Rejoindre la salle à la connexion initiale ET à chaque reconnexion automatique.
        // Socket.io v4 : 'connect' se déclenche sur la connexion initiale ET après chaque reconnect.
        // On fusionne tout ici pour éviter le double join_game (l'ancien handler 'reconnect'
        // émettait join_game une deuxième fois sur reconnect).
        newSocket.on('connect', () => {
            setSocketConnected(true);
            newSocket.emit('join_game', {
                roomCode,
                userId: user.uid,
                username: user.displayName || user.email?.split('@')[0] || "Anonyme",
                avatarUrl: getSafeAvatarUrl(user.photoURL || firestorePhotoURL)
            });
        });

        newSocket.on('disconnect', () => setSocketConnected(false));

        setSocket(newSocket);

        // Nettoyage quand on quitte la page
        return () => {
            newSocket.disconnect();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, roomCode, firestorePhotoURL, isValidatingRoom, groupConfig?.isMicro, micPermissionGranted]);

    // Bug #3 — Page Visibility API
    // Sur iOS/mobiles, les onglets mis en arrière-plan peuvent voir le WebSocket se couper.
    // Quand l'onglet revient au premier plan : si le socket est déconnecté, on force la reconnexion ;
    // s'il est connecté, on envoie un ping pour signaler qu'on est toujours là.
    // Bug #3 — iOS timer drift fix: reconnect socket when tab becomes visible again
    useVisibilityReconnect(socket);

    // Track user activity to prevent idle kick
    useEffect(() => {
        if (!socket) return;

        let lastPing = Date.now();
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastPing > 30000) { // Send activity ping max once every 30 seconds
                socket.emit('ping_activity');
                lastPing = now;
            }
        };

        const activityEvents = ['mousemove', 'keydown', 'touchstart', 'click'];
        activityEvents.forEach(event => window.addEventListener(event, handleActivity));

        // Initial ping
        socket.emit('ping_activity');

        return () => {
            activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [socket]);

    // 4. Récupérer la configuration de la room depuis Firestore The Lobby (En temps réel)
    useEffect(() => {
        if (!roomCode || isValidatingRoom) return;
        const unsubscribe = onSnapshot(doc(db, "groups", roomCode), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setGroupConfig(data as GroupConfig);
                if (data.rolesCount) {
                    setRolesConfig(data.rolesCount);
                }
            }
        }, (err) => {
            console.error("Erreur lors de la récupération de la configuration du village:", err);
        });

        return () => unsubscribe();
    }, [roomCode, isValidatingRoom]);

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
    const friendsIdsString = useMemo(() => {
        return friends.map(f => f.id).sort().join(',');
    }, [friends]);

    useEffect(() => {
        if (!friendsIdsString) return;
        const friendsIds = friendsIdsString.split(',');
        const rtdb = getDatabase();
        const unsubscribers: (() => void)[] = [];

        friendsIds.forEach(id => {
            const presenceRef = ref(rtdb, `status/${id}`);
            const unsub = onValue(presenceRef, (snapshot) => {
                const data = snapshot.val();
                const isOnline = data && data.state === 'online';
                setFriendsOnlinePresence(prev => ({ ...prev, [id]: isOnline }));
            });
            unsubscribers.push(unsub);
        });

        return () => unsubscribers.forEach(u => u());
    }, [friendsIdsString]);

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

        // Inform the game server that we are leaving this room now
        if (socket) {
            socket.emit("leave_game");
        }

        if (user && roomCode) {
            try {
                // Remove player from group in DB before leaving
                const groupRef = doc(db, "groups", roomCode);
                const groupSnap = await getDoc(groupRef);

                if (groupSnap.exists()) {
                    const groupData = groupSnap.data();
                    if (groupData.players && groupData.players.length <= 1) {
                        await deleteDoc(groupRef);
                    } else {
                        const updatedPlayers = groupData.players.filter((p: { uid: string }) => p.uid !== user.uid);
                        await updateDoc(groupRef, { players: updatedPlayers });
                    }
                }

                // Restaurer le groupe social si possible, sinon effacer
                const socialGroupId = (authUserData?.socialGroupId as string | undefined) || null;
                await updateDoc(doc(db, "users", user.uid), {
                    currentGroupId: socialGroupId
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

    // ─── Perf #5 : Chat windowing ────────────────────────────────────────────────
    // Délègue le filtrage et la troncature aux fonctions pures de lib/chatWindowing.
    // Encapsulées dans useMemo : recalcul seulement si les données changent, pas à chaque tick.
    const [showAllMessages, setShowAllMessages] = useState(false);

    const filteredChatMessages = useMemo(
        () => filterChatMessages(chatMessages, activeChatTab, mePlayer?.role, user?.uid, r => isInWolfCamp(r as RoleId)),
        [chatMessages, activeChatTab, mePlayer?.role, user?.uid]
    );

    const { displayed: displayedMessages, hiddenCount: hiddenMessageCount } = useMemo(
        () => windowChatMessages(filteredChatMessages, CHAT_WINDOW_SIZE, showAllMessages),
        [filteredChatMessages, showAllMessages]
    );

    // Réinitialiser "tout afficher" quand l'utilisateur change d'onglet jour/nuit
    useEffect(() => { setShowAllMessages(false); }, [activeChatTab]);

    // ⚠️ BLOCKER 1 : Configuration du salon en cours de chargement
    if (!groupConfig) {
        return <LoadingScreen roomCode={roomCode} />;
    }

    // ⚠️ BLOCKER 2 : Permission Micro Requise
    if (groupConfig.isMicro && !micPermissionGranted && !isValidatingRoom) {
        return (
            <div className="h-screen w-screen bg-primary flex flex-col items-center justify-center p-4 text-center z-[9999]">
                <h1 className="text-secondary font-enchanted text-5xl mb-6">Chat Vocal Activé</h1>
                <p className="text-dark/70 font-montserrat mb-8 max-w-md bg-white p-4 rounded-lg shadow-md border-2 border-dark/10 text-sm">
                    Pour rejoindre ce village, nous devons activer votre microphone. Le navigateur vous demandera l{"'"}autorisation.
                </p>
                <button
                    onClick={async () => {
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            stream.getTracks().forEach(t => t.stop());
                            setMicPermissionGranted(true);
                        } catch {
                            toast.error("Le microphone est nécessaire pour ce salon.");
                            setMicPermissionGranted(true);
                        }
                    }}
                    className="bg-secondary text-primary px-8 py-3 rounded-xl font-bold font-montserrat shadow-lg hover:bg-black hover:text-white transition-all transform hover:scale-105"
                >
                    Autoriser et Rejoindre
                </button>
            </div>
        );
    }

    // ⚠️ BLOCKER 3 : Chargement du jeu via Socket
    if (!user || !game) {
        return <LoadingScreen roomCode={roomCode} />;
    }

    // Source affichée dans la grille : dynamique en LOBBY, rôles distribués sinon
    const displayedRolesConfig = game.phase === 'LOBBY'
        ? dynamicRolesConfig
        : (game.rolesCount || gameRolesConfig);

    const isHost = game.hostId === user.uid;

    // Mode spectateur : l'utilisateur regarde sans être un joueur de la partie.
    // Le serveur ne l'a pas ajouté à game.players car la partie était déjà commencée.
    const isSpectator = game.phase !== 'LOBBY' && !game.players.find(p => p.id === user.uid);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !socket || !user || !game) return;

        const me = game.players.find(p => p.id === user.uid);
        if (me && !me.isAlive) return; // Un mort ne parle plus (sauf ongle système peut-être plus tard, mais simplifions)

        socket.emit('chat_message', {
            senderId: user.uid,
            senderName: user.displayName || user.email?.split('@')[0] || "Anonyme",
            text: chatInput,
            time: Date.now(),
            chatType: activeChatTab
        }, () => {
        });
        setIsChatAutoScrollEnabled(true);
        setChatInput("");
    };

    const copyInviteLink = () => {
        const link = `${window.location.origin}/room/${roomCode}`;
        navigator.clipboard.writeText(link);
        toast.success("Lien copié !");
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _copySecretCode = () => {
        if (!game?.secretCode) return;
        navigator.clipboard.writeText(game.secretCode);
        toast.success("Code secret copié !");
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
            toast.success(`Invitation envoyée à ${friendPseudo} !`);
        } catch (error) {
            console.error("Error sending invite", error);
            toast.error("Erreur lors de l'envoi de l'invitation.");
        }
    };

    const handleReplay = async () => {
        if (!nextRoomCode || !user) {
            router.push('/play');
            return;
        }

        const playerEntry = {
            uid: user.uid,
            pseudo: authUserData?.pseudo || user.displayName || 'Joueur',
            photoURL: getSafeAvatarUrl(user.photoURL || firestorePhotoURL) || '',
        };

        try {
            const nextRoomRef = doc(db, "groups", nextRoomCode);
            const nextRoomSnap = await getDoc(nextRoomRef);

            if (nextRoomSnap.exists()) {
                // Document déjà créé par l'hôte — se contente d'ajouter le joueur
                await updateDoc(nextRoomRef, { players: arrayUnion(playerEntry) });
            } else {
                // L'hôte n'a pas encore créé le doc (réseau lent, onglet fermé…)
                // On le crée nous-mêmes avec les mêmes paramètres que la partie qui vient de se terminer
                await setDoc(nextRoomRef, {
                    id: nextRoomCode,
                    name: groupConfig?.name || 'Village',
                    mode: groupConfig?.isCustom ? 'Personnalisé' : 'Classique',
                    isPrivate: groupConfig?.isPrivate || false,
                    isMicro: groupConfig?.isMicro !== false,
                    isMayorEnabled: groupConfig?.isMayorEnabled !== false,
                    maxPlayers: groupConfig?.maxPlayers || 16,
                    rolesCount: groupConfig?.rolesCount || {},
                    isCustom: groupConfig?.isCustom || false,
                    isVillage: true,
                    hostId: user.uid,
                    hostPseudo: playerEntry.pseudo,
                    hostPhoto: playerEntry.photoURL,
                    isConfigured: true,
                    players: [playerEntry],
                    gameStarted: false,
                    secretCode: nextRoomCode,
                    createdAt: new Date().toISOString(),
                });
            }
        } catch (e) {
            console.warn("handleReplay Firestore error", e);
            // On tente quand même la navigation — la room Socket.io existe déjà côté serveur
        }

        // Supprimer l'ancienne room côté Firestore (nettoyage immédiat, sans attendre room_shutdown)
        deleteDoc(doc(db, "groups", roomCode as string)).catch(() => {});

        router.push(`/room/${nextRoomCode}`);
    };

    const confirmAllumette = () => {
        socket?.emit('use_power', { powerId: 'ALLUMETTE' });
        setShowAllumetteConfirm(false);
    };

    const handlePowerClick = (powerId: string) => {
        if (isSpectator) return;
        if (powerId === 'ALLUMETTE') {
            setShowAllumetteConfirm(true);
            return;
        }

        // POTION_SOIN : sauvegarde aveugle, déclenche directement la modal de confirmation
        if (powerId === 'POTION_SOIN') {
            if (!game?.wolfVictimId) {
                toast.info("Personne n'est ciblé cette nuit.");
                return;
            }
            setWitchHealTarget('blind');
            return;
        }

        // MORSURE_INFECTE : auto-cible la victime des loups, toggle on/off
        if (powerId === 'MORSURE_INFECTE') {
            if (!game?.wolfVictimId) {
                toast.info("Aucune victime à infecter cette nuit.");
                return;
            }
            socket?.emit('use_power', { powerId: 'MORSURE_INFECTE' });
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
        if (isSpectator) return; // spectateurs ne peuvent pas voter
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
            // La sorcière sauve à l'aveugle — pas besoin de cibler un joueur spécifique
            // Le serveur applique la potion automatiquement sur la victime des loups
            if (!game.wolfVictimId) {
                toast.info("Personne n'est ciblé cette nuit.");
                return;
            }
            setWitchHealTarget('blind'); // Signal "sauvegarde aveugle"
        } else if (activePower === 'POTION_POISON') {
            if (me && playerId === me.id) {
                toast.warning("Vous ne pouvez pas vous empoisonner vous-même.");
                return;
            }
            setWitchPoisonTarget(playerId);
        } else if (activePower === 'ESSENCE') {
            const targetPlayer = game.players.find(p => p.id === playerId);
            if (me && playerId === me.id) {
                // Not ideal but matches the current codebase style
                toast.warning("Vous ne pouvez pas vous arroser vous-même !");
                return;
            }
            if (targetPlayer && targetPlayer.effects.includes('gasoline')) {
                toast.warning("Ce joueur est déjà aspergé d'essence !");
                return;
            }
            socket?.emit('use_power', { powerId: activePower as PowerId, targetId: playerId });
            setActivePower(null);
            setPowerTargets([]);
        } else if (activePower === 'POISON_TOXIQUE') {
            if (me && playerId === me.id) {
                toast.warning("Vous ne pouvez pas vous empoisonner vous-même !");
                return;
            }
            if (playerId === game.lastPoisonedId) {
                toast.warning("Vous ne pouvez pas empoisonner le même joueur deux nuits de suite !");
                return;
            }
            socket?.emit('use_power', { powerId: activePower as PowerId, targetId: playerId });
            setActivePower(null);
            setPowerTargets([]);
        } else {
            // Single target powers
            if (activePower === 'FUSIL') playOneShot(); // Son du tir au moment du clic
            socket?.emit('use_power', { powerId: activePower as PowerId, targetId: playerId });
            setActivePower(null);
            setPowerTargets([]);
        }
    };

    // --- ECRAN DU LOBBY & JEU ---
    const currentPhase = game?.phase as string;

    return (
        <div className={`h-screen max-h-screen overflow-hidden flex font-montserrat transition-colors duration-1000 ${currentPhase === 'NIGHT' ? 'bg-[#1a1b26] text-slate-200' : 'bg-[#fafafa] text-slate-900'} relative`}>

            {/* Bannière mode spectateur */}
            {isSpectator && (
                <div className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-2 bg-slate-800/95 text-slate-300 text-sm font-bold py-2 px-4 shadow-lg backdrop-blur-sm">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Mode Spectateur — vous observez cette partie sans y participer
                </div>
            )}

            {/* Bannière de reconnexion — visible dès que le socket est coupé */}
            {!socketConnected && currentPhase !== 'END' && (
                <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-bold py-2 px-4 shadow-lg animate-pulse">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    Connexion perdue — Reconnexion en cours...
                </div>
            )}

            {/* Mobile Toggle Button (Visible only on small screens) */}
            <button
                onClick={() => { setIsMobileSidebarOpen(!isMobileSidebarOpen); setIsPlayersListOpen(false); setIsInviteOpen(false); }}
                className={`md:hidden fixed top-4 left-4 z-[110] p-2 rounded-md bg-dark text-white border-2 transition-colors shadow-lg border-secondary hover:bg-black ${!isMobileSidebarOpen && game?.phase === 'LOBBY' ? 'animate-bounce' : ''}`}
                title={isMobileSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
                {isMobileSidebarOpen ? (
                    <Image src="/assets/images/icones/close-icon.png" alt="Menu" width={24} height={24} />
                ) : (
                    <Image src="/assets/images/icones/list-icon.png" alt="Menu" width={24} height={24} />
                )}
            </button>
            {/* Default Voice Chat Manager */}
            {groupConfig?.isMicro && user && game && (
                <VoiceChatManager
                    socket={socket}
                    roomCode={roomCode}
                    currentUser={user}
                    game={game}
                    isMicroOn={isMicroOn && (game.phase === 'LOBBY' || game.phase === 'GAME_OVER' || (!mePlayer?.effects?.includes('poisoned') && mePlayer?.isAlive !== false))}
                    isHeadphonesOn={isHeadphonesOn}
                    micSensitivity={micSensitivity}
                    outputVolume={outputVolume}
                    onSpeakingChange={setSpeakingPlayers}
                    type="room"
                />
            )}
            {/* --- SIDEBAR GAUCHE --- */}
            {/* Mobile Overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 z-[95] backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}
            <aside className={`fixed md:relative inset-y-0 left-0 z-[100] w-80 md:w-100 flex flex-col p-4 transition-transform duration-300 transform md:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${currentPhase === 'NIGHT' ? 'bg-[#16161e] border-r border-[#2a2b3d]' : 'bg-[#fafafa] shadow-2xl md:shadow-none'}`}>
                {/* Ligne du haut : Home, Params, Amis */}
                <div className={`flex justify-between items-center bg-transparent border-3 rounded-lg px-3 py-1 ml-14 mb-6 md:ml-0 transition-colors duration-1000 ${currentPhase === 'NIGHT' ? 'bg-[#1f202e] border-slate-600 text-white' : 'bg-white border-dark text-slate-900'}`}>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { handleSafeLeave(); setIsMobileSidebarOpen(false); setIsPlayersListOpen(false); setIsInviteOpen(false); }} className="hover:opacity-70 transition-opacity flex items-center justify-center p-1">
                            <Image src={currentPhase === 'NIGHT' ? '/assets/images/icones/home-icon_white.png' : '/assets/images/icones/home-icon_black.png'} alt="Accueil" width={22} height={22} />
                        </button>
                        {/* Indicateur connexion socket */}
                        <div
                            title={socketConnected ? 'Connecté' : 'Reconnexion...'}
                            className={`w-2 h-2 rounded-full transition-colors duration-500 ${socketConnected ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`}
                        />
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="hover:opacity-70 transition-opacity flex items-center justify-center p-1"
                        >
                            <Image src={currentPhase === 'NIGHT' ? '/assets/images/icones/parametre-icon_white.png' : '/assets/images/icones/parametre-icon_black.png'} alt="Paramètres" width={22} height={22} />
                        </button>
                        <button onClick={() => { if (!isPlayersListOpen) { setIsPlayersListOpen(true); setIsInviteOpen(false); setIsMobileSidebarOpen(false) } else { setIsPlayersListOpen(false); } }} className="hover:opacity-70 transition-opacity flex items-center justify-center p-1">
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
                        {/* Bouton "Messages précédents" — visible uniquement si des messages sont cachés */}
                        {hiddenMessageCount > 0 && (
                            <button
                                onClick={() => setShowAllMessages(true)}
                                className={`w-full text-xs font-bold py-2 px-3 rounded-lg mb-2 transition-colors ${currentPhase === 'NIGHT' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                ↑ {hiddenMessageCount} message{hiddenMessageCount > 1 ? 's' : ''} précédent{hiddenMessageCount > 1 ? 's' : ''}
                            </button>
                        )}
                        <div className="mt-auto"></div>
                        {displayedMessages.map((msg, idx) => {
                            const senderIndex = game.players.findIndex(p => p.id === msg.senderId);
                            const senderPlayer = senderIndex !== -1 ? game.players[senderIndex] : null;
                            const senderNumber = senderIndex + 1;

                            const avatar = getPlayerAvatar(msg.senderId, senderPlayer?.avatarUrl);

                            // Joueur actuel pour la mention (Nom, "Joueur X", ou "JX")
                            const myIndex = game.players.findIndex(p => p.id === user.uid);
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
                                    <div className={`relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-slate-300 -mt-0.5 ${speakingPlayers.has(msg.senderId) ? 'ring-2 ring-[var(--voice-aura)]' : ''}`}>
                                        {speakingPlayers.has(msg.senderId) && <div className="voice-aura-wave" />}
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

                        // Condition de parole stricte : Les morts se taisent, les spectateurs aussi.
                        const canChat = game ? (!isSpectator && !isDeadPlayer && (
                            currentPhase === 'LOBBY' ||
                            (activeChatTab === 'day' && currentPhase !== 'NIGHT') ||
                            (activeChatTab === 'night' && currentPhase === 'NIGHT' && mePlayer?.role && isInWolfCamp(mePlayer.role as RoleId))
                        )) : false;

                        return (
                            <form onSubmit={handleSendMessage} className={`p-3 flex items-center gap-2 relative z-10 transition-colors duration-1000 ${currentPhase === 'NIGHT' ? 'bg-[#1f202e]' : 'bg-[#FCF8E8]'}`}>
                                {mePlayer?.effects?.includes('poisoned') ? (
                                    <div className="flex-1 rounded-lg px-4 py-3 text-sm flex items-center gap-2 bg-purple-900/10 border border-purple-500/30 text-purple-600 font-bold shadow-inner">
                                        <Image src="/assets/images/icones/powers/Effet_Empoisonnement.png" alt="Poison" width={20} height={20} />
                                        Le poison vous mutile. Vous ne pouvez pas parler aujourd{"'"}hui.
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
            {/* --- ZONE CENTRALE DROITE (Fin de partie vs Jeu En Cours) --- */}
            {/* ENDGAME COMPONENT */}
            {(currentPhase === 'GAME_OVER' && gameOverData) ? (
                <EndGame
                    gameOverData={gameOverData as unknown as Parameters<typeof EndGame>[0]['gameOverData']}
                    confirmLeave={confirmLeave}
                    getPlayerAvatar={getPlayerAvatar}
                    currentUserId={user?.uid}
                    onReplay={handleReplay}
                    hasNextRoom={!!nextRoomCode}
                />
            ) : (
                <GameProvider value={{
                    game, currentPhase, roomCode, isHost, groupConfig: groupConfig as unknown as Record<string, unknown>,
                    dynamicRolesConfig: rolesConfig as unknown as Record<string, unknown>,
                    socket, user,
                    activePower, setActivePower, powerTargets, setPowerTargets,
                    handlePowerClick, handlePlayerClick,
                    isCardFlipped, setIsCardFlipped, setSelectedRole,
                    isInviteOpen, setIsInviteOpen,
                    isPlayersListOpen, setIsPlayersListOpen,
                    getPlayerAvatar, speakingPlayers, copyInviteLink,
                }}>
                    <ActiveGame />
                </GameProvider>
            )}
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
                    const partner = game.players.find((p) => p.id === actualPartnerId);

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
            {/* Modal Avertissement Inactivité Salon */}
            {showLobbyWarning && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2020] p-4 font-montserrat">
                    <div className="bg-slate-900 border-2 border-orange-500 p-8 rounded-xl max-w-sm text-center shadow-[0_0_20px_rgba(249,115,22,0.4)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-orange-600 animate-pulse"></div>
                        <h2 className="text-2xl font-enchanted tracking-wider text-orange-500 mb-4">Attention !</h2>
                        <p className="text-slate-300 text-sm mb-8">
                            Le salon est inactif depuis longtemps et vous êtes assez nombreux. <br /><br />
                            <span className="text-white font-bold">Veuillez lancer la partie ou le salon sera fermé dans 1 minute.</span>
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    setShowLobbyWarning(false);
                                    socket?.emit('ping_activity');
                                }}
                                className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded shadow transition-colors w-full uppercase text-sm tracking-wide"
                            >
                                J{"'"}ai compris
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Avertissement Inactivité Joueur */}
            {showPlayerIdleWarning && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2020] p-4 font-montserrat">
                    <div className="bg-slate-900 border-2 border-orange-500 p-8 rounded-xl max-w-sm text-center shadow-[0_0_20px_rgba(249,115,22,0.4)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-orange-600 animate-pulse"></div>
                        <h2 className="text-2xl font-enchanted tracking-wider text-orange-500 mb-4">Êtes-vous toujours là ?</h2>
                        <p className="text-slate-300 text-sm mb-8">
                            Vous n{"'"}avez eu aucune interaction depuis 9 minutes.<br /><br />
                            <span className="text-white font-bold">Bougez la souris ou cliquez pour ne pas être déconnecté dans 1 minute !</span>
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    setShowPlayerIdleWarning(false);
                                    socket?.emit('ping_activity');
                                }}
                                className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded shadow transition-colors w-full uppercase text-sm tracking-wide"
                            >
                                Je suis là !
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Pop-up Modale de FIN DE PARTIE supprimée pour être affichée dans le Main Content */}
            {/* Overlay partagé pour les panneaux de droite */}
            {(isInviteOpen || isPlayersListOpen) && (
                <div
                    className="absolute inset-0 bg-black/20 z-[45] backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => { setIsInviteOpen(false); setIsPlayersListOpen(false); }}
                />
            )}
            {/* Panneau latéral droit (Inviter des amis) */}
            <div className={`absolute top-0 right-0 w-80 h-full bg-white border-l-4 border-slate-800 shadow-2xl z-50 flex flex-col font-montserrat transition-transform duration-300 ease-in-out transform ${isInviteOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
                                            <Image src={(friend.photoURL as string) || "/assets/images/icones/Photo_Profil-transparent.png"} alt={(friend.pseudo as string) || "Ami"} fill className="object-cover" />
                                        </div>
                                        <span className="font-bold text-slate-700 text-sm truncate">{(friend.pseudo as string) || "Joueur"}</span>
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
                                            onClick={() => handleInviteFriend(friend.id, (friend.pseudo as string) || "Joueur")}
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
            {/* Panneau latéral droit (Liste des Joueurs) */}
            <div className={`absolute top-0 right-0 w-80 h-full bg-white border-l-4 border-slate-800 shadow-2xl z-50 flex flex-col font-montserrat transition-transform duration-300 ease-in-out transform ${isPlayersListOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
            {/* --- MODAL POTION DE VIE (sauvegarde aveugle) --- */}
            {witchHealTarget && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4 font-montserrat" onClick={() => { setWitchHealTarget(null); setActivePower(null); }}>
                    <div className="bg-[#2C3338] text-white max-w-sm w-full rounded-2xl p-6 border-2 border-[#D1A07A] shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-enchanted font-extrabold text-[#D1A07A] mb-4">Potion de Vie</h3>
                        <p className="text-sm text-slate-300 mb-6">
                            Vous sentez que quelqu{"'"}un est en danger cette nuit...<br />
                            <span className="font-bold text-white">Voulez-vous utiliser votre potion pour sauver cette personne ?</span>
                            <br /><span className="text-slate-500 text-xs mt-1 block italic">Vous ne savez pas qui est ciblé.</span>
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => { setWitchHealTarget(null); setActivePower(null); }}
                                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors text-sm font-bold"
                            >
                                Non
                            </button>
                            <button
                                onClick={() => {
                                    // Pas de targetId — le serveur auto-cible la victime des loups
                                    socket?.emit('use_power', { powerId: 'POTION_SOIN' });
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
                            Voulez-vous vraiment déclencher l{"'"}incendie général ?<br />
                            <span className="font-bold text-orange-400">Tous les joueurs aspergés d{"'"}essence mourront simultanément.</span>
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
            {/* Modal Paramètres (Vocal) */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2100] p-4 font-montserrat" onClick={() => setShowSettings(false)}>
                    <div className="bg-[#2C3338] text-white max-w-sm w-full rounded-2xl p-6 border-2 border-slate-700 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-enchanted font-extrabold text-[#D1A07A] mb-6 text-center">Paramètres Vocaux</h3>

                        <div className="space-y-6">
                            {/* Microphone Toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-8 h-8">
                                        <Image src={isMicroOn ? '/assets/images/icones/microphone-icone_white.png' : '/assets/images/icones/non_microphone-icon.png'} alt="Micro" fill className="object-contain" />
                                    </div>
                                    <span className="font-bold">Microphone</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (mePlayer?.isAlive === false && game?.phase !== 'LOBBY' && game?.phase !== 'GAME_OVER') {
                                            toast.warning("Les morts ne peuvent pas parler !");
                                            return;
                                        }
                                        setIsMicroOn(!isMicroOn);
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isMicroOn ? 'bg-green-500' : 'bg-slate-600'} ${mePlayer?.isAlive === false && game?.phase !== 'LOBBY' && game?.phase !== 'GAME_OVER' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isMicroOn ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Mic Sensitivity Slider */}
                            <div className="space-y-2 px-1">
                                <div className="flex justify-between text-xs font-bold text-slate-400">
                                    <span>Sensibilité Micro</span>
                                    <span className="text-[#D1A07A]">{micSensitivity}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={micSensitivity}
                                    onChange={(e) => setMicSensitivity(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#D1A07A]"
                                />
                                <p className="text-[9px] text-slate-500 italic">Ajustez pour ne pas capter les bruits de fond.</p>
                            </div>

                            {/* Headphones Toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-8 h-8">
                                        <Image src={isHeadphonesOn ? '/assets/images/icones/headphone-icon_white.png' : '/assets/images/icones/non_headphone-icone_black.png'} alt="Casque" fill className="object-contain" />
                                    </div>
                                    <span className="font-bold">Casque</span>
                                </div>
                                <button
                                    onClick={() => setIsHeadphonesOn(!isHeadphonesOn)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isHeadphonesOn ? 'bg-blue-500' : 'bg-slate-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isHeadphonesOn ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Output Volume Slider */}
                            <div className="space-y-2 px-1">
                                <div className="flex justify-between text-xs font-bold text-slate-400">
                                    <span>Volume Sortie</span>
                                    <span className="text-blue-400">{outputVolume}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={outputVolume}
                                    onChange={(e) => setOutputVolume(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>


                            {/* Ambiance Volume Slider */}
                            <div className="space-y-2 px-1">
                                <div className="flex justify-between text-xs font-bold text-slate-400">
                                    <span>Volume Ambiance</span>
                                    <span className="text-[#D1A07A]">{ambianceVolume}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={ambianceVolume}
                                    onChange={(e) => setAmbianceVolume(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#D1A07A]"
                                />
                                <p className="text-[9px] text-slate-500 italic">Musique de fond du jeu.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSettings(false)}
                            className="mt-8 w-full py-3 bg-[#D1A07A] text-dark font-extrabold rounded-xl hover:bg-[#b08465] transition-colors"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}

            {/* Overlay de transition de phase — affiché par-dessus tout */}
            <PhaseTransitionOverlay
                phase={game?.phase || 'LOBBY'}
                dayCount={game?.dayCount || 1}
            />
        </div>
    );
}
