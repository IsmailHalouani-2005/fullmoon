import { isInWolfCamp, ROLES } from '../types/roles';

describe('isInWolfCamp', () => {

    it('retourne false pour null', () => {
        expect(isInWolfCamp(null)).toBe(false);
    });

    it('retourne false pour undefined', () => {
        expect(isInWolfCamp(undefined)).toBe(false);
    });

    // --- Rôles LOUPS ---
    it('LOUP_GAROU → true', () => {
        expect(isInWolfCamp('LOUP_GAROU')).toBe(true);
    });

    it('LOUP_ALPHA → true', () => {
        expect(isInWolfCamp('LOUP_ALPHA')).toBe(true);
    });

    it('GRAND_MECHANT_LOUP → true', () => {
        expect(isInWolfCamp('GRAND_MECHANT_LOUP')).toBe(true);
    });

    it('LOUP_INFECT → true', () => {
        expect(isInWolfCamp('LOUP_INFECT')).toBe(true);
    });

    // --- Rôles VILLAGE ---
    it('VILLAGEOIS → false', () => {
        expect(isInWolfCamp('VILLAGEOIS')).toBe(false);
    });

    it('SORCIERE → false', () => {
        expect(isInWolfCamp('SORCIERE')).toBe(false);
    });

    it('CHASSEUR → false', () => {
        expect(isInWolfCamp('CHASSEUR')).toBe(false);
    });

    it('VOYANTE → false', () => {
        expect(isInWolfCamp('VOYANTE')).toBe(false);
    });

    it('CUPIDON → false', () => {
        expect(isInWolfCamp('CUPIDON')).toBe(false);
    });

    it('PETITE_FILLE → false', () => {
        expect(isInWolfCamp('PETITE_FILLE')).toBe(false);
    });

    // --- Rôles SOLO ---
    it('LOUP_BLANC → false (camp SOLO, pas LOUPS)', () => {
        expect(isInWolfCamp('LOUP_BLANC')).toBe(false);
    });

    it('FOU → false', () => {
        expect(isInWolfCamp('FOU')).toBe(false);
    });

    it('ASSASSIN → false', () => {
        expect(isInWolfCamp('ASSASSIN')).toBe(false);
    });

    it('PYROMANE → false', () => {
        expect(isInWolfCamp('PYROMANE')).toBe(false);
    });

    it('EMPOISONNEUR → false', () => {
        expect(isInWolfCamp('EMPOISONNEUR')).toBe(false);
    });

    // --- Cohérence avec ROLES ---
    it('tous les rôles camp LOUPS retournent true', () => {
        const loups = Object.values(ROLES).filter(r => r.camp === 'LOUPS');
        expect(loups.length).toBeGreaterThan(0);
        loups.forEach(r => {
            expect(isInWolfCamp(r.id as any)).toBe(true);
        });
    });

    it('aucun rôle hors camp LOUPS ne retourne true', () => {
        const nonLoups = Object.values(ROLES).filter(r => r.camp !== 'LOUPS');
        nonLoups.forEach(r => {
            expect(isInWolfCamp(r.id as any)).toBe(false);
        });
    });

});
