import { tallyVotes } from '../server/gameLogic';
import { makePlayer, makeGame } from './helpers';

describe('tallyVotes', () => {

    it('retourne le joueur avec le plus de votes', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'VILLAGEOIS'), makePlayer('p3', 'LOUP_GAROU')],
            votes: { p1: 'p3', p2: 'p3' },
        });
        expect(tallyVotes(game)).toBe('p3');
    });

    it('retourne null en cas d\'égalité (vote de jour)', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'VILLAGEOIS'), makePlayer('p3', 'LOUP_GAROU')],
            votes: { p1: 'p2', p2: 'p3' },
        });
        expect(tallyVotes(game)).toBeNull();
    });

    it('le maire compte double au vote de jour', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            mayorId: 'p1',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'VILLAGEOIS'), makePlayer('p3', 'LOUP_GAROU')],
            votes: { p1: 'p3', p2: 'p2' }, // p1 (maire) vote p3 → 2 voix; p2 vote p2 → 1 voix
        });
        expect(tallyVotes(game)).toBe('p3');
    });

    it('au vote de nuit, seuls les loups comptent', () => {
        const game = makeGame({
            phase: 'NIGHT',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'VILLAGEOIS'), makePlayer('p3', 'LOUP_GAROU')],
            votes: { p1: 'p3', p2: 'p3', p3: 'p1' }, // villageois votent p3, loup vote p1
        });
        // Seul p3 (loup) vote → p1 est la victime
        expect(tallyVotes(game)).toBe('p1');
    });

    it('retourne null si personne n\'a voté', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'LOUP_GAROU')],
            votes: {},
        });
        expect(tallyVotes(game)).toBeNull();
    });

    it('le Loup Alpha compte double la nuit', () => {
        const game = makeGame({
            phase: 'NIGHT',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'VILLAGEOIS'), makePlayer('p3', 'LOUP_GAROU'), makePlayer('p4', 'LOUP_ALPHA')],
            votes: { p3: 'p1', p4: 'p2' }, // loup → p1 (1 voix), alpha → p2 (2 voix)
        });
        expect(tallyVotes(game)).toBe('p2');
    });

});
