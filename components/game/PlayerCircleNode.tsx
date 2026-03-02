import Image from 'next/image';
import { Player, Phase, GameState } from '@/types/game';
import { ROLES, RoleId } from "@/types/roles";

const isInWolfCamp = (roleId: RoleId | null | undefined): boolean => {
    if (!roleId) return false;
    const wolfRoles = ['LOUP_GAROU', 'LOUP_ALPHA', 'GRAND_MECHANT_LOUP', 'LOUP_INFECT'];
    return wolfRoles.includes(roleId);
};

interface PlayerCircleNodeProps {
    player: Player;
    index: number;
    totalPlayers: number;
    game: GameState;
    currentPhase: Phase | string;
    currentUser: any;
    onVote?: (playerId: string) => void;
    mockCanVote?: boolean;
    mockRoleDef?: any;
    activePower?: string | null;
    powerTargets?: string[];
    wolfVictimId?: string | null;
    getPlayerAvatar: (playerId: string, fallbackUrl?: string) => string;
}

export default function PlayerCircleNode({
    player,
    index,
    totalPlayers,
    game,
    currentPhase,
    currentUser,
    onVote,
    mockCanVote,
    mockRoleDef,
    activePower,
    powerTargets,
    wolfVictimId,
    getPlayerAvatar
}: PlayerCircleNodeProps) {
    // ---- Géométrie Octogonale ----
    const angleDeg = (360 / totalPlayers) * index - 90;
    const angleRad = angleDeg * (Math.PI / 180);

    // Un octogone a 8 côtés, soit des "tranches" de 45 degrés (Math.PI / 4).
    const sliceRad = Math.PI / 4;
    let normalizedAngle = angleRad % sliceRad;
    if (normalizedAngle < 0) normalizedAngle += sliceRad; // Pour les angles de base négatifs (ex: -90)

    // On calcule la distance angulaire par rapport au centre du segment (qui est à sliceRad / 2)
    const distanceToSegmentCenter = normalizedAngle - (sliceRad / 2);

    // Rayon de base (distance du centre de l'octogone au milieu d'un segment)
    const baseRadiusPercent = 42;
    // Allongement du rayon pour atteindre les coins de l'octogone (formule de la sécante)
    const octoRadius = baseRadiusPercent / Math.cos(distanceToSegmentCenter);

    const x = Math.cos(angleRad) * octoRadius;
    const y = Math.sin(angleRad) * octoRadius;

    // Réduire la taille des avatars si le nombre de joueurs est élevé pour ne pas qu'ils se chevauchent
    let sizeClass = 'w-16 h-16 sm:w-[90px] sm:h-[90px]';
    if (totalPlayers >= 15) {
        sizeClass = 'w-10 h-10 sm:w-14 sm:h-14'; // Plus petit pour 15 à 18 joueurs
    } else if (totalPlayers >= 11) {
        sizeClass = 'w-12 h-12 sm:w-[70px] sm:h-[70px]'; // Taille moyenne pour 11 à 14 joueurs
    }

    const isDead = !player.isAlive;
    const roleDef = mockRoleDef || (player.role ? ROLES[player.role] : null);

    // Use game.votes for better synchronicity
    const votersForThisPlayer = game.players.filter(p => (game.votes || {})[p.id] === player.id);
    const isTargeted = votersForThisPlayer.length > 0;
    const me = currentUser ? game.players.find(p => p.id === currentUser.uid) : null;

    // Autorisation de voter ou d'utiliser un pouvoir sur cette personne
    const isTargetWolf = isInWolfCamp(player.role as RoleId);
    const isTargetedByPower = powerTargets?.includes(player.id);
    const isWolfVictim = wolfVictimId === player.id;

    // Logic for targeting with power or normal vote
    const canVoteActual = (onVote && (
        (activePower && me?.isAlive && !isDead && (activePower !== 'FUSIL')) || // Regular power
        (activePower === 'FUSIL' && !me?.isAlive && me?.deadAt && !isDead) || // Hunter power
        (!activePower && (
            currentPhase === 'MAYOR_ELECTION' ||
            currentPhase === 'DAY_VOTE' ||
            (currentPhase === 'NIGHT' && isInWolfCamp(me?.role as RoleId) && !isTargetWolf)
        ) && me?.isAlive && !isDead)
    ));
    const canVote = mockCanVote !== undefined ? mockCanVote : canVoteActual;

    const isMe = me?.id === player.id;
    if (isMe && currentPhase === 'NIGHT') {
        const iAmWolf = isInWolfCamp(me?.role as RoleId);
        console.log(`[VOTE_DEBUG] Me: ${me?.name} (Wolf: ${iAmWolf}) | Target: ${player.name} (T.Wolf: ${isTargetWolf}) | Phase: ${currentPhase} | canVote: ${canVote}`);
    }

    // Determine which effects to show to this specific user
    const effects = player.effects || [];
    const meEffects = me?.effects || [];

    const showInfected = effects.includes('infected') && (
        isInWolfCamp(me?.role as RoleId) ||
        me?.id === player.id ||
        meEffects.includes('infected')
    );
    const showPoisoned = effects.includes('poisoned');
    const showGasoline = effects.includes('gasoline') && me?.role === 'PYROMANE';
    const showLover = effects.includes('lover') && (meEffects.includes('lover') || me?.role === 'CUPIDON' || player.id === me?.id);

    return (
        <div
            onClick={canVote && onVote ? () => onVote(player.id) : undefined}
            className={`absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out ${canVote ? 'cursor-pointer hover:scale-110 z-30' : 'z-20'}`}
            style={{
                left: `calc(50% + ${x}%)`,
                top: `calc(50% + ${y}%)`,
            }}
        >
            <div className={`relative ${sizeClass} rounded-full flex items-center justify-center shadow-lg transition-all
                ${player.id === game.hostId && currentPhase === 'LOBBY' ? 'border-[3px] border-[#D1A07A]' : 'border-[3px] border-slate-800'} 
                ${isTargeted || isTargetedByPower ? 'border-dashed !border-4 !border-slate-900 shadow-[0_0_20px_rgba(0,0,0,0.6)] scale-105' : ''}
                ${isTargetedByPower ? '!border-[#D1A07A]' : ''}
                ${isWolfVictim ? '!border-red-600 shadow-[0_0_15px_#ef4444] animate-pulse scale-105' : ''}
            `} title={isWolfVictim ? "Cible des Loups" : ""}>
                {/* MOCK: L'image de fond lune pour tout le monde */}
                <div className={`absolute inset-0 bg-[#e3d1ae] rounded-full z-0 overflow-hidden ${isDead ? 'grayscale' : ''}`}></div>
                <div className={`absolute inset-0 flex items-center justify-center opacity-30 z-0 select-none overflow-hidden ${isDead ? 'grayscale' : ''}`}>
                    <Image src="/assets/images/icones/Moon.png" alt="" fill className="object-cover" />
                </div>

                {/* L'avatar personnage */}
                <div className={`relative z-10 w-[95%] h-[95%] rounded-full overflow-hidden flex items-center justify-center text-slate-800 ${isDead ? 'grayscale opacity-90' : ''}`}>
                    {isDead ? (
                        <Image src="/assets/images/icones/Mort.png" alt="Mort" fill className="object-cover rounded-full" />
                    ) : (
                        <Image src={getPlayerAvatar(player.id, player.avatarUrl)} alt={player.name} fill className="object-cover rounded-full" />
                    )}
                </div>

                {/* Couronne du maire */}
                {game.mayorId === player.id && (
                    <div className="absolute -top-4 -right-2 w-8 h-8 drop-shadow-md z-30 transform rotate-12" title="Maire actuel">
                        <Image src="/assets/images/icones/couronne-icon.png" alt="Maire" width={32} height={32} />
                    </div>
                )}

                {/* Badge Rôle (Uniquement si mort) */}
                {(isDead && roleDef) && (
                    <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full z-30 overflow-hidden" title={roleDef.label}>
                        <Image src={roleDef.image} alt={roleDef.label} fill className="object-contain p-1" />
                    </div>
                )}

                {/* Effect Icons Section */}
                <div className="absolute -left-2 top-0 flex flex-col gap-1 z-40">
                    {showInfected && (
                        <div className="w-6 h-6 drop-shadow-md animate-pulse" title="Infecté">
                            <Image src="/assets/images/icones/powers/Morsure.png" alt="Infecté" width={24} height={24} />
                        </div>
                    )}
                    {showPoisoned && (
                        <div className="w-6 h-6 drop-shadow-md" title="Empoisonné (Muet)">
                            <Image src="/assets/images/icones/powers/Poison_Toxique.png" alt="Muet" width={24} height={24} />
                        </div>
                    )}
                    {showGasoline && (
                        <div className="w-6 h-6 drop-shadow-md" title="Recouvert d'essence">
                            <Image src="/assets/images/icones/powers/Essence.png" alt="Essence" width={24} height={24} />
                        </div>
                    )}
                    {showLover && (
                        <div className="w-6 h-6 drop-shadow-md animate-bounce" title="Amoureux">
                            <Image src="/assets/images/icones/powers/Coup_De_Coeur.png" alt="Amour" width={24} height={24} />
                        </div>
                    )}
                </div>
            </div>

            <p className={`mt-1 font-bold text-[10px] tracking-wider bg-transparent px-2 py-0.5 whitespace-nowrap ${isDead ? 'text-red-700 line-through decoration-2 decoration-red-900' : (currentPhase === 'NIGHT' ? 'text-slate-200' : 'text-slate-800')}`}>
                <span className={`font-extrabold mr-1 ${currentPhase === 'NIGHT' ? 'text-slate-400' : 'text-slate-500'}`}>{index + 1}</span>
                {player.name}
                {isMe && <span className="ml-1 text-[8px] opacity-70">(Moi)</span>}
                <span className="ml-1 text-[6px] opacity-40 select-none">v2.5</span>
            </p>

            {/* Piles de voteurs sous le nom */}
            {isTargeted && (
                <div className="flex flex-wrap justify-center mt-1 gap-1 w-full max-w-[100px] absolute top-[110%]">
                    {votersForThisPlayer.map((vp, vIdx) => (
                        <div key={vIdx} className="relative w-5 h-5 rounded-full border-[1.5px] border-slate-700 overflow-hidden drop-shadow-sm transition-transform hover:scale-150 z-40" title={vp.name}>
                            <Image src={getPlayerAvatar(vp.id, vp.avatarUrl)} alt={vp.name} fill className="object-cover" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
