/**
 * Tests extrêmes et cas limites pour checkVictory.
 */
import { checkVictory } from '../server/gameLogic';
import { makePlayer, makeGame } from './helpers';

describe('checkVictory — cas extrêmes', () => {

    // ─── Un seul joueur vivant ────────────────────────────────────────────────

    it('1 villageois seul → victoire village', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    it('1 loup seul → victoire loups', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'LOUP_GAROU'),
                makePlayer('p2', 'VILLAGEOIS', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    it('1 solo solo seul → victoire solo', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'ASSASSIN'),
                makePlayer('p2', 'VILLAGEOIS', false),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('ASSASSIN');
    });

    // ─── Beaucoup de joueurs ──────────────────────────────────────────────────

    it('18 joueurs — partie non terminée si loups minoritaires', () => {
        const players = [
            makePlayer('l1', 'LOUP_GAROU'),
            makePlayer('l2', 'LOUP_GAROU'),
            makePlayer('l3', 'LOUP_GAROU'),
            ...Array.from({ length: 15 }, (_, i) => makePlayer(`v${i}`, 'VILLAGEOIS')),
        ];
        const game = makeGame({ players });
        expect(checkVictory(game)).toBeNull();
    });

    it('loups exactement égaux aux villageois → victoire loups', () => {
        const game = makeGame({
            players: [
                makePlayer('l1', 'LOUP_GAROU'),
                makePlayer('l2', 'LOUP_GAROU'),
                makePlayer('v1', 'VILLAGEOIS'),
                makePlayer('v2', 'VILLAGEOIS'),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    it('loups supérieurs aux villageois → victoire loups', () => {
        const game = makeGame({
            players: [
                makePlayer('l1', 'LOUP_GAROU'),
                makePlayer('l2', 'LOUP_GAROU'),
                makePlayer('l3', 'LOUP_GAROU'),
                makePlayer('v1', 'VILLAGEOIS'),
                makePlayer('v2', 'VILLAGEOIS'),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    // ─── Effets multiples ─────────────────────────────────────────────────────

    it('joueur avec multiple effets (lover + gasoline) → compte normalement', () => {
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['lover', 'gasoline']),
                makePlayer('p2', 'LOUP_GAROU', true, ['lover']),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('AMOUR');
    });

    it('joueur infecté avec effet gasoline → toujours compté comme loup', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE', true, ['infected', 'gasoline']),
                makePlayer('p2', 'VILLAGEOIS'),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    // ─── Solo dangereux bloque la victoire village ────────────────────────────

    it('village + solo dangereux vivant → pas de victoire village', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU', false),
                makePlayer('p4', 'PYROMANE'), // solo dangereux vivant
            ]
        });
        expect(checkVictory(game)).toBeNull();
    });

    it('village + FOU vivant → victoire village quand même (FOU non dangereux)', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'FOU'), // non dangereux
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    // ─── Amoureux même camp ───────────────────────────────────────────────────

    it('amoureux même camp (2 villageois) → victoire normale village, pas AMOUR', () => {
        const game = makeGame({
            lovers: ['p1', 'p2'],
            areLoversSameCamp: true,
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['lover']),
                makePlayer('p2', 'SORCIERE', true, ['lover']),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    it('amoureux camps différents mais pas les 2 derniers → pas AMOUR', () => {
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['lover']),
                makePlayer('p2', 'LOUP_GAROU', true, ['lover']),
                makePlayer('p3', 'VILLAGEOIS'), // 3ème joueur vivant
            ]
        });
        expect(checkVictory(game)).toBeNull();
    });

    // ─── Résultats retournés ──────────────────────────────────────────────────

    it('checkVictory retourne les joueurs gagnants, pas les perdants', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        const result = checkVictory(game);
        expect(result?.winner).toBe('VILLAGEOIS');
        // Les gagnants sont les villageois vivants
        result?.players.forEach(p => {
            expect(p.isAlive).toBe(true);
        });
    });

    it('checkVictory retourne null quand la partie est équilibrée', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'VILLAGEOIS'),
                makePlayer('p4', 'LOUP_GAROU'),
            ]
        });
        expect(checkVictory(game)).toBeNull();
    });
});
