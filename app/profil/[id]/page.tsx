'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../components/Header';
import { db } from '../../../lib/firebase';
import { doc, getDoc, deleteDoc, setDoc, collection, addDoc, query, where, onSnapshot, getCountFromServer, getDocs, orderBy, limit } from 'firebase/firestore';
import PrivateChat from '../../../components/PrivateChat';
import ProfileAvatarHeader from '../../../components/profile/ProfileAvatarHeader';
import ProfileStats from '../../../components/profile/ProfileStats';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLES, RoleId } from '../../../types/roles';

export default function PlayerProfilePage() {
    const router = useRouter();
    const toast = useToast();
    const params = useParams();
    const playerId = params.id as string;

    // Auth vient du contexte global — plus de listener Firebase en double
    const { user: currentUser, userData: currentUserData, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [playerData, setPlayerData] = useState<Record<string, unknown> | null>(null);
    const [isFriend, setIsFriend] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [hasBlockedMe, setHasBlockedMe] = useState(false);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [playerRank, setPlayerRank] = useState<number | null>(null);

    // --- Private Chat State ---
    const [showChat, setShowChat] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // --- Game History State ---
    const [gameHistory, setGameHistory] = useState<Record<string, unknown>[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        // Attendre que l'auth soit résolue avant de faire quoi que ce soit
        if (authLoading) return;

        let unsubFriend: (() => void) | undefined;
        let unsubBlocked: (() => void) | undefined;
        let unsubBlockedMe: (() => void) | undefined;
        let unsubNotif: (() => void) | undefined;
        let active = true;

        (async () => {
            if (!playerId) { setLoading(false); return; }
            try {
                // Récupérer les données du joueur cible
                const docSnap = await getDoc(doc(db, "users", playerId));
                if (!active) return;

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setPlayerData(data);

                    // Rang dynamique
                    if (data.stats?.points !== undefined) {
                        try {
                            const qRank = query(collection(db, "users"), where("stats.points", ">", data.stats.points));
                            const snapshot = await getCountFromServer(qRank);
                            if (active) setPlayerRank(snapshot.data().count + 1);
                        } catch (rankError) {
                            console.error("Error fetching player rank:", rankError);
                        }
                    }
                } else {
                    setPlayerData(null);
                }

                // Abonnements temps-réel uniquement si connecté
                if (currentUser) {
                    // currentUserData déjà disponible depuis useAuth() — pas besoin de getDoc

                    unsubFriend = onSnapshot(doc(db, "users", currentUser.uid, "friends", playerId), (s) => {
                        setIsFriend(s.exists() && s.data()?.status === "accepted");
                    });

                    unsubBlocked = onSnapshot(doc(db, "users", currentUser.uid, "blocked", playerId), (s) => {
                        setIsBlocked(s.exists());
                    });

                    unsubBlockedMe = onSnapshot(doc(db, "users", playerId, "blocked", currentUser.uid), (s) => {
                        setHasBlockedMe(s.exists());
                    });

                    const notifRef = collection(db, "users", playerId, "notifications");
                    const q = query(notifRef, where("type", "==", "friend_request"), where("fromUserId", "==", currentUser.uid));
                    const unsubNotifReal = onSnapshot(q, (s) => { setHasPendingRequest(!s.empty); });

                    const chatId = [currentUser.uid, playerId].sort().join("_");
                    const unsubChat = onSnapshot(doc(db, "chats", chatId), (chatSnap) => {
                        setUnreadCount(chatSnap.exists() ? (chatSnap.data().unreadCount?.[currentUser.uid] || 0) : 0);
                    });

                    unsubNotif = () => { unsubNotifReal(); unsubChat(); };
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des données :", error);
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
            if (unsubFriend) unsubFriend();
            if (unsubBlocked) unsubBlocked();
            if (unsubBlockedMe) unsubBlockedMe();
            if (unsubNotif) unsubNotif();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, currentUser?.uid, playerId]);

    const handleRemoveFriend = async () => {
        if (!currentUser) {
            toast.error("Vous devez être connecté pour retirer un ami.");
            return;
        }
        if (!playerId || !playerData) {
            toast.error("Les données du joueur sont incomplètes.");
            return;
        }

        const confirmRemove = window.confirm(`Voulez-vous vraiment retirer ${playerData.pseudo} de vos amis ?`);
        if (!confirmRemove) return;

        try {
            await deleteDoc(doc(db, "users", currentUser.uid, "friends", playerId));
            await deleteDoc(doc(db, "users", playerId, "friends", currentUser.uid));
            setIsFriend(false);
            toast.success(`${playerData.pseudo} a été retiré de vos amis.`);
        } catch (error) {
            console.error("Erreur lors de la suppression de l'ami :", error);
            toast.error("Erreur lors de la suppression.");
        }
    };

    const handleBlockPlayer = async () => {
        if (!currentUser) {
            toast.error("Vous devez être connecté pour bloquer un joueur.");
            return;
        }
        if (!playerId || !playerData) {
            toast.error("Les données du joueur sont incomplètes.");
            return;
        }

        try {
            if (isBlocked) {
                await deleteDoc(doc(db, "users", currentUser.uid, "blocked", playerId));
                setIsBlocked(false);
                toast.success(`${playerData.pseudo} a été débloqué.`);
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
                toast.success(`${playerData.pseudo} a été bloqué.`);
            }
        } catch (error) {
            console.error("Erreur lors du blocage :", error);
            toast.error("Erreur lors de l'opération.");
        }
    };

    const handleSendFriendRequest = async () => {
        if (!currentUser || !currentUserData) {
            toast.error("Vous devez être connecté pour envoyer une demande d'ami.");
            return;
        }
        if (!playerData) {
            toast.error("Les données du joueur sont incomplètes.");
            return;
        }
        if (hasBlockedMe) {
            toast.warning("Impossible d'envoyer une demande à ce joueur.");
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
            toast.success("Demande d'ami envoyée !");
        } catch (err) {
            console.error("Error sending friend request", err);
            toast.error("Erreur lors de l'envoi de la demande.");
        }
    };

    useEffect(() => {
        if (!playerId) return;
        const fetchHistory = async () => {
            try {
                const q = query(
                    collection(db, "users", playerId, "gameHistory"),
                    orderBy("playedAt", "desc"),
                    limit(15)
                );
                const snap = await getDocs(q);
                setGameHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.warn("Impossible de charger l'historique:", e);
            } finally {
                setHistoryLoading(false);
            }
        };
        fetchHistory();
    }, [playerId]);

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

    return (
        <div className="min-h-screen w-full bg-background text-dark font-montserrat flex flex-col">
            <Header />

            <main className="flex-1 flex flex-col items-center px-4 py-8 pb-32">
                <div className="w-full max-w-3xl flex flex-col">

                    {/* Main Card (Header) */}
                    <ProfileAvatarHeader
                        playerId={playerId}
                        playerData={playerData}
                        currentUser={currentUser as unknown as Record<string, unknown> | null}
                        isFriend={isFriend}
                        hasBlockedMe={hasBlockedMe}
                        isBlocked={isBlocked}
                        hasPendingRequest={hasPendingRequest}
                        unreadCount={unreadCount}
                        onMessage={() => {
                            if (hasBlockedMe) toast.warning("Impossible d'envoyer un message à ce joueur.");
                            else setShowChat(true);
                        }}
                        onRemoveFriend={handleRemoveFriend}
                        onSendFriendRequest={handleSendFriendRequest}
                        onBlockPlayer={handleBlockPlayer}
                        onGoBack={() => router.back()}
                    />


                    {/* Stats Wrapper */}
                    <ProfileStats
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        stats={{ ...(playerData.stats as any), rank: playerRank }}
                    />

                </div>

                {/* Historique de parties */}
                {!historyLoading && gameHistory.length > 0 && (
                    <div className="w-full max-w-3xl mt-6 mb-8">
                        <div className="w-full bg-[#2A2F32] rounded-xl p-6 md:p-8 shadow-2xl">
                            <h3 className="text-white font-bold text-xl mb-6 border-b border-white/10 pb-4">
                                Historique des parties
                            </h3>
                            <div className="flex flex-col gap-3">
                                {gameHistory.map((entry) => {
                                    const roleDef = entry.roleId ? ROLES[entry.roleId as RoleId] : null;
                                    const campColor = entry.roleCamp === 'LOUPS' ? 'text-red-400' : entry.roleCamp === 'SOLO' ? 'text-purple-400' : 'text-green-400';
                                    const date = entry.playedAt ? new Date(entry.playedAt as string).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
                                    return (
                                        <div key={entry.id as string} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${entry.hasWon ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                            <div className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden border border-white/10 bg-white/5">
                                                {roleDef?.image ? (
                                                    <Image src={roleDef.image} alt={(entry.roleLabel as string) || '?'} fill className="object-contain p-1" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">?</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate ${campColor}`}>{(entry.roleLabel as string) || '?'}</p>
                                                <p className="text-xs text-white/40">{entry.playerCount as number} joueurs · {date}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${entry.hasWon ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {entry.hasWon ? 'Victoire' : 'Défaite'}
                                                </span>
                                                <span className="text-xs text-[#D1A07A] font-bold">+{(entry.points as number) ?? 0} pts</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Floating Private Chat */}
            {showChat && (
                <PrivateChat
                    friendId={playerId}
                    friendPseudo={(playerData?.pseudo as string) || "Joueur"}
                    friendPhotoURL={(playerData?.photoURL as string) || "/assets/images/icones/Photo_Profil-transparent.png"}
                    onClose={() => setShowChat(false)}
                />
            )}
        </div>
    );
}
