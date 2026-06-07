import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { setupGameLogic } from '../server/gameLogic';
import * as roleDist from '../lib/roleDistribution';
import { Player, ChatMessage } from '../types/game';

describe('Wolf Chat Logic', () => {
    let io: SocketIOServer;
    let httpServer: HttpServer;
    let clientWolf: ClientSocket;
    let clientAlpha: ClientSocket;
    let port: number;

    jest.setTimeout(100000); // 100s timeout (65s wait + marge)

    beforeAll((done) => {
        httpServer = createServer();
        io = new SocketIOServer(httpServer);

        setupGameLogic(io);

        httpServer.listen(() => {
            port = (httpServer.address() as { port: number }).port;
            done();
        });
    });

    afterAll((done) => {
        // Forcer la déconnexion de tous les sockets avant de fermer le serveur
        io.disconnectSockets(true);
        io.close(() => {
            httpServer.close(() => done());
        });
    });

    beforeEach((done) => {
        let connectedCount = 0;
        const url = `http://localhost:${port}`;

        jest.spyOn(roleDist, 'distributeRoles').mockReturnValue({
            'LOUP_GAROU': 1,
            'LOUP_ALPHA': 1
        });

        const checkDone = () => {
            connectedCount++;
            if (connectedCount === 2) done();
        }

        clientWolf = Client(url, { query: { roomCode: 'TESTROOM', userId: 'userW', username: 'WolfPlayer' } });
        clientAlpha = Client(url, { query: { roomCode: 'TESTROOM', userId: 'userA', username: 'AlphaPlayer' } });

        clientWolf.on('connect', () => { clientWolf.emit('join_game', {}); });
        clientWolf.on('update_game', (state) => { if (state.players && state.players.find((p: Player) => p.id === 'userW')) checkDone(); });
        clientAlpha.on('connect', () => { clientAlpha.emit('join_game', {}); });
        clientAlpha.on('update_game', (state) => { if (state.players && state.players.find((p: Player) => p.id === 'userA')) checkDone(); });
    });

    afterEach(() => {
        clientWolf.disconnect();
        clientAlpha.disconnect();
        jest.restoreAllMocks();
    });

    it('should allow LOUP_ALPHA to receive night chat messages from LOUP_GAROU and keep them', (done) => {
        clientWolf.emit('start_game', {});

        let gotDirectMsg = false;
        let gotStateMessage = false;
        let messageSent = false;
        let finished = false;
        let failTimer: NodeJS.Timeout | null = null;

        // Finalise le test une seule fois et nettoie tous les timers
        const finish = (err?: Error) => {
            if (finished) return;
            finished = true;
            if (failTimer) { clearTimeout(failTimer); failTimer = null; }
            done(err);
        };

        clientAlpha.on('chat_message', (msg) => {
            if (msg.text === 'Hello Alpha!' && msg.chatType === 'night') {
                gotDirectMsg = true;
            }
        });

        clientAlpha.on('update_game', (state) => {
            if (gotDirectMsg) {
                const hasMessage = state.chatMessages?.find((m: ChatMessage) => m.text === 'Hello Alpha!');
                if (hasMessage && !gotStateMessage) {
                    gotStateMessage = true;
                    finish();
                }
            }
        });

        // Écouter le changement de phase plutôt qu'attendre un délai fixe (plus robuste)
        clientWolf.on('update_game', (state) => {
            if (state.phase === 'NIGHT' && !messageSent) {
                messageSent = true;
                clientWolf.emit('chat_message', {
                    senderId: 'userW',
                    senderName: 'WolfPlayer',
                    text: 'Hello Alpha!',
                    time: Date.now(),
                    chatType: 'night'
                }, () => {});

                // Échoue si pas reçu dans les 5s après envoi
                failTimer = setTimeout(() => {
                    failTimer = null;
                    if (!gotStateMessage) finish(new Error('Message envoyé en phase NIGHT mais non reçu dans update_game'));
                }, 5000);
            }
        });
    });
});
