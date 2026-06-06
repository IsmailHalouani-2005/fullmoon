'use client';
import Image from 'next/image';
import { ROLES, RoleId, RoleDefinition } from '@/types/roles';
import { useState } from 'react';
import RoleInfoModal from '@/components/room/edit/RoleInfoModal';
import { useToast } from '@/contexts/ToastContext';

interface EndGameProps {
    gameOverData: Record<string, unknown>;
    confirmLeave: () => void;
    getPlayerAvatar: (id: string, avatarUrl?: string) => string;
    currentUserId?: string;
    onReplay: () => void;
}

export default function EndGame({ gameOverData, confirmLeave, getPlayerAvatar, currentUserId, onReplay }: EndGameProps) {
    const [selectedRoleForModal, setSelectedRoleForModal] = useState<RoleDefinition | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isReplaying, setIsReplaying] = useState(false);
    const toast = useToast();

    if (!gameOverData) return null;

    const myPlayer = (gameOverData.players as Record<string, unknown>[]).find((p) => p.id === currentUserId);

    // --- Group Players by Camp / Winning status ---
    const winners: Record<string, unknown>[] = [];
    const village: Record<string, unknown>[] = [];
    const loups: Record<string, unknown>[] = [];
    const solos: Record<string, unknown>[] = [];

    const winnerKey = gameOverData.winner;

    (gameOverData.players as Record<string, unknown>[]).forEach((p) => {
        const baseCamp = ROLES[p.role as RoleId]?.camp;
        const isInfected = p.effects?.includes('infected');
        const effectiveCamp = isInfected ? 'LOUPS' : baseCamp;

        let isWinner = false;

        if (winnerKey === 'VILLAGEOIS' && effectiveCamp === 'VILLAGE') {
            isWinner = true;
        } else if (winnerKey === 'LOUPS' && effectiveCamp === 'LOUPS') {
            isWinner = true;
        } else if (winnerKey === 'AMOUR' && p.effects?.includes('lover')) {
            isWinner = true;
        } else if (['VILLAGEOIS', 'LOUPS', 'AMOUR'].includes(winnerKey) === false && p.role === winnerKey) {
            isWinner = true;
        }

        if (isWinner) {
            winners.push(p);
        } else if (effectiveCamp === 'VILLAGE') {
            village.push(p);
        } else if (effectiveCamp === 'LOUPS') {
            loups.push(p);
        } else if (effectiveCamp === 'SOLO') {
            solos.push(p);
        }
    });

    const groups = [];
    if (winners.length > 0) {
        groups.push({
            title: winnerKey === 'VILLAGEOIS' ? 'Le Village (Gagnants)' :
                winnerKey === 'LOUPS' ? 'Les Loups-Garous (Gagnants)' :
                    winnerKey === 'AMOUR' ? 'Les Amoureux (Gagnants)' : `Gagnant (${ROLES[winnerKey as RoleId]?.label || winnerKey})`,
            color: winnerKey === 'VILLAGEOIS' ? 'text-green-500' :
                winnerKey === 'LOUPS' ? 'text-red-500' :
                    winnerKey === 'AMOUR' ? 'text-[#ff69b4]' : 'text-blue-400',
            players: winners
        });
    }

    if (village.length > 0) {
        groups.push({ title: 'Reste du Village', color: 'text-green-400', players: village });
    }
    if (loups.length > 0) {
        groups.push({ title: 'Reste des Loups', color: 'text-red-400', players: loups });
    }
    if (solos.length > 0) {
        groups.push({ title: 'Reste des Solos', color: 'text-blue-400', players: solos });
    }

    const handleShare = async () => {
        if (!myPlayer) return;
        const roleLabel = ROLES[myPlayer.role as RoleId]?.label || myPlayer.role || '?';
        const isWinner = winners.some(p => p.id === currentUserId);
        const result = isWinner ? '🏆 Victoire' : '💀 Défaite';
        const text = `${result} en tant que ${roleLabel} sur FullMoon ! ${myPlayer.stats?.points ?? 0} pts · ${myPlayer.stats?.kills ?? 0} élim. · ${myPlayer.stats?.daysSurvived ?? 0} jours survécus 🌕`;
        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({ text, url: typeof window !== 'undefined' ? window.location.origin : '' });
            } else {
                await navigator.clipboard.writeText(text);
                toast.success('Résultat copié dans le presse-papiers !');
            }
        } catch {
            // L'utilisateur a annulé le partage — pas d'erreur
        }
    };

    return (
        <main className="flex-1 relative flex flex-col items-center justify-center pt-6 font-montserrat overflow-y-auto bg-white text-dark">
            <div className="text-center max-w-6xl w-full mt-10">
                <h1 className="text-4xl sm:text-6xl font-enchanted text-secondary mb-2 drop-shadow-lg tracking-widest uppercase">Fin de la Partie</h1>

                <div className="my-6 mx-2 px-2 py-6 border-2 border-slate-200 bg-primary/50 rounded-2xl shadow-xl">
                    <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-widest mb-4 uppercase drop-shadow-md 
                        ${gameOverData.winner === 'VILLAGEOIS' ? 'text-green-500' :
                            gameOverData.winner === 'LOUPS' ? 'text-red-500' :
                                gameOverData.winner === 'AMOUR' ? 'text-[#ff69b4]' :
                                    'text-blue-400'}`}
                    >
                        Victoire {gameOverData.winner === 'VILLAGEOIS' ? 'du Village' : gameOverData.winner === 'LOUPS' ? 'des Loups-Garous' : gameOverData.winner === 'AMOUR' ? 'des Amoureux' : 'en Solo'} !
                    </h2>

                    {gameOverData.winner !== 'VILLAGEOIS' && gameOverData.winner !== 'LOUPS' && gameOverData.winner !== 'AMOUR' && (
                        <p className="text-lg text-slate-300 font-bold mb-4">
                            Le rôle <span className="text-[#D1A07A] uppercase">{ROLES[gameOverData.winner as RoleId]?.label || gameOverData.winner}</span> a triomphé !
                        </p>
                    )}

                    {gameOverData.winner === 'AMOUR' && (
                        <p className="text-lg text-slate-300 font-bold mb-4">
                            L{"'"}amour triomphe toujours ! Le couple a survécu.
                        </p>
                    )}

                    <div className="flex flex-col gap-6 mt-6 px-2 w-full">
                        {groups.map((group, gIdx) => (
                            <div key={gIdx} className="w-full flex flex-col items-center">
                                <h3 className={`text-xl font-bold mb-3 ${group.color} uppercase tracking-wider border-b border-slate-700/50 pb-1 w-full text-left`}>
                                    {group.title}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 w-full">
                                    {group.players.map((p: Record<string, unknown>) => (
                                        <button
                                            key={p.id}
                                            className="flex min-w-[200px] items-center bg-dark/70 hover:bg-dark/80 p-2 px-3 rounded-xl border border-slate-600 transition-all cursor-pointer"
                                        >
                                            <div
                                                onClick={() => window.open(`/profil/${p.id}`, '_blank')}
                                                className="relative w-17 h-12 rounded-full border-2 border-[#D1A07A] overflow-hidden"
                                            >
                                                <Image src={getPlayerAvatar(p.id, p.avatarUrl)} alt={p.name} fill className="object-cover" />
                                            </div>
                                            <span className={`text-xs truncate w-full text-center ${p.id === currentUserId ? 'text-secondary' : 'text-white'}`}>
                                                {p.name}  {p.id === currentUserId && "(MOI)"}
                                                {p.effects?.includes('infected') && (
                                                    <span className="text-[8px] text-red-400 font-bold uppercase tracking-widest ml-1">(Infecté)</span>
                                                )}
                                            </span>

                                            <div
                                                className="relative w-8 h-8 rounded-full border border-secondary overflow-hidden cursor-pointer hover:border-primary transition-all shrink-0 my-1 shadow-md hover:scale-110"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (ROLES[p.role as RoleId]) {
                                                        setSelectedRoleForModal(ROLES[p.role as RoleId]);
                                                    }
                                                }}
                                                title={ROLES[p.role as RoleId]?.label || p.role}
                                            >
                                                {ROLES[p.role as RoleId]?.image && (
                                                    <Image src={ROLES[p.role as RoleId].image} alt={ROLES[p.role as RoleId].label} fill className="object-cover" />
                                                )}
                                            </div>
                                            <span className="text-xs text-green-400 text-center font-extrabold ml-1">+{p.stats?.points ?? 0} pts</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Résumé stats de la partie */}
                {myPlayer && (
                    <div className="mx-2 mb-4 px-4 py-4 bg-dark/60 rounded-xl border border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div>
                            <p className="text-2xl font-extrabold text-[#D1A07A]">+{myPlayer.stats?.points ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Points</p>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-red-400">{myPlayer.stats?.kills ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Éliminations</p>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-green-400">{myPlayer.stats?.saves ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Sauvetages</p>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-blue-400">{myPlayer.stats?.daysSurvived ?? 0}</p>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Jours survécus</p>
                        </div>
                    </div>
                )}

                <div className="mt-4 flex gap-4 justify-center flex-wrap">
                    <button
                        disabled={isReplaying}
                        onClick={() => { setIsReplaying(true); onReplay(); }}
                        className={`border-2 text-lg font-extrabold px-8 py-3 rounded-lg transition-all uppercase tracking-wide ${isReplaying ? 'bg-slate-600 border-slate-500 text-slate-300 cursor-not-allowed' : 'bg-dark text-white border-slate-600 hover:border-[#D1A07A] hover:shadow-[0_0_15px_rgba(209,160,122,0.3)]'}`}
                    >
                        {isReplaying ? 'Connexion...' : 'Rejouer'}
                    </button>
                    <button
                        onClick={() => {
                            setIsLeaving(true);
                            confirmLeave();
                        }}
                        disabled={isLeaving}
                        className={`${isLeaving
                            ? 'bg-slate-600 border-slate-500 text-slate-300 cursor-not-allowed shadow-none'
                            : 'bg-secondary border-slate-200 text-dark hover:bg-primary shadow-[0_0_15px_rgba(209,160,122,0.3)]'
                            } border-2 text-lg font-extrabold px-8 py-3 rounded-lg transition-all uppercase tracking-wide`}
                    >
                        {isLeaving ? 'Chargement...' : 'Quitter le village'}
                    </button>
                    {myPlayer && (
                        <button
                            onClick={handleShare}
                            className="border-2 border-slate-500 text-slate-300 text-lg font-extrabold px-8 py-3 rounded-lg transition-all uppercase tracking-wide hover:border-[#D1A07A] hover:text-[#D1A07A]"
                        >
                            Partager
                        </button>
                    )}
                </div>
            </div>

            {selectedRoleForModal && (
                <div className="fixed inset-0 z-[110]">
                    <RoleInfoModal
                        role={selectedRoleForModal}
                        onClose={() => setSelectedRoleForModal(null)}
                    />
                </div>
            )}
        </main>
    );
}
