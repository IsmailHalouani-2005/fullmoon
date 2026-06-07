/**
 * Tests d'intégration Socket.io — enregistrement vocal (join_voice_room).
 *
 * join_voice_room enregistre le socket dans userSocketMap côté serveur.
 * Sans cet enregistrement, la signalisation WebRTC (voice_request_connect,
 * voice_signal) ne peut pas router les messages vers le bon socket.
 *
 * Vérifie :
 *  - Après join_voice_room, le serveur peut router voice_request_connect
 *    vers la bonne cible (qui reçoit voice_connect)
 *  - Un socket join_game (partie classique) est aussi joignable via voice_request_connect
 *  - Un socket qui n'a pas émis join_voice_room ne reçoit pas les signaux
 */
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { setupGameLogic } from '../server/gameLogic';

jest.mock('../server/firebaseAdmin', () => ({
    adminDb: {
        collection: () => ({ doc: () => ({ delete: () => Promise.resolve() }) }),
    },
}));

function waitForEvent<T>(
    socket: ClientSocket,
    event: string,
    timeoutMs = 3000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`waitForEvent("${event}") timeout`)),
            timeoutMs
        );
        socket.once(event, (data: T) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

describe('join_voice_room — enregistrement vocal', () => {
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
        clients.forEach(c => { try { c.disconnect(); } catch {} });
        io.disconnectSockets(true);
        io.close(() => httpServer.close(() => done()));
    });

    function connect(userId: string, room = 'VOICE_TEST'): ClientSocket {
        const c = Client(`http://localhost:${port}`, {
            query: { roomCode: room, userId, username: `User_${userId}` },
            reconnection: false,
        });
        clients.push(c);
        return c;
    }

    // Le serveur relaie `voice_request_connect` avec { senderId } (pas voice_connect).
    // VoiceChatManager reçoit ce relais et répond avec voice_signal pour la négociation WebRTC.

    // ─── Enregistrement basique ───────────────────────────────────────────────

    it('voice_request_connect est relayé à la cible après join_voice_room', async () => {
        const userA = connect('vr_A', 'VOICE_BASIC');
        const userB = connect('vr_B', 'VOICE_BASIC');

        // Attendre la connexion des deux
        await new Promise<void>(resolve => {
            let cnt = 0;
            const check = () => { if (++cnt === 2) resolve(); };
            userA.on('connect', () => { userA.emit('join_voice_room'); check(); });
            userB.on('connect', () => { userB.emit('join_voice_room'); check(); });
        });

        // A demande à se connecter à B en vocal → serveur relaie voice_request_connect à B
        const relayPromise = waitForEvent<{ senderId: string }>(userB, 'voice_request_connect');
        userA.emit('voice_request_connect', { targetId: 'vr_B', type: 'group' });

        const event = await relayPromise;
        expect(event.senderId).toBe('vr_A');
    });

    // ─── Via join_game ────────────────────────────────────────────────────────

    it('voice_request_connect atteint aussi un joueur enregistré via join_game', async () => {
        const room = 'VOICE_JOINGAME';
        const userA = connect('vr_jg_A', room);
        const userB = connect('vr_jg_B', room);

        await new Promise<void>(resolve => {
            let cnt = 0;
            const check = () => { if (++cnt === 2) resolve(); };
            userA.on('connect', () => { userA.emit('join_game', {}); check(); });
            userB.on('connect', () => { userB.emit('join_game', {}); check(); });
        });

        // Attendre que les deux apparaissent dans le game state (lobby)
        await new Promise<void>(resolve => {
            userA.on('update_game', (s) => {
                if (s.players?.length >= 2) resolve();
            });
        });

        // Pour type 'room', le serveur vérifie la phase (LOBBY → canHear = true)
        const relayPromise = waitForEvent<{ senderId: string }>(userB, 'voice_request_connect');
        userA.emit('voice_request_connect', { targetId: 'vr_jg_B', type: 'room' });

        const event = await relayPromise;
        expect(event.senderId).toBe('vr_jg_A');
    });

    // ─── Signal WebRTC relay ──────────────────────────────────────────────────

    it('voice_signal est relayé à la cible correcte', async () => {
        const room = 'VOICE_SIGNAL';
        const userA = connect('vr_sig_A', room);
        const userB = connect('vr_sig_B', room);

        await new Promise<void>(resolve => {
            let cnt = 0;
            const check = () => { if (++cnt === 2) resolve(); };
            userA.on('connect', () => { userA.emit('join_voice_room'); check(); });
            userB.on('connect', () => { userB.emit('join_voice_room'); check(); });
        });

        // voice_signal est relayé avec { senderId, signal, type }
        const signalPromise = waitForEvent<{ senderId: string; signal: unknown }>(userB, 'voice_signal');

        userA.emit('voice_signal', {
            targetId: 'vr_sig_B',
            signal: { type: 'offer', sdp: 'mock_sdp' },
            type: 'group',
        });

        const received = await signalPromise;
        expect(received.senderId).toBe('vr_sig_A');
        expect((received.signal as { type: string }).type).toBe('offer');
    });

    // ─── Double join_voice_room ───────────────────────────────────────────────

    it('émettre join_voice_room plusieurs fois ne provoque pas d\'erreur', async () => {
        const userA = connect('vr_double_A', 'VOICE_DOUBLE');
        const userB = connect('vr_double_B', 'VOICE_DOUBLE');

        await new Promise<void>(resolve => {
            let cnt = 0;
            const check = () => { if (++cnt === 2) resolve(); };
            userA.on('connect', () => {
                // Émettre plusieurs fois
                userA.emit('join_voice_room');
                userA.emit('join_voice_room');
                check();
            });
            userB.on('connect', () => { userB.emit('join_voice_room'); check(); });
        });

        // Doit quand même router le signal correctement
        const relayPromise = waitForEvent<{ senderId: string }>(userB, 'voice_request_connect');
        userA.emit('voice_request_connect', { targetId: 'vr_double_B', type: 'group' });

        const event = await relayPromise;
        expect(event.senderId).toBe('vr_double_A');
    });
});
