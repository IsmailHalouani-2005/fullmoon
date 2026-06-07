import type { RoleId } from './roles';

// ─── SafePlayer ───────────────────────────────────────────────────────────────

/** Lightweight player entry stored inside a groups/{id} document. */
export interface SafePlayer {
    uid: string;
    pseudo: string;
    photoURL?: string;
}

// ─── UserStats ────────────────────────────────────────────────────────────────

/**
 * Stats block stored under users/{uid}.stats.
 * Extends the in-game Player.stats shape with Firestore-only aggregates.
 */
export interface UserStats {
    // In-game counters (shared with Player.stats in types/game.ts)
    kills: number;
    saves: number;
    daysSurvived: number;
    powerUses: number;
    points: number;

    // Aggregate match results
    gamesPlayed: number;
    wins: number;
    losses: number;
    fled: number;

    // Camp-level win/loss breakdown
    villageWins: number;
    villageLosses: number;
    werewolfWins: number;
    werewolfLosses: number;
    soloWins: number;
    soloLosses: number;

    // Optional extended fields
    roles?: Partial<Record<RoleId, number>>;
}

// ─── UserData ─────────────────────────────────────────────────────────────────

/** Firestore document stored at users/{uid}. */
export interface UserData {
    uid: string;
    pseudo: string;
    email: string;
    photoURL?: string;

    /** ID of the group/village the user is currently in. */
    currentGroupId?: string;

    /** ID of the social (party) group the user belongs to. */
    socialGroupId?: string;

    stats: UserStats;

    createdAt: string;

    rank?: number | string;
    friends?: string[];
    notifications?: NotifData[];
}

// ─── GroupData ────────────────────────────────────────────────────────────────

/**
 * Firestore document stored at groups/{id}.
 * Villages are groups with isVillage === true.
 */
export interface GroupData {
    id: string;
    hostId: string;
    hostPseudo?: string;
    hostPhoto?: string;
    players: SafePlayer[];
    createdAt?: string;

    // Flags
    isVillage?: boolean;
    gameStarted?: boolean;
    isPrivate?: boolean;
    isMicro?: boolean;
    isMayorEnabled?: boolean;
    isCustom?: boolean;
    isConfigured?: boolean;

    maxPlayers?: number;
    secretCode?: string;
    name?: string;

    // Social / UI helpers
    unreadCount?: Record<string, number>;

    /**
     * Snapshot of the live Socket.io game state written back to Firestore
     * by the game server for admin monitoring.
     */
    liveState?: {
        phase?: string;
        timer?: number;
        hostId?: string;
        mayorId?: string;
        players?: {
            id: string;
            name: string;
            role?: string;
            isAlive?: boolean;
            isDisconnected?: boolean;
            effects?: string[];
            deadAt?: string;
        }[];
    } | null;

    // Game configuration
    rolesCount?: Partial<Record<RoleId, number>>;
    phaseDurations?: Partial<Record<string, number>>;
    mode?: string;
    phase?: string;
}

// ─── VillageData ──────────────────────────────────────────────────────────────

/**
 * Alias for GroupData — villages are groups with isVillage === true.
 * Kept as a separate named export for readability at call sites.
 */
export type VillageData = GroupData;

// ─── FriendData ───────────────────────────────────────────────────────────────

/** Document stored at users/{uid}/friends/{friendId}. */
export interface FriendData {
    id?: string;
    friendId: string;
    pseudo: string;
    photoURL?: string;
    createdAt?: string;
    status?: 'accepted' | 'pending';
}

// ─── NotifData ────────────────────────────────────────────────────────────────

/** Document stored at users/{uid}/notifications/{notifId}. */
export interface NotifData {
    id: string;
    type: string;
    fromId?: string;
    fromUserId?: string;
    fromPseudo?: string;
    fromPhotoURL?: string;
    groupId?: string;
    message?: string;
    read?: boolean;
    createdAt?: string;
}

// ─── FriendStatus ─────────────────────────────────────────────────────────────

/**
 * Value shape in the friendsStatuses map used on the Play page.
 * Derived from the target user's Firestore document (currentGroupId / socialGroupId).
 */
export interface FriendStatus {
    currentGroupId?: string;
    socialGroupId?: string;
    isVillage?: boolean;
}
