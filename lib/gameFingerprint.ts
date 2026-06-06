import type { GameState } from '../types/game';

/**
 * Empreinte légère du GameState excluant le timer.
 *
 * Utilisée dans update_game pour détecter si la mise à jour contient de
 * vrais changements de jeu ou seulement un tick du compteur — ce qui évite
 * de remplacer la référence React chaque seconde et donc de re-rendre tout
 * l'arbre de composants inutilement.
 *
 * Contrat : deux GameState qui ne diffèrent que par `timer` produisent la
 * même empreinte.
 */
export function gameFingerprint(
    s: Pick<
        GameState,
        | 'phase'
        | 'mayorId'
        | 'wolfVictimId'
        | 'hostId'
        | 'dyingMayorId'
        | 'lastPoisonedId'
        | 'votes'
        | 'players'
        | 'nightActions'
    >
): string {
    const voteStr = Object.entries(s.votes || {})
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `${k}:${v}`)
        .join(',');

    const playerStr = s.players
        .map(
            p =>
                `${p.id}:${p.isAlive ? 1 : 0}:${p.isDisconnected ? 1 : 0}:${p.role || ''}:${(p.effects || []).join('+')}:${(p.usedPowers || []).join('+')}`
        )
        .join('|');

    const actionStr = (s.nightActions || [])
        .map(a => `${a.sourceId}:${a.powerId}:${a.targetId || ''}`)
        .join(',');

    return [
        s.phase,
        s.mayorId || '',
        s.wolfVictimId || '',
        s.hostId,
        s.dyingMayorId || '',
        s.lastPoisonedId || '',
        voteStr,
        playerStr,
        actionStr,
    ].join('|');
}
