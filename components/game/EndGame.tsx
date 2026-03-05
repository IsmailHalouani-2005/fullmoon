import Image from 'next/image';
import { ROLES, RoleId, RoleDefinition } from '@/types/roles';
import { useState } from 'react';
import RoleInfoModal from '@/components/room/edit/RoleInfoModal';

interface EndGameProps {
    gameOverData: any;
    confirmLeave: () => void;
    getPlayerAvatar: (id: string, avatarUrl?: string) => string;
    currentUserId?: string;
}

export default function EndGame({ gameOverData, confirmLeave, getPlayerAvatar, currentUserId }: EndGameProps) {
    const [selectedRoleForModal, setSelectedRoleForModal] = useState<RoleDefinition | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);

    if (!gameOverData) return null;

    // --- Group Players by Camp / Winning status ---
    const winners: any[] = [];
    const village: any[] = [];
    const loups: any[] = [];
    const solos: any[] = [];

    const winnerKey = gameOverData.winner;

    gameOverData.players.forEach((p: any) => {
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
                            L'amour triomphe toujours ! Le couple a survécu.
                        </p>
                    )}

                    <div className="flex flex-col gap-6 mt-6 px-2 w-full">
                        {groups.map((group, gIdx) => (
                            <div key={gIdx} className="w-full flex flex-col items-center">
                                <h3 className={`text-xl font-bold mb-3 ${group.color} uppercase tracking-wider border-b border-slate-700/50 pb-1 w-full text-left`}>
                                    {group.title}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 w-full">
                                    {group.players.map((p: any) => (
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

                <div className="mt-6 flex gap-4 justify-center">
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
