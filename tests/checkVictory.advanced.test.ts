import { checkVictory } from '../server/gameLogic';
import { makePlayer, makeGame } from './helpers';

describe('checkVictory — cas avancés', () => {

    // ─── FOU ───────────────────────────────────────────────────────────────────

    it('un FOU vivant n\'empêche pas la victoire du village', () => {
        // Village gagne même si le FOU est encore en vie
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'FOU'),          // Solo non dangereux
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    it('un FOU infecté compte comme loup, empêche la victoire du village', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'FOU', true, ['infected']),  // infecté = loup
            ]
        });
        // 1 villageois vs 1 "loup" infecté → loups gagnent
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    // ─── AMOUREUX ──────────────────────────────────────────────────────────────

    it('deux amoureux du MÊME camp ne déclenchent pas la victoire AMOUR', () => {
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['lover']),
                makePlayer('p2', 'SORCIERE', true, ['lover']),   // même camp (VILLAGE)
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        // Même camp → victoire villageois, pas AMOUR
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    it('victoire AMOUR seulement quand les 2 amoureux de camps différents sont les DERNIERS', () => {
        // Encore un troisième joueur → pas de victoire AMOUR
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['lover']),
                makePlayer('p2', 'LOUP_GAROU', true, ['lover']),
                makePlayer('p3', 'VILLAGEOIS'),   // 3ème joueur vivant
            ]
        });
        expect(checkVictory(game)).toBeNull();
    });

    it('un amoureux mort ne compte plus pour la victoire AMOUR', () => {
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', false, ['lover']),  // mort
                makePlayer('p2', 'LOUP_GAROU', true, ['lover']),
            ]
        });
        // p1 mort → plus de couple → loups vs rien → LOUPS gagnent
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    // ─── INFECTÉ ───────────────────────────────────────────────────────────────

    it('un joueur infecté compte comme loup pour le ratio de victoire', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'SORCIERE', true, ['infected']), // compte comme loup
            ]
        });
        // 1 loup (infecté) >= 1 villageois → loups gagnent
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    it('un joueur infecté mort n\'est pas compté comme loup vivant', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'SORCIERE', false, ['infected']), // infecté mais mort
            ]
        });
        // Pas de loup vivant → village gagne
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    // ─── SOLOS MULTIPLES ───────────────────────────────────────────────────────

    it('village ne gagne pas si un solo dangereux est encore en vie', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'LOUP_BLANC'),   // solo dangereux
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        // Loup_blanc toujours vivant → pas de victoire village
        expect(checkVictory(game)).toBeNull();
    });

    it('ASSASSIN gagne s\'il est le seul survivant', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'ASSASSIN'),
                makePlayer('p2', 'VILLAGEOIS', false),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('ASSASSIN');
    });

    it('EMPOISONNEUR gagne s\'il est le seul survivant', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'EMPOISONNEUR'),
                makePlayer('p2', 'VILLAGEOIS', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('EMPOISONNEUR');
    });

    it('PYROMANE gagne s\'il est le seul survivant', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'PYROMANE'),
                makePlayer('p2', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('PYROMANE');
    });

    it('deux solos vivants → pas encore de victoire solo', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'LOUP_BLANC'),
                makePlayer('p2', 'ASSASSIN'),
            ]
        });
        // vivants.length === 2, solosDangereuxVivants.length === 2 → pas de victoire solo
        expect(checkVictory(game)).toBeNull();
    });

    // ─── LOUPS GAGNENT ─────────────────────────────────────────────────────────

    it('loups gagnent quand ils sont plus nombreux que les villageois', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'LOUP_GAROU'),
                makePlayer('p2', 'LOUP_GAROU'),
                makePlayer('p3', 'VILLAGEOIS'),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    it('partie continue si les loups sont moins nombreux', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'LOUP_GAROU'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'VILLAGEOIS'),
                makePlayer('p4', 'VILLAGEOIS'),
            ]
        });
        expect(checkVictory(game)).toBeNull();
    });

    // ─── NONE ──────────────────────────────────────────────────────────────────

    it('retourne NONE si tous les joueurs sont morts', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS', false),
                makePlayer('p2', 'LOUP_GAROU', false),
                makePlayer('p3', 'SORCIERE', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('NONE');
    });

});
