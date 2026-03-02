import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { setupGameLogic } from '../server/gameLogic';
import * as roleDist from '../lib/roleDistribution';

describe('Wolf Chat Logic', () => {
    let io: SocketIOServer;
    let httpServer: any;
    let clientWolf: ClientSocket;
    let clientAlpha: ClientSocket;
    let port: number;

    jest.setTimeout(80000); // 80s timeout

    beforeAll((done) => {
        httpServer = createServer();
        io = new SocketIOServer(httpServer);

        setupGameLogic(io);

        httpServer.listen(() => {
            port = (httpServer.address() as any).port;
            done();
        });
    });

    afterAll(() => {
        io.close();
        httpServer.close();
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
        clientWolf.on('update_game', (state) => { if (state.players && state.players.find((p: any) => p.id === 'userW')) checkDone(); });
        clientAlpha.on('connect', () => { clientAlpha.emit('join_game', {}); });
        clientAlpha.on('update_game', (state) => { if (state.players && state.players.find((p: any) => p.id === 'userA')) checkDone(); });
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

        clientAlpha.on('chat_message', (msg) => {
            if (msg.text === 'Hello Alpha!' && msg.chatType === 'night') {
                console.log("Got direct msg!");
                gotDirectMsg = true;
            }
        });

        clientAlpha.on('update_game', (state) => {
            if (gotDirectMsg) {
                console.log("Alpha got update_game. Chat messages length:", state.chatMessages?.length || 0);
                const hasMessage = state.chatMessages?.find((m: any) => m.text === 'Hello Alpha!');
                if (hasMessage && !gotStateMessage) {
                    gotStateMessage = true;
                    console.log("Got state msg!");
                    done();
                } else if (!hasMessage) {
                    console.log("MESSAGES SEEN BY ALPHA:", JSON.stringify(state.chatMessages?.slice(-2)));
                }
            }
        });

        // Wait 65s
        setTimeout(() => {
            clientWolf.emit('chat_message', {
                senderId: 'userW',
                senderName: 'WolfPlayer',
                text: 'Hello Alpha!',
                time: Date.now(),
                chatType: 'night'
            }, (res: any) => console.log('Chat SEND result:', res));

            // Fail if not received in state within 5s
            setTimeout(() => {
                if (!gotStateMessage) done(new Error("Did not receive message in update_game state"));
            }, 5000);
        }, 65000);
    });
});
