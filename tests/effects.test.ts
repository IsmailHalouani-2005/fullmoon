/**
 * Tests sur les effets (infected, poisoned, gasoline, lover)
 * et leurs interactions avec la logique de victoire.
 */
import { checkVictory } from '../server/gameLogic';
import { isInWolfCamp } from '../types/roles';
import { makePlayer, makeGame } from './helpers';

describe('Effets — isInWolfCamp avec infected', () => {

    it('joueur infecté → isInWolfCamp via effects (non via role)', () => {
        // isInWolfCamp ne prend pas les effects en compte — c'est checkVictory qui le fait
        // isInWolfCamp regarde uniquement le camp du rôle
        expect(isInWolfCamp('VILLAGEOIS')).toBe(false); // toujours faux même si infecté
        expect(isInWolfCamp('SORCIERE')).toBe(false);
    });

    it('checkVictory compte les infectés comme loups même si leur rôle est village', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE', true, ['infected']),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'VILLAGEOIS'),
            ]
        });
        // 1 "loup" infecté < 2 villageois → pas de victoire
        expect(checkVictory(game)).toBeNull();
    });

    it('2 infectés >= 1 villageois → loups gagnent', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE', true, ['infected']),
                makePlayer('p2', 'CHASSEUR', true, ['infected']),
                makePlayer('p3', 'VILLAGEOIS'),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });
});

describe('Effets — lover', () => {

    it('amoureux meurent ensemble : si l\'un meurt, l\'autre aussi (logique doc)', () => {
        // checkVictory vérifie l'état APRÈS les morts
        // Si les amoureux de camps différents sont les 2 derniers → AMOUR gagne
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['lover']),
                makePlayer('p2', 'LOUP_GAROU', true, ['lover']),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('AMOUR');
    });

    it('si les 2 amoureux sont morts → NONE si personne d\'autre', () => {
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', false, ['lover']),
                makePlayer('p2', 'LOUP_GAROU', false, ['lover']),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('NONE');
    });

    it('FOU amoureux ne peut pas gagner via bûcher (bloqué par la logique amoureux)', () => {
        // Note: c'est handlePhaseEnd DAY_VOTE qui vérifie !deadPlayer.effects.includes('lover')
        // Ce test vérifie que checkVictory ne lui donne pas une victoire solo s'il est vivant
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'FOU', true, ['lover']),
                makePlayer('p2', 'VILLAGEOIS', true, ['lover']),
            ]
        });
        // 2 amoureux différents camps vivants → AMOUR gagne
        expect(checkVictory(game)?.winner).toBe('AMOUR');
    });
});

describe('Effets — gasoline (Pyromane)', () => {

    it('joueur avec effet gasoline compte normalement dans les vivants', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS', true, ['gasoline']),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        // Les 2 villageois sont vivants → victoire village
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    it('Pyromane avec joueurs arrosés → Pyromane est toujours un solo dangereux', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'PYROMANE'),
                makePlayer('p2', 'VILLAGEOIS', true, ['gasoline']),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        // Pyromane est solo dangereux → village ne gagne pas
        expect(checkVictory(game)).toBeNull();
    });
});

describe('Effets — poisoned', () => {

    it('joueur empoisonné reste vivant jusqu\'à sa mort effective', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE', true, ['poisoned']),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        // La sorcière est encore vivante (empoisonnée mais pas morte)
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    it('joueur empoisonné mort → ne compte plus dans les vivants', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE', false, ['poisoned']),
                makePlayer('p2', 'LOUP_GAROU'),
            ]
        });
        // Sorcière morte → 1 loup, 0 villageois → loups gagnent
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });
});
