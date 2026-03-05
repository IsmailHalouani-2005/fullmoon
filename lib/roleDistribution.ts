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
    // Special wolves first
    const specials = WOLF_PRIORITY.filter(r => r !== 'LOUP_GAROU');
    for (const roleId of specials) {
        if (wolfSlotsLeft <= 0) break;
        result[roleId] = 1;
        wolfSlotsLeft--;
    }
    // Then generic
    if (wolfSlotsLeft > 0) {
        result['LOUP_GAROU'] = wolfSlotsLeft;
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
        // Probability factor based on user formula: (J - x) / J
        // This factor is 1 at x=0 and 1/J at x=J-1.
        // We can use it to decide if we pick from the pool or use a fallback (Villager).
        const prob = (J - x) / J;

        if (Math.random() < prob && shuffledPool.length > 0) {
            pickedRoles.push(shuffledPool.shift()!);
        } else if (shuffledPool.length > 0) {
            // Even if prob check fails, if we have roles in pool, we might want to pick them 
            // but the formula suggests a specific decay.
            // Let's stick to picking from pool first if available, 
            // but the formula f(x) = (1/Jt) * ((J-x)/J) is very small.
            // Sum of (1/Jt) * (J-x)/J from x=0 to J-1 is approx 0.5 if J=Jt.

            // To respect the "custom" aspect, we primarily want roles from the pool.
            pickedRoles.push(shuffledPool.shift()!);
        } else {
            // Pool empty, fill with default villageois
            pickedRoles.push('VILLAGEOIS');
        }
    }

    // Convert back to Record
    for (const roleId of pickedRoles) {
        result[roleId] = (result[roleId] ?? 0) + 1;
    }

    return result;
}
