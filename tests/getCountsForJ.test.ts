/**
 * Tests exhaustifs de getCountsForJ pour chaque valeur de 5 à 18.
 * Vérifie toutes les propriétés mathématiques de la formule.
 */
import { getCountsForJ } from '../lib/roleDistribution';

describe('getCountsForJ — propriétés invariantes (J=5 à 18)', () => {

    it('A + B + C = J pour toutes les valeurs', () => {
        for (let J = 5; J <= 18; J++) {
            const { A, B, C } = getCountsForJ(J);
            expect(A + B + C).toBe(J);
        }
    });

    it('A > B toujours (village majoritaire)', () => {
        for (let J = 5; J <= 18; J++) {
            const { A, B } = getCountsForJ(J);
            expect(A).toBeGreaterThan(B);
        }
    });

    it('B >= 1 toujours (au moins 1 loup)', () => {
        for (let J = 5; J <= 18; J++) {
            const { B } = getCountsForJ(J);
            expect(B).toBeGreaterThanOrEqual(1);
        }
    });

    it('B <= 5 toujours (cap à 5 loups)', () => {
        for (let J = 5; J <= 18; J++) {
            const { B } = getCountsForJ(J);
            expect(B).toBeLessThanOrEqual(5);
        }
    });

    it('C = 0 pour J < 11', () => {
        for (let J = 5; J <= 10; J++) {
            expect(getCountsForJ(J).C).toBe(0);
        }
    });

    it('C = 1 pour 11 <= J <= 14', () => {
        for (let J = 11; J <= 14; J++) {
            expect(getCountsForJ(J).C).toBe(1);
        }
    });

    it('C = 2 pour J = 15', () => {
        expect(getCountsForJ(15).C).toBe(2);
    });

    it('C = 3 pour J >= 16', () => {
        for (let J = 16; J <= 18; J++) {
            expect(getCountsForJ(J).C).toBe(3);
        }
    });

    it('A, B, C sont tous positifs ou nuls', () => {
        for (let J = 5; J <= 18; J++) {
            const { A, B, C } = getCountsForJ(J);
            expect(A).toBeGreaterThanOrEqual(0);
            expect(B).toBeGreaterThanOrEqual(0);
            expect(C).toBeGreaterThanOrEqual(0);
        }
    });

    it('croissance monotone de B avec J (jamais décroissant)', () => {
        let prevB = 0;
        for (let J = 5; J <= 18; J++) {
            const { B } = getCountsForJ(J);
            expect(B).toBeGreaterThanOrEqual(prevB);
            prevB = B;
        }
    });
});

describe('getCountsForJ — valeurs précises', () => {
    // Valeurs calculées avec la formule : N=J-C, B=max(1,floor((N-3)/2)) cap 5, A=N-B
    const expected: Record<number, { A: number; B: number; C: number }> = {
        5:  { A: 4, B: 1, C: 0 },
        6:  { A: 5, B: 1, C: 0 },
        7:  { A: 5, B: 2, C: 0 },
        8:  { A: 6, B: 2, C: 0 },
        9:  { A: 6, B: 3, C: 0 },
        10: { A: 7, B: 3, C: 0 },
        11: { A: 7, B: 3, C: 1 }, // N=10, B=floor(7/2)=3, A=7
        12: { A: 7, B: 4, C: 1 }, // N=11, B=floor(8/2)=4, A=7
        13: { A: 8, B: 4, C: 1 }, // N=12, B=floor(9/2)=4, A=8
        14: { A: 8, B: 5, C: 1 }, // N=13, B=floor(10/2)=5, A=8
        15: { A: 8, B: 5, C: 2 }, // N=13, B=5 (cap), A=8
        16: { A: 8, B: 5, C: 3 }, // N=13, B=5 (cap), A=8
        17: { A: 9, B: 5, C: 3 }, // N=14, B=5 (cap), A=9
        18: { A: 10, B: 5, C: 3 }, // N=15, B=5 (cap), A=10
    };

    Object.entries(expected).forEach(([jStr, exp]) => {
        const J = parseInt(jStr);
        it(`J=${J} → A=${exp.A} B=${exp.B} C=${exp.C}`, () => {
            const result = getCountsForJ(J);
            expect(result).toEqual(exp);
        });
    });
});
