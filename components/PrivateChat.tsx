"use client";

import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, doc, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, getDoc, updateDoc } from "firebase/firestore";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";

interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: any;
}

interface PrivateChatProps {
    friendId: string;
    friendPseudo: string;
    friendPhotoURL: string;
    onClose: () => void;
}

export default function PrivateChat({ friendId, friendPseudo, friendPhotoURL, onClose }: PrivateChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isFriend, setIsFriend] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [hasBlockedMe, setHasBlockedMe] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Check friendship & block status
    useEffect(() => {
        if (!currentUser || !friendId) return;

        // Check if they are friends
        const unsubFriend = onSnapshot(doc(db, "users", currentUser.uid, "friends", friendId), (docSnap) => {
            setIsFriend(docSnap.exists() && docSnap.data()?.status === "accepted");
        });

        // Check if I blocked them
        const unsubBlocked = onSnapshot(doc(db, "users", currentUser.uid, "blocked", friendId), (docSnap) => {
            setIsBlocked(docSnap.exists());
        });

        // Check if they blocked me
        const unsubBlockedMe = onSnapshot(doc(db, "users", friendId, "blocked", currentUser.uid), (docSnap) => {
            setHasBlockedMe(docSnap.exists());
        });

        return () => {
            unsubFriend();
            unsubBlocked();
            unsubBlockedMe();
        };
    }, [currentUser, friendId]);

    // Generate unique Chat ID (Alphabetical order of UIDs)
    const getChatId = () => {
        if (!currentUser || !friendId) return null;
        return [currentUser.uid, friendId].sort().join("_");
    };

    // Load Messages
    useEffect(() => {
        const chatId = getChatId();
        if (!chatId || !isFriend || isBlocked || hasBlockedMe) return;

        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: Message[] = [];
            snapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() } as Message);
            });
            setMessages(msgs);
            scrollToBottom();
        });

        // Mark as read whenchat is open
        const markAsRead = async () => {
            try {
                const chatDocRef = doc(db, "chats", chatId);
                const chatDocSnap = await getDoc(chatDocRef);
                if (chatDocSnap.exists()) {
                    await updateDoc(chatDocRef, {
                        [`unreadCount.${currentUser.uid}`]: 0
                    });
                }
            } catch (err) { }
        };
        markAsRead();

        return () => unsubscribe();
    }, [currentUser, friendId, isFriend, isBlocked, hasBlockedMe]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const chatId = getChatId();

        if (!chatId || !currentUser || !newMessage.trim() || !isFriend || isBlocked || hasBlockedMe) return;

        try {
            // Check if chat doc exists, if not create it
            const chatDocRef = doc(db, "chats", chatId);
            const chatDocSnap = await getDoc(chatDocRef);

            if (!chatDocSnap.exists()) {
                await setDoc(chatDocRef, {
                    participants: [currentUser.uid, friendId],
                    unreadCount: {
                        [friendId]: 1,
                        [currentUser.uid]: 0
                    },
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp()
                });
            } else {
                const currentData = chatDocSnap.data();
                const currentUnread = currentData?.unreadCount?.[friendId] || 0;
                await updateDoc(chatDocRef, {
                    [`unreadCount.${friendId}`]: currentUnread + 1,
                    lastUpdated: serverTimestamp()
                });
            }

            // Add message
            const messagesRef = collection(db, "chats", chatId, "messages");
            await addDoc(messagesRef, {
                text: newMessage.trim(),
                senderId: currentUser.uid,
                createdAt: serverTimestamp()
            });

            setNewMessage("");
            scrollToBottom();
        } catch (error) {
            console.error("Erreur d'envoi", error);
        }
    };

    const isChatDisabled = !isFriend || isBlocked || hasBlockedMe;

    return (
        <div className="fixed bottom-4 right-4 w-80 md:w-96 bg-[#1A1D20] rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col z-[100] overflow-hidden drop-shadow-2xl">
            {/* Header */}
            <div className="bg-[#111315] p-3 flex justify-between items-center border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-full border border-[#E3D1A5] bg-[#E3D1A5]/20 overflow-hidden">
                        <Image src={friendPhotoURL || "/assets/images/icones/Photo_Profil-transparent.png"} alt={friendPseudo} fill className="object-cover" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-bold text-sm tracking-wide shrink-0">{friendPseudo}</span>
                        {isBlocked ? (
                            <span className="text-red-500 text-[10px] font-bold">Joueur bloqué</span>
                        ) : hasBlockedMe ? (
                            <span className="text-red-500 text-[10px] font-bold">Impossible de répondre</span>
                        ) : !isFriend ? (
                            <span className="text-white/50 text-[10px] italic">Non amis</span>
                        ) : (
                            <span className="text-green-400 text-[10px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Ami
                            </span>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1" title="Fermer le chat">
                    ✕
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 h-72 max-h-[300px] md:h-80 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
                {messages.length === 0 && !isChatDisabled ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-white/30 text-xs italic text-center">Aucun message. Dites bonjour !</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === currentUser?.uid;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm drop-shadow-md ${isMe ? "bg-secondary text-dark rounded-br-sm" : "bg-[#2A2F32] text-white rounded-bl-sm"}`}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#111315] border-t border-white/10">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isChatDisabled ? "Chat indisponible" : "Écrire un message..."}
                        disabled={isChatDisabled}
                        className="flex-1 bg-[#2A2F32] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-secondary placeholder-white/40 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isChatDisabled}
                        className="bg-secondary text-dark px-3 py-2 rounded-lg font-bold hover:bg-[#c9a785] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md cursor-pointer"
                    >
                        <span>➤</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
