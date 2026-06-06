/**
 * Tests pour la détection du mode spectateur.
 *
 * Côté serveur : un utilisateur qui rejoint une partie déjà commencée
 * (phase !== 'LOBBY') ne doit pas être ajouté à game.players.
 *
 * Côté client : isSpectator = game.phase !== 'LOBBY' && !players.find(uid)
 */
import { makePlayer, makeGame } from './helpers';
import type { GameState } from '../types/game';

// ─── Logique pure de détection spectateur (miroir de page.tsx) ───────────────

function isSpectator(game: GameState, userId: string): boolean {
    return game.phase !== 'LOBBY' && !game.players.find(p => p.id === userId);
}

function canJoinAsPlayer(game: GameState, userId: string): boolean {
    const alreadyIn = !!game.players.find(p => p.id === userId);
    return game.phase === 'LOBBY' || alreadyIn;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('détection spectateur — côté client', () => {

    it('en LOBBY, un utilisateur inconnu n\'est pas spectateur', () => {
        const game = makeGame({ phase: 'LOBBY', players: [] });
        expect(isSpectator(game, 'stranger')).toBe(false);
    });

    it('en NIGHT, un utilisateur absent de players est spectateur', () => {
        const game = makeGame({
            phase: 'NIGHT',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'LOUP_GAROU')],
        });
        expect(isSpectator(game, 'spectator')).toBe(true);
    });

    it('en NIGHT, un joueur dans players n\'est pas spectateur', () => {
        const game = makeGame({
            phase: 'NIGHT',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'LOUP_GAROU')],
        });
        expect(isSpectator(game, 'p1')).toBe(false);
    });

    it('en GAME_OVER, un utilisateur absent est spectateur', () => {
        const game = makeGame({ phase: 'GAME_OVER', players: [makePlayer('p1', 'VILLAGEOIS')] });
        expect(isSpectator(game, 'visitor')).toBe(true);
    });

    it('en LOBBY, même un utilisateur absent n\'est pas spectateur', () => {
        const game = makeGame({ phase: 'LOBBY', players: [] });
        expect(isSpectator(game, 'newcomer')).toBe(false);
    });

});

describe('logique de rejoindre la partie', () => {

    it('un utilisateur peut rejoindre en LOBBY', () => {
        const game = makeGame({ phase: 'LOBBY', players: [] });
        expect(canJoinAsPlayer(game, 'newcomer')).toBe(true);
    });

    it('un joueur déjà présent peut se reconnecter même hors LOBBY', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [makePlayer('p1', 'VILLAGEOIS')],
        });
        expect(canJoinAsPlayer(game, 'p1')).toBe(true);
    });

    it('un étranger ne peut pas rejoindre une partie en cours', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [makePlayer('p1', 'VILLAGEOIS')],
        });
        expect(canJoinAsPlayer(game, 'stranger')).toBe(false);
    });

    it('en ROLE_REVEAL, un étranger est refusé', () => {
        const game = makeGame({ phase: 'ROLE_REVEAL', players: [makePlayer('p1', 'VILLAGEOIS')] });
        expect(canJoinAsPlayer(game, 'newcomer')).toBe(false);
    });

});

describe('interaction isSpectator + canJoin', () => {

    it('un spectateur n\'est jamais joueur', () => {
        const game = makeGame({
            phase: 'NIGHT',
            players: [makePlayer('p1', 'VILLAGEOIS')],
        });
        const uid = 'watcher';
        expect(isSpectator(game, uid)).toBe(true);
        expect(canJoinAsPlayer(game, uid)).toBe(false);
    });

    it('un joueur existant n\'est jamais spectateur', () => {
        const game = makeGame({
            phase: 'NIGHT',
            players: [makePlayer('p1', 'VILLAGEOIS')],
        });
        expect(isSpectator(game, 'p1')).toBe(false);
        expect(canJoinAsPlayer(game, 'p1')).toBe(true);
    });

});
