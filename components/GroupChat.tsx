"use client";

import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, doc, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, getDoc, updateDoc } from "firebase/firestore";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { io, Socket } from "socket.io-client";
import VoiceChatManager from "./room/VoiceChatManager";
import { GameState } from "@/types/game";

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderPseudo: string;
    senderPhotoURL: string;
    createdAt: any;
}

interface GroupChatProps {
    groupId: string;
    onClose: () => void;
}

export default function GroupChat({ groupId, onClose }: GroupChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentData, setCurrentData] = useState<any>(null);
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

    // Voice Chat State
    const [isMicroOn, setIsMicroOn] = useState(true);
    const [isHeadphonesOn, setIsHeadphonesOn] = useState(true);
    const [micSensitivity, setMicSensitivity] = useState(70);
    const [outputVolume, setOutputVolume] = useState(100);
    const [showSettings, setShowSettings] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [groupGame, setGroupGame] = useState<GameState | null>(null);
    const [speakingPlayers, setSpeakingPlayers] = useState<Set<string>>(new Set());
    const [groupPlayers, setGroupPlayers] = useState<any[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // Check if we are at the bottom (allow 50px threshold)
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setIsAutoScrollEnabled(isAtBottom);
    };

    // Listen to group data (especially players list for voice chat)
    useEffect(() => {
        if (!groupId) return;
        const unsubscribe = onSnapshot(doc(db, "groups", groupId), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setGroupData(data); // Using local groupData state if it exists, otherwise define it
                const playersList = (data.players || []).map((p: any) => ({
                    id: p.uid,
                    name: p.pseudo || "Joueur",
                    avatarUrl: p.photoURL || "",
                    isAlive: true,
                    role: null,
                    effects: []
                }));
                setGroupPlayers(playersList);
            }
        });
        return () => unsubscribe();
    }, [groupId]);

    const [groupData, setGroupData] = useState<any>(null);

    // Get current user and their data
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                const docSnap = await getDoc(doc(db, "users", user.uid));
                if (docSnap.exists()) {
                    setCurrentData(docSnap.data());
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Socket.io Connection for Voice Signaling
    useEffect(() => {
        if (!groupId || !currentUser) return;

        const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        let socketUrl = baseUrl;
        if (!process.env.NEXT_PUBLIC_SOCKET_URL && baseUrl.includes('localhost')) {
            socketUrl = 'http://localhost:3001';
        }
        socketUrl = socketUrl.replace(/\/$/, '');

        const newSocket = io(socketUrl, {
            query: {
                roomCode: groupId,
                userId: currentUser.uid,
                username: currentUser.displayName || "Anonyme",
                type: 'group' // Tell the server this is a group chat, not a game room
            }
        });

        newSocket.on('update_game', (gameState: GameState) => {
            setGroupGame(gameState);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [groupId, currentUser]);

    // Listen to group messages
    useEffect(() => {
        if (!groupId) return;

        const q = query(
            collection(db, "groups", groupId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [groupId]);

    // Auto-scroll when messages change, but ONLY if auto-scroll is enabled
    useEffect(() => {
        if (isAutoScrollEnabled) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isAutoScrollEnabled]);

    // Mark messages as read when viewing them
    useEffect(() => {
        if (!groupId || !currentUser) return;
        const markAsRead = async () => {
            try {
                await updateDoc(doc(db, "groups", groupId), {
                    [`unreadCount.${currentUser.uid}`]: 0
                });
            } catch (err) {
                console.error("Failed to mark group messages as read", err);
            }
        };
        markAsRead();
    }, [groupId, currentUser, messages.length]); // Re-run when new messages arrive so they instantly get marked read

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !currentData || !groupId) return;

        try {
            // Get group players to increment their unread counts
            const groupDocSnap = await getDoc(doc(db, "groups", groupId));
            const groupData = groupDocSnap.data();

            const msgRef = collection(db, "groups", groupId, "messages");
            await addDoc(msgRef, {
                text: newMessage.trim(),
                senderId: currentUser.uid,
                senderPseudo: currentData.pseudo || "Joueur",
                senderPhotoURL: currentData.photoURL || "/assets/images/icones/Photo_Profil-transparent.png",
                createdAt: serverTimestamp()
            });

            // Update parent group last activity & unread counts
            const updates: any = {
                lastMessageAt: serverTimestamp()
            };

            if (groupData?.players) {
                groupData.players.forEach((p: any) => {
                    if (p.uid !== currentUser.uid) {
                        const currentUnread = groupData.unreadCount?.[p.uid] || 0;
                        updates[`unreadCount.${p.uid}`] = currentUnread + 1;
                    }
                });
            }

            await updateDoc(doc(db, "groups", groupId), updates);

            setNewMessage("");
            setIsAutoScrollEnabled(true); // Always auto-scroll when sending a message
        } catch (error) {
            console.error("Error sending group message:", error);
        }
    };

    return (
        <div className="w-[350px] h-[450px] bg-dark border-2 border-[#1A1D20] rounded-t-xl rounded-bl-xl shadow-2xl flex flex-col overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="bg-[#1A1D20] p-3 border-b border-white/10 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-dark flex items-center justify-center shadow-inner relative flex-shrink-0">
                        <Image src="/assets/images/icones/friends-icon_white.png" alt="Groupe" width={22} height={22} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">Chat du Groupe</h3>
                        <p className="text-green-400 text-[10px] uppercase font-bold tracking-wider">En direct</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-white/50 hover:text-white transition-colors p-2 cursor-pointer text-xl font-bold"
                >
                    ✕
                </button>
            </div>
            <div className="flex items-center gap-1">
                {/* Voice Toggles in Header */}
                <button
                    onClick={() => setIsMicroOn(!isMicroOn)}
                    className={`p-2 rounded-lg transition-colors ${isMicroOn ? 'text-green-400 hover:bg-white/5' : 'text-red-500 hover:bg-white/5'}`}
                    title={isMicroOn ? "Désactiver micro" : "Activer micro"}
                >
                    <Image src={isMicroOn ? '/assets/images/icones/microphone-icon.png' : '/assets/images/icones/non_microphone-icon.png'} alt="Micro" width={18} height={18} />
                </button>
                <button
                    onClick={() => setIsHeadphonesOn(!isHeadphonesOn)}
                    className={`p-2 rounded-lg transition-colors ${isHeadphonesOn ? 'text-blue-400 hover:bg-white/5' : 'text-slate-400 hover:bg-white/5'}`}
                    title={isHeadphonesOn ? "Désactiver casque" : "Activer casque"}
                >
                    <Image src={isHeadphonesOn ? '/assets/images/icones/headphone-icon_white.png' : '/assets/images/icones/non_headphone-icone_white.png'} alt="Casque" width={18} height={18} />
                </button>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-colors ${showSettings ? 'text-secondary bg-white/5' : 'text-white/50 hover:bg-white/5'}`}
                    title="Paramètres audio"
                >
                    <Image src="/assets/images/icones/params-icon.png" alt="Settings" width={18} height={18} className={showSettings ? 'opacity-100' : 'opacity-50'} />
                </button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="bg-[#1A1D20] border-b border-white/10 p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-wider">
                            <span>Sensibilité Micro</span>
                            <span className="text-secondary">{micSensitivity}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={micSensitivity}
                            onChange={(e) => setMicSensitivity(parseInt(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-secondary"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-wider">
                            <span>Volume Sortie</span>
                            <span className="text-blue-400">{outputVolume}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={outputVolume}
                            onChange={(e) => setOutputVolume(parseInt(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4 bg-dark"
            >
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 px-4">
                        <Image src="/assets/images/icones/chat-icon.png" alt="" width={40} height={40} className="mb-2 opacity-50" />
                        <p className="text-sm font-medium">L'historique est vide.</p>
                        <p className="text-xs mt-1">Dites bonjour à votre groupe !</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === currentUser?.uid;
                        return (
                            <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"} mb-2 group/msg`}>
                                <div className={`w-8 h-8 rounded-full border border-white/10 overflow-hidden relative ${isMe ? "ml-2 order-2" : "mr-2 flex-shrink-0"} mt-auto ${speakingPlayers.has(msg.senderId) ? 'ring-2 ring-[var(--voice-aura)]' : ''}`}>
                                    {speakingPlayers.has(msg.senderId) && <div className="voice-aura-wave" />}
                                    <Image src={msg.senderPhotoURL || "/assets/images/icones/Photo_Profil-transparent.png"} alt="Avatar" fill className="object-cover" />
                                </div>
                                <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                                    {!isMe && (
                                        <span className="text-[10px] text-white/50 ml-1 mb-0.5">{msg.senderPseudo}</span>
                                    )}
                                    <div className={`p-3 rounded-2xl shadow-sm ${isMe
                                        ? "bg-secondary text-white rounded-tr-sm border border-secondary/50"
                                        : "bg-[#2A2F32] text-white/90 rounded-tl-sm border border-white/5"
                                        }`}>
                                        <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                    </div>
                                    <span className={`text-[9px] text-white/30 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity px-1 ${isMe ? "text-right" : "text-left"}`}>
                                        {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#1A1D20] border-t border-white/10 shrink-0">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Écrire au groupe..."
                        className="w-full bg-dark/50 text-white placeholder-white/40 text-sm px-4 py-3 rounded-full outline-none focus:ring-1 focus:ring-secondary/50 border border-white/5"
                        maxLength={500}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="absolute right-1 w-10 h-10 bg-secondary hover:bg-secondary/80 disabled:bg-dark disabled:text-white/20 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md"
                        title="Envoyer"
                    >
                        ➤
                    </button>
                </div>
            </form>

            <VoiceChatManager
                socket={socket}
                roomCode={groupId}
                currentUser={currentUser}
                game={groupGame}
                players={groupPlayers}
                isMicroOn={isMicroOn}
                isHeadphonesOn={isHeadphonesOn}
                micSensitivity={micSensitivity}
                outputVolume={outputVolume}
                onSpeakingChange={setSpeakingPlayers}
                type="group"
            />
        </div >
    );
}
