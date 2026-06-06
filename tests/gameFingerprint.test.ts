import { gameFingerprint } from '../lib/gameFingerprint';
import { makePlayer, makeGame } from './helpers';

describe('gameFingerprint', () => {

    it('deux états identiques produisent la même empreinte', () => {
        const g = makeGame({
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'LOUP_GAROU')],
            votes: { p1: 'p2' },
        });
        expect(gameFingerprint(g)).toBe(gameFingerprint({ ...g }));
    });

    it('une différence de timer seul ne change pas l\'empreinte', () => {
        const g = makeGame({ players: [makePlayer('p1', 'VILLAGEOIS')] });
        const g2 = { ...g, timer: g.timer + 5 };
        expect(gameFingerprint(g)).toBe(gameFingerprint(g2));
    });

    it('un changement de phase change l\'empreinte', () => {
        const g = makeGame({ phase: 'DAY_VOTE', players: [makePlayer('p1', 'VILLAGEOIS')] });
        const g2 = { ...g, phase: 'NIGHT' as const };
        expect(gameFingerprint(g)).not.toBe(gameFingerprint(g2));
    });

    it('la mort d\'un joueur change l\'empreinte', () => {
        const alive = makePlayer('p1', 'VILLAGEOIS', true);
        const dead  = makePlayer('p1', 'VILLAGEOIS', false);
        const g1 = makeGame({ players: [alive] });
        const g2 = makeGame({ players: [dead] });
        expect(gameFingerprint(g1)).not.toBe(gameFingerprint(g2));
    });

    it('un vote ajouté change l\'empreinte', () => {
        const g1 = makeGame({ players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'LOUP_GAROU')], votes: {} });
        const g2 = { ...g1, votes: { p1: 'p2' } };
        expect(gameFingerprint(g1)).not.toBe(gameFingerprint(g2));
    });

    it('l\'ordre des votes ne change pas l\'empreinte (tri alphabétique)', () => {
        const players = [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'VILLAGEOIS'), makePlayer('p3', 'LOUP_GAROU')];
        const g1 = makeGame({ players, votes: { p1: 'p3', p2: 'p3' } });
        const g2 = makeGame({ players, votes: { p2: 'p3', p1: 'p3' } });
        expect(gameFingerprint(g1)).toBe(gameFingerprint(g2));
    });

    it('un effet ajouté à un joueur change l\'empreinte', () => {
        const normal   = makePlayer('p1', 'VILLAGEOIS', true, []);
        const infected = makePlayer('p1', 'VILLAGEOIS', true, ['infected']);
        const g1 = makeGame({ players: [normal] });
        const g2 = makeGame({ players: [infected] });
        expect(gameFingerprint(g1)).not.toBe(gameFingerprint(g2));
    });

    it('un changement de mayorId change l\'empreinte', () => {
        const g1 = makeGame({ players: [makePlayer('p1', 'VILLAGEOIS')], mayorId: null });
        const g2 = { ...g1, mayorId: 'p1' };
        expect(gameFingerprint(g1)).not.toBe(gameFingerprint(g2));
    });

    it('une action de nuit ajoutée change l\'empreinte', () => {
        const g1 = makeGame({ players: [makePlayer('p1', 'VILLAGEOIS')], nightActions: [] });
        const g2 = {
            ...g1,
            nightActions: [{ type: 'power' as const, powerId: 'SEER_VISION' as import('../types/roles').PowerId, sourceId: 'p1', targetId: 'p2' }],
        };
        expect(gameFingerprint(g1)).not.toBe(gameFingerprint(g2));
    });

    it('les champs optionnels null/undefined sont traités de façon stable', () => {
        const g1 = makeGame({ players: [], wolfVictimId: null, dyingMayorId: null, lastPoisonedId: null });
        const g2 = { ...g1, wolfVictimId: undefined, dyingMayorId: undefined, lastPoisonedId: undefined };
        expect(gameFingerprint(g1)).toBe(gameFingerprint(g2));
    });

});
