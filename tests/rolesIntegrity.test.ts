/**
 * Tests d'intégrité des données de rôles.
 * Vérifie que chaque rôle est bien défini et cohérent.
 */
import { ROLES, RoleId, isInWolfCamp } from '../types/roles';

const ALL_ROLE_IDS: RoleId[] = [
    'LOUP_GAROU', 'LOUP_ALPHA', 'GRAND_MECHANT_LOUP', 'LOUP_INFECT', 'LOUP_BLANC',
    'VILLAGEOIS', 'SORCIERE', 'CHASSEUR', 'VOYANTE', 'CUPIDON', 'PETITE_FILLE',
    'FOU', 'ASSASSIN', 'PYROMANE', 'EMPOISONNEUR',
];

describe('Intégrité des données ROLES', () => {

    it('tous les rôles listés existent dans ROLES', () => {
        ALL_ROLE_IDS.forEach(id => {
            expect(ROLES[id]).toBeDefined();
        });
    });

    it('chaque rôle a un id, label, description, camp et image', () => {
        ALL_ROLE_IDS.forEach(id => {
            const role = ROLES[id];
            expect(role.id).toBe(id);
            expect(typeof role.label).toBe('string');
            expect(role.label.length).toBeGreaterThan(0);
            expect(typeof role.description).toBe('string');
            expect(['VILLAGE', 'LOUPS', 'SOLO']).toContain(role.camp);
            expect(typeof role.image).toBe('string');
            expect(role.image).toMatch(/\.(png|jpg|webp)$/);
        });
    });

    it('les rôles loups ont tous camp LOUPS', () => {
        const loups: RoleId[] = ['LOUP_GAROU', 'LOUP_ALPHA', 'GRAND_MECHANT_LOUP', 'LOUP_INFECT'];
        loups.forEach(id => {
            expect(ROLES[id].camp).toBe('LOUPS');
        });
    });

    it('les rôles village ont tous camp VILLAGE', () => {
        const village: RoleId[] = ['VILLAGEOIS', 'SORCIERE', 'CHASSEUR', 'VOYANTE', 'CUPIDON', 'PETITE_FILLE'];
        village.forEach(id => {
            expect(ROLES[id].camp).toBe('VILLAGE');
        });
    });

    it('les rôles solo ont tous camp SOLO', () => {
        const solos: RoleId[] = ['FOU', 'LOUP_BLANC', 'ASSASSIN', 'PYROMANE', 'EMPOISONNEUR'];
        solos.forEach(id => {
            expect(ROLES[id].camp).toBe('SOLO');
        });
    });

    it('LOUP_BLANC est SOLO (pas LOUPS) — important pour la logique de victoire', () => {
        expect(ROLES['LOUP_BLANC'].camp).toBe('SOLO');
        expect(isInWolfCamp('LOUP_BLANC')).toBe(false);
    });

    it('isInWolfCamp cohérent avec la définition camp LOUPS', () => {
        ALL_ROLE_IDS.forEach(id => {
            const isWolf = isInWolfCamp(id);
            const campIsLoups = ROLES[id].camp === 'LOUPS';
            expect(isWolf).toBe(campIsLoups);
        });
    });

    it('les rôles avec pouvoirs ont un tableau powers non-vide', () => {
        // LOUP_ALPHA a un pouvoir (vote double via power)
        // LOUP_GAROU et FOU n'ont pas de powers définis
        // PETITE_FILLE a un pouvoir passif (écoute) mais pas de powers[] défini dans ROLES
        // LOUP_GAROU et FOU aussi n'ont pas de powers[]
        const rolesWithPowers: RoleId[] = [
            'SORCIERE', 'CHASSEUR', 'VOYANTE', 'CUPIDON',
            'GRAND_MECHANT_LOUP', 'LOUP_INFECT', 'LOUP_BLANC', 'LOUP_ALPHA',
            'PYROMANE', 'EMPOISONNEUR', 'ASSASSIN',
        ];
        rolesWithPowers.forEach(id => {
            expect(ROLES[id].powers?.length).toBeGreaterThan(0);
        });
    });

    it('les rôles sans pouvoirs spéciaux n\'ont pas de powers', () => {
        // LOUP_GAROU et FOU n'ont pas de powers (leur "pouvoir" est implicite)
        const rolesNoPowers: RoleId[] = ['VILLAGEOIS', 'LOUP_GAROU', 'FOU'];
        rolesNoPowers.forEach(id => {
            const powers = ROLES[id].powers;
            expect(!powers || powers.length === 0).toBe(true);
        });
    });

    it('chaque power a un id, label, type et timing valides', () => {
        ALL_ROLE_IDS.forEach(id => {
            ROLES[id].powers?.forEach(power => {
                expect(typeof power.id).toBe('string');
                expect(typeof power.label).toBe('string');
                expect(['active', 'one-time', 'passive']).toContain(power.type);
                // 'death' = pouvoir déclenché à la mort (Chasseur), pas 'on-death'
                expect(['night', 'day', 'anytime', 'death', 'always']).toContain(power.timing);
            });
        });
    });
});
