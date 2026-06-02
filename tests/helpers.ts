import { GameState, Player } from '../types/game';
import { RoleId } from '../types/roles';

/** Crée un joueur minimal pour les tests */
export function makePlayer(id: string, role: RoleId, isAlive = true, effects: string[] = []): Player {
    return {
        id,
        socketId: `socket_${id}`,
        name: `Joueur ${id}`,
        isAlive,
        role,
        votesAgainst: 0,
        hasVoted: null,
        usedPowers: [],
        effects,
        stats: { kills: 0, saves: 0, daysSurvived: 0, powerUses: 0, points: 0 },
    };
}

/** Crée un GameState minimal pour les tests */
export function makeGame(overrides: Partial<GameState> = {}): GameState {
    return {
        roomCode: 'TEST',
        phase: 'DAY_VOTE',
        players: [],
        hostId: 'p1',
        timer: 30,
        mayorId: null,
        dayCount: 1,
        votes: {},
        nightActions: [],
        chatMessages: [],
        lastActivity: Date.now(),
        ...overrides,
    };
}
