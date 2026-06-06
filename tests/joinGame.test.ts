/**
 * Tests d'intégration Socket.io pour le handler join_game.
 *
 * Vérifie les comportements clés sans passer par toute la boucle de jeu :
 *  - Un joueur peut rejoindre le lobby → il apparaît dans game.players
 *  - Deux joueurs dans le même salon coexistent
 *  - Un joueur qui se reconnecte ne se duplique pas
 *  - Un joueur rejoignant une partie déjà commencée → mode spectateur (absent de players)
 */
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { setupGameLogic } from '../server/gameLogic';
import { GameState } from '../types/game';

// Firebase Admin n'est pas configuré en environnement de test —
// on mocke adminDb pour que deleteRoom() soit un no-op silencieux.
jest.mock('../server/firebaseAdmin', () => ({
    adminDb: {
        collection: () => ({
            doc: () => ({
                delete: () => Promise.resolve(),
            }),
        }),
    },
}));

const ROOM = 'INTEG_TEST';

function waitForGame(socket: ClientSocket, predicate: (s: GameState) => boolean, timeoutMs = 5000): Promise<GameState> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('waitForGame timeout')), timeoutMs);
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

describe('join_game — intégration Socket.io', () => {
    let io: SocketIOServer;
    let httpServer: HttpServer;
    let port: number;
    const clients: ClientSocket[] = [];

    jest.setTimeout(15000);

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
        clients.forEach(c => c.disconnect());
        io.disconnectSockets(true);
        io.close(() => httpServer.close(() => done()));
    });

    function connect(userId: string, username: string, roomCode = ROOM): ClientSocket {
        const c = Client(`http://localhost:${port}`, {
            query: { roomCode, userId, username },
        });
        clients.push(c);
        return c;
    }

    // ─── Rejoindre le lobby ────────────────────────────────────────────────────

    it('un joueur qui rejoint le lobby est ajouté à game.players', async () => {
        const c1 = connect('u_join1', 'Alice', 'ROOM_JOIN1');
        c1.on('connect', () => c1.emit('join_game', {}));

        const state = await waitForGame(c1, s => s.players.some(p => p.id === 'u_join1'));
        expect(state.players.find(p => p.id === 'u_join1')).toBeDefined();
        expect(state.phase).toBe('LOBBY');
    });

    it('deux joueurs dans le même salon partagent le même game.players', async () => {
        const c1 = connect('u_share1', 'Bob', 'ROOM_SHARE');
        const c2 = connect('u_share2', 'Carol', 'ROOM_SHARE');

        c1.on('connect', () => c1.emit('join_game', {}));
        c2.on('connect', () => c2.emit('join_game', {}));

        const state = await waitForGame(c2, s => s.players.length >= 2);
        const ids = state.players.map(p => p.id);
        expect(ids).toContain('u_share1');
        expect(ids).toContain('u_share2');
    });

    it('reconnexion du même joueur → pas de doublon dans players', async () => {
        const room = 'ROOM_RECONNECT';
        const c1 = connect('u_reconn', 'Dave', room);
        c1.on('connect', () => c1.emit('join_game', {}));

        // Attendre que le joueur soit présent
        await waitForGame(c1, s => s.players.some(p => p.id === 'u_reconn'));

        // Reconnexion simulée : même socket émet join_game une seconde fois
        c1.emit('join_game', {});

        // Attendre un update_game de plus et vérifier l'absence de doublon
        const state = await waitForGame(c1, s => s.players.length > 0);
        const count = state.players.filter(p => p.id === 'u_reconn').length;
        expect(count).toBe(1);
    });

    // ─── Mode spectateur ──────────────────────────────────────────────────────

    it('un joueur qui rejoint une partie déjà commencée n\'est pas dans players', async () => {
        const room = 'ROOM_SPECTATOR';

        // Créer une partie avec 2 joueurs et la démarrer
        const host = connect('u_spec_host', 'Host', room);
        const p2 = connect('u_spec_p2', 'P2', room);

        host.on('connect', () => host.emit('join_game', {}));
        p2.on('connect', () => p2.emit('join_game', {}));

        // Attendre que les 2 joueurs soient dans le lobby
        await waitForGame(host, s => s.players.length >= 2);

        // Enregistrer le listener AVANT l'emit pour éviter la race condition
        const phaseChangePromise = waitForGame(host, s => s.phase !== 'LOBBY', 8000);
        host.emit('start_game', {});

        // Attendre que la phase change (ROLE_REVEAL ou autre)
        await phaseChangePromise;

        // Un nouveau joueur tente de rejoindre — enregistrer le listener avant connection
        const spectator = connect('u_spectator', 'Watcher', room);
        const spectatorStatePromise = waitForGame(spectator, () => true, 5000); // Premier update_game reçu
        spectator.on('connect', () => spectator.emit('join_game', {}));

        const state = await spectatorStatePromise;

        // Le spectateur NE doit PAS être dans players
        const found = state.players.find(p => p.id === 'u_spectator');
        expect(found).toBeUndefined();
    });

});
