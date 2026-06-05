/**
 * Tests pour la logique de détection de victoire (sons fin de partie).
 * Reproduit la logique de useGameAudio pour vérifier que chaque joueur
 * entend le bon son selon le résultat de la partie.
 */
import { ROLES, RoleId, isInWolfCamp } from '../types/roles';

/** Replication de la logique useGameAudio — permet de tester sans React */
function iWon(
    winner: string,
    player: { role: RoleId | null; effects?: string[] }
): boolean {
    const roleDef = player.role ? ROLES[player.role] : null;
    const myCamp = roleDef?.camp || '';
    const isMeWolf = isInWolfCamp(player.role) || (player.effects?.includes('infected') ?? false);

    if (winner === 'AMOUR' && player.effects?.includes('lover')) return true;
    if (winner === 'VILLAGEOIS' && myCamp === 'VILLAGE' && !isMeWolf) return true;
    if (winner === 'LOUPS' && (isMeWolf || myCamp === 'LOUPS')) return true;
    if (winner === player.role) return true;
    return false;
}

describe('Détection victoire — sons fin de partie', () => {

    // ─── Victoire Village ──────────────────────────────────────────────────────

    it('Villageois gagne → son victoire', () => {
        expect(iWon('VILLAGEOIS', { role: 'VILLAGEOIS' })).toBe(true);
    });

    it('Sorcière gagne avec village → son victoire', () => {
        expect(iWon('VILLAGEOIS', { role: 'SORCIERE' })).toBe(true);
    });

    it('Chasseur gagne avec village → son victoire', () => {
        expect(iWon('VILLAGEOIS', { role: 'CHASSEUR' })).toBe(true);
    });

    it('Voyante gagne avec village → son victoire', () => {
        expect(iWon('VILLAGEOIS', { role: 'VOYANTE' })).toBe(true);
    });

    it('Loup-Garou perd contre village → son défaite', () => {
        expect(iWon('VILLAGEOIS', { role: 'LOUP_GAROU' })).toBe(false);
    });

    // ─── Victoire Loups ────────────────────────────────────────────────────────

    it('Loup-Garou gagne → son victoire', () => {
        expect(iWon('LOUPS', { role: 'LOUP_GAROU' })).toBe(true);
    });

    it('Loup Alpha gagne → son victoire', () => {
        expect(iWon('LOUPS', { role: 'LOUP_ALPHA' })).toBe(true);
    });

    it('Grand Méchant Loup gagne → son victoire', () => {
        expect(iWon('LOUPS', { role: 'GRAND_MECHANT_LOUP' })).toBe(true);
    });

    it('Joueur infecté gagne avec les loups → son victoire', () => {
        expect(iWon('LOUPS', { role: 'SORCIERE', effects: ['infected'] })).toBe(true);
    });

    it('Villageois perd contre les loups → son défaite', () => {
        expect(iWon('LOUPS', { role: 'VILLAGEOIS' })).toBe(false);
    });

    // ─── Victoire Amour ────────────────────────────────────────────────────────

    it('Amoureux gagnent → son victoire (clé AMOUR pas AMOUREUX)', () => {
        expect(iWon('AMOUR', { role: 'VILLAGEOIS', effects: ['lover'] })).toBe(true);
    });

    it('Loup amoureux gagne → son victoire', () => {
        expect(iWon('AMOUR', { role: 'LOUP_GAROU', effects: ['lover'] })).toBe(true);
    });

    it('Joueur non-amoureux quand les amoureux gagnent → son défaite', () => {
        expect(iWon('AMOUR', { role: 'VILLAGEOIS', effects: [] })).toBe(false);
    });

    // ─── Victoires Solo ────────────────────────────────────────────────────────

    it('Loup Blanc gagne → son victoire', () => {
        expect(iWon('LOUP_BLANC', { role: 'LOUP_BLANC' })).toBe(true);
    });

    it('Assassin gagne → son victoire', () => {
        expect(iWon('ASSASSIN', { role: 'ASSASSIN' })).toBe(true);
    });

    it('Pyromane gagne → son victoire', () => {
        expect(iWon('PYROMANE', { role: 'PYROMANE' })).toBe(true);
    });

    it('Empoisonneur gagne → son victoire', () => {
        expect(iWon('EMPOISONNEUR', { role: 'EMPOISONNEUR' })).toBe(true);
    });

    it('Fou gagne → son victoire', () => {
        expect(iWon('FOU', { role: 'FOU' })).toBe(true);
    });

    it('Villageois perd contre un solo → son défaite', () => {
        expect(iWon('LOUP_BLANC', { role: 'VILLAGEOIS' })).toBe(false);
    });

    // ─── Cas limites ───────────────────────────────────────────────────────────

    it('NONE (tous morts) → son défaite pour tout le monde', () => {
        expect(iWon('NONE', { role: 'VILLAGEOIS' })).toBe(false);
        expect(iWon('NONE', { role: 'LOUP_GAROU' })).toBe(false);
    });

    it('Loup Infect gagne avec les loups → son victoire', () => {
        expect(iWon('LOUPS', { role: 'LOUP_INFECT' })).toBe(true);
    });

    it('Petite Fille gagne avec village → son victoire', () => {
        expect(iWon('VILLAGEOIS', { role: 'PETITE_FILLE' })).toBe(true);
    });

    it('Cupidon gagne avec village → son victoire', () => {
        expect(iWon('VILLAGEOIS', { role: 'CUPIDON' })).toBe(true);
    });
});
