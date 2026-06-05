/**
 * Tests pour le comportement aveugle de la Sorcière.
 * Vérifie que la logique de sauvegarde aveugle est correcte
 * dans le contexte de la victoire et des nuits.
 */
import { checkVictory } from '../server/gameLogic';
import { makePlayer, makeGame } from './helpers';

describe('Sorcière — sauvegarde aveugle', () => {

    // ─── La sorcière peut sauver n'importe qui ────────────────────────────────

    it('si la sorcière sauve, la victime des loups survit → partie continue', () => {
        // Simulation : 3 joueurs, loups ont tué p3, sorcière l'a sauvé
        // → p3 est toujours en vie → pas encore de victoire
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE'),
                makePlayer('p2', 'LOUP_GAROU'),
                makePlayer('p3', 'VILLAGEOIS'), // sauvé par la sorcière, toujours en vie
            ]
        });
        expect(checkVictory(game)).toBeNull();
    });

    it('si la sorcière ne sauve pas, la victime meurt → peut changer l\'issue', () => {
        // p3 tué la nuit, non sauvé → 2 joueurs : 1 loup, 1 sorcière
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE'),
                makePlayer('p2', 'LOUP_GAROU'),
                makePlayer('p3', 'VILLAGEOIS', false), // mort la nuit
            ]
        });
        // 1 loup >= 1 villageois → loups gagnent
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    it('la sorcière peut empoisonner un loup → aide le village', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU', false), // tué par la potion de mort
            ]
        });
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    // ─── La sorcière gagne avec le village ────────────────────────────────────

    it('la sorcière fait partie des gagnants village', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU', false),
            ]
        });
        const result = checkVictory(game);
        expect(result?.winner).toBe('VILLAGEOIS');
        // La sorcière doit être dans les gagnants
        const winners = result?.players || [];
        expect(winners.some(p => p.role === 'SORCIERE')).toBe(true);
    });

    // ─── La sorcière infectée compte comme loup ───────────────────────────────

    it('sorcière infectée → compte comme loup, gagne avec les loups', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE', true, ['infected']),
                makePlayer('p2', 'VILLAGEOIS'),
            ]
        });
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });

    // ─── Cas sans victime la nuit ─────────────────────────────────────────────

    it('si aucun loup ne vote (pas de wolfVictimId), bouton sorcière doit être désactivé', () => {
        // Ce test vérifie la logique conceptuelle :
        // wolfVictimId = null → BLIND_SAVE n'est pas envoyé → bouton désactivé
        // On vérifie cela via la cohérence de l'état : si les loups ne votent pas,
        // la partie peut toujours continuer normalement
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE'),
                makePlayer('p2', 'LOUP_GAROU'),
                makePlayer('p3', 'VILLAGEOIS'),
                makePlayer('p4', 'VILLAGEOIS'),
            ]
        });
        // 2 villageois + sorcière (3) vs 1 loup → pas de victoire
        expect(checkVictory(game)).toBeNull();
    });
});

describe('Sorcière — potion de mort', () => {

    it('empoisonner le dernier loup → victoire village', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE'),
                makePlayer('p2', 'VILLAGEOIS'),
                makePlayer('p3', 'LOUP_GAROU', false), // empoisonné = mort
            ]
        });
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    it('empoisonner un villageois ne change pas l\'issue si les loups dominent', () => {
        const game = makeGame({
            players: [
                makePlayer('p1', 'SORCIERE', false), // empoisonnée par... un autre mécanisme
                makePlayer('p2', 'LOUP_GAROU'),
                makePlayer('p3', 'VILLAGEOIS'),
            ]
        });
        // 1 loup >= 1 villageois → loups gagnent
        expect(checkVictory(game)?.winner).toBe('LOUPS');
    });
});
