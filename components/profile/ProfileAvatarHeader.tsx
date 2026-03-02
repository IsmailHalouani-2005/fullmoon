import Image from 'next/image';

interface ProfileAvatarHeaderProps {
    playerId: string;
    playerData: any;
    currentUser: any;
    isFriend: boolean;
    hasBlockedMe: boolean;
    isBlocked: boolean;
    hasPendingRequest: boolean;
    unreadCount: number;
    onMessage: () => void;
    onRemoveFriend: () => void;
    onSendFriendRequest: () => void;
    onBlockPlayer: () => void;
    onGoBack: () => void;
}

export default function ProfileAvatarHeader({
    playerId,
    playerData,
    currentUser,
    isFriend,
    hasBlockedMe,
    isBlocked,
    hasPendingRequest,
    unreadCount,
    onMessage,
    onRemoveFriend,
    onSendFriendRequest,
    onBlockPlayer,
    onGoBack
}: ProfileAvatarHeaderProps) {
    return (
        <div className="bg-[#2A2F32] rounded-t-xl p-8 md:p-12 shadow-2xl relative flex flex-col items-center w-full">
            <button
                onClick={onGoBack}
                className="absolute top-6 left-8 text-white/70 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"
            >
                <span className="text-xl">←</span> Retour
            </button>

            <h1 className="font-enchanted text-6xl text-white text-center mb-10 tracking-wider">PROFIL</h1>

            {/* Identity Header */}
            <div className="flex flex-col md:flex-row items-center gap-8 w-full justify-center">

                {/* Avatar */}
                <div className="relative w-40 h-40 rounded-full border-4 border-[#5E4730] bg-[#E3D1A5] shadow-xl overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 bg-[url('/assets/images/icones/village_batiments.png')] bg-cover opacity-20 bg-center"></div>
                    <Image
                        src={playerData?.photoURL || "/assets/images/icones/Photo_Profil-transparent.png"}
                        alt="Profil"
                        fill
                        className="object-cover z-10"
                    />
                </div>

                {/* Info & Actions */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <h2 className="text-white font-bold text-3xl mb-1">{playerData?.pseudo || "Joueur"}</h2>
                    <p className="text-white/50 text-sm mb-4">[{playerId.substring(0, 8)}...]</p>

                    {/* Icons row */}
                    <div className="flex gap-4 items-center">
                        {isFriend ? (
                            <>
                                <div className="relative flex items-center justify-center">
                                    <button
                                        className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center text-white hover:bg-secondary transition-colors"
                                        title="Envoyer un message"
                                        onClick={onMessage}
                                    >
                                        <Image src="/assets/images/icones/message-icon.png" alt="Envoyer un message" width={18} height={18} />
                                    </button>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full pointer-events-none drop-shadow-md border border-[#2A2F32] px-1 z-10">
                                            {unreadCount > 9 ? "9+" : unreadCount}
                                        </span>
                                    )}
                                </div>
                                <button
                                    className="w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                    title="Retirer l'ami"
                                    onClick={onRemoveFriend}
                                >
                                    <Image src="/assets/images/icones/unfriend-icon.png" alt="Retirer l'ami" width={18} height={18} />
                                </button>
                            </>
                        ) : hasPendingRequest ? (
                            <button
                                className="px-4 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 cursor-not-allowed border border-white/10 text-sm font-bold"
                                title="Demande en attente"
                                disabled
                            >
                                ⏳ En attente
                            </button>
                        ) : (
                            <button
                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                title="Ajouter en ami"
                                onClick={onSendFriendRequest}
                            >
                                +<Image src="/assets/images/icones/friends-icon_white.png" alt="Ajouter en ami" width={16} height={16} />
                            </button>
                        )}
                        <button
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${isBlocked ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
                            title={isBlocked ? "Débloquer" : "Bloquer"}
                            onClick={onBlockPlayer}
                        >
                            <Image src="/assets/images/icones/block-icon.png" alt={isBlocked ? 'Débloquer' : 'Bloquer'} width={18} height={18} />
                        </button>
                        <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors" title="Signaler">
                            <Image src="/assets/images/icones/signal-icon.png" alt="Signaler" width={18} height={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
