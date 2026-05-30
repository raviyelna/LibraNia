import 'dotenv/config';
import express from 'express';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/connection.js';
import { initFileStorage } from './services/file-storage.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerInstance {
  server: http.Server;
  io: SocketIOServer;
  port: number;
}

export async function startServer(
  port: number = process.env.LIBRANIA_PORT ? parseInt(process.env.LIBRANIA_PORT) : 3000,
  distPath: string
): Promise<ServerInstance> {
  const app = express();

  // Initialize database and file storage
  const dataDir = process.env.LIBRANIA_DATA_DIR || path.join(process.cwd(), 'data');
  await initDatabase();
  initFileStorage(dataDir);
  console.log('[Init] Database and file storage initialized');

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS for web version
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Load API routes and WebSocket handlers
  try {
    console.log('[DEBUG] Loading API routes...');
    const { default: apiRoutes } = await import('./api/routes.js');
    console.log('[DEBUG] Loading WebSocket handlers...');
    const { setupSocketHandlers } = await import('./websocket/socket.handlers.js');
    console.log('[DEBUG] Modules loaded successfully');

    // API routes
    app.use(apiRoutes);

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO with CORS configuration
    const io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    // Setup WebSocket handlers
    setupSocketHandlers(io);

    // Serve uploaded content files
    app.use('/content', express.static(path.join(process.cwd(), 'content')));

    // Serve static files from dist directory
    app.use(express.static(distPath));

    // SPA routing: catch-all route returns index.html
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        next();
      }
    });

    // Start server with port retry logic (up to 5 attempts)
    return new Promise((resolve, reject) => {
      const maxRetries = 5;
      let attempt = 0;

      const tryPort = (portToTry: number) => {
        server.listen(portToTry, () => {
          if (portToTry !== port) {
            console.log(`Port ${port} was in use, started on http://localhost:${portToTry}`);
          } else {
            console.log(`Web server started on http://localhost:${portToTry}`);
          }
          resolve({ server, io, port: portToTry });
        });

        server.once('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            attempt++;
            if (attempt < maxRetries) {
              const nextPort = port + attempt;
              console.log(`Port ${portToTry} in use, trying ${nextPort}...`);
              server.removeAllListeners('error');
              tryPort(nextPort);
            } else {
              reject(new Error(`Could not find available port after ${maxRetries} attempts. Last tried: ${portToTry}`));
            }
          } else {
            reject(error);
          }
        });
      };

      tryPort(port);
    });
  } catch (error) {
    // Failed to load API routes or WebSocket handlers
    console.error('[ERROR] Failed to load API routes:', error);
    console.error('[ERROR] Stack:', error instanceof Error ? error.stack : String(error));
    console.warn('Running in minimal mode - API routes unavailable');

    const server = http.createServer(app);
    const io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    // Serve static files from dist directory
    app.use(express.static(distPath));

    // SPA routing: catch-all route returns index.html
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        next();
      }
    });

    // Start server with port retry logic (up to 5 attempts)
    return new Promise((resolve, reject) => {
      const maxRetries = 5;
      let attempt = 0;

      const tryPort = (portToTry: number) => {
        server.listen(portToTry, () => {
          if (portToTry !== port) {
            console.log(`Port ${port} was in use, started on http://localhost:${portToTry}`);
          } else {
            console.log(`Web server started on http://localhost:${portToTry}`);
          }
          resolve({ server, io, port: portToTry });
        });

        server.once('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            attempt++;
            if (attempt < maxRetries) {
              const nextPort = port + attempt;
              console.log(`Port ${portToTry} in use, trying ${nextPort}...`);
              server.removeAllListeners('error');
              tryPort(nextPort);
            } else {
              reject(new Error(`Could not find available port after ${maxRetries} attempts. Last tried: ${portToTry}`));
            }
          } else {
            reject(error);
          }
        });
      };

      tryPort(port);
    });
  }
}

export function stopServer(instance: ServerInstance): Promise<void> {
  return new Promise((resolve, reject) => {
    instance.server.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Web server stopped');
        resolve();
      }
    });
  });
}
