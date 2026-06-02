import { useEffect, useRef, useState } from 'react';
import { GameState, Phase } from '@/types/game';
import { ROLES, RoleId, isInWolfCamp } from '@/types/roles';

// Chemin de base vers les dossiers d'effets sonores
const SFX_DIR = "/assets/soundeffects";

export function useGameAudio(game: GameState | null, currentUserUid: string | undefined, socket: any, activePower?: string | null, ambianceVolume: number = 50) {
    // Refs pour les éléments audio persistant à travers les rendus
    const ambianceAudioRef = useRef<HTMLAudioElement | null>(null);

    // Refs pour mémoriser l'état précédent (détection de changements)
    const prevPhaseRef = useRef<Phase | null>(null);
    const prevPlayersRef = useRef<any[]>([]);
    const prevMayorRef = useRef<string | null>(null);

    const [isMuted, setIsMuted] = useState(false); // Optionnel : permettre au joueur de couper le son dynamiquement

    // Initialisation globale
    useEffect(() => {
        if (typeof window !== 'undefined') {
            ambianceAudioRef.current = new Audio();
            ambianceAudioRef.current.loop = true;
            ambianceAudioRef.current.volume = ambianceVolume / 100;
        }

        return () => {
            if (ambianceAudioRef.current) {
                ambianceAudioRef.current.pause();
                ambianceAudioRef.current = null;
            }
        };
    }, []);

    // Ref pour le volume courant (évite les closures périmées dans changeAmbiance)
    const ambianceVolumeRef = useRef<number>(ambianceVolume);

    // Mise à jour du volume si l'utilisateur le change (via le slider)
    useEffect(() => {
        ambianceVolumeRef.current = ambianceVolume;
        if (ambianceAudioRef.current) {
            ambianceAudioRef.current.volume = ambianceVolume / 100;
        }
    }, [ambianceVolume]);

    // Helper pour jouer un effet sonore (one-shot, instances séparées pour éviter de couper les sons)
    const playSFX = (filename: string) => {
        if (isMuted || typeof window === 'undefined') return;
        const audio = new Audio(`${SFX_DIR}/${filename}`);
        audio.volume = 0.2;
        audio.play().catch(e => console.warn("Audio play blocked", e));
    };

    // Helper pour changer l'ambiance avec réinitialisation s'il s'agit d'une nouvelle piste
    const changeAmbiance = (filename: string) => {
        if (!ambianceAudioRef.current) return;

        if (filename === "") {
            ambianceAudioRef.current.pause();
            ambianceAudioRef.current.src = "";
            return;
        }

        const newSrc = `${window.location.origin}${SFX_DIR}/${filename}`;

        // On applique toujours le dernier volume connu (via ref)
        ambianceAudioRef.current.volume = ambianceVolumeRef.current / 100;

        // On ne recharge pas si c'est déjà la même piste qui tourne
        if (ambianceAudioRef.current.src !== newSrc) {
            ambianceAudioRef.current.src = newSrc;
            if (!isMuted) {
                ambianceAudioRef.current.play().catch(e => console.warn("Ambiance play blocked", e));
            }
        } else if (!isMuted && ambianceAudioRef.current.paused) {
            ambianceAudioRef.current.play().catch(e => console.warn("Ambiance play blocked", e));
        }
    };

    // Global volume / mute switch
    useEffect(() => {
        if (ambianceAudioRef.current) {
            if (isMuted) ambianceAudioRef.current.pause();
            else ambianceAudioRef.current.play().catch(() => { });
        }
    }, [isMuted]);

    // -- 1. GESTION DE L'AMBIANCE SELON LA PHASE --
    useEffect(() => {
        if (!game) return;

        const currentPhase = game.phase;

        switch (currentPhase) {
            case 'LOBBY':
            case 'ROLE_REVEAL':
            case 'GAME_OVER':
                changeAmbiance(''); // Pas d'ambiance dans ces phases
                break;
            case 'DAY_DISCUSSION':
            case 'MAYOR_ELECTION':
            case 'MAYOR_SUCCESSION':
                changeAmbiance('day_ambiance.mp3');
                break;
            case 'DAY_VOTE':
                changeAmbiance('campfire_sound.mp3'); // Transition smooth au vote
                break;
            case 'NIGHT':
            case 'HUNTER_SHOT':
                changeAmbiance('night_ambiance.mp3');
                break;
            default:
                break;
        }

    }, [game?.phase, isMuted]);

    // -- 1.5 GESTION DES ARMES (CHASSEUR) --
    useEffect(() => {
        if (activePower === 'FUSIL') {
            playSFX('chasseur_gun_reload_sound.mp3');
        }
    }, [activePower]);

    // -- 2. GESTION DES EFFETS SPECIAUX (Transitions) --
    useEffect(() => {
        if (!game || !currentUserUid) return;

        const currentPhase = game.phase;
        const previousPhase = prevPhaseRef.current;
        const currentPlayers = game.players || [];
        const previousPlayers = prevPlayersRef.current || [];
        const currentMayor = game.mayorId;
        const previousMayor = prevMayorRef.current;

        // On ignore les calculs si on vient d'arriver (previousPhase = null) pour ne pas jouer de son en rafraîchissant la page
        if (previousPhase !== null && currentPhase !== 'LOBBY') {
            // A. Tuer un joueur (N'importe quelle phase, si un joueur vivait et vient de mourir)
            let someoneDied = false;
            currentPlayers.forEach(player => {
                const prev = previousPlayers.find(p => p.id === player.id);
                // Il était en vie avant, et ne l'est plus
                if (prev && prev.isAlive && !player.isAlive) {
                    someoneDied = true;
                }
            });

            if (someoneDied && currentPhase !== 'GAME_OVER') {
                playSFX('death_sound.mp3');
            }

            // B. Coup de fusil du chasseur (Exit de la phase HUNTER_SHOT)
            // Dès qu'on quitte HUNTER_SHOT on estime que le tir est parti
            if (previousPhase === 'HUNTER_SHOT' && currentPhase !== 'HUNTER_SHOT') {
                playSFX('one_shot.mp3');
            }

            // C. Loup qui hurle en entrant dans la nuit
            if (currentPhase === 'NIGHT' && previousPhase !== 'NIGHT') {
                // Y a-t-il des loups en vie ?
                const wolvesAlive = currentPlayers.some(p => {
                    if (!p.isAlive) return false;
                    const roleId = p.role as RoleId;
                    return roleId === 'LOUP_GAROU' || roleId === 'LOUP_ALPHA' || roleId === 'GRAND_MECHANT_LOUP' || roleId === 'LOUP_INFECT' || isInWolfCamp(roleId);
                });

                if (wolvesAlive) {
                    playSFX('wolf_howling.mp3');
                }
            }

            // C2. Coq qui chante au lever du jour
            if (currentPhase === 'DAY_DISCUSSION' && previousPhase === 'NIGHT') {
                playSFX('rouster_crowing.mp3');
            }

            // D. Election d'un nouveau Maire
            if (currentMayor !== previousMayor && currentMayor !== null && currentMayor !== undefined) {
                // Quelqu'un vient d'être élu (différent de null/undefined, et différent de l'ancien)
                playSFX('crowning_fanfare.mp3');
            }

            // E. Fin de partie (Victoire / Défaite) fallback (optionnel si le socket l'envoie déjà, 
            // mais l'écoute du socket est plus fiable pour récupérer le "winner" text ou camp).
        }

        // Mettre à jour les refs pour le prochain rendu
        prevPhaseRef.current = currentPhase;
        prevPlayersRef.current = currentPlayers;
        prevMayorRef.current = currentMayor;

    }, [game]);

    // -- 3. GESTION DU GAME OVER VIA SOCKET --
    useEffect(() => {
        if (!socket || !currentUserUid) return;

        const handleGameOver = (payload: { winner: string; players: any[] }) => {
            const { winner, players } = payload;

            // Chercher notre joueur et son camp pour savoir si l'on a gagné
            const me = players.find(p => p.id === currentUserUid);
            if (!me) return;

            let myCamp = "";
            let iWon = false;

            // Logique de victoire basique:
            // "winner" peut être le nom du camp ("VILLAGE", "LOUPS", "AMOUREUX", "PIPER" ou "LOUP_BLANC", etc.)

            // Si on est dans les amoureux et qu'ils gagnent
            if (winner === 'AMOUREUX' && me.effects?.includes('lover')) {
                iWon = true;
            } else if (winner === 'LOUP_BLANC' && me.role === 'LOUP_BLANC') {
                iWon = true;
            } else if (winner === 'ANGE' && me.role === 'ANGE') {
                // Pour roles custom future proof
                iWon = true;
            } else {
                // Camp standard (Village ou Loups)
                const roleDef = ROLES[me.role as RoleId];
                myCamp = roleDef ? roleDef.camp : "";

                if (winner === myCamp && winner !== 'SOLO') {
                    // J'appartiens au camp gagnant, est-ce que les amoureux n'ont pas volé la victoire ?
                    iWon = true;
                }
            }
            // Cas d'un loup infecté ou autre : "isInWolfCamp" 
            const isMeWolf = isInWolfCamp(me.role as RoleId) || me.role === 'LOUP_GAROU' || me.role === 'LOUP_ALPHA' || me.role === 'GRAND_MECHANT_LOUP' || me.role === 'LOUP_INFECT';
            if (winner === 'LOUPS' && (isMeWolf || me.effects?.includes('infected'))) {
                iWon = true;
            }

            if (iWon) {
                playSFX('clappingHands_win_sound.mp3');
            } else {
                playSFX('losing_sound.mp3');
            }
        };

        socket.on('game_over', handleGameOver);

        return () => {
            socket.off('game_over', handleGameOver);
        };
    }, [socket, currentUserUid]);

    return {
        isMuted,
        setIsMuted
    };
}
