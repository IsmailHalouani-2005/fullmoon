import Image from 'next/image';

interface ProfileStatsProps {
    stats: {
        wins: number;
        losses: number;
        fled: number;
        gamesPlayed: number;
        villageWins: number;
        villageLosses: number;
        werewolfWins: number;
        werewolfLosses: number;
        soloWins: number;
        soloLosses: number;
        kills: number;
        saves: number;
        powerUses: number;
        daysSurvived: number;
        points: number;
        rank?: number | null;
    };
}

export default function ProfileStats({ stats }: ProfileStatsProps) {
    const totalWins = stats.wins || 0;
    const totalLosses = stats.losses || 0;
    const totalLeaves = stats.fled || 0;
    const totalGames = stats.gamesPlayed || (totalWins + totalLosses + totalLeaves);

    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const lossRate = totalGames > 0 ? Math.round((totalLosses / totalGames) * 100) : 0;
    const leaveRate = totalGames > 0 ? Math.round((totalLeaves / totalGames) * 100) : 0;

    return (
        <div className="w-full flex flex-col gap-10">
            {/* Row 1: General Stats & Achievements */}
            <div className="w-full flex flex-col md:flex-row justify-between gap-8 md:gap-12 bg-[#2A2F32] rounded-xl p-8 md:p-12 shadow-2xl">

                {/* Stats Jeu */}
                <div className="flex-1 flex flex-col">
                    <h3 className="text-white font-bold text-xl mb-6">Statistiques de jeu</h3>

                    <div className="flex flex-col gap-3 text-sm text-white/80">
                        <div className="flex justify-between items-center bg-[#111315] p-3 rounded-lg border border-white/5 mb-2">
                            <span className="font-enchanted text-2xl text-[#D1A07A] pt-1 tracking-wider">Points</span>
                            <span className="text-xl font-bold text-[#D1A07A]">{stats.points || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex-1">Total des parties</span>
                            <span className="w-8 text-right font-bold">{totalGames}</span>
                        </div>
                        <div className="flex justify-between items-center text-green-400">
                            <span className="flex-1">Total des victoires</span>
                            <span className="w-16 text-center font-bold">{winRate}%</span>
                            <span className="w-8 text-right font-bold">{totalWins}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-400">
                            <span className="flex-1">Total des défaites</span>
                            <span className="w-16 text-center font-bold">{lossRate}%</span>
                            <span className="w-8 text-right font-bold">{totalLosses}</span>
                        </div>
                        <div className="flex justify-between items-center text-orange-400">
                            <span className="flex-1">Total des fuites</span>
                            <span className="w-16 text-center font-bold">{leaveRate}%</span>
                            <span className="w-8 text-right font-bold">{totalLeaves}</span>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <p className="text-white font-bold text-lg uppercase tracking-wider mb-1">Rang actuel</p>
                        <span className="text-[#D1A07A] text-4xl font-extrabold font-enchanted">
                            {stats.rank ? `#${stats.rank}` : "Non classé"}
                        </span>
                    </div>
                </div>

                {/* Faits d'Armes */}
                <div className="flex-1 flex flex-col">
                    <h3 className="text-white font-bold text-xl mb-6">Faits d'Armes</h3>

                    <div className="flex flex-col gap-3 text-sm text-white/80">
                        <div className="flex justify-between items-center">
                            <span>Jours survécus</span>
                            <span className="font-bold text-white">{stats.daysSurvived || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Pouvoirs utilisés</span>
                            <span className="font-bold text-white">{stats.powerUses || 0}</span>
                        </div>
                        <div className="h-px bg-white/10 my-1 w-full"></div>
                        <div className="flex justify-between items-center text-red-400">
                            <span>Meurtres commis</span>
                            <span className="font-bold">{stats.kills || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-blue-400">
                            <span>Vies sauvées</span>
                            <span className="font-bold">{stats.saves || 0}</span>
                        </div>
                    </div>

                    <div className="mt-auto pt-8">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/5 italic text-xs text-white/40 leading-relaxed">
                            Les faits d'armes reflètent vos actions héroïques (ou monstrueuses) au fil de vos aventures sous la pleine lune.
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Team Stats */}
            <div className="w-full bg-[#2A2F32] rounded-xl p-8 md:p-12 shadow-2xl">
                <h3 className="text-white font-bold text-xl mb-8 border-b border-white/10 pb-4">Statistiques d'équipe</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Village */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center relative overflow-hidden">
                                <Image src="/assets/images/icones/maison_jardin-icon.png" alt="Village" fill className="object-contain p-1" />
                            </div>
                            <span className="text-green-400 font-bold tracking-widest uppercase text-sm">Village</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Victoires</span>
                            <span className="text-white font-bold">{stats.villageWins || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Défaites</span>
                            <span className="text-white font-bold">{stats.villageLosses || 0}</span>
                        </div>
                    </div>

                    {/* Loups */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center relative overflow-hidden">
                                <Image src="/assets/images/icones/loup-icon.png" alt="Loups-Garous" fill className="object-contain p-1" />
                            </div>
                            <span className="text-red-400 font-bold tracking-widest uppercase text-sm">Loups-Garous</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Victoires</span>
                            <span className="text-white font-bold">{stats.werewolfWins || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Défaites</span>
                            <span className="text-white font-bold">{stats.werewolfLosses || 0}</span>
                        </div>
                    </div>

                    {/* Solos */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center relative overflow-hidden">
                                <Image src="/assets/images/icones/masque_theatre-icon.png" alt="Solitaires" fill className="object-contain p-1" />
                            </div>
                            <span className="text-purple-400 font-bold tracking-widest uppercase text-sm">Solitaires</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Victoires</span>
                            <span className="text-white font-bold">{stats.soloWins || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Défaites</span>
                            <span className="text-white font-bold">{stats.soloLosses || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
