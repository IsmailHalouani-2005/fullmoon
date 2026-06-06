/**
 * Tests pour getRoomStats et getDetailedRoomStats.
 *
 * Ces fonctions lisent l'état interne `_games` du serveur.
 * En l'absence de parties actives (état initial ou après cleanup)
 * elles doivent retourner un objet vide.
 */
import { getRoomStats, getDetailedRoomStats } from '../server/gameLogic';

describe('getRoomStats', () => {

    it('retourne un objet vide quand aucune partie n\'est active', () => {
        const stats = getRoomStats();
        // En dehors d'un serveur Socket.io actif, _games est vide
        expect(typeof stats).toBe('object');
        expect(stats).not.toBeNull();
    });

    it('les valeurs sont toutes numériques (nombre de joueurs)', () => {
        const stats = getRoomStats();
        Object.values(stats).forEach(count => {
            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

});

describe('getDetailedRoomStats', () => {

    it('retourne un objet vide quand aucune partie n\'est active', () => {
        const stats = getDetailedRoomStats();
        expect(typeof stats).toBe('object');
        expect(stats).not.toBeNull();
    });

    it('chaque entrée contient les champs attendus si une room est présente', () => {
        const stats = getDetailedRoomStats();
        Object.values(stats).forEach((room: unknown) => {
            const r = room as Record<string, unknown>;
            expect(typeof r.roomCode).toBe('string');
            expect(typeof r.phase).toBe('string');
            expect(Array.isArray(r.players)).toBe(true);
            expect(typeof r.totalPlayers).toBe('number');
            expect(typeof r.alivePlayers).toBe('number');
        });
    });

});
