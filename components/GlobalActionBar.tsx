'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc, setDoc, deleteDoc, addDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import PrivateChat from './PrivateChat';
import { useThemeStore } from '../store/themeStore';

export default function GlobalActionBar() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);

    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    const [unreadChatsList, setUnreadChatsList] = useState<any[]>([]);
    const [friends, setFriends] = useState<Record<string, any>>({});
    const [showMessagesDropdown, setShowMessagesDropdown] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const { isDarkMode, toggleDarkMode } = useThemeStore();

    // Private chat state
    const [activeChatFriend, setActiveChatFriend] = useState<{ id: string, pseudo: string, photoURL: string } | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const messagesDropdownRef = useRef<HTMLDivElement>(null);

    // Click outside to close the dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (messagesDropdownRef.current && !messagesDropdownRef.current.contains(event.target as Node)) {
                setShowMessagesDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        let unsubNotifs = () => { };
        let unsubChats = () => { };
        let unsubUser = () => { };
        let unsubFriends = () => { };

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Listen to User Data
                unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    }
                });

                // Listen to friends to get pseudo/photoURL for chats
                const qFriends = query(collection(db, "users", currentUser.uid, "friends"));
                unsubFriends = onSnapshot(qFriends, (snapshot) => {
                    const friendsMap: Record<string, any> = {};
                    snapshot.forEach(doc => {
                        friendsMap[doc.id] = doc.data();
                    });
                    setFriends(friendsMap);
                });

                // Listen to Notifications
                const qNotifs = query(
                    collection(db, "users", currentUser.uid, "notifications"),
                    orderBy("createdAt", "desc")
                );
                unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
                    const notifsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as any));
                    setNotifications(notifsData);
                });

                // Listen to unread chats
                const qChats = query(
                    collection(db, "chats"),
                    where("participants", "array-contains", currentUser.uid)
                );
                unsubChats = onSnapshot(qChats, (snapshot) => {
                    let totalUnread = 0;
                    const unreadList: any[] = [];

                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const count = data.unreadCount?.[currentUser.uid] || 0;
                        if (count > 0) {
                            totalUnread += count;
                            const otherUserId = data.participants.find((p: string) => p !== currentUser.uid);
                            if (otherUserId) {
                                unreadList.push({
                                    chatId: doc.id,
                                    friendId: otherUserId,
                                    count,
                                    lastUpdated: data.lastUpdated
                                });
                            }
                        }
                    });

                    // Sort unread list by most recent
                    unreadList.sort((a, b) => {
                        const timeA = a.lastUpdated?.toMillis() || 0;
                        const timeB = b.lastUpdated?.toMillis() || 0;
                        return timeB - timeA;
                    });

                    setUnreadChatsList(unreadList);
                    setUnreadMessages(totalUnread);
                });
            } else {
                setNotifications([]);
                setUnreadMessages(0);
                setUnreadChatsList([]);
                setFriends({});
                unsubNotifs();
                unsubChats();
                unsubUser();
                unsubFriends();
            }
        });

        return () => {
            unsubscribeAuth();
            unsubNotifs();
            unsubChats();
            unsubUser();
            unsubFriends();
        };
    }, []);

    const handleDeleteNotif = async (notifId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "notifications", notifId));
        } catch (error) {
            console.error("Error deleting notification", error);
        }
    };

    const handleAcceptFriend = async (notif: any) => {
        if (!user || !userData) return;
        try {
            // 1. Add them to my friends list
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

            // 3. Delete notification
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
        if (!user || !userData) return;
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

    const handleAcceptGroupInvite = async (notif: any) => {
        if (!user || !userData) return;
        try {
            const groupDoc = await getDoc(doc(db, "groups", notif.groupId));
            let destination = '/play';

            if (groupDoc.exists()) {
                const groupData = groupDoc.data();

                // Check if it's a village
                if (groupData.isVillage) {
                    if (groupData.gameStarted) {
                        alert("Ce village est déjà en partie !");
                        await handleDeleteNotif(notif.id);
                        return;
                    }
                    const maxPlayers = groupData.maxPlayers || 16;
                    if (groupData.players && groupData.players.length >= maxPlayers) {
                        alert("Ce village est complet !");
                        await handleDeleteNotif(notif.id);
                        return;
                    }
                    destination = `/room/${notif.groupId}`;
                } else {
                    // It's a standard group lobby
                    if (groupData.players && groupData.players.length >= 18) {
                        alert("Ce groupe est complet !");
                        await handleDeleteNotif(notif.id);
                        return;
                    }
                }
            } else {
                alert("Ce groupe n'existe plus.");
                await handleDeleteNotif(notif.id);
                return;
            }

            if (userData.currentGroupId && userData.currentGroupId !== user.uid) {
                await updateDoc(doc(db, "groups", userData.currentGroupId), {
                    players: arrayRemove({ uid: user.uid, pseudo: userData.pseudo, photoURL: userData.photoURL || "/assets/images/icones/Photo_Profil-transparent.png" })
                });
            }

            await updateDoc(doc(db, "groups", notif.groupId), {
                players: arrayUnion({ uid: user.uid, pseudo: userData.pseudo, photoURL: userData.photoURL || "/assets/images/icones/Photo_Profil-transparent.png" })
            });

            await updateDoc(doc(db, "users", user.uid), {
                currentGroupId: notif.groupId
            });

            await handleDeleteNotif(notif.id);
            router.push(destination);
        } catch (error) {
            console.error("Error accepting group invite", error);
        }
    };

    const unreadNotifsCount = notifications.filter(n => !n.read && n.type !== 'friend_request_accepted' && n.type !== 'friend_request_rejected').length;
    // Note: To keep it similar, we show length of all notifications acting as unread actions.
    const activeNotifsCount = notifications.length;

    if (!user) return null;

    const totalUnreadCount = activeNotifsCount + unreadMessages;

    return (
        <div className="fixed top-24 right-3 flex flex-col items-center gap-3 pointer-events-none z-[210]">
            {/* Main Toggle Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="group pointer-events-auto relative w-10 h-10 md:w-12 md:h-12 bg-[#FCF8E8] rounded-full shadow-[0_0_15px_rgba(0,0,0,0.2)] border-[2px] md:border-[3px] border-secondary text-dark hover:bg-white hover:scale-105 transition-all flex items-center justify-center cursor-pointer z-[210]"
                title="Menu Social"
            >
                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                    {isExpanded ? (
                        <Image src="/assets/images/icones/close-icon_black.png" alt="Social" width={22} height={22} className="opacity-80 group-hover:opacity-100" />
                    ) : (
                        <Image src="/assets/images/icones/hello-icon_black.png" alt="Social" width={22} height={22} className="opacity-80 group-hover:opacity-100" />
                    )}
                </div>
                {!isExpanded && totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-lg border-2 border-white z-10 pointer-events-none">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                )}
            </button>

            {/* Collapsible Container for Notifications and Messages */}
            <div className={`flex flex-col gap-3 items-center transition-all duration-300 ease-in-out origin-top ${isExpanded ? 'opacity-100 translate-y-0 scale-100 z-[200] pointer-events-auto' : 'opacity-0 -z-[200] -translate-y-10 scale-95 pointer-events-none'}`}>

                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className="group relative md:w-10 md:h-10 w-8.5 h-8.5 bg-dark rounded-full shadow-lg border-2 border-[#1A1D20] hover:-translate-y-1 transition-all flex items-center justify-center cursor-pointer"
                    title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
                >
                    <Image
                        src={isDarkMode ? "/assets/images/icones/moon-icon.png" : "/assets/images/icones/sun-icon.png"}
                        alt="Thème"
                        width={18}
                        height={18}
                        className="transition-transform duration-300 group-hover:scale-110"
                    />
                </button>
                {/* Notifications Button */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="group relative md:w-10 md:h-10 w-8.5 h-8.5 bg-dark rounded-full shadow-lg border-2 border-[#1A1D20] text-white/80 hover:text-white hover:-translate-y-1 transition-all flex items-center justify-center cursor-pointer"
                        title="Notifications"
                    >
                        <Image src="/assets/images/icones/bell-icon.png" alt="Notifications" width={18} height={18} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                        {/* The text "Notifications" is removed from the button itself as it's a floating icon bar */}
                        {activeNotifsCount > 0 && (
                            <span className="absolute -top-1 -left-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-lg border-2 border-[#2A2F32] z-10 pointer-events-none">
                                {activeNotifsCount > 99 ? '99+' : activeNotifsCount}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="absolute max-w-[300px] top-0 right-full mr-4 w-80 bg-white border-2 border-dark rounded-lg shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all">
                            <div className="p-4 bg-dark text-white border-b border-dark">
                                <h3 className="font-bold">Notifications</h3>
                            </div>
                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <p className="p-4 text-center text-dark/50 text-sm">Aucune nouvelle notification.</p>
                                ) : (
                                    notifications.map(notif => (
                                        <div key={notif.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 flex flex-col gap-2 relative">
                                            <div className="flex items-center gap-3 pr-4">
                                                <div className="w-10 h-10 rounded-full bg-dark overflow-hidden relative flex-shrink-0">
                                                    <Image src={notif.fromPhotoURL || "/assets/images/icones/Photo_Profil-transparent.png"} alt="Expéditeur" fill className="object-cover" sizes="40px" />
                                                </div>
                                                <p className="text-sm text-dark">
                                                    <span className="font-bold cursor-pointer hover:underline" onClick={() => { setShowNotifications(false); router.push(`/profil/${notif.fromUserId}`); }}>{notif.fromPseudo}</span>
                                                    {notif.type === 'friend_request' && " vous a envoyé une demande d'ami."}
                                                    {notif.type === 'friend_request_accepted' && " a accepté votre demande d'ami."}
                                                    {notif.type === 'friend_request_rejected' && " a refusé votre demande d'ami."}
                                                    {notif.type === 'group_invite' && " vous a invité à rejoindre son groupe."}
                                                </p>
                                            </div>

                                            {(notif.type !== 'friend_request' && notif.type !== 'group_invite') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteNotif(notif.id); }}
                                                    className="absolute top-4 right-4 text-dark/40 hover:text-dark font-bold cursor-pointer"
                                                >
                                                    ✕
                                                </button>
                                            )}

                                            {notif.type === 'friend_request' && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={() => handleAcceptFriend(notif)}
                                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded cursor-pointer transition-colors"
                                                    >
                                                        Accepter
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectFriend(notif)}
                                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 rounded cursor-pointer transition-colors"
                                                    >
                                                        Refuser
                                                    </button>
                                                </div>
                                            )}

                                            {notif.type === 'group_invite' && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={() => handleAcceptGroupInvite(notif)}
                                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded transition-colors cursor-pointer"
                                                    >
                                                        Rejoindre
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNotif(notif.id)}
                                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 rounded transition-colors cursor-pointer"
                                                    >
                                                        Refuser
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages Button */}
                <div className="relative" ref={messagesDropdownRef}>
                    <button
                        onClick={() => setShowMessagesDropdown(!showMessagesDropdown)}
                        className="group relative md:w-10 md:h-10 w-8.5 h-8.5 bg-dark rounded-full shadow-lg border-2 border-[#1A1D20] text-white/80 hover:text-white hover:-translate-y-1 transition-all flex items-center justify-center cursor-pointer"
                        title="Messages Privés"
                    >
                        <Image src="/assets/images/icones/message-icon.png" alt="Messages" width={18} height={18} className="transition-transform duration-300 group-hover:scale-110" />
                        {/* The text "Messages" is removed from the button itself as it's a floating icon bar */}
                        {unreadMessages > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full shadow-lg border-2 border-[#1A1D20] z-10 pointer-events-none">
                                {unreadMessages > 99 ? '99+' : unreadMessages}
                            </span>
                        )}
                    </button>

                    {/* Messages Dropdown */}
                    {showMessagesDropdown && (
                        <div className="absolute max-w-[300px] top-0 right-full mr-4 w-80 bg-white border-2 border-dark rounded-lg shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all">
                            <div className="p-4 bg-dark text-white border-b border-dark">
                                <h3 className="font-bold">Messages Non Lus</h3>
                            </div>
                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                {unreadChatsList.length === 0 ? (
                                    <p className="p-4 text-center text-dark/50 text-sm">Aucun nouveau message.</p>
                                ) : (
                                    unreadChatsList.map(chat => {
                                        const friendInfo = friends[chat.friendId] || { pseudo: "Utilisateur inconnu", photoURL: "/assets/images/icones/Photo_Profil-transparent.png" };
                                        return (
                                            <div key={chat.chatId}
                                                // Actuellement, cliquer amène vers /play, mais maintenant on ouvre le chat directement
                                                onClick={() => {
                                                    setShowMessagesDropdown(false);
                                                    setActiveChatFriend({
                                                        id: chat.friendId,
                                                        pseudo: friendInfo.pseudo,
                                                        photoURL: friendInfo.photoURL
                                                    });
                                                }}
                                                className="p-4 border-b border-gray-100 hover:bg-gray-50 flex items-center gap-3 relative cursor-pointer group"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-dark overflow-hidden relative flex-shrink-0">
                                                    <Image src={friendInfo.photoURL} alt="Ami" fill className="object-cover" sizes="40px" />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <p className="text-sm text-dark font-bold truncate group-hover:text-secondary transition-colors">
                                                        {friendInfo.pseudo}
                                                    </p>
                                                    <p className="text-xs text-red-500 font-bold mt-0.5">
                                                        {chat.count} message(s) non lu(s)
                                                    </p>
                                                </div>
                                                <div className="absolute right-4 opacity-50">
                                                    <Image src="/assets/images/icones/chat-icon.png" alt="Message" width={18} height={18} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Private Chat */}
            {activeChatFriend && (
                <div className="fixed bottom-4 right-4 z-[9999] md:right-8 md:bottom-8 pointer-events-auto">
                    <PrivateChat
                        friendId={activeChatFriend.id}
                        friendPseudo={activeChatFriend.pseudo}
                        friendPhotoURL={activeChatFriend.photoURL}
                        onClose={() => setActiveChatFriend(null)}
                    />
                </div>
            )}

        </div>
    );
}
