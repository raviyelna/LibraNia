import 'dotenv/config';
import express from 'express';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
export async function startServer(port = process.env.LIBRANIA_PORT ? parseInt(process.env.LIBRANIA_PORT) : 3000, distPath) {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });
    try {
        const { default: apiRoutes } = await import('./api/routes.js');
        const { setupSocketHandlers } = await import('./websocket/socket.handlers.js');
        app.use(apiRoutes);
        const server = http.createServer(app);
        const io = new SocketIOServer(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || '*',
                methods: ['GET', 'POST']
            }
        });
        setupSocketHandlers(io);
        app.use(express.static(path.join(__dirname, '../dist')));
        app.use((req, res, next) => {
            if (req.method === 'GET' && !req.path.startsWith('/api')) {
                res.sendFile(path.join(__dirname, '../dist/index.html'));
            }
            else {
                next();
            }
        });
        return new Promise((resolve, reject) => {
            const maxRetries = 5;
            let attempt = 0;
            const tryPort = (portToTry) => {
                server.listen(portToTry, () => {
                    if (portToTry !== port) {
                        console.log(`Port ${port} was in use, started on http://localhost:${portToTry}`);
                    }
                    else {
                        console.log(`Web server started on http://localhost:${portToTry}`);
                    }
                    resolve({ server, io, port: portToTry });
                });
                server.once('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        attempt++;
                        if (attempt < maxRetries) {
                            const nextPort = port + attempt;
                            console.log(`Port ${portToTry} in use, trying ${nextPort}...`);
                            server.removeAllListeners('error');
                            tryPort(nextPort);
                        }
                        else {
                            reject(new Error(`Could not find available port after ${maxRetries} attempts. Last tried: ${portToTry}`));
                        }
                    }
                    else {
                        reject(error);
                    }
                });
            };
            tryPort(port);
        });
    }
    catch (error) {
        console.warn('Running in minimal mode - API routes unavailable (electron dependencies not loaded)');
        console.error('Error loading API routes:', error.message);
        console.error('Stack:', error.stack);
        const server = http.createServer(app);
        const io = new SocketIOServer(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || '*',
                methods: ['GET', 'POST']
            }
        });
        app.use(express.static(distPath));
        app.use((req, res, next) => {
            if (req.method === 'GET' && !req.path.startsWith('/api')) {
                res.sendFile(path.join(distPath, 'index.html'));
            }
            else {
                next();
            }
        });
        return new Promise((resolve, reject) => {
            const maxRetries = 5;
            let attempt = 0;
            const tryPort = (portToTry) => {
                server.listen(portToTry, () => {
                    if (portToTry !== port) {
                        console.log(`Port ${port} was in use, started on http://localhost:${portToTry}`);
                    }
                    else {
                        console.log(`Web server started on http://localhost:${portToTry}`);
                    }
                    resolve({ server, io, port: portToTry });
                });
                server.once('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        attempt++;
                        if (attempt < maxRetries) {
                            const nextPort = port + attempt;
                            console.log(`Port ${portToTry} in use, trying ${nextPort}...`);
                            server.removeAllListeners('error');
                            tryPort(nextPort);
                        }
                        else {
                            reject(new Error(`Could not find available port after ${maxRetries} attempts. Last tried: ${portToTry}`));
                        }
                    }
                    else {
                        reject(error);
                    }
                });
            };
            tryPort(port);
        });
    }
}
export function stopServer(instance) {
    return new Promise((resolve, reject) => {
        instance.server.close((err) => {
            if (err) {
                reject(err);
            }
            else {
                console.log('Web server stopped');
                resolve();
            }
        });
    });
}
