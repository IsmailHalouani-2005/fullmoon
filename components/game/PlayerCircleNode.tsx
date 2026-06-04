import Image from 'next/image';
import { Player, Phase, GameState } from '@/types/game';
import { ROLES, RoleId, isInWolfCamp } from "@/types/roles";
import { useState, useEffect, useRef } from 'react';

// ─── Tooltip générique ────────────────────────────────────────────────────────
type TooltipDir = 'top' | 'bottom' | 'left' | 'right';

function Tooltip({ label, description, color = 'text-[#D1A07A]', children, dir = 'top', isOpen, onToggle }: {
    label: string;
    description: string;
    color?: string;
    children: React.ReactNode;
    dir?: TooltipDir;
    isOpen: boolean;
    onToggle: () => void;
}) {
    const posClass = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    }[dir];

    const arrowClass = {
        top: 'absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 border-r border-b border-white/10 rotate-45',
        bottom: 'absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 border-l border-t border-white/10 rotate-45',
        left: 'absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-t border-r border-white/10 rotate-45',
        right: 'absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-b border-l border-white/10 rotate-45',
    }[dir];

    return (
        <div
            className="relative"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
            {children}
            {isOpen && (
                <div
                    className={`absolute z-[3000] w-44 bg-[#1a1d20]/95 border border-white/10 rounded-xl shadow-2xl p-3 pointer-events-none ${posClass}`}
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    <p className={`font-bold text-xs mb-1 ${color}`}>{label}</p>
                    <p className="text-white/70 text-[10px] leading-tight">{description}</p>
                    <div className={`bg-[#1a1d20] ${arrowClass}`} />
                </div>
            )}
        </div>
    );
}

// ─── Données des effets ───────────────────────────────────────────────────────
const EFFECT_INFO: Record<string, { label: string; description: string; color: string }> = {
    infected: {
        label: 'Infecté',
        description: "Le joueur a été mordu par le Loup Infect. Il fait partie des loups-garous.",
        color: 'text-green-400',
    },
    poisoned: {
        label: 'Empoisonné',
        description: "Le joueur est empoisonné. Il ne pourra utiliser ses pouvoirs ni voter pendant tout un cycle.",
        color: 'text-purple-400',
    },
    gasoline: {
        label: "Aspersé d'essence",
        description: "Le joueur a été aspergé par le Pyromane. Il brûlera quand le Pyromane déclenchera l'incendie.",
        color: 'text-yellow-400',
    },
    lover: {
        label: 'Amoureux',
        description: "Le joueur est lié par l'amour. Si son partenaire meurt, il mourra de chagrin.",
        color: 'text-pink-400',
    },
};

// ─── Types ────────────────────────────────────────────────────────────────────
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
    gmlVictimId?: string | null;
    infectedVictimId?: string | null;
    getPlayerAvatar: (playerId: string, fallbackUrl?: string) => string;
    nightActions?: any[];
    isSpeaking?: boolean;
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
    gmlVictimId,
    infectedVictimId,
    getPlayerAvatar,
    nightActions,
    isSpeaking
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
    const roleDef = mockRoleDef || (player.role ? ROLES[player.role as RoleId] : null);

    // ── Animation de mort ──
    const wasAliveRef = useRef(player.isAlive);
    const [dyingAnimation, setDyingAnimation] = useState(false);
    useEffect(() => {
        if (wasAliveRef.current && !player.isAlive) {
            setDyingAnimation(true);
            const t = setTimeout(() => setDyingAnimation(false), 2000);
            return () => clearTimeout(t);
        }
        wasAliveRef.current = player.isAlive;
    }, [player.isAlive]);

    // ── Gestion du tooltip actif (un seul à la fois) ──
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const toggleTip = (id: string) => setActiveTooltip(prev => prev === id ? null : id);
    // Direction du tooltip selon la position de l'avatar dans l'octogone
    const tooltipDir: TooltipDir = Math.abs(x) >= Math.abs(y)
        ? (x < 0 ? 'right' : 'left')
        : (y < 0 ? 'bottom' : 'top');

    // Use game.votes for better synchronicity
    const votersForThisPlayer = game.players.filter(p => (game.votes || {})[p.id] === player.id);
    const isTargeted = votersForThisPlayer.length > 0;
    const me = currentUser ? game.players.find(p => p.id === currentUser.uid) : null;

    // Autorisation de voter ou d'utiliser un pouvoir sur cette personne
    const isTargetWolf = isInWolfCamp(player.role as RoleId) || player.role === 'GRAND_MECHANT_LOUP' || player.role === 'LOUP_INFECT' || player.effects?.includes('infected');
    const isMeWolf = isInWolfCamp(me?.role as RoleId) || me?.role === 'GRAND_MECHANT_LOUP' || me?.role === 'LOUP_INFECT' || me?.effects?.includes('infected');
    const isTargetedByPower = powerTargets?.includes(player.id);
    const isWolfVictim = wolfVictimId === player.id;

    // Check if player is targeted by Witch's poison this night
    const isPoisonTarget = nightActions?.some(a => a.powerId === 'POTION_POISON' && a.targetId === player.id && a.sourceId === me?.id);
    const isHealed = nightActions?.some(a => a.powerId === 'POTION_SOIN' && a.targetId === player.id && a.sourceId === me?.id);
    const isCupidonTarget = nightActions?.some(a => a.powerId === 'COUP_DE_COEUR' && (a.targetId === player.id || a.targetId2 === player.id) && a.sourceId === me?.id);

    // If healed, remove the wolf victim status visually for the Witch so it stops pulsing.
    // Also, ONLY Wolves, the Witch (if she hasn't used her heal potion), and the Little Girl should see the wolf victim.
    const witchCanSeeVictim = me?.role === 'SORCIERE' && !me?.usedPowers?.includes('POTION_SOIN');
    const canSeeWolfVictim = isInWolfCamp(me?.role as RoleId) || witchCanSeeVictim || me?.role === 'PETITE_FILLE';
    const displayAsWolfVictim = isWolfVictim && !isHealed && canSeeWolfVictim;

    // GML Victim
    const isGmlVictim = gmlVictimId === player.id && me?.role === 'GRAND_MECHANT_LOUP';

    const isMe = me?.id === player.id;

    // Determine which effects to show to this specific user
    const effects = player.effects || [];
    const meEffects = me?.effects || [];

    // Logic for targeting with power or normal vote
    const canVoteActual = (onVote && (
        (activePower && activePower !== 'FUSIL' && activePower !== 'GRIFFURE_MORTELLE' && activePower !== 'ESSENCE' && activePower !== 'POISON_TOXIQUE' && me?.isAlive && !isDead) || // Regular power
        (activePower === 'GRIFFURE_MORTELLE' && me?.isAlive && !isDead && me?.id !== player.id) || // GML cannot target himself
        (activePower === 'ESSENCE' && me?.isAlive && !isDead && me?.id !== player.id && !effects.includes('gasoline')) || // Pyromane cannot target himself or already gasoline
        (activePower === 'POISON_TOXIQUE' && me?.isAlive && !isDead && me?.id !== player.id && game.lastPoisonedId !== player.id) || // Empoisonneur cannot target himself or last poisoned
        (activePower === 'FUSIL' && !me?.isAlive && me?.deadAt && !isDead) || // Hunter power
        (currentPhase === 'MAYOR_SUCCESSION' && !me?.isAlive && me?.id === game.dyingMayorId && !isDead) || // Dying Mayor
        (!activePower && (
            currentPhase === 'MAYOR_ELECTION' ||
            currentPhase === 'DAY_VOTE' ||
            (currentPhase === 'NIGHT' && isMeWolf && !isTargetWolf) ||
            (currentPhase === 'NIGHT' && me?.role === 'LOUP_BLANC' && !me?.effects?.includes('infected')) ||
            (currentPhase === 'NIGHT' && me?.role === 'ASSASSIN' && !me?.effects?.includes('infected'))
        ) && me?.isAlive && !isDead)
    ));
    const canVote = mockCanVote !== undefined ? mockCanVote : canVoteActual;

    const showInfected = effects.includes('infected') && (
        isDead ||
        isInWolfCamp(me?.role as RoleId) ||
        me?.id === player.id ||
        meEffects.includes('infected')
    );
    const showPoisoned = effects.includes('poisoned');
    const showGasoline = effects.includes('gasoline') && (isDead || me?.role === 'PYROMANE' || player.id === me?.id);
    const showLover = effects.includes('lover') && (meEffects.includes('lover') || me?.role === 'CUPIDON' || player.id === me?.id);

    // La bordure de la victime infectée lors de l'utilisation du pouvoir
    const isInfectedTarget = currentPhase === 'NIGHT' && (
        (activePower === 'MORSURE_INFECTE' && (powerTargets || []).includes(player.id)) ||
        infectedVictimId === player.id
    );

    const isLoupBlancVote = currentPhase === 'NIGHT' && me?.role === 'LOUP_BLANC' && !meEffects.includes('infected') && game.votes[me.id] === player.id;
    const isAssassinVote = currentPhase === 'NIGHT' && me?.role === 'ASSASSIN' && !meEffects.includes('infected') && game.votes[me.id] === player.id;
    const isEssenceTarget = currentPhase === 'NIGHT' && me?.role === 'PYROMANE' && nightActions?.some(a => a.powerId === 'ESSENCE' && a.targetId === player.id && a.sourceId === me?.id);
    const isPoisonTargetSelection = currentPhase === 'NIGHT' && me?.role === 'EMPOISONNEUR' && nightActions?.some(a => a.powerId === 'POISON_TOXIQUE' && a.targetId === player.id && a.sourceId === me?.id);

    // Détermine si l'indicateur vocal doit être visible pour l'utilisateur actuel
    let displaySpeaking = false;
    if (isSpeaking) {
        if (currentPhase === 'NIGHT') {
            displaySpeaking = Boolean(isMe ? isMeWolf : (isMeWolf && isTargetWolf));
        } else {
            // Dans les autres phases, si le joueur parle on peut l'afficher.
            displaySpeaking = true;
        }
    }

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
                ${isTargeted || isTargetedByPower || isPoisonTarget || isPoisonTargetSelection || isCupidonTarget || isGmlVictim || isInfectedTarget || isLoupBlancVote || isAssassinVote || isEssenceTarget ? ((currentPhase === 'NIGHT') ? "border-dashed !border-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.6)] scale-105" : 'border-dashed !border-4 border-slate-900 shadow-[0_0_20px_rgba(0,0,0,0.6)] scale-105') : ''}
                ${displaySpeaking ? '!border-[var(--voice-aura)]' : ''}
                ${isTargetedByPower ? (activePower === 'COUP_DE_COEUR' ? '!border-[#ff69b4] shadow-[0_0_15px_#ff69b4] animate-pulse' : (activePower === 'MORSURE_INFECTE' ? '!border-green-500 shadow-[0_0_15px_#22c55e] animate-pulse' : '!border-[#D1A07A]')) : ''}
                ${isCupidonTarget ? '!border-[#ff69b4] shadow-[0_0_15px_#ff69b4] animate-pulse scale-105' : ''}
                ${displayAsWolfVictim ? ((isInfectedTarget) ? '!border-green-600 shadow-[0_0_15px_#22c55e] animate-pulse scale-105' : '!border-red-600 shadow-[0_0_15px_#ef4444] animate-pulse scale-105') : ''}
                ${isGmlVictim || isLoupBlancVote ? '!border-dashed !border-red-900 shadow-[0_0_15px_#7f1d1d] animate-pulse scale-105' : ''}
                ${isAssassinVote ? '!border-dashed !border-blue-800 shadow-[0_0_15px_#000000] animate-pulse scale-105' : ''}
                ${isEssenceTarget ? '!border-dashed !border-[#fbbf24] shadow-[0_0_15px_#fbbf24] animate-pulse scale-105' : ''}
                ${isPoisonTarget || isPoisonTargetSelection ? '!border-purple-600 shadow-[0_0_15px_#9333ea]' : ''}
                ${isHealed ? '!border-green-500 shadow-[0_0_15px_#22c55e]' : ''}
                ${dyingAnimation ? '!border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.8)] scale-110' : ''}
            `} title={displayAsWolfVictim ? "Cible des Loups" : (isGmlVictim ? "Carnage (Votre 2e cible)" : (isAssassinVote ? "Lame Noire (Votre cible)" : (isLoupBlancVote ? "Trahison (Votre cible)" : (isInfectedTarget ? "Cible de l'infection" : (isPoisonTarget || isPoisonTargetSelection ? "Cible de votre poison" : (isHealed ? "Sauvé par votre potion" : (isEssenceTarget ? "Cible de l'arrosage" : "")))))))}>
                {displaySpeaking && <div className="voice-aura-wave" />}
                {/* Animation de mort — flash rouge puis croix */}
                {dyingAnimation && (
                    <div className="absolute inset-0 z-50 rounded-full flex items-center justify-center bg-red-900/60" style={{ animation: 'toast-in 0.2s ease-out' }}>
                        <Image src="/assets/images/icones/Mort.png" alt="Mort" fill className="object-cover rounded-full opacity-80" />
                    </div>
                )}
                {/* MOCK: L'image de fond lune pour tout le monde */}
                <div className={`absolute inset-0 bg-[#e3d1ae] rounded-full z-0 overflow-hidden ${isDead ? 'grayscale' : ''}`}></div>
                <div className={`absolute inset-0 flex items-center justify-center opacity-30 z-0 select-none overflow-hidden ${isDead ? 'grayscale' : ''}`}>
                    <Image src="/assets/images/icones/Moon.png" alt="" fill className="object-cover" />
                </div>

                {/* L'avatar personnage */}
                <div className={`relative z-10 w-[95%] h-[95%] rounded-full overflow-hidden flex items-center justify-center text-slate-800 ${isDead ? 'grayscale opacity-90' : ''}`}>
                    {player.isDisconnected ? (
                        <div className="absolute inset-0 bg-black flex items-center justify-center rounded-full z-10">
                            <span className="text-white text-[10px] sm:text-xs font-bold font-montserrat truncate w-full text-center px-1">(déconnecté)</span>
                        </div>
                    ) : isDead ? (
                        <Image src="/assets/images/icones/Mort.png" alt="Mort" fill className="object-cover rounded-full" />
                    ) : (
                        <Image src={getPlayerAvatar(player.id, player.avatarUrl)} alt={player.name} fill className="object-cover rounded-full" />
                    )}
                </div>

                {/* Couronne du maire */}
                {game.mayorId === player.id && (
                    <div className="absolute -top-4 -left-2 z-30">
                        <Tooltip
                            label="Maire"
                            description="Ce joueur est le Maire élu. Son vote compte double lors de l'élimination du jour."
                            color="text-[#D1A07A]"
                            dir={tooltipDir}
                            isOpen={activeTooltip === 'mayor'}
                            onToggle={() => toggleTip('mayor')}
                        >
                            <div className="w-8 h-8 drop-shadow-md transform -rotate-15 cursor-pointer">
                                <Image src="/assets/images/icones/couronne-icon.png" alt="Maire" width={32} height={32} unoptimized />
                            </div>
                        </Tooltip>
                    </div>
                )}

                {/* Badge Loup (Reconnaissance entre loups) */}
                {isInWolfCamp(me?.role as RoleId) && isInWolfCamp(player.role as RoleId) && (
                    <div className="absolute -top-3 -right-5 z-30">
                        <Tooltip
                            label="Membre de la meute"
                            description="Ce joueur fait partie de votre camp. Vous votez ensemble la nuit pour éliminer un villageois."
                            color="text-red-400"
                            dir={tooltipDir}
                            isOpen={activeTooltip === 'wolf'}
                            onToggle={() => toggleTip('wolf')}
                        >
                            <div className="w-12 h-12 drop-shadow-lg cursor-pointer">
                                <Image src="/assets/images/icones/Icone_Loup.png" alt="Loup" width={32} height={32} className="object-contain" unoptimized />
                            </div>
                        </Tooltip>
                    </div>
                )}

                {/* Badge Rôle (Si mort, ou bien révélé à la voyante pendant la nuit) */}
                {roleDef && (isDead || (!isDead && currentPhase === 'NIGHT' && me?.role === 'VOYANTE')) && (
                    <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full z-30 overflow-hidden" title={roleDef.label}>
                        <Image src={roleDef.image || "/assets/images/icones/Carte_Role.png"} alt={roleDef.label} fill className="object-contain p-1" />
                    </div>
                )}

                {/* Badge Infecté */}
                {showInfected && (
                    <div className="absolute -top-5 -right-5 z-40">
                        <Tooltip {...EFFECT_INFO.infected} dir={tooltipDir} isOpen={activeTooltip === 'infected'} onToggle={() => toggleTip('infected')}>
                            <div className="cursor-pointer">
                                <Image src="/assets/images/icones/powers/Effect_infecte.png" alt="Infecté" width={48} height={48} unoptimized className="scale-150" />
                            </div>
                        </Tooltip>
                    </div>
                )}

                {/* Autres effets en bas à gauche */}
                <div className="absolute -left-2 -bottom-2 flex flex-col gap-1 z-40">
                    {showPoisoned && (
                        <Tooltip {...EFFECT_INFO.poisoned} dir={tooltipDir} isOpen={activeTooltip === 'poisoned'} onToggle={() => toggleTip('poisoned')}>
                            <div className="cursor-pointer">
                                <Image src="/assets/images/icones/powers/Poison_Toxique.png" alt="Empoisonné" width={50} height={50} unoptimized />
                            </div>
                        </Tooltip>
                    )}
                    {showGasoline && (
                        <Tooltip {...EFFECT_INFO.gasoline} dir={tooltipDir} isOpen={activeTooltip === 'gasoline'} onToggle={() => toggleTip('gasoline')}>
                            <div className="cursor-pointer">
                                <Image src="/assets/images/icones/powers/essance_bidon.png" alt="Essence" width={50} height={50} unoptimized />
                            </div>
                        </Tooltip>
                    )}
                    {showLover && (
                        <Tooltip {...EFFECT_INFO.lover} dir={tooltipDir} isOpen={activeTooltip === 'lover'} onToggle={() => toggleTip('lover')}>
                            <div className="cursor-pointer">
                                <Image src="/assets/images/icones/powers/coup_coeur.png" alt="Amoureux" width={50} height={50} unoptimized />
                            </div>
                        </Tooltip>
                    )}
                </div>
            </div>

            <p className={`mt-1 font-bold text-[10px] tracking-wider bg-transparent px-2 py-0.5 whitespace-nowrap ${isDead ? 'text-red-700 line-through decoration-2 decoration-red-900' : (currentPhase === 'NIGHT' ? 'text-slate-200' : 'text-slate-800')}`}>
                <span className={`font-extrabold mr-1 ${currentPhase === 'NIGHT' ? 'text-slate-400' : 'text-slate-500'}`}>{index + 1}</span>
                {player.name}
                {isMe && <span className="ml-1 text-[8px] opacity-70">(Moi)</span>}
            </p>

            {/* Rangée de voteurs — avatars chevauchés + overflow +X */}
            {isTargeted && (currentPhase !== 'NIGHT' || isInWolfCamp(me?.role as RoleId)) && (
                <div className="absolute top-[108%] group z-40">
                    <div className="flex items-center">
                        {votersForThisPlayer.slice(0, 8).map((vp, vIdx) => (
                            <div
                                key={vIdx}
                                className="relative w-5 h-5 rounded-full border border-slate-700 overflow-hidden shadow-sm flex-shrink-0"
                                style={{ marginLeft: vIdx === 0 ? 0 : '-6px', zIndex: 10 + vIdx }}
                                title={vp.name}
                            >
                                <Image src={getPlayerAvatar(vp.id, vp.avatarUrl)} alt={vp.name} fill className="object-cover" />
                            </div>
                        ))}
                        {votersForThisPlayer.length > 8 && (
                            <div className="relative w-5 h-5 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-[7px] font-extrabold text-white flex-shrink-0" style={{ marginLeft: '-6px', zIndex: 20 }}>
                                +{votersForThisPlayer.length - 8}
                            </div>
                        )}
                    </div>
                    {/* Tooltip noms au survol */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/95 text-white text-[9px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
                        {votersForThisPlayer.map(vp => vp.name).join(', ')}
                    </div>
                </div>
            )}
        </div >
    );
}
