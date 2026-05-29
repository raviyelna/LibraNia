import 'dotenv/config';
import express from 'express';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import apiRoutes from './api/routes';
import { setupSocketHandlers } from './websocket/socket.handlers';

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

  // API routes
  app.use(apiRoutes);

  // Serve static files from dist directory
  app.use(express.static(path.join(__dirname, '../dist')));

  // SPA routing: catch-all route returns index.html
  // Use a function-based route to avoid path-to-regexp issues with wildcards
  app.use((req, res, next) => {
    // Only handle GET requests that don't start with /api
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    } else {
      next();
    }
  });

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
            // Remove the error listener before trying next port
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
