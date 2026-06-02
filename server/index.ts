import * as dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server } from "socket.io";
import { setupGameLogic, getRoomStats } from "./gameLogic";

// Load the Next.js environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map(o => o.trim());

// 1. Create native HTTP server to handle API + CORS
const server = http.createServer((req, res) => {
    const origin = req.headers.origin || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

    if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Route: /api/rooms-live
    if (req.url === '/api/rooms-live') {
        const stats = getRoomStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
    }

    // Default 404
    res.writeHead(404);
    res.end('Not Found');
});

// 2. Attach Socket.io to the HTTP server
export const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"]
    }
});

setupGameLogic(io);

// 3. Listen on port 3001
server.listen(3001, () => {});
