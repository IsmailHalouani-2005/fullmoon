import { RoleId, PowerId } from "./roles";

export type Role = RoleId | null;
export type Phase = 'LOBBY' | 'ROLE_REVEAL' | 'MAYOR_ELECTION' | 'MAYOR_SUCCESSION' | 'NIGHT' | 'DAY_DISCUSSION' | 'DAY_VOTE' | 'HUNTER_SHOT' | 'GAME_OVER';

export interface Player {
    hasVoted: string | null;
    id: string;        // Firebase UID
    socketId: string;  // Socket IO ID
    name: string;
    avatarUrl?: string;
    isAlive: boolean;
    role: RoleId | null;
    votesAgainst: number;
    deadAt?: string;
    // New fields for powers
    usedPowers: PowerId[];
    effects: string[]; // e.g., 'infected', 'gasoline', 'poisoned', 'lover'
    isMute?: boolean;  // From poisoner
    stats: {
        kills: number;
        saves: number;
        daysSurvived: number;
        powerUses: number;
        points: number;
        wins?: number;
        losses?: number;
        fled?: number;
        gamesPlayed?: number;
    };
}

export interface ChatMessage {
    senderId: string;
    senderName: string;
    text: string;
    time: number;
    chatType: 'day' | 'night' | 'system' | 'lover' | 'highlighted' | 'poisoned';
    targetId?: string;
}

export interface GameAction {
    type: 'power';
    powerId: PowerId;
    sourceId: string;
    targetId?: string;
    targetId2?: string; // For cupid
}

export interface GameState {
    roomCode: string;
    phase: Phase;
    players: Player[];
    hostId: string;
    timer: number;
    isMayorEnabled?: boolean;
    mayorId: string | null;
    dyingMayorId?: string | null;
    dayCount: number;
    votes: Record<string, string>; // { voterId: targetId }
    nightActions: GameAction[]; // Decisions pending for dawn
    chatMessages: ChatMessage[];
    isPrivate?: boolean;
    secretCode?: string;
    nextPhase?: Phase;
    queuedPhase?: Phase; // Pour revenir à la bonne phase après MAYOR_SUCCESSION
    wolfVictimId?: string | null;
    rolesCount?: Partial<Record<RoleId, number>>;
    deadRolesCount?: Partial<Record<RoleId, number>>;
    lastActivity: number;
    lovers?: string[];
    areLoversSameCamp?: boolean;
    gmlVictimId?: string | null;
    infectedVictimId?: string | null;
    lastPoisonedId?: string | null;
    disconnectedPlayers?: { id: string; name: string }[];
}

// -- Events Socket.io (Typage strict) --

export interface ClientToServerEvents {
    join_game: (payload: { roomCode: string; userId: string; username: string; avatarUrl?: string }) => void;
    start_game: (config?: { rolesCount: Partial<Record<RoleId, number>>, isCustom?: boolean, isMayorEnabled?: boolean }) => void;
    vote_player: (targetId: string) => void;
    use_power: (payload: { powerId: PowerId; targetId?: string; targetId2?: string }) => void;
    chat_message: (payload: ChatMessage, callback?: (response: { status: 'success' | 'error', reason?: string }) => void) => void;
    voice_signal: (payload: { targetId: string; signal: any; type: 'room' | 'group' }) => void;
    voice_request_connect: (payload: { targetId: string; type: 'room' | 'group' }) => void;
    player_speaking: (payload: { isSpeaking: boolean; type: 'room' | 'group' }) => void;
    leave_game: () => void;
}

export interface ServerToClientEvents {
    update_game: (gameState: GameState) => void;
    error: (msg: string) => void;
    game_over: (payload: { winner: string; players: Player[] }) => void;
    chat_message: (payload: ChatMessage) => void;
    room_shutdown: (reason: string) => void;
    voice_signal: (payload: { senderId: string; signal: any; type: 'room' | 'group' }) => void;
    voice_request_connect: (payload: { senderId: string; type: 'room' | 'group' }) => void;
    player_speaking: (payload: { userId: string; isSpeaking: boolean; type: 'room' | 'group' }) => void;
}
