'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../components/Header';
import { db, auth } from '../../../lib/firebase';
import { doc, getDoc, deleteDoc, setDoc, collection, addDoc, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import PrivateChat from '../../../components/PrivateChat';
import ProfileAvatarHeader from '../../../components/profile/ProfileAvatarHeader';
import ProfileStats from '../../../components/profile/ProfileStats';

export default function PlayerProfilePage() {
    const router = useRouter();
    const params = useParams();
    const playerId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [playerData, setPlayerData] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentUserData, setCurrentUserData] = useState<any>(null);
    const [isFriend, setIsFriend] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [hasBlockedMe, setHasBlockedMe] = useState(false);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);

    // --- Private Chat State ---
    const [showChat, setShowChat] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let unsubFriend: () => void;
        let unsubBlocked: () => void;
        let unsubBlockedMe: () => void;
        let unsubNotif: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (!playerId) return;

            try {
                // Fetch target player data
                const docSnap = await getDoc(doc(db, "users", playerId));
                if (docSnap.exists()) {
                    setPlayerData(docSnap.data());
                } else {
                    setPlayerData(null);
                }

                // Cleanup previous listeners if any
                if (unsubFriend) unsubFriend();
                if (unsubBlocked) unsubBlocked();
                if (unsubBlockedMe) unsubBlockedMe();
                if (unsubNotif) unsubNotif();

                // Check friendship if logged in
                if (user) {
                    // Fetch current user data for notifications
                    const currentUserDoc = await getDoc(doc(db, "users", user.uid));
                    if (currentUserDoc.exists()) {
                        setCurrentUserData(currentUserDoc.data());
                    }

                    unsubFriend = onSnapshot(doc(db, "users", user.uid, "friends", playerId), (docSnap) => {
                        setIsFriend(docSnap.exists() && docSnap.data()?.status === "accepted");
                    });

                    unsubBlocked = onSnapshot(doc(db, "users", user.uid, "blocked", playerId), (docSnap) => {
                        setIsBlocked(docSnap.exists());
                    });

                    unsubBlockedMe = onSnapshot(doc(db, "users", playerId, "blocked", user.uid), (docSnap) => {
                        setHasBlockedMe(docSnap.exists());
                    });

                    const notifRef = collection(db, "users", playerId, "notifications");
                    const q = query(notifRef, where("type", "==", "friend_request"), where("fromUserId", "==", user.uid));
                    unsubNotif = onSnapshot(q, (snapshot) => {
                        setHasPendingRequest(!snapshot.empty);
                    });

                    // Check unread count for this specific chat
                    const chatId = [user.uid, playerId].sort().join("_");
                    const chatRef = doc(db, "chats", chatId);
                    const unsubChat = onSnapshot(chatRef, (chatSnap) => {
                        if (chatSnap.exists()) {
                            const data = chatSnap.data();
                            setUnreadCount(data.unreadCount?.[user.uid] || 0);
                        } else {
                            setUnreadCount(0);
                        }
                    });

                    // We redefine the cleanup to include unsubChat
                    const origUnsubNotif = unsubNotif;
                    unsubNotif = () => {
                        origUnsubNotif();
                        unsubChat();
                    };
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des données :", error);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubFriend) unsubFriend();
            if (unsubBlocked) unsubBlocked();
            if (unsubBlockedMe) unsubBlockedMe();
            if (unsubNotif) unsubNotif();
        };
    }, [playerId]);

    const handleRemoveFriend = async () => {
        if (!currentUser) {
            alert("Vous devez être connecté pour retirer un ami.");
            return;
        }
        if (!playerId || !playerData) {
            alert("Les données du joueur sont incomplètes.");
            return;
        }

        const confirmRemove = window.confirm(`Voulez-vous vraiment retirer ${playerData.pseudo} de vos amis ?`);
        if (!confirmRemove) return;

        try {
            await deleteDoc(doc(db, "users", currentUser.uid, "friends", playerId));
            await deleteDoc(doc(db, "users", playerId, "friends", currentUser.uid));
            setIsFriend(false);
            alert(`${playerData.pseudo} a été retiré de vos amis.`);
        } catch (error) {
            console.error("Erreur lors de la suppression de l'ami :", error);
            alert("Erreur lors de la suppression.");
        }
    };

    const handleBlockPlayer = async () => {
        if (!currentUser) {
            alert("Vous devez être connecté pour bloquer un joueur.");
            return;
        }
        if (!playerId || !playerData) {
            alert("Les données du joueur sont incomplètes.");
            return;
        }

        try {
            if (isBlocked) {
                await deleteDoc(doc(db, "users", currentUser.uid, "blocked", playerId));
                setIsBlocked(false);
                alert(`${playerData.pseudo} a été débloqué.`);
            } else {
                const confirmBlock = window.confirm(`Voulez-vous vraiment bloquer ${playerData.pseudo} ? Il ne pourra plus vous envoyer de demandes d'amis ni de messages.`);
                if (!confirmBlock) return;

                await setDoc(doc(db, "users", currentUser.uid, "blocked", playerId), {
                    blockedAt: new Date().toISOString()
                });

                if (isFriend) {
                    await deleteDoc(doc(db, "users", currentUser.uid, "friends", playerId));
                    await deleteDoc(doc(db, "users", playerId, "friends", currentUser.uid));
                    setIsFriend(false);
                }

                setIsBlocked(true);
                alert(`${playerData.pseudo} a été bloqué.`);
            }
        } catch (error) {
            console.error("Erreur lors du blocage :", error);
            alert("Erreur lors de l'opération.");
        }
    };

    const handleSendFriendRequest = async () => {
        if (!currentUser || !currentUserData) {
            alert("Vous devez être connecté pour envoyer une demande d'ami.");
            return;
        }
        if (!playerData) {
            alert("Les données du joueur sont incomplètes.");
            return;
        }
        if (hasBlockedMe) {
            alert("Impossible d'envoyer une demande à ce joueur.");
            return;
        }

        try {
            const notifRef = collection(db, "users", playerId, "notifications");
            await addDoc(notifRef, {
                type: "friend_request",
                fromUserId: currentUser.uid,
                fromPseudo: currentUserData?.pseudo || currentUser.displayName || "Joueur",
                fromPhotoURL: currentUserData?.photoURL || currentUser.photoURL || "/assets/images/icones/Photo_Profil-transparent.png",
                createdAt: new Date().toISOString(),
                read: false
            });
            setHasPendingRequest(true);
            alert("Demande d'ami envoyée !");
        } catch (err) {
            console.error("Error sending friend request", err);
            alert("Erreur lors de l'envoi de la demande.");
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-screen bg-primary flex flex-col items-center justify-center">
                <Image src="/assets/images/logo_fullmoon.png" alt="Loading" width={80} height={80} className="animate-pulse mb-4" />
                <p className="text-secondary font-enchanted text-5xl">Chargement...</p>
            </div>
        );
    }

    if (!playerData) {
        return (
            <div className="min-h-screen w-full bg-background text-dark font-montserrat flex flex-col">
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center px-4">
                    <h1 className="font-enchanted text-4xl text-dark">Joueur introuvable</h1>
                    <button onClick={() => router.back()} className="mt-8 bg-dark text-white px-6 py-2 rounded">Retour</button>
                </main>
            </div>
        );
    }

    const stats = playerData.stats || {
        totalWins: 0,
        totalLosses: 0,
        totalLeaves: 0,
        villageWins: 0,
        villageLosses: 0,
        werewolfWins: 0,
        werewolfLosses: 0,
        soloWins: 0,
        soloLosses: 0,
        rank: "Non classé"
    };

    const totalGames = stats.totalWins + stats.totalLosses + stats.totalLeaves;
    const winRate = totalGames > 0 ? Math.round((stats.totalWins / totalGames) * 100) : 0;
    const lossRate = totalGames > 0 ? Math.round((stats.totalLosses / totalGames) * 100) : 0;
    const leaveRate = totalGames > 0 ? Math.round((stats.totalLeaves / totalGames) * 100) : 0;

    return (
        <div className="min-h-screen w-full bg-background text-dark font-montserrat flex flex-col">
            <Header />

            <main className="flex-1 flex flex-col items-center px-4 py-8 pb-32">
                <div className="w-full max-w-3xl flex flex-col">

                    {/* Main Card (Header) */}
                    <ProfileAvatarHeader
                        playerId={playerId}
                        playerData={playerData}
                        currentUser={currentUser}
                        isFriend={isFriend}
                        hasBlockedMe={hasBlockedMe}
                        isBlocked={isBlocked}
                        hasPendingRequest={hasPendingRequest}
                        unreadCount={unreadCount}
                        onMessage={() => {
                            if (hasBlockedMe) alert("Impossible d'envoyer un message à ce joueur.");
                            else setShowChat(true);
                        }}
                        onRemoveFriend={handleRemoveFriend}
                        onSendFriendRequest={handleSendFriendRequest}
                        onBlockPlayer={handleBlockPlayer}
                        onGoBack={() => router.back()}
                    />

                    {/* Divider */}
                    <div className="w-full h-px bg-white/10 relative z-10 mx-auto max-w-[90%]"></div>

                    {/* Stats Wrapper */}
                    <ProfileStats stats={stats} />

                </div>
            </main>

            {/* Floating Private Chat */}
            {showChat && (
                <PrivateChat
                    friendId={playerId}
                    friendPseudo={playerData?.pseudo || "Joueur"}
                    friendPhotoURL={playerData?.photoURL || "/assets/images/icones/Photo_Profil-transparent.png"}
                    onClose={() => setShowChat(false)}
                />
            )}
        </div>
    );
}
