import { distributeRoles, getCountsForJ } from '../lib/roleDistribution';

describe('getCountsForJ', () => {

    it('J=5 → B=1, C=0', () => {
        const { B, C } = getCountsForJ(5);
        expect(B).toBe(1);
        expect(C).toBe(0);
    });

    it('J=13 → B=4, A=8, C=1', () => {
        const { A, B, C } = getCountsForJ(13);
        expect(A).toBe(8);
        expect(B).toBe(4);
        expect(C).toBe(1);
    });

    it('J=11 → C=1', () => {
        const { C } = getCountsForJ(11);
        expect(C).toBe(1);
    });

    it('J=15 → C=2', () => {
        const { C } = getCountsForJ(15);
        expect(C).toBe(2);
    });

    it('J=16 → C=3', () => {
        const { C } = getCountsForJ(16);
        expect(C).toBe(3);
    });

    it('A + B + C = J pour tout J entre 5 et 18', () => {
        for (let J = 5; J <= 18; J++) {
            const { A, B, C } = getCountsForJ(J);
            expect(A + B + C).toBe(J);
        }
    });

});

describe('distributeRoles', () => {

    it('le total des rôles distribués = J', () => {
        for (let J = 5; J <= 18; J++) {
            const result = distributeRoles(J);
            const total = Object.values(result).reduce((sum, count) => sum + (count || 0), 0);
            expect(total).toBe(J);
        }
    });

    it('il y a toujours au moins un LOUP_GAROU', () => {
        for (let J = 5; J <= 18; J++) {
            const result = distributeRoles(J);
            const totalLoups = (result.LOUP_GAROU || 0) + (result.LOUP_ALPHA || 0) + (result.GRAND_MECHANT_LOUP || 0) + (result.LOUP_INFECT || 0);
            expect(totalLoups).toBeGreaterThan(0);
        }
    });

    it('il y a toujours au moins un VILLAGEOIS', () => {
        for (let J = 5; J <= 18; J++) {
            const result = distributeRoles(J);
            expect((result.VILLAGEOIS || 0)).toBeGreaterThan(0);
        }
    });

    it('le camp Village est toujours majoritaire', () => {
        for (let J = 5; J <= 18; J++) {
            const { A, B } = getCountsForJ(J);
            expect(A).toBeGreaterThan(B);
        }
    });

});
