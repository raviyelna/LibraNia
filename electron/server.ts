import express from 'express';
import path from 'path';
import http from 'http';
import apiRoutes from './api/routes';

export interface ServerInstance {
  server: http.Server;
  port: number;
}

export async function startServer(
  port: number = 3000,
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
  app.use(express.static(distPath));

  // SPA routing: catch-all route returns index.html
  app.use((_req, res) => {
    const indexPath = path.resolve(distPath, 'index.html');
    res.sendFile(indexPath);
  });

  // Start server
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Web server started on http://localhost:${port}`);
      resolve({ server, port });
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use, trying ${port + 1}`);
        // Try next port
        const nextPort = port + 1;
        app.listen(nextPort, () => {
          console.log(`Web server started on http://localhost:${nextPort}`);
          resolve({ server, port: nextPort });
        });
      } else {
        reject(error);
      }
    });
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
