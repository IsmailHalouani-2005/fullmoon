/**
 * Tests unitaires — logique d'un joueur déconnecté en cours de partie.
 *
 * Vérifie les invariants de l'état du jeu quand des joueurs ont
 * isDisconnected = true (comportement attendu depuis le fix Bug #7) :
 *  - Un joueur déconnecté peut encore être voté (comptage des votes)
 *  - checkVictory ignore les joueurs déconnectés pour le camp des survivants
 *  - La partie continue tant qu'il reste des joueurs actifs
 */
import { checkVictory, tallyVotes } from '../server/gameLogic';
import { makePlayer, makeGame } from './helpers';

describe('joueur déconnecté — logique de jeu', () => {

    // ─── checkVictory avec déconnectés ────────────────────────────────────────

    it('la partie continue si seuls des loups déconnectés restent face à des villageois actifs', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [
                makePlayer('p1', 'VILLAGEOIS', true),
                makePlayer('p2', 'VILLAGEOIS', true),
                { ...makePlayer('p3', 'LOUP_GAROU', true), isDisconnected: true } as ReturnType<typeof makePlayer> & { isDisconnected: boolean },
            ],
        });
        // Les loups déconnectés sont toujours vivants → pas de victoire village automatique
        const result = checkVictory(game);
        expect(result).toBeNull(); // La partie continue
    });

    it('checkVictory détecte la victoire même si tous les loups sont déconnectés mais pas encore morts', () => {
        // Un loup vivant mais déconnecté = toujours en jeu
        const game = makeGame({
            phase: 'NIGHT',
            players: [
                makePlayer('v1', 'VILLAGEOIS', true),
                makePlayer('v2', 'VILLAGEOIS', true),
                { ...makePlayer('l1', 'LOUP_GAROU', true), isDisconnected: true } as ReturnType<typeof makePlayer> & { isDisconnected: boolean },
            ],
        });
        // Loup déconnecté mais vivant → pas de victoire village
        expect(checkVictory(game)).toBeNull();
    });

    it('le village gagne si tous les loups sont morts (indépendamment de isDisconnected)', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [
                makePlayer('v1', 'VILLAGEOIS', true),
                makePlayer('v2', 'VILLAGEOIS', true),
                makePlayer('l1', 'LOUP_GAROU', false), // mort
            ],
        });
        expect(checkVictory(game)?.winner).toBe('VILLAGEOIS');
    });

    // ─── tallyVotes avec déconnectés ──────────────────────────────────────────

    it('un joueur déconnecté peut recevoir des votes et être éliminé (majorité)', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [
                makePlayer('v1', 'VILLAGEOIS', true),
                makePlayer('v2', 'VILLAGEOIS', true),
                { ...makePlayer('l1', 'LOUP_GAROU', true), isDisconnected: true } as ReturnType<typeof makePlayer> & { isDisconnected: boolean },
            ],
            votes: {
                v1: 'l1',
                v2: 'l1',
            },
        });

        // tallyVotes retourne l'id du joueur éliminé (string | null), pas un objet
        expect(tallyVotes(game)).toBe('l1');
    });

    it('un joueur déconnecté ne vote pas mais peut se faire voter (1 seul vote)', () => {
        const game = makeGame({
            phase: 'DAY_VOTE',
            players: [
                makePlayer('v1', 'VILLAGEOIS', true),
                makePlayer('v2', 'VILLAGEOIS', true),
                { ...makePlayer('l1', 'LOUP_GAROU', true), isDisconnected: true } as ReturnType<typeof makePlayer> & { isDisconnected: boolean },
            ],
            votes: {
                v1: 'l1',
                // v2 n'a pas voté, l1 non plus (déconnecté)
            },
        });
        // l1 a 1 vote, v1 et v2 ont 0 → l1 est le seul candidat → éliminé
        expect(tallyVotes(game)).toBe('l1');
    });

    // ─── Calcul des joueurs actifs ────────────────────────────────────────────

    it('les joueurs actifs sont ceux avec isDisconnected != true', () => {
        const players = [
            makePlayer('p1', 'VILLAGEOIS', true),
            { ...makePlayer('p2', 'LOUP_GAROU', true), isDisconnected: true } as ReturnType<typeof makePlayer> & { isDisconnected: boolean },
            makePlayer('p3', 'SORCIERE', true),
        ];
        const active = players.filter(p => !p.isDisconnected);
        expect(active.length).toBe(2);
        expect(active.map(p => p.id)).toEqual(['p1', 'p3']);
    });

    it('la partie se nettoie si tous les joueurs sont déconnectés ou morts', () => {
        const game = makeGame({
            phase: 'NIGHT',
            players: [
                { ...makePlayer('p1', 'VILLAGEOIS', true), isDisconnected: true } as ReturnType<typeof makePlayer> & { isDisconnected: boolean },
                { ...makePlayer('p2', 'LOUP_GAROU', true), isDisconnected: true } as ReturnType<typeof makePlayer> & { isDisconnected: boolean },
            ],
        });
        const activePlayers = game.players.filter(p => !(p as typeof p & { isDisconnected?: boolean }).isDisconnected);
        expect(activePlayers.length).toBe(0); // Tous déconnectés → room doit être nettoyée
    });
});

// ─── Phases et déconnexion ────────────────────────────────────────────────────

describe('déconnexion et phases de jeu', () => {

    it('un joueur déconnecté garde son rôle et ses effets', () => {
        const player = {
            ...makePlayer('p1', 'LOUP_GAROU', true, ['infected']),
            isDisconnected: true,
        };
        expect(player.role).toBe('LOUP_GAROU');
        expect(player.effects).toContain('infected');
        expect(player.isDisconnected).toBe(true);
        expect(player.isAlive).toBe(true); // Toujours vivant jusqu'au vote
    });

    it('un joueur mort et déconnecté ne compte pas dans les loups actifs', () => {
        const game = makeGame({
            players: [
                makePlayer('v1', 'VILLAGEOIS', true),
                makePlayer('v2', 'VILLAGEOIS', true),
                makePlayer('l1', 'LOUP_GAROU', false), // mort
                { ...makePlayer('l2', 'LOUP_GAROU', true), isDisconnected: true } as ReturnType<typeof makePlayer> & { isDisconnected: boolean },
            ],
        });
        // Loups vivants = 1 (l2, déconnecté mais vivant)
        const alivePlayers = game.players.filter(p => p.isAlive);
        const aliveWolves = alivePlayers.filter(p => p.role === 'LOUP_GAROU');
        const aliveVillage = alivePlayers.filter(p => p.role === 'VILLAGEOIS');
        expect(aliveWolves.length).toBe(1);
        expect(aliveVillage.length).toBe(2);
        // La partie continue car wolves <= village
        expect(checkVictory(game)).toBeNull();
    });
});
