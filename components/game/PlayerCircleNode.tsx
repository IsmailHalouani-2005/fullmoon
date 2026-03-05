import Image from 'next/image';
import { Player, Phase, GameState } from '@/types/game';
import { ROLES, RoleId, isInWolfCamp } from "@/types/roles";


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
            `} title={displayAsWolfVictim ? "Cible des Loups" : (isGmlVictim ? "Carnage (Votre 2e cible)" : (isAssassinVote ? "Lame Noire (Votre cible)" : (isLoupBlancVote ? "Trahison (Votre cible)" : (isInfectedTarget ? "Cible de l'infection" : (isPoisonTarget || isPoisonTargetSelection ? "Cible de votre poison" : (isHealed ? "Sauvé par votre potion" : (isEssenceTarget ? "Cible de l'arrosage" : "")))))))}>
                {displaySpeaking && <div className="voice-aura-wave" />}
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
                    <div className="absolute -top-4 -left-2 w-8 h-8 drop-shadow-md z-30 transform -rotate-15" title="Maire actuel">
                        <Image src="/assets/images/icones/couronne-icon.png" alt="Maire" width={32} height={32} />
                    </div>
                )}

                {/* Badge Loup (Reconnaissance entre loups) */}
                {isInWolfCamp(me?.role as RoleId) && isInWolfCamp(player.role as RoleId) && (
                    <div className="absolute -top-3 -right-5 w-12 h-12 drop-shadow-lg z-30" title="Membre de la meute">
                        <Image src="/assets/images/icones/Icone_Loup.png" alt="Loup" width={32} height={32} className="object-contain" />
                    </div>
                )}

                {/* Badge Rôle (Si mort, ou bien révélé à la voyante pendant la nuit) */}
                {roleDef && (isDead || (!isDead && currentPhase === 'NIGHT' && me?.role === 'VOYANTE')) && (
                    <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full z-30 overflow-hidden" title={roleDef.label}>
                        <Image src={roleDef.image || "/assets/images/icones/Carte_Role.png"} alt={roleDef.label} fill className="object-contain p-1" />
                    </div>
                )}

                {/* Effect Icons Section */}
                {/* Badge Infecté en haut à droite */}
                {showInfected && (
                    <div className="absolute -top-4 -right-20 w-25 h-25 drop-shadow-md z-40" title="Infecté">
                        <Image src="/assets/images/icones/powers/Effect_infecte.png" alt="Infecté" width={50} height={50} />
                    </div>
                )}

                {/* Autres effets en bas à gauche */}
                <div className="absolute -left-2 -bottom-2 flex flex-col gap-1 z-40">
                    {showPoisoned && (
                        <div className="w-15 h-15 drop-shadow-md" title="Empoisonné (Muet)">
                            <Image src="/assets/images/icones/powers/Poison_Toxique.png" alt="Muet" width={50} height={50} />
                        </div>
                    )}
                    {showGasoline && (
                        <div className="w-10 h-10 drop-shadow-md" title="Recouvert d'essence">
                            <Image src="/assets/images/icones/powers/essance_bidon.png" alt="Essence" width={50} height={50} />
                        </div>
                    )}
                    {showLover && (<div className="w-10 h-10 drop-shadow-md" title="Amoureux">
                        <Image src="/assets/images/icones/powers/coup_coeur.png" alt="Amour" width={50} height={50} />
                    </div>
                    )}
                </div>
            </div>

            <p className={`mt-1 font-bold text-[10px] tracking-wider bg-transparent px-2 py-0.5 whitespace-nowrap ${isDead ? 'text-red-700 line-through decoration-2 decoration-red-900' : (currentPhase === 'NIGHT' ? 'text-slate-200' : 'text-slate-800')}`}>
                <span className={`font-extrabold mr-1 ${currentPhase === 'NIGHT' ? 'text-slate-400' : 'text-slate-500'}`}>{index + 1}</span>
                {player.name}
                {isMe && <span className="ml-1 text-[8px] opacity-70">(Moi)</span>}
            </p>

            {/* Piles de voteurs sous le nom */}
            {
                isTargeted && (
                    (currentPhase === 'NIGHT') ? (
                        (isInWolfCamp(me?.role as RoleId)) ? (
                            <div className="flex flex-wrap justify-center gap-1 w-full max-w-[100px] absolute top-[110%]">
                                {votersForThisPlayer.map((vp, vIdx) => (
                                    <div key={vIdx} className="relative w-5 h-5 rounded-full border-1 border-slate-700 overflow-hidden drop-shadow-sm transition-transform hover:scale-150 z-40" title={vp.name}>
                                        <Image src={getPlayerAvatar(vp.id, vp.avatarUrl)} alt={vp.name} fill className="object-cover" />
                                    </div>
                                ))}
                            </div>) : ""
                    ) : (
                        <div className="flex flex-wrap justify-center gap-1 w-full max-w-[100px] absolute top-[110%]">
                            {votersForThisPlayer.map((vp, vIdx) => (
                                <div key={vIdx} className="relative w-5 h-5 rounded-full border-1 border-slate-700 overflow-hidden drop-shadow-sm transition-transform hover:scale-150 z-40" title={vp.name}>
                                    <Image src={getPlayerAvatar(vp.id, vp.avatarUrl)} alt={vp.name} fill className="object-cover" />
                                </div>
                            ))}
                        </div>
                    )
                )
            }
        </div >
    );
}
