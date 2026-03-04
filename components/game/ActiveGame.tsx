import React from 'react';
import Image from 'next/image';
import { ROLES, RoleId } from '@/types/roles';
import { GameState, Phase } from '@/types/game';
import RoleCard from '@/components/game/RoleCard';
import PlayerCircleNode from '@/components/game/PlayerCircleNode';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActiveGameProps {
    currentPhase: Phase | string;
    game: GameState;
    roomCode: string;
    dynamicRolesConfig: any;
    copyInviteLink: () => void;
    isHost: boolean;
    groupConfig: any;
    isInviteOpen: boolean;
    setIsInviteOpen: (v: boolean) => void;
    isPlayersListOpen: boolean;
    setIsPlayersListOpen: (v: boolean) => void;
    socket: any;
    user: any;
    isCardFlipped: boolean;
    setIsCardFlipped: (v: boolean) => void;
    setSelectedRole: (v: RoleId | null) => void;
    activePower: string | null;
    setActivePower: (v: string | null) => void;
    powerTargets: string[];
    setPowerTargets: (v: string[]) => void;
    handlePowerClick: (powerId: string) => void;
    handlePlayerClick: (playerId: string) => void;
    getPlayerAvatar: (playerId: string, avatarUrl?: string) => string;
    speakingPlayers: Set<string>;
}

export default function ActiveGame({
    currentPhase,
    game,
    roomCode,
    dynamicRolesConfig,
    copyInviteLink,
    isHost,
    groupConfig,
    isInviteOpen,
    setIsInviteOpen,
    isPlayersListOpen,
    setIsPlayersListOpen,
    socket,
    user,
    isCardFlipped,
    setIsCardFlipped,
    setSelectedRole,
    activePower,
    setActivePower,
    powerTargets,
    setPowerTargets,
    handlePowerClick,
    handlePlayerClick,
    getPlayerAvatar,
    speakingPlayers
}: ActiveGameProps) {
    const getCampColor = (camp: string) => {
        if (camp === 'VILLAGE') return 'text-green-600';
        if (camp === 'LOUPS') return 'text-red-600';
        return 'text-purple-600';
    };

    return (
        <main className={`flex-1 relative overflow-hidden flex flex-col items-center justify-center p-8 ${currentPhase === 'NIGHT' ? 'bg-dark text-white' : 'bg-white text-dark'}`}>

            {/* Image de fond léger pour l'ambiance */}
            <div
                className={`absolute inset-0 pointer-events-none bg-center bg-no-repeat bg-cover transition-opacity duration-1000 ${currentPhase === 'NIGHT' ? 'opacity-5' : 'opacity-[0.03]'}`}
                style={{ backgroundImage: "url('/assets/images/icones/village_batiments.png')" }}
            />

            {/* Le conteneur du cercle (Responsive en pourcentage pour s'adapter à l'écran) */}
            <div className="relative w-full max-w-[800px] aspect-square max-h-[90vh] sm:max-h-[80vh] flex items-center justify-center">

                {/* Boîte Centrale des Infos */}
                {currentPhase === 'LOBBY' ? (
                    <div className="bg-primary font-montserrat border-2 border-dark p-4 sm:p-10 text-center flex flex-col items-center shadow-md w-[80%] max-w-[400px] z-50 rounded-lg">
                        <h2 className="text-4xl sm:text-3xl font-extrabold tracking-widest mb-1 text-slate-900 font-enchanted">EN ATTENTE DES JOUEURS</h2>
                        <p className=" text-sm text-slate-600 mb-5 font-bold">({game.players.length} / {dynamicRolesConfig ? (Object.values(dynamicRolesConfig).reduce((a: any, b: any) => a + (b || 0), 0) as number) : '?'} joueurs)</p>

                        <p className="text-sm text-slate-500 mb-2">Invitez d'autres joueurs pour remplir le village</p>

                        <div className="flex items-center gap-2 bg-[#D1A07A] text-dark px-6 py-3 rounded-lg w-full cursor-pointer hover:bg-[#b08465] transition-colors shadow-[0_0_10px_-1px_#2D3436]" onClick={copyInviteLink}>
                            <span className="flex-1 font-bold text-sm truncate text-left">{typeof window !== 'undefined' ? `${window.location.host}/room/${roomCode}` : roomCode}</span>
                            <Image src="/assets/images/icones/copy_paste-icon.png" alt="Copier" width={20} height={20} className="ml-2 flex-shrink-0" />
                        </div>

                        {/* Section Code Secret (Uniquement pour l'Hôte si Village Privé) */}
                        {isHost && (game.isPrivate || groupConfig?.isPrivate) && (
                            <div className="mt-2 w-full flex flex-col items-center">
                                <p className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Code Secret (Privé)</p>
                                <div className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-lg w-3/4 shadow-inner">
                                    <span className="flex-1 text-sm tracking-widest text-center">{game.secretCode || groupConfig?.secretCode}</span>
                                    <button onClick={() => {
                                        const code = game.secretCode || groupConfig?.secretCode;
                                        if (!code) return;
                                        navigator.clipboard.writeText(code);
                                        alert("Code secret copié dans le presse-papiers !");
                                    }} className="text-slate-300 hover:text-white transition-colors" title="Copier le code"><Image src="/assets/images/icones/copy_paste-icon_white.png" alt="Copier" width={18} height={18} /></button>
                                </div>
                            </div>
                        )}

                        <p className=" text-xs text-slate-500 my-2 uppercase font-bold tracking-widest">ou</p>

                        <button onClick={() => { if (!isInviteOpen) { setIsInviteOpen(true); setIsPlayersListOpen(false); } else { setIsInviteOpen(false); } }} className="bg-dark text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-black transition-colors shadow-md flex items-center justify-center gap-2 w-full ">
                            Invitez directement vos amis
                        </button>

                        {/* Bouton Commencer la Partie (En Dessous du cercle si host & >= 5) */}
                        <div className="bg-transparent mt-4 w-full flex justify-center z-20 font-enchanted">
                            {isHost && game.players.length >= 5 ? (
                                <button
                                    onClick={async () => {
                                        const startPayload: any = { isMayorEnabled: groupConfig?.isMayorEnabled };
                                        if (dynamicRolesConfig) {
                                            startPayload.rolesCount = dynamicRolesConfig;
                                            startPayload.isCustom = groupConfig?.isCustom;
                                        }
                                        console.log("[DIAGNOSTIC] Emitting start_game with payload:", JSON.stringify(startPayload));
                                        socket?.emit('start_game', startPayload);
                                        // Persister dans Firestore pour que le Quick Join sache que la partie est lancée
                                        try {
                                            await updateDoc(doc(db, "groups", roomCode), { gameStarted: true });
                                        } catch (e) { console.warn("Could not update gameStarted", e); }
                                    }}
                                    className="bg-transparent border-2 border-dark px-6 py-2 text-lg font-extrabold tracking-widest hover:bg-dark hover:text-white transition-colors text-dark rounded-lg cursor-pointer"
                                >
                                    COMMENCER LA PARTIE
                                </button>
                            ) : (
                                <div className="text-sm italic font-montserrat pointer-events-none text-slate-500">
                                    En attente de l'hôte (min. 5 joueurs)...
                                </div>
                            )}
                        </div>
                    </div>
                ) : currentPhase === 'ROLE_REVEAL' ? (
                    <div className="flex flex-col items-center justify-center z-[200] font-montserrat perspective-1000">
                        <h2 className="absolute -top-40 md:relative md:top-auto text-4xl sm:text-2xl font-extrabold tracking-widest mb-2 text-center text-slate-900 font-enchanted drop-shadow-md">Découvrez votre Rôle</h2>

                        <RoleCard
                            roleId={user && game.players.find((p: any) => p.id === user.uid)?.role ? (game.players.find((p: any) => p.id === user.uid)!.role as RoleId) : undefined}
                            isCardFlipped={isCardFlipped}
                            onFlip={() => setIsCardFlipped(true)}
                            isMayor={user ? game.mayorId === user.uid : false}
                            className="w-[180px] sm:w-[240px]"
                        />

                        <p className="mt-2 text-sm text-slate-600 font-bold bg-white/90 px-4 py-2 rounded-full shadow-sm animate-pulse">
                            {!isCardFlipped ? "Cliquez sur la carte pour la retourner" : "La partie commence bientôt..."}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full relative font-montserrat  md:p-8">
                        {/* Zone des Titres (Haut sur mobile, centré sur desktop via media queries) */}
                        <div className="absolute -top-45 md:top-auto md:relative w-full text-center flex flex-col items-center z-30">
                            <h2 className={`text-3xl md:text-4xl font-extrabold tracking-widest font-enchanted drop-shadow-sm ${currentPhase === 'NIGHT' ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-slate-900'}`}>
                                {(game.phase as string) === 'MAYOR_ELECTION' ? 'Élection du Maire' :
                                    (game.phase as string) === 'MAYOR_SUCCESSION' ? 'Succession du Maire' :
                                        (game.phase as string) === 'NIGHT' ? 'La Nuit Tombe' :
                                            (game.phase as string) === 'DAY_DISCUSSION' ? 'Le Jour se Lève' :
                                                (game.phase as string) === 'DAY_VOTE' ? 'Le Bûcher' :
                                                    (game.phase as string) === 'HUNTER_SHOT' ? 'Le Dernier Tir' : 'Fin de Partie'}
                            </h2>
                            <h5 className={`text-xs md:text-sm tracking-widest mb-2 italic drop-shadow-sm ${currentPhase === 'NIGHT' ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-slate-900'}`}>
                                {(game.phase as string) === 'MAYOR_ELECTION' ? "Votez pour un joueur pour qu'il devienne le Maire" :
                                    (game.phase as string) === 'MAYOR_SUCCESSION' ? (game.dyingMayorId === user?.uid ? "C'est votre dernier souffle ! Choisissez un joueur." : "Le Maire rend son dernier souffle...") :
                                        (game.phase as string) === 'NIGHT' ? "Utilisez vos pouvoirs" :
                                            (game.phase as string) === 'DAY_DISCUSSION' ? "Discutez et débattez entre vous" :
                                                (game.phase as string) === 'DAY_VOTE' ? "Votez pour le joueur à exécuter" :
                                                    (game.phase as string) === 'HUNTER_SHOT' ? "Le Chasseur prépare son arme..." : "Fin de Partie"}
                            </h5>
                            <div className="text-lg font-extrabold text-[#D1A07A] drop-shadow-md">
                                {game.timer}s
                            </div>
                            <p className={`text-sm font-bold uppercase tracking-widest ${currentPhase === 'NIGHT' ? 'text-slate-400' : 'text-slate-600'}`}>Temps Restant</p>
                        </div>

                        {/* Zone Centrale (Timer + Rôle) */}
                        <div className="flex flex-col items-center justify-center z-20 -mt-10 md:mt-0 relative w-full">

                            {/* Rappel du rôle du joueur */}
                            {(user && game.players.find((p: any) => p.id === user.uid)?.role) && (() => {
                                const mePlayer = game.players.find((p: any) => p.id === user.uid)!;
                                const myRole = mePlayer.role! as RoleId;
                                const roleDef = ROLES[myRole];
                                if (!roleDef) return null;
                                return (
                                    <div className="flex flex-col items-center">
                                        <div
                                            className="flex flex-col items-center opacity-80 hover:opacity-100 transition-opacity cursor-pointer bg-transparent md:bg-black/5 dark:bg-white/5 px-4 md:px-5 py-2 md:py-3 rounded-lg backdrop-blur-sm border border-black/10 dark:border-white/10"
                                            onClick={() => setSelectedRole(myRole)}
                                        >
                                            <p className={`text-[8px] uppercase font-bold text-center font-montserrat tracking-widest mb-1 ${currentPhase === 'NIGHT' ? 'text-slate-400' : 'text-slate-500'}`}>Votre rôle <br /> <span className="text-slate-300 text-[8px]">(cliquez)</span></p>
                                            <div className={`relative w-10 h-10 drop-shadow-md ${currentPhase === 'NIGHT' ? 'animate-pulse' : ''}`}>
                                                <Image src={roleDef.image || "/assets/images/icones/Carte_Role.png"} alt={roleDef.label} fill className="object-contain" />
                                            </div>
                                            <p className={`font-extrabold mt-1 text-[10px] md:text-xs tracking-wide ${currentPhase === 'NIGHT' ? (roleDef.camp === 'LOUPS' ? 'text-red-400' : (roleDef.camp === 'VILLAGE' ? 'text-green-400' : 'text-purple-400')) : (getCampColor(roleDef.camp))}`}>{roleDef.label}</p>
                                        </div>

                                        {/* Power Icons Section */}
                                        {((roleDef.powers || []).length > 0 && (currentPhase === 'NIGHT' || currentPhase === 'HUNTER_SHOT')) && (
                                            <div className="mt-1 flex gap-4">
                                                {(roleDef.powers || []).map(power => {
                                                    const usedPowers = mePlayer.usedPowers || [];
                                                    const isUsedOneTime = power.type === 'one-time' && usedPowers.includes(power.id);
                                                    const isUsedThisNight = game.nightActions?.some((a: any) => a.sourceId === user?.uid && a.powerId === power.id);
                                                    const isUsed = isUsedOneTime || (power.type === 'active' && isUsedThisNight);

                                                    // Sorcière : si une potion est utilisée cette nuit, bloquer l'autre pendant cette nuit
                                                    const usedPotionThisNight = game.nightActions?.some((a: any) => a.sourceId === user.uid && (a.powerId === 'POTION_SOIN' || a.powerId === 'POTION_POISON'));
                                                    const isPotion = power.id === 'POTION_SOIN' || power.id === 'POTION_POISON';
                                                    const isTemporarilyBlocked = isPotion && usedPotionThisNight && !game.nightActions.some((a: any) => a.powerId === power.id); // L'autre potion est bloquée

                                                    // GML Specific: canGMLKill logic
                                                    let canGMLKill = true;
                                                    let gmlDisableMessage = "Seconde attaque (Carnage)";
                                                    if (power.id === 'GRIFFURE_MORTELLE') {
                                                        const initialWolvesCount = (game.rolesCount?.['LOUP_GAROU'] || 0) +
                                                            (game.rolesCount?.['LOUP_ALPHA'] || 0) +
                                                            (game.rolesCount?.['GRAND_MECHANT_LOUP'] || 0) +
                                                            (game.rolesCount?.['LOUP_INFECT'] || 0);

                                                        let currentWolvesAlive = 0;
                                                        game.players.forEach((p: any) => {
                                                            if (p.isAlive && (p.role === 'LOUP_GAROU' || p.role === 'LOUP_ALPHA' || p.role === 'GRAND_MECHANT_LOUP' || p.role === 'LOUP_INFECT')) {
                                                                currentWolvesAlive++;
                                                            }
                                                        });

                                                        if (initialWolvesCount <= 1) {
                                                            canGMLKill = false;
                                                            gmlDisableMessage = "Carnage bloqué : Vous avez commencé la partie seul.";
                                                        } else if (currentWolvesAlive < initialWolvesCount) {
                                                            canGMLKill = false;
                                                            gmlDisableMessage = "Carnage perdu : Un loup de la meute est mort.";
                                                        }
                                                    }

                                                    // Only show/enable FUSIL during HUNTER_SHOT, others during NIGHT
                                                    const isTimingCorrect = power.id === 'FUSIL'
                                                        ? currentPhase === 'HUNTER_SHOT'
                                                        : (power.timing === 'night' && currentPhase === 'NIGHT');

                                                    // Pyromane Specific:
                                                    let canPyromaneUse = true;
                                                    let pyromaneDisableMessage = "";
                                                    if (mePlayer.role === 'PYROMANE') {
                                                        const hasGasolineAlive = game.players.some((p: any) => p.isAlive && p.effects.includes('gasoline'));
                                                        const usedEssenceTonight = game.nightActions?.some((a: any) => a.sourceId === user?.uid && a.powerId === 'ESSENCE');
                                                        const usedAllumetteTonight = game.nightActions?.some((a: any) => a.sourceId === user?.uid && a.powerId === 'ALLUMETTE');

                                                        if (power.id === 'ALLUMETTE') {
                                                            if (!hasGasolineAlive) {
                                                                canPyromaneUse = false;
                                                                pyromaneDisableMessage = "Personne n'est arrosé !";
                                                            } else if (usedEssenceTonight) {
                                                                canPyromaneUse = false;
                                                                pyromaneDisableMessage = "Vous avez déjà arrosé ce soir";
                                                            }
                                                        } else if (power.id === 'ESSENCE') {
                                                            if (usedAllumetteTonight) {
                                                                canPyromaneUse = false;
                                                                pyromaneDisableMessage = "Incendie déjà amorcé";
                                                            }
                                                        }
                                                    }

                                                    const isPoisonedBlocked = mePlayer?.effects?.includes('poisoned');
                                                    const canUse = !isUsed && !isTemporarilyBlocked && !isPoisonedBlocked && isTimingCorrect && (power.id === 'FUSIL' ? true : mePlayer.isAlive) && canGMLKill && canPyromaneUse;
                                                    const isActive = activePower === power.id;

                                                    // If the power isn't relevant to this moment at all, skip rendering it? 
                                                    // User said "only visible during night", but Hunter shot is special.
                                                    if (!isTimingCorrect && currentPhase !== 'NIGHT') return null;

                                                    return (
                                                        (power.icon != "") ? (
                                                            <div
                                                                key={power.id}
                                                                className={`relative z-[1000] group flex flex-col items-center cursor-pointer transition-all ${!canUse ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-110'}`}
                                                                onClick={() => canUse && handlePowerClick(power.id)}
                                                            >
                                                                <div className={`md:w-10 md:h-10 w-8 h-8 rounded-full border-2 p-1 flex items-center justify-center transition-colors ${isActive ? 'border-[#D1A07A] bg-[#D1A07A]/20 shadow-[0_0_10px_#D1A07A]' : 'border-slate-600 bg-black/20'}`}>
                                                                    <Image src={power.icon} alt={power.label} width={32} height={32} className="object-contain" />
                                                                </div>
                                                                {/* Tooltip or Label */}
                                                                <span className="absolute -bottom-6 w-max bg-black/80 text-white text-[8px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {power.id === 'GRIFFURE_MORTELLE' ? gmlDisableMessage : (mePlayer.role === 'PYROMANE' && pyromaneDisableMessage ? pyromaneDisableMessage : power.label)}
                                                                </span>
                                                                {isActive && (
                                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                                                                )}
                                                            </div>
                                                        ) : ""
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Helper text for Cupidon */}
                                        {activePower === 'COUP_DE_COEUR' && (
                                            <div className="mt-3 text-[#ff69b4] font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-[#ff69b4]/50">
                                                {powerTargets.length === 0 ? "Choisissez le premier amoureux" : "Choisissez le deuxième amoureux"}
                                            </div>
                                        )}

                                        {/* Helper text for Grand Méchant Loup */}
                                        {activePower === 'GRIFFURE_MORTELLE' && (
                                            <div className="mt-3 text-[#7f1d1d] font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-[#7f1d1d]/50">
                                                Choisissez une autre victime à tuer
                                            </div>
                                        )}

                                        {/* Helper text for Loup Infecte */}
                                        {activePower === 'MORSURE_INFECTE' && (
                                            <div className="mt-3 text-red-500 font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-red-500/50">
                                                Cliquez sur la victime des loups pour qu'elle soit infectée
                                            </div>
                                        )}

                                        {/* Helper text for Loup Blanc */}
                                        {currentPhase === 'NIGHT' && mePlayer?.role === 'LOUP_BLANC' && !mePlayer?.effects?.includes('infected') && !activePower && (
                                            <div className="mt-3 text-red-500 font-bold text-xs sm:text-xs animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-red-500/50 text-center">
                                                Votez pour tuer un Loup-Garou. <br /> Si vous ciblez un autre rôle, l'attaque échouera.
                                            </div>
                                        )}

                                        {/* Helper text for Assassin */}
                                        {currentPhase === 'NIGHT' && mePlayer?.role === 'ASSASSIN' && !mePlayer?.effects?.includes('infected') && !activePower && (
                                            <div className="mt-3 text-slate-300 font-bold text-xs sm:text-xs animate-pulse drop-shadow-md bg-black/60 px-3 py-1 rounded-full border border-slate-500/50 text-center">
                                                Votez pour assassiner un joueur. <br /> Votre cible mourra de façon certaine.
                                            </div>
                                        )}

                                        {/* Helper text for Pyromane (Essence) */}
                                        {activePower === 'ESSENCE' && (
                                            <div className="mt-3 text-orange-400 font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-orange-500/50 text-center">
                                                Choisissez un joueur à arroser d'essence
                                            </div>
                                        )}

                                        {/* Helper text for Empoisonneur */}
                                        {activePower === 'POISON_TOXIQUE' && (
                                            <div className="mt-3 text-purple-400 font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/40 px-3 py-1 rounded-full border border-purple-500/50 text-center">
                                                Choisissez un joueur à empoisonner
                                            </div>
                                        )}

                                        {/* Feedback text for Pyromane (Allumette activée) */}
                                        {/* On vérifie si l'action ALLUMETTE est dans les actions de nuit du joueur */}
                                        {currentPhase === 'NIGHT' && mePlayer?.role === 'PYROMANE' && game.nightActions?.some((a: any) => a.sourceId === user?.uid && a.powerId === 'ALLUMETTE') && (
                                            <div className="mt-3 text-red-500 font-bold text-xs sm:text-sm animate-pulse drop-shadow-md bg-black/60 px-3 py-1 rounded-full border border-red-500/50 text-center">
                                                Incendie programmé pour cette nuit ! 🔥
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Affichage des Joueurs en Cercle */}
                {game.players.map((player: any, index: number) => (
                    <PlayerCircleNode
                        key={player.id}
                        player={player}
                        index={index}
                        totalPlayers={game.players.length}
                        game={game}
                        currentPhase={currentPhase as Phase}
                        currentUser={user}
                        onVote={handlePlayerClick}
                        getPlayerAvatar={getPlayerAvatar}
                        activePower={activePower}
                        powerTargets={powerTargets}
                        wolfVictimId={game.wolfVictimId}
                        gmlVictimId={game.gmlVictimId}
                        infectedVictimId={game.infectedVictimId}
                        nightActions={game.nightActions}
                        isSpeaking={speakingPlayers.has(player.id)}
                    />
                ))}

            </div>
        </main>
    );
}
