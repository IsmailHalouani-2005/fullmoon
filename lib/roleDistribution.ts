import { RoleId } from '../types/roles';

/**
 * Priorities for role selection within categories
 */
export const WOLF_PRIORITY: RoleId[] = [
    'LOUP_GAROU',
    'LOUP_ALPHA',
    'GRAND_MECHANT_LOUP',
    'LOUP_INFECT',
];

export const VILLAGE_SPECIAL_PRIORITY: RoleId[] = [
    'SORCIERE',
    'CHASSEUR',
    'VOYANTE',
    'CUPIDON',
    'PETITE_FILLE',
];

export const SOLO_PRIORITY: RoleId[] = [
    'LOUP_BLANC',
    'FOU',
    'ASSASSIN',
    'PYROMANE',
    'EMPOISONNEUR',
];

/**
 * Returns the target counts for each camp (Village, Wolf, Solo) based on player count J
 */
export function getCountsForJ(J: number) {
    // --- Determine C (solo count) ---
    let C = 0;
    if (J >= 16) C = 3;
    else if (J >= 15) C = 2;
    else if (J >= 11) C = 1;

    const N = J - C; // N = A + B

    // --- Compute B and A ---
    let B = Math.max(1, Math.floor((N - 3) / 2));
    if (B > 5) B = 5;
    const A = N - B;

    return { A, B, C };
}

export function distributeRoles(J: number): Partial<Record<RoleId, number>> {
    const result: Partial<Record<RoleId, number>> = {};
    const { A, B, C } = getCountsForJ(J);

    // --- Fill WOLVES ---
    let wolfSlotsLeft = B;
    // Parcourt la priorité (Loup Garou d'abord, puis Alpha, etc.)
    for (const roleId of WOLF_PRIORITY) {
        if (wolfSlotsLeft <= 0) break;
        result[roleId] = 1;
        wolfSlotsLeft--;
    }
    // S'il reste de la place pour des loups génériques, on donne tout au Loup-Garou
    if (wolfSlotsLeft > 0) {
        result['LOUP_GAROU'] = (result['LOUP_GAROU'] || 0) + wolfSlotsLeft;
    }

    // --- Fill VILLAGE ---
    let villageSlotsLeft = A;
    const maxVillageois = J === 5 ? 2 : J <= 13 ? 3 : 4;

    // Minimum mandatory villagers
    const initialVillageois = Math.min(villageSlotsLeft, maxVillageois);
    result['VILLAGEOIS'] = initialVillageois;
    villageSlotsLeft -= initialVillageois;

    for (const roleId of VILLAGE_SPECIAL_PRIORITY) {
        if (villageSlotsLeft <= 0) break;
        result[roleId] = 1;
        villageSlotsLeft--;
    }

    // Gaps
    if (villageSlotsLeft > 0) {
        result['VILLAGEOIS'] = (result['VILLAGEOIS'] ?? 0) + villageSlotsLeft;
    }

    // --- Fill SOLO ---
    let soloSlotsLeft = C;
    for (const roleId of SOLO_PRIORITY) {
        if (soloSlotsLeft <= 0) break;
        result[roleId] = 1;
        soloSlotsLeft--;
    }

    return result;
}

/**
 * Distributes roles based on a custom pool and a specific probability formula
 * f(x) = (1/Jt) * ((J - x) / J)
 * where J is number of players, Jt is total roles in the custom pool,
 * and x is the number of roles already distributed.
 */
export function distributeCustomRoles(J: number, rolesCount: Partial<Record<RoleId, number>>): Partial<Record<RoleId, number>> {
    const result: Partial<Record<RoleId, number>> = {};

    // 1. Create a flat pool of selected roles
    const pool: RoleId[] = [];
    for (const [roleId, count] of Object.entries(rolesCount)) {
        for (let i = 0; i < (count as number); i++) {
            pool.push(roleId as RoleId);
        }
    }

    const Jt = pool.length;
    if (Jt === 0) return distributeRoles(J); // Fallback to default if pool is empty

    // Shuffle the pool for randomness
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);

    // We need to pick exactly J roles.
    // The user's formula f(x) seems to describe a weight or a probability for the NEXT role to be special.
    // However, to ensure we get exactly J roles, we'll pick J roles from the pool.
    // If J > Jt, we'll have to repeat or add villagers.
    // If J < Jt, we pick J.

    const pickedRoles: RoleId[] = [];

    for (let x = 0; x < J; x++) {
        if (shuffledPool.length > 0) {
            pickedRoles.push(shuffledPool.shift()!);
        } else {
            pickedRoles.push('VILLAGEOIS');
        }
    }

    // Convert back to Record
    for (const roleId of pickedRoles) {
        result[roleId] = (result[roleId] ?? 0) + 1;
    }

    return result;
}
