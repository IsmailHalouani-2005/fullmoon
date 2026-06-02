import { checkVictory } from '../server/gameLogic';
import { makePlayer, makeGame } from './helpers';

describe('checkVictory', () => {

    it('retourne NONE si tout le monde est mort', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS', false),
                makePlayer('p2', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('NONE');
    });

    it('retourne null si la partie continue (loups < villageois)', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
            ]
        });
        expect(checkVictory(game)).toBeNull();
    });

    it('victoire LOUPS quand loups >= villageois', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'LOUP_GAROU'),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    it('victoire VILLAGEOIS quand tous les loups sont morts', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    it('victoire VILLAGEOIS même s\'il reste un FOU vivant', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'FOU'),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    it('victoire AMOUR si seulement les deux amoureux de camps différents restent', () => {
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['lover']),
                makePlayer('p2', 'LOUP_GAROU', true, ['lover']),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('AMOUR');
    });

    it('pas de victoire amour si d\'autres joueurs sont encore en vie', () => {
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['lover']),
                makePlayer('p2', 'LOUP_GAROU', true, ['lover']),
                makePlayer('p3', 'VILLAGEOIS'),
            ]
        });
        expect(checkVictory(game)).toBeNull();
    });

    it('victoire LOUP_BLANC s\'il est le dernier survivant', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'LOUP_BLANC'),
                makePlayer('p2', 'VILLAGEOIS', false),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('LOUP_BLANC');
    });

    it('un joueur infecté compte dans le camp des loups', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['infected']),
                makePlayer('p2', 'VILLAGEOIS'),
            ]
        });
        // p1 infecté = loup, p2 = villageois → 1 loup >= 1 villageois → loups gagnent
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

});
