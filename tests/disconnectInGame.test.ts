/**
 * Tests d'intégration Socket.io — comportement de déconnexion.
 *
 * Vérifie que :
 *  - En lobby : un joueur déconnecté est marqué isDisconnected=true (supprimé après 60s)
 *  - En partie : un joueur déconnecté est marqué isDisconnected=true (avatar conservé)
 *  - Reconnexion en lobby : pas de doublon dans players
 *  - Reconnexion en partie : isDisconnected repassé à false
 */
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { setupGameLogic } from '../server/gameLogic';
import { GameState, Player } from '../types/game';
import * as roleDist from '../lib/roleDistribution';

jest.mock('../server/firebaseAdmin', () => ({
    adminDb: {
        collection: () => ({ doc: () => ({ delete: () => Promise.resolve() }) }),
    },
}));

function waitForGame(
    socket: ClientSocket,
    predicate: (s: GameState) => boolean,
    timeoutMs = 8000
): Promise<GameState> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`waitForGame timeout after ${timeoutMs}ms`)),
            timeoutMs
        );
        const handler = (state: GameState) => {
            if (predicate(state)) {
                clearTimeout(timer);
                socket.off('update_game', handler);
                resolve(state);
            }
        };
        socket.on('update_game', handler);
    });
}

describe('Déconnexion — intégration Socket.io', () => {
    let io: SocketIOServer;
    let httpServer: HttpServer;
    let port: number;
    const clients: ClientSocket[] = [];

    jest.setTimeout(30000);

    beforeAll(done => {
        httpServer = createServer();
        io = new SocketIOServer(httpServer);
        setupGameLogic(io);
        httpServer.listen(() => {
            port = (httpServer.address() as { port: number }).port;
            done();
        });
    });

    afterAll(done => {
        clients.forEach(c => { try { c.disconnect(); } catch {} });
        io.disconnectSockets(true);
        io.close(() => httpServer.close(() => done()));
    });

    function connect(userId: string, room: string): ClientSocket {
        const c = Client(`http://localhost:${port}`, {
            query: { roomCode: room, userId, username: `User_${userId}` },
            reconnection: false,
        });
        clients.push(c);
        return c;
    }

    // ─── Déconnexion en LOBBY ─────────────────────────────────────────────────

    it('en lobby, un joueur déconnecté est marqué isDisconnected=true (pas supprimé immédiatement)', async () => {
        const room = 'DC_LOBBY_MARK';
        const c1 = connect('dc_l1', room);
        const c2 = connect('dc_l2', room);

        c1.on('connect', () => c1.emit('join_game', {}));
        c2.on('connect', () => c2.emit('join_game', {}));

        // Attendre que les deux soient dans le lobby
        await waitForGame(c1, s => s.players.length >= 2);

        // c2 se déconnecte
        c2.disconnect();

        // c1 doit voir c2 avec isDisconnected=true (l'avatar reste 60s avant suppression)
        const state = await waitForGame(c1, s => {
            const p = s.players.find((pl: Player) => pl.id === 'dc_l2');
            return !!p && p.isDisconnected === true;
        });

        const disconnected = state.players.find((p: Player) => p.id === 'dc_l2');
        expect(disconnected).toBeDefined();
        expect(disconnected?.isDisconnected).toBe(true);
        // c1 est toujours là
        expect(state.players.find((p: Player) => p.id === 'dc_l1')).toBeDefined();
    });

    // ─── Reconnexion en LOBBY ─────────────────────────────────────────────────

    it('une reconnexion rapide en lobby enlève le marquage isDisconnected', async () => {
        const room = 'DC_LOBBY_RECONNECT';
        const c1 = connect('dc_rc1', room);

        c1.on('connect', () => c1.emit('join_game', {}));
        await waitForGame(c1, s => s.players.some((p: Player) => p.id === 'dc_rc1'));

        // Déconnexion
        c1.disconnect();

        // Reconnexion immédiate
        const c1b = connect('dc_rc1', room);
        c1b.on('connect', () => c1b.emit('join_game', {}));

        const state = await waitForGame(c1b, s => {
            const p = s.players.find((pl: Player) => pl.id === 'dc_rc1');
            return !!p && !p.isDisconnected;
        });

        const count = state.players.filter((p: Player) => p.id === 'dc_rc1').length;
        expect(count).toBe(1); // Pas de doublon
        expect(state.players.find((p: Player) => p.id === 'dc_rc1')?.isDisconnected).toBeFalsy();
    });

    // ─── Déconnexion en partie ────────────────────────────────────────────────

    it('en partie, un joueur déconnecté conserve son avatar avec isDisconnected=true', async () => {
        const room = 'DC_INGAME_MARK';

        jest.spyOn(roleDist, 'distributeRoles').mockReturnValue({
            VILLAGEOIS: 1,
            LOUP_GAROU: 1,
        });

        const host = connect('dc_ig_host', room);
        const player2 = connect('dc_ig_p2', room);

        host.on('connect', () => host.emit('join_game', {}));
        player2.on('connect', () => player2.emit('join_game', {}));

        // Attendre lobby avec 2 joueurs
        await waitForGame(host, s => s.players.length >= 2);

        // Démarrer la partie
        host.emit('start_game', {});

        // Attendre que la partie démarre (phase ROLE_REVEAL ou NIGHT)
        await waitForGame(host, s => s.phase !== 'LOBBY', 12000);

        // Player2 se déconnecte pendant la partie
        player2.disconnect();

        // Host doit voir player2 avec isDisconnected=true
        const stateAfterDC = await waitForGame(
            host,
            s => {
                const p = s.players.find((pl: Player) => pl.id === 'dc_ig_p2');
                return !!p && p.isDisconnected === true;
            },
            6000
        );

        const disconnectedPlayer = stateAfterDC.players.find((p: Player) => p.id === 'dc_ig_p2');
        expect(disconnectedPlayer).toBeDefined();
        expect(disconnectedPlayer?.isDisconnected).toBe(true);
        expect(disconnectedPlayer?.isAlive).toBe(true); // Toujours vivant

        jest.restoreAllMocks();
    });

    // ─── Reconnexion en partie ────────────────────────────────────────────────

    it('une reconnexion en partie remet isDisconnected à false', async () => {
        const room = 'DC_INGAME_REJOIN';

        jest.spyOn(roleDist, 'distributeRoles').mockReturnValue({
            VILLAGEOIS: 1,
            LOUP_GAROU: 1,
        });

        const host = connect('dc_rj_host', room);
        const player2 = connect('dc_rj_p2', room);

        host.on('connect', () => host.emit('join_game', {}));
        player2.on('connect', () => player2.emit('join_game', {}));

        await waitForGame(host, s => s.players.length >= 2);
        host.emit('start_game', {});
        await waitForGame(host, s => s.phase !== 'LOBBY', 12000);

        // Déconnexion
        player2.disconnect();
        await waitForGame(host, s => {
            const p = s.players.find((pl: Player) => pl.id === 'dc_rj_p2');
            return !!p && p.isDisconnected === true;
        }, 5000);

        // Reconnexion
        const player2b = connect('dc_rj_p2', room);
        player2b.on('connect', () => player2b.emit('join_game', {}));

        // Attendre que le joueur revienne (isDisconnected = false)
        const stateAfterRejoin = await waitForGame(
            player2b,
            s => {
                const p = s.players.find((pl: Player) => pl.id === 'dc_rj_p2');
                return !!p && !p.isDisconnected;
            },
            6000
        );

        const rejoinedPlayer = stateAfterRejoin.players.find((p: Player) => p.id === 'dc_rj_p2');
        expect(rejoinedPlayer).toBeDefined();
        expect(rejoinedPlayer?.isDisconnected).toBeFalsy();
        // Toujours un seul joueur (pas de doublon)
        const count = stateAfterRejoin.players.filter((p: Player) => p.id === 'dc_rj_p2').length;
        expect(count).toBe(1);

        jest.restoreAllMocks();
    });
});
