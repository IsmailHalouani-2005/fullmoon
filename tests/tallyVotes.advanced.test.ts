import { tallyVotes } from '../server/gameLogic';
import { makePlayer, makeGame } from './helpers';

describe('tallyVotes — cas avancés', () => {

    // ─── Empoisonné ne peut pas voter ─────────────────────────────────────────

    it('un joueur empoisonné qui vote est quand même comptabilisé (blocage côté use_power, pas tallyVotes)', () => {
        // Note : le blocage du vote empoisonné est dans use_power (validation serveur)
        // tallyVotes comptabilise tous les votes présents dans game.votes
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [
                makePlayer('p1', 'VILLAGEOIS', true, ['poisoned']),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
            ],
            votes: { p1: 'p3', p2: 'p3' },
        });
        expect(tallyVotes(game)).toBe('p3');
    });

    // ─── Loup Blanc et Assassin — kills résolus séparément ───────────────────
    // Ces rôles sont camp SOLO, pas LOUPS.
    // tallyVotes ne compte PAS leurs votes la nuit — leurs kills sont résolus
    // directement dans handlePhaseEnd (section 2.5 Loup Blanc / 2.6 Assassin).

    it('la nuit, tallyVotes ne compte pas le vote du Loup Blanc (résolu séparément)', () => {
        const game = makeGame({
            phase: 'NIGHT',
            players: [
                makePlayer('p1', 'LOUP_BLANC'),
                makePlayer('p2', 'VILLAGEOIS'),
            ],
            votes: { p1: 'p2' },
        });
        // Loup Blanc est SOLO → son vote n'est pas dans tallyVotes
        expect(tallyVotes(game)).toBeNull();
    });

    it('la nuit, tallyVotes ne compte pas le vote de l\'Assassin (résolu séparément)', () => {
        const game = makeGame({
            phase: 'NIGHT',
            players: [
                makePlayer('p1', 'ASSASSIN'),
                makePlayer('p2', 'VILLAGEOIS'),
            ],
            votes: { p1: 'p2' },
        });
        // Assassin est SOLO → son vote n'est pas dans tallyVotes
        expect(tallyVotes(game)).toBeNull();
    });

    // ─── Égalité stricte ──────────────────────────────────────────────────────

    it('égalité parfaite à 3 voteurs → null (pas d\'élimination)', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
            ],
            votes: { p1: 'p2', p2: 'p3', p3: 'p1' }, // triangle parfait
        });
        expect(tallyVotes(game)).toBeNull();
    });

    // ─── Vote sur soi-même ────────────────────────────────────────────────────

    it('voter pour soi-même est comptabilisé normalement', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [
                makePlayer('p1', 'VILLAGEOIS'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
            ],
            votes: { p1: 'p1', p2: 'p1', p3: 'p2' }, // p1 vote pour lui-même
        });
        // p1 a 2 voix, p2 a 1 → p1 est éliminé
        expect(tallyVotes(game)).toBe('p1');
    });

    // ─── Succession du maire ──────────────────────────────────────────────────

    it('MAYOR_SUCCESSION : seul le maire mourant vote, son vote désigne le successeur', () => {
        const game = makeGame({
            phase: 'MAYOR_SUCCESSION',
            mayorId: null,
            dyingMayorId: 'p1',
            players: [
                makePlayer('p1', 'VILLAGEOIS', false), // maire mourant
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU'),
            ],
            votes: { p1: 'p2' },
        });
        // Quel que soit qui vote, on cherche le vote du maire mourant
        // tallyVotes retourne p2 car il a 1 voix
        expect(tallyVotes(game)).toBe('p2');
    });

    // ─── Aucun vote ───────────────────────────────────────────────────────────

    it('aucun vote du tout → null', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'LOUP_GAROU')],
            votes: {},
        });
        expect(tallyVotes(game)).toBeNull();
    });

    // ─── Un seul voteur ───────────────────────────────────────────────────────

    it('un seul voteur → sa cible est éliminée', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [makePlayer('p1', 'VILLAGEOIS'), makePlayer('p2', 'LOUP_GAROU')],
            votes: { p1: 'p2' },
        });
        expect(tallyVotes(game)).toBe('p2');
    });
});
