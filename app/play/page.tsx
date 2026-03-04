'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../components/Header';
import PrivateChat from '../../components/PrivateChat';
import GroupChat from '../../components/GroupChat'; // Added GroupChat import
import { auth, db, rtdb } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, onSnapshot, where, getDocs, addDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';

export default function PlayPage() {
    const router = useRouter();

    const deleteGroupCompletely = async (groupId: string) => {
        try {
            // Firestore doesn't delete sub-collections automatically.
            // We need to fetch and delete all messages.
            const messagesRef = collection(db, "groups", groupId, "messages");
            const messagesSnap = await getDocs(messagesRef);

            const deletePromises = messagesSnap.docs.map(mDoc => deleteDoc(mDoc.ref));
            await Promise.all(deletePromises);

            // Finally delete the group document
            await deleteDoc(doc(db, "groups", groupId));
        } catch (error) {
            console.error(`Error deleting group ${groupId} completely:`, error);
        }
    };

    /**
     * Ne jamais stocker une photo Base64 dans un document Firestore groups/.
     * Les images Base64 (data:image/...) peuvent dépasser la limite de 1MB.
     * On stocke une chaîne vide à la place et on lit la photo depuis users/{uid} en temps réel.
     */
    const getSafePhotoURL = (url: string | null | undefined): string => {
        if (!url || url.startsWith('data:')) return '';
        return url;
    };
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('Toutes');
    const [searchVillage, setSearchVillage] = useState('');
    const [searchPlayer, setSearchPlayer] = useState('');
    const [villages, setVillages] = useState<any[]>([]);
    const [playerSearchResults, setPlayerSearchResults] = useState<any[]>([]);
    const [isSearchingPlayer, setIsSearchingPlayer] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [friendsStatuses, setFriendsStatuses] = useState<Record<string, any>>({});
    const [friendsGroups, setFriendsGroups] = useState<Record<string, any>>({});
    const [friendsOnlinePresence, setFriendsOnlinePresence] = useState<Record<string, boolean>>({});
    const [sentRequests, setSentRequests] = useState<string[]>([]);
    const [group, setGroup] = useState<any>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Photos des hôtes de villages lues depuis Firestore (pour les comptes Base64)
    const [hostAvatars, setHostAvatars] = useState<Record<string, string>>({});
    // Nombre de joueurs connectés en temps réel (Socket.io) par code de room
    const [livePlayerCounts, setLivePlayerCounts] = useState<Record<string, number>>({});

    // --- Private Chat State ---
    const [activeChatFriend, setActiveChatFriend] = useState<{ id: string, pseudo: string, photoURL: string } | null>(null);
    const [unreadChats, setUnreadChats] = useState<{ [friendId: string]: number }>({});

    // --- Group Chat State ---
    const [showGroupChat, setShowGroupChat] = useState(false);

    // --- Private Village Join State ---
    const [selectedPrivateVillage, setSelectedPrivateVillage] = useState<any>(null);
    const [inputSecretCode, setInputSecretCode] = useState("");
    const [joiningError, setJoiningError] = useState("");

    const [pendingRejoinVillage, setPendingRejoinVillage] = useState<any>(null);
    const [rejoinCountdown, setRejoinCountdown] = useState<number | null>(null);
    const isNavigatingRef = useRef(false);
    const rejoinCountdownRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        let unsubscribeVillages = () => { };
        let unsubscribeFriends = () => { };
        let unsubscribeChats = () => { };

        let unsubscribeUser = () => { };

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.replace('/auth');
            } else {
                setUser(currentUser);
                unsubscribeUser = onSnapshot(doc(db, "users", currentUser.uid), async (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    } else {
                        const newUserData = {
                            pseudo: currentUser.displayName || "Joueur",
                            points: 0,
                            photoURL: currentUser.photoURL || "/assets/images/icones/Photo_Profil-transparent.png"
                        };
                        setUserData(newUserData);

                        try {
                            const { setDoc } = await import('firebase/firestore');
                            await setDoc(doc(db, "users", currentUser.uid), newUserData, { merge: true });
                        } catch (error) {
                            console.error("Erreur création profil utilsateur :", error);
                        }
                    }
                    setLoading(false);
                });

                // Notifications listening deleted, moved to GlobalActionBar.
                // Keeping sentRequests state separate.

                // Real-time listener for friends for this user
                const qFriends = query(collection(db, "users", currentUser.uid, "friends"));
                unsubscribeFriends = onSnapshot(qFriends, (snapshot) => {
                    const friendsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setFriends(friendsData);
                });

                // Real-time listener for unread chats
                const qChats = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid));
                unsubscribeChats = onSnapshot(qChats, (snapshot) => {
                    const unreads: { [friendId: string]: number } = {};
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const count = data.unreadCount?.[currentUser.uid] || 0;
                        if (count > 0) {
                            const otherUserId = data.participants.find((p: string) => p !== currentUser.uid);
                            if (otherUserId) unreads[otherUserId] = count;
                        }
                    });
                    setUnreadChats(unreads);
                });
            }
        });

        // Real-time listener for villages (Global) - Sorted locally to avoid missing Firebase indexes
        const qVillages = query(
            collection(db, "groups"),
            where("isVillage", "==", true)
        );
        unsubscribeVillages = onSnapshot(qVillages, (snapshot) => {
            const villagesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Auto-cleanup des salons vides
            villagesData.forEach(async (v: any) => {
                if (!v.players || v.players.length === 0) {
                    await deleteGroupCompletely(v.id);
                }
            });

            // Ne garder que les salons avec au moins un joueur connecté ET qui sont entièrement configurés
            const activeVillages = villagesData.filter((v: any) => v.players && v.players.length > 0 && v.isConfigured === true);

            // Sort locally by createdAt desc
            activeVillages.sort((a: any, b: any) => {
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            setVillages(activeVillages);
        }, (error) => {
            console.error("Error fetching villages:", error);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeUser();
            unsubscribeVillages();
            unsubscribeFriends();
            unsubscribeChats();
        };
    }, [router]);

    // Charge les photos des hôtes de villages depuis Firestore si hostPhoto est vide ou par défaut
    useEffect(() => {
        if (!villages.length) return;
        villages.forEach(async (v: any) => {
            if (!v.hostId || hostAvatars[v.hostId]) return; // déjà chargé

            // Si on a déjà une vraie URL (Google ou autre stockage externe), on ne fetch pas
            const hasRealPhoto = v.hostPhoto && !v.hostPhoto.startsWith('data:') && v.hostPhoto !== "/assets/images/icones/Photo_Profil-transparent.png";
            if (hasRealPhoto) return;

            try {
                const snap = await getDoc(doc(db, "users", v.hostId));
                if (snap.exists()) {
                    const photo = snap.data().photoURL || '';
                    setHostAvatars(prev => ({ ...prev, [v.hostId]: photo }));
                }
            } catch (e) { /* ignore */ }
        });
    }, [villages]);

    // Polling du nombre de joueurs connectés en direct (Socket.io) via /api/rooms-live
    useEffect(() => {
        let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

        // CORRECTION : Utiliser NEXT_PUBLIC_SOCKET_URL ou l'origine actuelle
        // On ne force plus le port 3001 si on est sur un domaine personnalisé.
        let baseUrl = socketUrl || (typeof window !== 'undefined' ? window.location.origin : '');
        if (!socketUrl && baseUrl.includes('localhost')) {
            baseUrl = 'http://localhost:3001';
        }
        // S'assurer que l'URL ne finit pas par un slash pour la concaténation
        baseUrl = baseUrl.replace(/\/$/, '');

        const fetchLiveCounts = async () => {
            try {
                // On utilise baseUrl qui pointe vers le port 3001 (serveur socket + API)
                const res = await fetch(`${baseUrl}/api/rooms-live`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setLivePlayerCounts(data);
                }
            } catch {
                // Silently ignore network errors
            }
        };

        fetchLiveCounts();
        const interval = setInterval(fetchLiveCounts, 5000);
        return () => clearInterval(interval);
    }, []);

    // Group Synchronization and Initialization
    useEffect(() => {
        let unsubscribeGroup = () => { };
        if (userData && user) {
            let groupId = userData.currentGroupId;

            if (!groupId) {
                // Initialize solo group for the user
                groupId = user.uid;
                const initGroup = async () => {
                    await setDoc(doc(db, "groups", groupId), {
                        id: groupId,
                        hostId: user.uid,
                        players: [{ uid: user.uid, pseudo: userData.pseudo, photoURL: getSafePhotoURL(userData.photoURL) }],
                        createdAt: new Date().toISOString()
                    }, { merge: true });

                    await updateDoc(doc(db, "users", user.uid), {
                        currentGroupId: groupId
                    });
                };
                initGroup();
            } else {
                // Listen to the active group
                unsubscribeGroup = onSnapshot(doc(db, "groups", groupId), (snap) => {
                    if (snap.exists()) {
                        const groupData = snap.data();
                        setGroup(groupData);

                        // Toujours demander confirmation avant de (re)rejoindre un village
                        if (groupData.isVillage && !isNavigatingRef.current) {
                            const gameStarted = groupData.gameStarted === true;
                            // Vérifier si le joueur faisait partie de la partie au moment de son lancement
                            const wasInGame = gameStarted
                                ? (groupData.players || []).some((p: any) => p.uid === user.uid)
                                : true; // En lobby, tous les joueurs du groupe peuvent toujours rejoindre
                            setPendingRejoinVillage({
                                ...groupData,
                                id: groupId,
                                gameStarted,
                                canRejoin: !gameStarted || wasInGame
                            });
                            // Si la partie est en cours et que l'utilisateur peut rejoindre, démarrer le compte à rebours de 60s
                            if (gameStarted && wasInGame) {
                                setRejoinCountdown(60);
                            }
                        }
                    } else if (groupId !== user.uid) {
                        // Le groupe a été supprimé ou est invalide → revenir au groupe solo
                        updateDoc(doc(db, "users", user.uid), { currentGroupId: '' });
                    }
                });
            }
        }
        return () => unsubscribeGroup();
    }, [userData?.currentGroupId, user, userData?.pseudo]);

    // Compte à rebours pour le rejoin en partie (1 minute max avant déconnexion serveur)
    useEffect(() => {
        if (rejoinCountdown === null) return;

        if (rejoinCountdown <= 0) {
            // Temps écoulé : le serveur a déjà déconnecté le joueur, on nettoie
            setPendingRejoinVillage(null);
            setRejoinCountdown(null);
            if (rejoinCountdownRef.current) clearInterval(rejoinCountdownRef.current);
            return;
        }

        rejoinCountdownRef.current = setInterval(() => {
            setRejoinCountdown(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(rejoinCountdownRef.current!);
                    setPendingRejoinVillage(null);
                    return null;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (rejoinCountdownRef.current) clearInterval(rejoinCountdownRef.current);
        };
    }, [rejoinCountdown !== null]);

    // Real-time listener pour les amis ET les membres du groupe courant
    useEffect(() => {
        // Fusionner amis + membres du groupe (sans doublons, sans soi-même)
        const idsToWatch = new Set<string>();
        friends.forEach(f => { if (f.friendId) idsToWatch.add(f.friendId); });
        group?.players?.forEach((p: any) => { if (p.uid && p.uid !== user?.uid) idsToWatch.add(p.uid); });

        const unsubscribes = Array.from(idsToWatch).map(uid =>
            onSnapshot(doc(db, "users", uid), (docSnap) => {
                if (docSnap.exists()) {
                    setFriendsStatuses(prev => ({
                        ...prev,
                        [uid]: docSnap.data()
                    }));
                }
            })
        );

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [friends, group?.players, user?.uid]);

    // Real-time listener for friends' groups to know the exact player count
    useEffect(() => {
        const groupIds = new Set<string>();
        Object.values(friendsStatuses).forEach(status => {
            if (status.currentGroupId) {
                groupIds.add(status.currentGroupId);
            }
        });

        const unsubscribes = Array.from(groupIds).map(groupId => {
            return onSnapshot(doc(db, "groups", groupId), (snap) => {
                if (snap.exists()) {
                    setFriendsGroups(prev => ({
                        ...prev,
                        [groupId]: snap.data()
                    }));
                }
            });
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [friendsStatuses]);

    // Listen to Realtime Database for online status of friends
    useEffect(() => {
        const unsubscribes = friends.map(friend => {
            if (!friend.friendId) return () => { };
            const statusRef = ref(rtdb, 'status/' + friend.friendId);
            const unsubscribe = onValue(statusRef, (snapshot) => {
                const data = snapshot.val();
                console.log(`Presence Friend [${friend.friendId}]:`, data);
                const isOnline = data && data.state === 'online';
                setFriendsOnlinePresence(prev => ({
                    ...prev,
                    [friend.friendId]: isOnline
                }));
            }, (error) => {
                console.error(`Presence Error reading friend [${friend.friendId}]:`, error);
            });
            return unsubscribe; // returns a firebase un-listener function
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [friends]);

    // Debounced Player Search
    useEffect(() => {
        if (!searchPlayer.trim() || !user) {
            setPlayerSearchResults([]);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearchingPlayer(true);
            try {
                const usersRef = collection(db, "users");
                // Note: Firestore doesn't support generic text search efficiently.
                // For a basic 'startsWith' query:
                const q = query(
                    usersRef,
                    where("pseudo", ">=", searchPlayer),
                    where("pseudo", "<=", searchPlayer + '\uf8ff')
                );

                const snapshot = await getDocs(q);
                let results = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(u => u.id !== user.uid); // Don't show yourself

                // Also try finding by exact UID if input length is typical for Firebase UIDs (typically 28 chars)
                if (searchPlayer.length >= 20) {
                    try {
                        const uidDocParams = await getDoc(doc(db, "users", searchPlayer.trim()));
                        if (uidDocParams.exists() && uidDocParams.id !== user.uid) {
                            // Add to results if not already there
                            if (!results.find(u => u.id === uidDocParams.id)) {
                                results.push({ id: uidDocParams.id, ...uidDocParams.data() });
                            }
                        }
                    } catch (err) {
                        // ignore potential invalid doc path errors
                    }
                }

                setPlayerSearchResults(results);
            } catch (err) {
                console.error("Error searching players:", err);
            } finally {
                setIsSearchingPlayer(false);
            }
        }, 300); // 300ms debounce

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchPlayer, user]);

    const handleSendFriendRequest = async (targetUserId: string) => {
        if (!user || !userData) return;

        try {
            // Check if the target user has blocked the current user
            const blockedMeSnap = await getDoc(doc(db, "users", targetUserId, "blocked", user.uid));
            if (blockedMeSnap.exists()) {
                alert("Impossible d'envoyer une demande à ce joueur.");
                return;
            }

            const notifRef = collection(db, "users", targetUserId, "notifications");
            await addDoc(notifRef, {
                type: "friend_request",
                fromUserId: user.uid,
                fromPseudo: userData.pseudo,
                fromPhotoURL: userData.photoURL || "/assets/images/icones/Photo_Profil-transparent.png",
                createdAt: new Date().toISOString(),
                read: false
            });
            setSentRequests(prev => [...prev, targetUserId]);
        } catch (err) {
            console.error("Error sending friend request", err);
            alert("Erreur lors de l'envoi de la demande.");
        }
    };

    const handleAcceptFriend = async (notif: any) => {
        if (!user) return;
        try {
            // 1. Add to my friends list
            await setDoc(doc(db, "users", user.uid, "friends", notif.fromUserId), {
                friendId: notif.fromUserId,
                pseudo: notif.fromPseudo,
                photoURL: notif.fromPhotoURL,
                status: "accepted",
                addedAt: new Date().toISOString()
            });

            // 2. Add me to their friends list
            await setDoc(doc(db, "users", notif.fromUserId, "friends", user.uid), {
                friendId: user.uid,
                pseudo: userData.pseudo,
                photoURL: userData.photoURL || "/assets/images/icones/Photo_Profil-transparent.png",
                status: "accepted",
                addedAt: new Date().toISOString()
            });

            // 3. Mark notification as read (or delete it)
            await handleDeleteNotif(notif.id);

            // 4. Send acceptance notification back
            const notifRef = collection(db, "users", notif.fromUserId, "notifications");
            await addDoc(notifRef, {
                type: "friend_request_accepted",
                fromUserId: user.uid,
                fromPseudo: userData.pseudo,
                fromPhotoURL: userData.photoURL || "/assets/images/icones/Photo_Profil-transparent.png",
                createdAt: new Date().toISOString(),
                read: false
            });

        } catch (error) {
            console.error("Error accepting friend", error);
        }
    };

    const handleRejectFriend = async (notif: any) => {
        if (!user) return;
        try {
            await handleDeleteNotif(notif.id);

            // Send rejection notification back
            const notifRef = collection(db, "users", notif.fromUserId, "notifications");
            await addDoc(notifRef, {
                type: "friend_request_rejected",
                fromUserId: user.uid,
                fromPseudo: userData.pseudo,
                fromPhotoURL: userData.photoURL || "/assets/images/icones/Photo_Profil-transparent.png",
                createdAt: new Date().toISOString(),
                read: false
            });
        } catch (error) {
            console.error("Error rejecting friend", error);
        }
    };

    const handleInviteToGroup = async (friendId: string, friendPseudo: string) => {
        if (!user || !userData || !userData.currentGroupId) return;
        try {
            const notifRef = collection(db, "users", friendId, "notifications");
            await addDoc(notifRef, {
                type: "group_invite",
                groupId: userData.currentGroupId,
                fromUserId: user.uid,
                fromPseudo: userData.pseudo,
                fromPhotoURL: userData.photoURL || "/assets/images/icones/Photo_Profil-transparent.png",
                createdAt: new Date().toISOString(),
                read: false
            });
            alert(`Invitation au groupe envoyée à ${friendPseudo}.`);
        } catch (error) {
            console.error("Error sending group invite", error);
        }
    };

    const handleAcceptGroupInvite = async (notif: any) => {
        if (!user || !userData) return;
        isNavigatingRef.current = true;
        setPendingRejoinVillage(null);
        setRejoinCountdown(null);
        if (rejoinCountdownRef.current) clearInterval(rejoinCountdownRef.current);
        try {
            const groupDoc = await getDoc(doc(db, "groups", notif.groupId));
            if (groupDoc.exists()) {
                const groupData = groupDoc.data();
                if (groupData.players && groupData.players.length >= 18) {
                    alert("Ce groupe est complet !");
                    await handleDeleteNotif(notif.id);
                    return;
                }
            } else {
                alert("Ce groupe n'existe plus.");
                await handleDeleteNotif(notif.id);
                return;
            }

            if (userData.currentGroupId && userData.currentGroupId !== user.uid) {
                await updateDoc(doc(db, "groups", userData.currentGroupId), {
                    players: arrayRemove({ uid: user.uid, pseudo: userData.pseudo, photoURL: getSafePhotoURL(userData.photoURL) })
                });
            }

            await updateDoc(doc(db, "groups", notif.groupId), {
                players: arrayUnion({ uid: user.uid, pseudo: userData.pseudo, photoURL: getSafePhotoURL(userData.photoURL) })
            });

            await updateDoc(doc(db, "users", user.uid), {
                currentGroupId: notif.groupId
            });

            await handleDeleteNotif(notif.id);
        } catch (error) {
            console.error("Error accepting group invite", error);
        }
    };

    const handleLeaveGroup = async () => {
        if (!user || !userData?.currentGroupId) return;

        try {
            const groupId = userData.currentGroupId;

            if (group && group.players && group.players.length <= 1) {
                // Si le joueur est le dernier du groupe, on efface complètement la room
                await deleteGroupCompletely(groupId);
            } else {
                // Otherwise, normal remove
                await updateDoc(doc(db, "groups", groupId), {
                    players: arrayRemove({
                        uid: user.uid,
                        pseudo: userData.pseudo || user.displayName || 'Joueur',
                        photoURL: getSafePhotoURL(userData.photoURL)
                    })
                });
            }

            // Remove groupId from user document
            await updateDoc(doc(db, "users", user.uid), {
                currentGroupId: null
            });

            setGroup(null);
        } catch (error) {
            console.error("Error leaving group:", error);
            alert("Erreur en quittant le groupe.");
        }
    };

    const handleJoinVillage = async (villageToJoin: any) => {
        if (!user || !userData) return;
        isNavigatingRef.current = true;
        setPendingRejoinVillage(null);
        setRejoinCountdown(null);
        if (rejoinCountdownRef.current) clearInterval(rejoinCountdownRef.current);
        try {
            // Determine if the user is in a party (group with >1 players and not a village)
            const isParty = group && group.id === userData.currentGroupId && group.players && group.players.length > 1 && !group.isVillage;

            if (isParty) {
                // Check if user is the host
                if (group.hostId !== user.uid) {
                    alert("Seul le maître du groupe peut faire rejoindre le groupe dans un village.");
                    return;
                }

                // User is the host: move EVERYONE in the party to the village
                // Check if village has enough space
                const currentVillagePlayers = villageToJoin.players ? villageToJoin.players.length : 0;
                if (currentVillagePlayers + group.players.length > (villageToJoin.maxPlayers || 16)) {
                    alert("Il n'y a pas assez de place dans ce village pour tout votre groupe !");
                    return;
                }

                // Add all party players to the village
                await updateDoc(doc(db, "groups", villageToJoin.id), {
                    players: arrayUnion(...group.players)
                });

                // Update currentGroupId for all party members
                const updatePromises = group.players.map((p: any) =>
                    updateDoc(doc(db, "users", p.uid), {
                        currentGroupId: villageToJoin.id
                    })
                );
                await Promise.all(updatePromises);

                // Delete the old party group since everyone left
                await deleteGroupCompletely(group.id);

            } else {
                // Solo player (or in a solo group)
                const playerObj = {
                    uid: user.uid,
                    pseudo: userData.pseudo || user.displayName || 'Joueur',
                    photoURL: getSafePhotoURL(userData.photoURL)
                };

                // Remove from current group if in another one
                if (userData.currentGroupId && userData.currentGroupId !== user.uid) {
                    await updateDoc(doc(db, "groups", userData.currentGroupId), {
                        players: arrayRemove(playerObj)
                    });
                }

                // Check if village is full BEFORE joining
                if (villageToJoin.players && villageToJoin.players.length >= (villageToJoin.maxPlayers || 16)) {
                    alert("Ce village est déjà complet !");
                    return;
                }

                // Add player to the new village
                await updateDoc(doc(db, "groups", villageToJoin.id), {
                    players: arrayUnion(playerObj)
                });

                // Update user profile
                await updateDoc(doc(db, "users", user.uid), {
                    currentGroupId: villageToJoin.id
                });
            }

            // Close modal if open
            setSelectedPrivateVillage(null);

            isNavigatingRef.current = true;
            router.push(`/room/${villageToJoin.id}`);
        } catch (error) {
            console.error("Erreur lors de la connexion au village:", error);
            alert("Erreur en rejoignant le village.");
        }
    };

    const handleCreateGroup = async () => {
        if (!user || !userData) {
            alert("Vous devez être connecté pour créer un village.");
            return;
        }
        isNavigatingRef.current = true;
        setPendingRejoinVillage(null);
        setRejoinCountdown(null);
        if (rejoinCountdownRef.current) clearInterval(rejoinCountdownRef.current);

        const isParty = group && group.id === userData.currentGroupId && group.players && group.players.length > 1 && !group.isVillage;

        if (isParty) {
            if (group.hostId !== user.uid) {
                alert("Seul le maître du groupe peut créer un village pour le groupe.");
                return;
            }
        } else if (userData.currentGroupId && userData.currentGroupId !== user.uid) {
            // Already in a real village (or some other unknown state)
            alert("Vous êtes déjà dans un village !");
            return;
        }

        try {
            // Génération d'un code de 6 caractères
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let newGroupId = '';
            for (let i = 0; i < 6; i++) {
                newGroupId += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            // Détermination des joueurs initiaux (soit le groupe entier, soit juste l'utilisateur)
            const initialPlayers = isParty ? group.players : [{
                uid: user.uid,
                pseudo: userData.pseudo || 'Joueur',
                photoURL: getSafePhotoURL(userData.photoURL)
            }];

            // Création d'un groupe de base
            await setDoc(doc(db, "groups", newGroupId), {
                id: newGroupId,
                name: `Village de ${userData.pseudo || 'Joueur'}`,
                mode: "Classique",
                isMicro: true,
                isPrivate: false,
                isVillage: true, // Mark this as a real lobby to appear in the list
                isConfigured: false, // Wait for the edit page to finish
                playerCount: initialPlayers.length,
                maxPlayers: 16,
                hostId: user.uid,
                hostPseudo: userData.pseudo || 'Joueur',
                hostPhoto: getSafePhotoURL(userData.photoURL),
                players: initialPlayers,
                createdAt: new Date().toISOString()
            });

            if (isParty) {
                // Update currentGroupId for all party members
                const updatePromises = group.players.map((p: any) =>
                    updateDoc(doc(db, "users", p.uid), {
                        currentGroupId: newGroupId
                    })
                );
                await Promise.all(updatePromises);

                // Delete the old party group
                await deleteGroupCompletely(group.id);
            } else {
                await updateDoc(doc(db, "users", user.uid), {
                    currentGroupId: newGroupId
                });
            }

            isNavigatingRef.current = true;
            router.push(`/room/${newGroupId}/edit`);

        } catch (error) {
            console.error("Erreur lors de la création du village:", error);
            alert("Une erreur est survenue lors de la création du village.");
        }
    };

    const handleQuickJoin = async () => {
        if (!user || !userData) return;

        // Détection du groupe/party
        const isParty = group && group.players && group.players.length > 1 && !group.isVillage;
        const partySize: number = isParty ? group.players.length : 1;

        if (isParty && group.hostId !== user.uid) {
            alert("Seul le maître du groupe peut lancer la recherche rapide.");
            return;
        }

        try {
            // Requête fraîche Firestore (données les plus récentes)
            const snap = await getDocs(
                query(
                    collection(db, "groups"),
                    where("isVillage", "==", true),
                    where("isPrivate", "==", false),
                    where("isConfigured", "==", true)
                )
            );

            // Filtres : public, configuré, en lobby (pas de phase ou phase === 'LOBBY'), assez de place
            const candidates = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(v =>
                    v.players && v.players.length > 0 &&                          // au moins un joueur
                    v.gameStarted !== true &&                                      // partie pas encore lancée (en lobby)
                    v.phase !== 'GAME_OVER' &&                                          // pas terminée
                    (v.maxPlayers - v.players.length) >= partySize &&             // assez de place
                    !v.players.some((p: any) => p.uid === user.uid)              // pas déjà dedans
                )
                // Tri : le plus rempli en premier (bientôt plein = meilleur match)
                .sort((a: any, b: any) => b.players.length - a.players.length);

            if (candidates.length > 0) {
                // Rejoindre le meilleur village trouvé
                await handleJoinVillage(candidates[0]);
            } else {
                // Aucun village disponible → créer un nouveau avec les paramètres par défaut
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let newGroupId = '';
                for (let i = 0; i < 6; i++) {
                    newGroupId += chars.charAt(Math.floor(Math.random() * chars.length));
                }

                const initialPlayers = isParty ? group.players : [{
                    uid: user.uid,
                    pseudo: userData.pseudo || 'Joueur',
                    photoURL: getSafePhotoURL(userData.photoURL)
                }];

                await setDoc(doc(db, "groups", newGroupId), {
                    id: newGroupId,
                    name: `Village de ${userData.pseudo || 'Joueur'}`,
                    mode: "Classique",
                    isMicro: true,
                    isPrivate: false,
                    isVillage: true,
                    isConfigured: true,   // Paramètres par défaut → pas besoin de /edit
                    phase: 'LOBBY',
                    playerCount: initialPlayers.length,
                    maxPlayers: 16,
                    hostId: user.uid,
                    hostPseudo: userData.pseudo || 'Joueur',
                    hostPhoto: getSafePhotoURL(userData.photoURL),
                    players: initialPlayers,
                    createdAt: new Date().toISOString()
                });

                if (isParty) {
                    const updatePromises = group.players.map((p: any) =>
                        updateDoc(doc(db, "users", p.uid), { currentGroupId: newGroupId })
                    );
                    await Promise.all(updatePromises);

                    await deleteGroupCompletely(group.id);
                } else {
                    await updateDoc(doc(db, "users", user.uid), { currentGroupId: newGroupId });
                }

                isNavigatingRef.current = true;
                router.push(`/room/${newGroupId}`);
            }
        } catch (error) {
            console.error("Erreur Quick Join:", error);
            alert("Une erreur est survenue lors de la recherche rapide.");
        }
    };

    const handleKickPlayer = async (playerToKick: any) => {
        if (!user || group?.hostId !== user.uid) return;
        try {
            if (group.players && group.players.length <= 1) {
                await deleteGroupCompletely(group.id);
            } else {
                await updateDoc(doc(db, "groups", group.id), {
                    players: arrayRemove(playerToKick)
                });
            }
            await updateDoc(doc(db, "users", playerToKick.uid), {
                currentGroupId: null
            });
        } catch (error) {
            console.error("Error kicking player", error);
        }
    };

    const handleDeleteNotif = async (notifId: string) => {
        if (!user) return;
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, "users", user.uid, "notifications", notifId));
        } catch (error) {
            console.error("Error deleting notification", error);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-screen bg-primary flex flex-col items-center justify-center">
                <Image src="/assets/images/logo_fullmoon.png" alt="Loading" width={80} height={80} className="animate-pulse mb-4" />
                <p className="text-secondary font-enchanted text-5xl">Chargement du village...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-white text-dark font-montserrat">
            {/* Global Header */}
            <Header onQuickJoin={handleQuickJoin} />

            <main className="max-w-6xl mx-auto px-4 pb-20">
                {/* TOP SECTION: Hero & Profile */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-12 mb-16 gap-12">

                    {/* Left: Actions */}
                    <div className="flex flex-col items-center md:items-start flex-1">
                        <h1 className="font-enchanted text-7xl text-dark tracking-wide mb-10">Prêts pour chasser ?</h1>
                        <div className="flex flex-col w-full max-w-sm gap-4">
                            <button
                                onClick={handleQuickJoin}
                                className="w-full bg-secondary text-white font-bold text py-4 rounded shadow-md hover:-translate-y-1 transition-transform uppercase tracking-wide"
                            >
                                REJOINDRE UN VILLAGE RAPIDE
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                className="w-full bg-dark text-white font-bold text py-4 rounded shadow-md hover:-translate-y-1 transition-transform uppercase tracking-wide"
                            >
                                CRÉER SON VILLAGE
                            </button>
                        </div>
                    </div>

                    {/* Right: User Profile Indicator & Notifications */}
                    <div className="flex flex-col items-center">


                        <div className="flex flex-col items-center cursor-pointer group" onClick={() => router.push('/profil')}>
                            <div className="relative w-38 h-38 md:w-44 md:h-44 rounded-full border-[8px] border-dark bg-[#E3D1A5] shadow-xl overflow-hidden mb-4 group-hover:scale-105 transition-transform">
                                {/* Moon background illusion */}
                                <div className="absolute inset-0 bg-[url('/assets/images/icones/village_batiments.png')] bg-cover opacity-20 bg-center"></div>
                                <Image
                                    src={userData?.photoURL || "/assets/images/icones/Photo_Profil-transparent.png"}
                                    alt="Profil"
                                    fill
                                    className="object-cover z-10"
                                />
                            </div>
                            <h2 className="font-bold text-2xl text-dark tracking-wide">{userData?.pseudo || "Joueur"}</h2>
                            <p className="text-dark/70 text-lg font-semibold">{userData?.stats?.points || 0} pts</p>
                            {/* Optionnel: Si vous vouliez rajouter le niveau, ce serait ici */}
                        </div>
                    </div>
                </div>

                {/* MIDDLE SECTION: Search & Filters */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
                    {/* Search Input */}
                    <div className="relative w-full lg:w-[60%] border-2 border-dark rounded-md bg-white">
                        <input
                            type="text"
                            placeholder="Rechercher le nom d'un village..."
                            value={searchVillage}
                            onChange={(e) => setSearchVillage(e.target.value)}
                            className="w-full px-4 py-3 bg-transparent text-dark placeholder-dark/50 focus:outline-none"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Image src="/assets/images/icones/search-icon_black.png" alt="Rechercher" width={20} height={20} />
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex w-full lg:w-auto bg-dark p-1 rounded-md overflow-hidden">
                        {['Toutes', 'Publiques', 'Privés', 'Amis'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 lg:flex-none px-6 py-2.5 font-bold text-sm transition-colors rounded ${activeTab === tab ? 'bg-secondary text-white' : 'text-white/80 hover:bg-white/10'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* BOTTOM SECTION: Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start ">

                    {/* LEFT LIST: Villages (Left 7-8 columns) */}
                    <div className="lg:col-span-7 flex flex-col gap-4 h-[calc(100vh-10rem)] overflow-y-auto">

                        {/* Pre-calculate filtered villages */}
                        {(() => {
                            const filteredVillages = villages.filter(v =>
                                (activeTab === 'Toutes') ||
                                (activeTab === 'Publiques' && !v.isPrivate) ||
                                (activeTab === 'Privés' && v.isPrivate) ||
                                (activeTab === 'Amis' && friends.some(f => f.id === v.hostId))
                            ).filter(v =>
                                v.name?.toLowerCase().includes(searchVillage.toLowerCase())
                            ).filter(v => {
                                // 1. Finished games ("Fin") should not be visible to anyone unless they are IN the game
                                const isUserInGroup = v.players?.some((p: any) => p.uid === user?.uid);
                                if (v.phase === 'GAME_OVER') {
                                    return isUserInGroup; // Hide from outside, show to players inside
                                }
                                return true;
                            });

                            return (
                                <>
                                    <p className="text-xs text-dark/70 -mb-2 font-semibold">
                                        Rejoindre un village : ({filteredVillages.length})
                                    </p>

                                    {/* Empty State */}
                                    {filteredVillages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-8 mt-4 bg-white/5 border-2 border-dashed border-dark/20 rounded-xl text-center">
                                            <Image src="/assets/images/icones/house-icon_black.png" alt="Aucun village" width={64} height={64} className="mb-4 opacity-40" />
                                            <h3 className="text-dark font-enchanted text-3xl mb-2">Aucun village trouvé</h3>
                                            <p className="text-dark/60 text-sm mb-6 max-w-sm">
                                                Il n'y a actuellement aucun village correspondant à votre recherche. Pourquoi ne pas créer le vôtre ?
                                            </p>
                                            <button
                                                onClick={handleCreateGroup}
                                                className="bg-secondary hover:bg-secondary/90 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
                                            >
                                                <span>+</span> Créer un village
                                            </button>
                                        </div>
                                    ) : (
                                        /* Real Village Cards from Firestore */
                                        filteredVillages.map((village) => {
                                            // Determine Badge Color and Text based on game state
                                            const isStarted = village.gameStarted;
                                            const isFinished = village.phase === 'GAME_OVER';

                                            // LOBBY (not started) -> Green
                                            // IN PROGRESS -> Orange
                                            // FINISHED -> Red
                                            const badgeColor = isFinished ? 'bg-red-500' : (isStarted ? 'bg-orange-500' : 'bg-green-500');

                                            return (
                                                <div
                                                    key={village.id}
                                                    className={`flex relative items-center rounded-lg shadow-sm border border-dark/20 pr-4 transition-transform hover:-translate-y-1 ${isStarted ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                                    style={{ background: 'linear-gradient(to right, #E3D1A5 15%, #F9F4DF 15%)' }}
                                                    onClick={() => {
                                                        const isUserInGroup = village.players?.some((p: any) => p.uid === user?.uid);

                                                        // If it's already started and user is NOT inside, block join
                                                        if (isStarted && !isUserInGroup) {
                                                            alert("Ce village est déjà en partie !");
                                                            return;
                                                        }

                                                        if (village.isPrivate) {
                                                            setSelectedPrivateVillage(village);
                                                            setInputSecretCode("");
                                                            setJoiningError("");
                                                        } else {
                                                            handleJoinVillage(village);
                                                        }
                                                    }}
                                                >
                                                    {/* Big Profile Overhang */}
                                                    <div className="absolute left-0 w-24 h-24 rounded-full border-[3px] border-dark overflow-hidden flex-shrink-0 z-10">
                                                        <Image src={hostAvatars[village.hostId] || village.hostPhoto || "/assets/images/icones/Photo_Profil-transparent.png"} alt="Avatar" fill className="object-cover" />
                                                    </div>

                                                    <div className="flex-1 pl-28 py-6 pr-4 flex justify-between items-center">
                                                        <div className="flex flex-col">
                                                            <h3 className="font-enchanted text-4xl tracking-wide font-bold text-dark leading-tight line-clamp-1">{village.name}</h3>
                                                            <p className="text-dark/60 text-sm flex items-center gap-1 mt-1">
                                                                {village.mode} <Image src={village.isMicro ? '/assets/images/icones/microphone-icon.png' : '/assets/images/icones/non_microphone-icon.png'} alt={village.isMicro ? 'Micro activé' : 'Micro désactivé'} width={14} height={14} className="inline-block" />
                                                            </p>
                                                            <p className="font-bold text-sm mt-1">{village.hostPseudo}</p>
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-enchanted tracking-wide text-2xl text-dark">{village.isPrivate ? 'Privé' : 'Publique'}</span>
                                                            <span className="bg-[#E0C09C] text-dark font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                                                                {/* Affichage du count : socket en priorité, Firestore en fallback */}
                                                                {livePlayerCounts[village.id] !== undefined ? (
                                                                    <>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${badgeColor} animate-pulse flex-shrink-0`} title="Joueurs connectés en direct" />
                                                                        {livePlayerCounts[village.id]}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${badgeColor} flex-shrink-0`} title="Joueurs" />
                                                                        {village.players?.length || 1}
                                                                    </>
                                                                )}
                                                                {' / '}{village.maxPlayers || 16}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </>
                            );
                        })()}
                    </div>

                    {/* RIGHT PANEL: Lobby & Social (Right 4-5 columns) */}
                    <div className="lg:col-span-5 bg-dark text-white rounded-lg p-6 flex flex-col h-[600px] border-2 border-dark/90 shadow-2xl">

                        {/* Lobby Players */}
                        <div className="mb-6 flex-shrink-0">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-white/60 text-sm flex items-center gap-2">
                                    Groupe : ({group?.players?.length || 1} / 18 maximal)
                                    {userData?.currentGroupId && (
                                        <div className="relative ml-2">
                                            <button
                                                onClick={() => setShowGroupChat(true)}
                                                className="bg-secondary hover:bg-secondary/80 text-white text-[10px] px-2 py-1 rounded transition-colors font-bold"
                                            >
                                                <Image src="/assets/images/icones/chat-icon.png" alt="Chat" width={12} height={12} className="inline-block mr-1" /> Chat
                                            </button>
                                            {(group?.unreadCount?.[user?.uid] || 0) > 0 && (
                                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full pointer-events-none drop-shadow-md border border-[#2A2F32] px-1 z-10 animate-pulse">
                                                    {(group?.unreadCount?.[user?.uid] || 0) > 9 ? "9+" : group?.unreadCount[user.uid]}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </h3>
                                {userData?.currentGroupId && userData.currentGroupId !== user?.uid && (
                                    <button onClick={handleLeaveGroup} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase transition-colors cursor-pointer">Quitter</button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {group?.players?.map((p: any) => (
                                    <div key={p.uid} className="flex items-center justify-between gap-3 cursor-pointer group hover:bg-white/5 p-2 rounded -ml-2 transition-colors" onClick={() => router.push(`/profil/${p.uid}`)}>
                                        <div className="flex items-center gap-3">
                                            <div className={`relative w-10 h-10 rounded-full border ${p.uid === group?.hostId ? 'border-yellow-400' : 'border-[#E3D1A5]'} bg-[#E3D1A5]/20 overflow-hidden`}>
                                                <Image
                                                    src={
                                                        p.uid === user?.uid
                                                            ? (userData?.photoURL || p.photoURL || "/assets/images/icones/Photo_Profil-transparent.png")
                                                            : (friendsStatuses[p.uid]?.photoURL || p.photoURL || "/assets/images/icones/Photo_Profil-transparent.png")
                                                    }
                                                    alt="Joueur" fill className="object-cover"
                                                />
                                                {p.uid === group?.hostId && (
                                                    <div className="absolute top-0 right-0 bg-dark rounded-full leading-none p-0.5"><Image src="/assets/images/icones/couronne-icon.png" alt="Hôte" width={10} height={10} /></div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold truncate max-w-[80px]">{p.uid === user?.uid ? (userData?.pseudo || p.pseudo) : (friendsStatuses[p.uid]?.pseudo || p.pseudo)} {p.uid === user?.uid && "(Moi)"}</span>
                                                <span className="text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Connecté</span>
                                            </div>
                                        </div>
                                        {group?.hostId === user?.uid && p.uid !== user?.uid && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleKickPlayer(p); }}
                                                className="text-white/30 hover:text-red-500 hover:bg-red-500/20 rounded-full w-8 h-8 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                                title="Exclure du groupe"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Placeholder for remaining slots: Show only one if not full */}
                                {group?.players && group.players.length < 18 && (
                                    <div className="flex items-center gap-3 opacity-30">
                                        <div className="w-10 h-10 rounded-full border border-dashed border-white/50 flex items-center justify-center">
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white/50">Libre</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Search Input for Social */}
                        <div className="relative w-full border border-white/20 rounded-md bg-white/5 mb-6 flex-shrink-0">
                            <input
                                type="text"
                                placeholder="Rechercher un joueur..."
                                value={searchPlayer}
                                onChange={(e) => setSearchPlayer(e.target.value)}
                                className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Image src="/assets/images/icones/search-icon.png" alt="Rechercher" width={16} height={16} className="opacity-50" />
                            </div>

                            {/* Search Results Dropdown */}
                            {searchPlayer.trim() && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-dark border-2 border-white/20 rounded-md shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                                    {isSearchingPlayer ? (
                                        <p className="p-3 text-xs text-secondary text-center">Recherche en cours...</p>
                                    ) : playerSearchResults.length > 0 ? (
                                        playerSearchResults.map(p => {
                                            const isFriend = friends.some(f => f.friendId === p.id);
                                            const isPending = sentRequests.includes(p.id);

                                            return (
                                                <div key={p.id} className="flex flex-col md:flex-row items-center justify-between p-3 border-b border-white/5 hover:bg-white/5">
                                                    <div
                                                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={() => router.push(`/profil/${p.id}`)}
                                                        title={`Voir le profil de ${p.pseudo || p.nom}`}
                                                    >
                                                        <div className="w-8 h-8 rounded-full border border-[#E3D1A5] bg-[#E3D1A5]/20 overflow-hidden relative flex-shrink-0">
                                                            <Image src={p.photoURL || p.photo_profil || "/assets/images/icones/Photo_Profil-transparent.png"} alt="Joueur" fill className="object-cover" />
                                                        </div>
                                                        <span className="text-sm font-bold truncate max-w-[100px]">{p.pseudo || p.nom}</span>
                                                    </div>

                                                    {isFriend ? (
                                                        <span className="text-green-400 text-xs font-bold px-3 py-1">Ami</span>
                                                    ) : isPending ? (
                                                        <span className="text-white/50 text-xs font-bold px-3 py-1">En attente</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSendFriendRequest(p.id)}
                                                            className="bg-secondary text-dark text-xs font-bold px-3 py-1 rounded shadow-sm hover:bg-[#c9a785] transition-colors mt-2 md:mt-0 cursor-pointer"
                                                        >
                                                            + Ajouter
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="p-3 text-xs text-white/50 text-center">Aucun joueur trouvé.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Friends List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <h3 className="text-white/60 text-sm mb-3">Amis : ({friends.length})</h3>

                            <div className="flex flex-col gap-4">
                                {friends.length === 0 ? (
                                    <p className="text-white/40 text-xs italic text-center mt-4">Vous n'avez pas encore d'amis. Cherchez un joueur pour l'ajouter !</p>
                                ) : (
                                    [...friends].sort((a, b) => {
                                        const isOnlineA = friendsOnlinePresence[a.friendId] === true;
                                        const isOnlineB = friendsOnlinePresence[b.friendId] === true;
                                        if (isOnlineA && !isOnlineB) return -1;
                                        if (!isOnlineA && isOnlineB) return 1;
                                        const pseudoA = friendsStatuses[a.friendId]?.pseudo || a.pseudo || "";
                                        const pseudoB = friendsStatuses[b.friendId]?.pseudo || b.pseudo || "";
                                        return pseudoA.localeCompare(pseudoB);
                                    }).map(friend => {
                                        const fStatus = friendsStatuses[friend.friendId];
                                        const isOnline = friendsOnlinePresence[friend.friendId] === true;
                                        const fGroup = fStatus?.currentGroupId ? friendsGroups[fStatus.currentGroupId] : null;

                                        // Currently we don't track active gameplay state, so isInGame is false.
                                        const isInGame = false;
                                        const inGroup = fGroup && fGroup.players && fGroup.players.length > 1;

                                        return (
                                            <div key={friend.id} className="flex items-center justify-between group">
                                                <div
                                                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => router.push(`/profil/${friend.friendId}`)}
                                                    title={`Voir le profil de ${fStatus?.pseudo || friend.pseudo}`}
                                                >
                                                    <div className="relative w-10 h-10 rounded-full border border-dark bg-[#E3D1A5]/20 overflow-hidden text-dark flex items-center justify-center">
                                                        <Image src={fStatus?.photoURL || friend.photoURL || "/assets/images/icones/Photo_Profil-transparent.png"} alt="Ami" fill className="object-cover" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold truncate max-w-[120px]">{fStatus?.pseudo || friend.pseudo}</span>
                                                        <span className={`text-[10px] flex items-center gap-1 ${isOnline ? 'text-green-400' : 'text-red-500'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-500'}`}></span>
                                                            {isInGame ? 'En jeu' : isOnline ? 'Connecté' : 'Hors ligne'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-center text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {inGroup ? (
                                                        <span className="text-secondary text-xs font-bold px-2 py-1 mr-2 bg-secondary/10 rounded">En Groupe</span>
                                                    ) : isOnline ? (
                                                        <button className="hover:text-white cursor-pointer mr-2" title="Inviter au groupe" onClick={() => handleInviteToGroup(friend.friendId, friend.pseudo)}><Image src="/assets/images/icones/plus-icon.png" alt="Inviter" width={14} height={14} /></button>
                                                    ) : <span className="opacity-0 px-2 py-1 mr-2"><Image src="/assets/images/icones/plus-icon.png" alt="" width={14} height={14} /></span>}
                                                    {isInGame && (
                                                        <button className="hover:text-white cursor-pointer" title="Voir partie" onClick={() => alert("Fonctionnalité Spectateur à venir.")}><Image src="/assets/images/icones/eye-icon.png" alt="Voir partie" width={16} height={16} /></button>
                                                    )}
                                                    {isOnline && (
                                                        <div className="relative flex items-center justify-center">
                                                            <button
                                                                className="hover:text-white cursor-pointer"
                                                                title="Message"
                                                                onClick={() => setActiveChatFriend({
                                                                    id: friend.friendId,
                                                                    pseudo: fStatus?.pseudo || friend.pseudo,
                                                                    photoURL: fStatus?.photoURL || friend.photoURL
                                                                })}
                                                            >
                                                                <Image src="/assets/images/icones/message-icon.png" alt="Message" width={16} height={16} />
                                                            </button>
                                                            {unreadChats[friend.friendId] > 0 && (
                                                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full pointer-events-none drop-shadow-md border border-[#1A1D20] px-1 z-10">
                                                                    {unreadChats[friend.friendId] > 9 ? "9+" : unreadChats[friend.friendId]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Global CSS for Custom Scrollbar matching dark container */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.4);
                }
            `}</style>

            {/* Floating Private Chat */}
            {activeChatFriend && (
                <PrivateChat
                    friendId={activeChatFriend.id}
                    friendPseudo={activeChatFriend.pseudo}
                    friendPhotoURL={activeChatFriend.photoURL}
                    onClose={() => setActiveChatFriend(null)}
                />
            )}

            {/* Render Group Chat if active */}
            {showGroupChat && userData?.currentGroupId && (
                <div className="fixed bottom-4 right-4 z-[9999] md:right-8 md:bottom-8">
                    <GroupChat
                        groupId={userData.currentGroupId}
                        onClose={() => setShowGroupChat(false)}
                    />
                </div>
            )}

            {/* Private Village Join Modal */}
            {selectedPrivateVillage && (
                <div className="fixed inset-0 z-[99999] p-4 bg-black/60 backdrop-blur-sm flex items-center justify-center font-montserrat">
                    <div className="bg-[#FCF8E8] w-full max-w-md rounded-xl shadow-2xl overflow-hidden border-2 border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b-2 border-slate-800 bg-[#E3D1A5]/30">
                            <h2 className="font-enchanted text-4xl text-slate-900 font-extrabold tracking-wide mb-1">Village Privé</h2>
                            <p className="text-sm font-bold text-slate-700">{selectedPrivateVillage.name}</p>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            {joiningError && (
                                <div className="p-3 bg-red-100 text-red-700 font-bold text-sm rounded-lg border border-red-300">
                                    {joiningError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">Code Secret (<span className="text-slate-500 lowercase font-normal italic">demandez-le à l'hôte</span>)</label>
                                <input
                                    type="text"
                                    value={inputSecretCode}
                                    onChange={(e) => setInputSecretCode(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            if (inputSecretCode.trim().toUpperCase() === selectedPrivateVillage.secretCode) {
                                                handleJoinVillage(selectedPrivateVillage);
                                            } else {
                                                setJoiningError("Code secret incorrect.");
                                            }
                                        }
                                    }}
                                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 text-slate-900 focus:outline-none focus:border-slate-800 bg-white font-mono text-center text-xl tracking-widest uppercase"
                                    placeholder="XXXXXX"
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-100 border-t-2 border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setSelectedPrivateVillage(null);
                                    setInputSecretCode("");
                                    setJoiningError("");
                                }}
                                className="px-5 py-2 font-bold text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                ANNULER
                            </button>
                            <button
                                onClick={() => {
                                    if (inputSecretCode.trim().toUpperCase() === selectedPrivateVillage.secretCode) {
                                        handleJoinVillage(selectedPrivateVillage);
                                    } else {
                                        setJoiningError("Code secret incorrect.");
                                    }
                                }}
                                className="bg-slate-900 hover:bg-black text-white px-6 py-2 rounded-lg font-bold shadow-md transition-colors"
                            >
                                REJOINDRE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Reconnexion à un Village */}
            {pendingRejoinVillage && (
                <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
                    <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
                        {/* Barre de couleur en haut selon l'état */}
                        <div className={`absolute top-0 left-0 w-full h-1 ${!pendingRejoinVillage.gameStarted ? 'bg-[#D1A07A]' :
                            pendingRejoinVillage.canRejoin ? 'bg-orange-500' : 'bg-red-600'
                            }`}></div>

                        {/* Titre */}
                        <h2 className={`text-2xl font-enchanted tracking-wider mb-4 ${!pendingRejoinVillage.gameStarted ? 'text-[#D1A07A]' :
                            pendingRejoinVillage.canRejoin ? 'text-orange-400' : 'text-red-400'
                            }`}>
                            {!pendingRejoinVillage.gameStarted
                                ? 'Vous étiez dans un village'
                                : pendingRejoinVillage.canRejoin
                                    ? 'Partie en cours'
                                    : 'Accès refusé'}
                        </h2>

                        {/* Description */}
                        <p className="text-slate-300 text-sm mb-6">
                            {!pendingRejoinVillage.gameStarted ? (
                                <>
                                    Vous étiez dans le lobby du village{' '}
                                    <strong className="text-white">{pendingRejoinVillage.name}</strong>.
                                    <br /><br />
                                    Voulez-vous le rejoindre à nouveau ?
                                </>
                            ) : pendingRejoinVillage.canRejoin ? (
                                <>
                                    Une partie est en cours dans{' '}
                                    <strong className="text-white">{pendingRejoinVillage.name}</strong>.
                                    <br /><br />
                                    Vous avez <span className="font-bold text-orange-400">{rejoinCountdown ?? 60}s</span> pour revenir
                                    avant d&apos;être définitivement déconnecté.
                                </>
                            ) : (
                                <>
                                    La partie dans{' '}
                                    <strong className="text-white">{pendingRejoinVillage.name}</strong>{' '}
                                    a déjà commencé et vous n&apos;en faisiez pas partie.
                                    <br /><br />
                                    <span className="text-red-400 font-bold">Vous ne pouvez pas rejoindre cette partie.</span>
                                </>
                            )}
                        </p>

                        {/* Barre de progression pour le compte à rebours */}
                        {pendingRejoinVillage.gameStarted && pendingRejoinVillage.canRejoin && rejoinCountdown !== null && (
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-6 overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 transition-all duration-1000"
                                    style={{ width: `${(rejoinCountdown / 60) * 100}%` }}
                                />
                            </div>
                        )}

                        {/* Boutons */}
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={async () => {
                                    if (rejoinCountdownRef.current) clearInterval(rejoinCountdownRef.current);
                                    setRejoinCountdown(null);
                                    if (user && pendingRejoinVillage.id) {
                                        try {
                                            const groupRef = doc(db, "groups", pendingRejoinVillage.id);
                                            const groupSnap = await getDoc(groupRef);
                                            if (groupSnap.exists()) {
                                                const gData = groupSnap.data();
                                                if (gData.players && gData.players.length <= 1) {
                                                    await deleteGroupCompletely(pendingRejoinVillage.id);
                                                } else {
                                                    const updatedPlayers = gData.players.filter((p: any) => p.uid !== user.uid);
                                                    await updateDoc(groupRef, { players: updatedPlayers });
                                                }
                                            }
                                            await updateDoc(doc(db, "users", user.uid), { currentGroupId: '' });
                                        } catch (e) {
                                            console.error("Error leaving pending village:", e);
                                        }
                                    }
                                    setPendingRejoinVillage(null);
                                }}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded shadow transition-colors flex-1 uppercase text-sm tracking-wide"
                            >
                                Quitter
                            </button>
                            {pendingRejoinVillage.canRejoin && (
                                <button
                                    onClick={() => {
                                        if (rejoinCountdownRef.current) clearInterval(rejoinCountdownRef.current);
                                        setRejoinCountdown(null);
                                        isNavigatingRef.current = true;
                                        router.push(`/room/${pendingRejoinVillage.id}`);
                                    }}
                                    className={`px-6 py-2 text-white font-bold rounded shadow transition-colors flex-1 uppercase text-sm tracking-wide ${pendingRejoinVillage.gameStarted
                                        ? 'bg-orange-600 hover:bg-orange-500'
                                        : 'bg-[#D1A07A] hover:bg-[#b08465] text-dark'
                                        }`}
                                >
                                    Rejoindre
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
