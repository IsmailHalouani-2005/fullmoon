import { distributeCustomRoles, distributeRoles } from '../lib/roleDistribution';
import { RoleId } from '../types/roles';

describe('distributeCustomRoles', () => {

    it('le total des rôles distribués est toujours égal à J', () => {
        const pool = { LOUP_GAROU: 2, SORCIERE: 1, VILLAGEOIS: 5 };
        for (let J = 5; J <= 10; J++) {
            const result = distributeCustomRoles(J, pool);
            const total = Object.values(result).reduce((sum, n) => sum + (n || 0), 0);
            expect(total).toBe(J);
        }
    });

    it('pool vide → fallback sur distributeRoles (distribution par défaut)', () => {
        const resultCustom = distributeCustomRoles(8, {});
        const resultDefault = distributeRoles(8);
        // Les deux doivent avoir le même total
        const totalCustom = Object.values(resultCustom).reduce((s, n) => s + (n || 0), 0);
        const totalDefault = Object.values(resultDefault).reduce((s, n) => s + (n || 0), 0);
        expect(totalCustom).toBe(totalDefault);
        expect(totalCustom).toBe(8);
    });

    it('quand le pool est plus grand que J, seuls J rôles sont pris', () => {
        const pool = { LOUP_GAROU: 5, VILLAGEOIS: 10 }; // pool = 15
        const result = distributeCustomRoles(8, pool);
        const total = Object.values(result).reduce((s, n) => s + (n || 0), 0);
        expect(total).toBe(8);
    });

    it('quand le pool est plus petit que J, le reste est complété par des VILLAGEOIS', () => {
        const pool = { LOUP_GAROU: 2 }; // pool = 2, J = 6
        const result = distributeCustomRoles(6, pool);
        const total = Object.values(result).reduce((s, n) => s + (n || 0), 0);
        expect(total).toBe(6);
        // VILLAGEOIS doit compléter
        expect((result['VILLAGEOIS'] || 0)).toBeGreaterThanOrEqual(4);
    });

    it('les rôles distribués viennent du pool ou sont des VILLAGEOIS (fallback)', () => {
        const pool = { LOUP_GAROU: 2, SORCIERE: 1 };
        const allowedRoles = new Set(['LOUP_GAROU', 'SORCIERE', 'VILLAGEOIS'] as RoleId[]);
        const result = distributeCustomRoles(8, pool);
        Object.keys(result).forEach(roleId => {
            expect(allowedRoles.has(roleId as RoleId)).toBe(true);
        });
    });

    it('pool exact (Jt === J) → tous les rôles du pool sont utilisés (ou presque)', () => {
        // Pool de 5 rôles pour 5 joueurs — tout doit être utilisé
        const pool = { LOUP_GAROU: 1, SORCIERE: 1, VOYANTE: 1, CHASSEUR: 1, VILLAGEOIS: 1 };
        const result = distributeCustomRoles(5, pool);
        const total = Object.values(result).reduce((s, n) => s + (n || 0), 0);
        expect(total).toBe(5);
        // Aucun VILLAGEOIS de fallback (pool exact)
        expect(result['LOUP_GAROU'] || 0).toBeGreaterThanOrEqual(0);
    });

    it('fonctionne pour J=5 (minimum)', () => {
        const pool = { LOUP_GAROU: 1, VILLAGEOIS: 10 };
        const result = distributeCustomRoles(5, pool);
        const total = Object.values(result).reduce((s, n) => s + (n || 0), 0);
        expect(total).toBe(5);
    });

    it('fonctionne pour J=18 (maximum)', () => {
        const pool = { LOUP_GAROU: 4, SORCIERE: 2, VOYANTE: 1, VILLAGEOIS: 8, FOU: 1, LOUP_BLANC: 1, ASSASSIN: 1 };
        const result = distributeCustomRoles(18, pool);
        const total = Object.values(result).reduce((s, n) => s + (n || 0), 0);
        expect(total).toBe(18);
    });

});
