import type { RoleId } from './roles';

/**
 * Configuration d'un salon (groupe) telle qu'elle est stockée dans Firestore
 * sous la collection `groups/{roomCode}`.
 */
export interface GroupConfig {
    /** Identifiant Firebase UID de l'hôte. */
    hostId: string;
    hostPseudo?: string;
    hostPhoto?: string;

    /** Nom d'affichage du salon. */
    name?: string;

    /** Mode de jeu : 'Classique' | 'Personnalisé' */
    mode?: string;

    isPrivate?: boolean;
    isMicro?: boolean;
    isMayorEnabled?: boolean;
    isCustom?: boolean;
    isVillage?: boolean;
    isConfigured?: boolean;
    maxPlayers?: number;
    gameStarted?: boolean;

    /** Code secret optionnel pour rejoindre un salon privé. */
    secretCode?: string;

    /** Distribution de rôles personnalisée. */
    rolesCount?: Partial<Record<RoleId, number>>;

    /** Durées de phase personnalisées (secondes), indexées par nom de phase. */
    phaseDurations?: Partial<Record<string, number>>;

    /** Phase courante synchronisée depuis le serveur. */
    phase?: string;

    /** Liste des joueurs présents dans le lobby. */
    players?: { uid: string; pseudo?: string; photoURL?: string }[];

    createdAt?: string;
}
