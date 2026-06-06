/**
 * Tests pour tallyVotes en mode élection du maire (isMayorElection = true).
 * Ces scénarios ne sont pas couverts par tallyVotes.test.ts qui ne teste que
 * les votes de jour et de nuit.
 */
import { tallyVotes } from '../server/gameLogic';
import { makePlayer, makeGame } from './helpers';

describe('tallyVotes — élection du maire', () => {

    it('le candidat avec le plus de votes gagne directement', () => {
        const game = makeGame({
            phase: 'MAYOR_ELECTION',
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
            ],
            votes: { p1: 'p2', p3: 'p2' }, // p2 = 2 voix
        });
        expect(tallyVotes(game, true)).toBe('p2');
    });

    it('égalité : les auto-votes sont retirés avant départage', () => {
        // p1 et p2 ont 1 voix chacun.
        // p1 a voté pour lui-même → après retrait auto-votes : p1 = 0, p2 = 1
        const game = makeGame({
            phase: 'MAYOR_ELECTION',
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
            ],
            votes: { p1: 'p1', p3: 'p2' },
        });
        expect(tallyVotes(game, true)).toBe('p2');
    });

    it('égalité totale après retrait auto-votes → retourne un candidat non null', () => {
        // p1 et p2 se votent l'un l'autre : 1 voix chacun, aucun auto-vote
        // → encore égalité → tallyVotes choisit aléatoirement → résultat non null
        const game = makeGame({
            phase: 'MAYOR_ELECTION',
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
            ],
            votes: { p1: 'p2', p2: 'p1' },
        });
        const result = tallyVotes(game, true);
        expect(result).not.toBeNull();
        expect(['p1', 'p2']).toContain(result);
    });

    it('le maire ne compte pas double pendant l\'élection', () => {
        // En mode élection, le poids du maire ne s'applique pas
        const game = makeGame({
            phase: 'MAYOR_ELECTION',
            mayorId: 'p1', // p1 serait maire — mais ça ne devrait pas compter double
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
            ],
            votes: { p1: 'p3', p2: 'p2' }, // p1 → p3 (1 voix), p2 → p2 (1 voix)
        });
        // Si le maire comptait double, p3 aurait 2 voix et gagnerait.
        // En mode élection, p1 vote pour p3 = 1 voix, p2 vote pour lui-même = 1 voix.
        // Égalité → retrait auto-vote p2 → p3 gagne
        expect(tallyVotes(game, true)).toBe('p3');
    });

    it('vote avec un seul candidat → ce candidat est élu', () => {
        const game = makeGame({
            phase: 'MAYOR_ELECTION',
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
            ],
            votes: { p1: 'p1', p2: 'p1' }, // tout le monde vote pour p1
        });
        expect(tallyVotes(game, true)).toBe('p1');
    });

});

describe('tallyVotes — votes de jour supplémentaires', () => {

    it('vote nul si aucun vote', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'LOUP_GAROU')],
            votes: {},
        });
        expect(tallyVotes(game)).toBeNull();
    });

    it('les votes des joueurs morts ne sont pas comptés (joueurs non trouvés dans players)', () => {
        // p99 n'existe pas dans players → son vote est ignoré
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'LOUP_GAROU')],
            votes: { p99: 'p2', p1: 'p1' }, // vote orphelin p99
        });
        // p99 n'est pas dans players mais son vote est compté côté jour
        // (tallyVotes ne filtre pas les votants absents en DAY_VOTE)
        // → p2 = 1 voix (p99), p1 = 1 voix (p1) → égalité → null
        expect(tallyVotes(game)).toBeNull();
    });

    it('un loup alpha qui vote la nuit compte double', () => {
        const game = makeGame({
            phase: 'NIGHT',
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
                makePlayer('p4', 'LOUP_ALPHA'),
            ],
            votes: { p3: 'p1', p4: 'p2' },
        });
        // p4 (Loup Alpha) vote p2 = 2 voix > p3 vote p1 = 1 voix → p2 éliminé
        expect(tallyVotes(game)).toBe('p2');
    });

});
