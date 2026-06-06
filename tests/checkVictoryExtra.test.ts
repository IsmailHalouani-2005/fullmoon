/**
 * Tests complémentaires pour checkVictory — scénarios non couverts
 * par checkVictory.test.ts.
 */
import { checkVictory } from '../server/gameLogic';
import { makePlayer, makeGame } from './helpers';

describe('checkVictory — maire et double-vote', () => {

    it('le maire villageois compte double : 2 loups vs 2 villageois (dont maire) → pas de victoire loups', () => {
        // 2 loups vs 2 villageois dont 1 est maire → pouvoir village = 3 > loups = 2
        const game = makeGame({
            phase: 'DAY_VOTE',
            isMayorEnabled: true,
            mayorId: 'p1',
            players: [
                makePlayer('p1', 'VILLAGEOIS'),   // maire
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
                makePlayer('p4', 'LOUP_GAROU'),
            ],
        });
        expect(checkVictory(game)).toBeNull(); // Partie continue
    });

    it('sans maire (isMayorEnabled=false), 2 loups vs 2 villageois → victoire loups', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            isMayorEnabled: false,
            mayorId: 'p1',
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
                makePlayer('p4', 'LOUP_GAROU'),
            ],
        });
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    it('le maire loup ne compte pas double pour le village', () => {
        // Maire = loup → puissance village normale
        const game = makeGame({
            phase: 'DAY_VOTE',
            isMayorEnabled: true,
            mayorId: 'p3',
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'), // maire
                makePlayer('p4', 'LOUP_GAROU'),
            ],
        });
        // 2 loups >= 2 villageois → loups gagnent
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

});

describe('checkVictory — solo roles', () => {

    it('le Loup Blanc gagne s\'il est seul en vie', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'LOUP_BLANC'),
                makePlayer('p2', 'VILLAGEOIS', false),
                makePlayer('p3', 'LOUP_GAROU', false),
            ],
        });
        expect(checkVictory(game)?.winner).toBe('LOUP_BLANC');
    });

    it('avec un solo dangereux vivant, les loups ne gagnent pas encore', () => {
        // Loup Blanc encore en vie → loups ne peuvent pas déclarer victoire
        const game = makeGame({
            players: [
                makePlayer('p1', 'LOUP_GAROU'),
                makePlayer('p2', 'LOUP_BLANC'),    // solo dangereux
                makePlayer('p3', 'VILLAGEOIS', false),
            ],
        });
        expect(checkVictory(game)).toBeNull();
    });

    it('le village gagne si tous les loups et solos dangereux sont morts', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'SORCIERE'),
                makePlayer('p3', 'LOUP_GAROU', false),
                makePlayer('p4', 'LOUP_BLANC', false),
            ],
        });
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

});

describe('checkVictory — amoureux', () => {

    it('si les deux amoureux sont dans le même camp, la condition AMOUR n\'est pas remplie', () => {
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['lover']),
                makePlayer('p2', 'CHASSEUR',   true, ['lover']),
            ],
        });
        // Même camp (VILLAGE) → ce n'est pas un couple mixte → pas de victoire AMOUR
        // Et tous les loups sont morts → victoire VILLAGEOIS
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    it('si un des amoureux meurt, la victoire AMOUR n\'est plus possible', () => {
        const game = makeGame({
            lovers: ['p1', 'p2'],
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['lover']),
                makePlayer('p2', 'LOUP_GAROU', false, ['lover']),  // mort
                makePlayer('p3', 'LOUP_GAROU'),
            ],
        });
        // p2 (loup amoureux) est mort → plus de couple → victoire normale
        // 1 loup (p3) >= 1 villageois (p1) → loups gagnent
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

});

describe('checkVictory — joueurs infectés', () => {

    it('un joueur infecté compte dans le camp des loups pour le ratio', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['infected']),  // villageois infecté = loup
                makePlayer('p2', 'VILLAGEOIS'),
            ],
        });
        // 1 infecté (= loup) >= 1 villageois → loups gagnent
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    it('avec 2 villageois non infectés vs 1 infecté → pas de victoire loups', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['infected']),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'VILLAGEOIS'),
            ],
        });
        expect(checkVictory(game)).toBeNull();
    });

});

describe('checkVictory — cas limites', () => {

    it('retourne NONE quand tous les joueurs sont morts', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS', false),
                makePlayer('p2', 'LOUP_GAROU', false),
            ],
        });
        expect(checkVictory(game)?.winner).toBe('NONE');
    });

    it('retourne null si la partie n\'est pas encore terminée', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
            ],
        });
        expect(checkVictory(game)).toBeNull();
    });

    it('un FOU seul avec le village ne compte pas comme menace solo', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'FOU'),
                makePlayer('p3', 'LOUP_GAROU', false),
            ],
        });
        // Tous les loups morts, FOU = pas de menace solo → victoire village
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

});
