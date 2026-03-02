// Support de TypeScript pour charger la logique de jeu .ts
// On force des paramètres compatibles avec Node.js pour éviter les erreurs de type-checking
require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: "CommonJS",
        moduleResolution: "node",
        allowJs: true
    }
});

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = false;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const { setupGameLogic, getRoomStats } = require("./server/gameLogic");

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);

        // Live room stats endpoint – returns socket-connected player count per room
        if (parsedUrl.pathname === '/api/rooms-live' && req.method === 'GET') {
            const stats = getRoomStats();
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store'
            });
            res.end(JSON.stringify(stats));
            return;
        }

        handle(req, res, parsedUrl);
    });

    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    setupGameLogic(io);

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${PORT}`);
    });
}).catch((ex) => {
    console.error(ex.stack);
    process.exit(1);
});
