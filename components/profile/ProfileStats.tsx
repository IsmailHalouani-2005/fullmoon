interface ProfileStatsProps {
    stats: {
        totalWins: number;
        totalLosses: number;
        totalLeaves: number;
        villageWins: number;
        villageLosses: number;
        werewolfWins: number;
        werewolfLosses: number;
        soloWins: number;
        soloLosses: number;
        rank: string;
    };
}

export default function ProfileStats({ stats }: ProfileStatsProps) {
    const totalGames = stats.totalWins + stats.totalLosses + stats.totalLeaves;
    const winRate = totalGames > 0 ? Math.round((stats.totalWins / totalGames) * 100) : 0;
    const lossRate = totalGames > 0 ? Math.round((stats.totalLosses / totalGames) * 100) : 0;
    const leaveRate = totalGames > 0 ? Math.round((stats.totalLeaves / totalGames) * 100) : 0;

    return (
        <div className="w-full h-full flex flex-col md:flex-row justify-between gap-12 bg-[#2A2F32] rounded-b-xl p-8 md:p-12 shadow-2xl">

            {/* Stats Jeu */}
            <div className="flex-1 flex flex-col">
                <h3 className="text-white font-bold text-xl mb-6">Statistiques de jeu</h3>

                <div className="flex flex-col gap-3 text-sm text-white/80">
                    <div className="flex justify-between items-center">
                        <span className="flex-1">Total des victoires</span>
                        <span className="w-16 text-center">{winRate}%</span>
                        <span className="w-8 text-right">{stats.totalWins}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex-1">Total des défaites</span>
                        <span className="w-16 text-center">{lossRate}%</span>
                        <span className="w-8 text-right">{stats.totalLosses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex-1">Total des fuites</span>
                        <span className="w-16 text-center">{leaveRate}%</span>
                        <span className="w-8 text-right">{stats.totalLeaves}</span>
                    </div>
                </div>

                <p className="text-white font-bold text-xl mt-8">Rang : <span className="text-white/70 text-lg">{stats.rank || "Non classé"}</span></p>
            </div>

            {/* Stats Équipe */}
            <div className="flex-1 flex flex-col">
                <h3 className="text-white font-bold text-xl mb-6">Statistiques d'équipe</h3>

                <div className="flex flex-col gap-3 text-sm text-white/80">
                    <div className="flex justify-between items-center">
                        <span>Victoires avec le village</span>
                        <span>{stats.villageWins}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Défaites avec le village</span>
                        <span>{stats.villageLosses}</span>
                    </div>

                    <div className="h-px bg-white/10 my-1 w-full"></div>

                    <div className="flex justify-between items-center">
                        <span>Victoires avec les loups-garous</span>
                        <span>{stats.werewolfWins}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Défaites avec les loups-garous</span>
                        <span>{stats.werewolfLosses}</span>
                    </div>

                    <div className="h-px bg-white/10 my-1 w-full"></div>

                    <div className="flex justify-between items-center">
                        <span>Victoires en solitaire</span>
                        <span>{stats.soloWins}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Défaites en solitaire</span>
                        <span>{stats.soloLosses}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
