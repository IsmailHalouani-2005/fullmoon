import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { setupGameLogic } from './server/gameLogic';
import * as roleDist from './lib/roleDistribution';

// Override the role distribution to ensure we have a LOUP_GAROU and a LOUP_ALPHA
roleDist.distributeRoles = (J: number) => ({
    'LOUP_GAROU': 1,
    'LOUP_ALPHA': 1
});

const httpServer = createServer();
const io = new SocketIOServer(httpServer);
setupGameLogic(io);

httpServer.listen(0, () => {
    const port = (httpServer.address() as any).port;
    const url = `http://localhost:${port}`;

    const clientWolf = Client(url, { query: { roomCode: 'TESTROOM', userId: 'userW', username: 'WolfPlayer' } });
    const clientAlpha = Client(url, { query: { roomCode: 'TESTROOM', userId: 'userA', username: 'AlphaPlayer' } });

    let connected = 0;
    const checkStart = () => {
        connected++;
        if (connected === 2) {
            clientWolf.emit('start_game', {});
        }
    };

    clientWolf.on('connect', () => clientWolf.emit('join_game', {}));
    clientAlpha.on('connect', () => clientAlpha.emit('join_game', {}));

    let gameStateCountW = 0;
    clientWolf.on('update_game', state => {
        if (state.players && state.players.length === 2 && gameStateCountW === 0) {
            gameStateCountW++;
            checkStart();
        }
    });

    let gameStateCountA = 0;
    clientAlpha.on('update_game', state => {
        if (state.players && state.players.length === 2 && gameStateCountA === 0) {
            gameStateCountA++;
            checkStart();
        }
    });

    clientAlpha.on('chat_message', (msg) => {
        if (msg.chatType === 'night') {
            console.log("SUCCESS: LOUP_ALPHA received night message from LOUP_GAROU!");
            process.exit(0);
        }
    });

    // Wait some time for the roles to be assigned and start_game to process.
    // The phase will be 'ROLE_REVEAL'. Night chat is blocked unless phase is 'NIGHT'.
    // We can manually bypass the block or wait 60s for the timer.
    // Let's just mock game.phase on the server side? It's hidden in the closure...
    // Instead of waiting, we can force a phase change by mocking a timer?
    // Let's just modify the node modules or wait 60s. For this test, 1 minute is fine.
    console.log("Waiting 65 seconds for game to enter NIGHT phase so we can test chat...");
    setTimeout(() => {
        console.log("Emitting chat message from LOUP_GAROU");
        clientWolf.emit('chat_message', {
            senderId: 'userW',
            senderName: 'WolfPlayer',
            text: 'Hello Alpha!',
            time: Date.now(),
            chatType: 'night'
        });

        setTimeout(() => {
            console.log("FAILED: Did not receive message within 5 seconds.");
            process.exit(1);
        }, 5000);
    }, 65000); // 15s role reveal + 45s mayor election + 5s buffer
});
