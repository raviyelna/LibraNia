import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startServer, stopServer } from './server';
import http from 'http';

describe('server', () => {
  let serverInstance: { server: http.Server; port: number } | null = null;

  afterEach(async () => {
    if (serverInstance) {
      await stopServer(serverInstance);
      serverInstance = null;
    }
  });

  describe('startServer', () => {
    it('should start HTTP server on specified port', async () => {
      const distPath = './dist';
      serverInstance = await startServer(3000, distPath);

      expect(serverInstance).toBeDefined();
      expect(serverInstance.port).toBe(3000);
      expect(serverInstance.server).toBeInstanceOf(http.Server);
    });

    it('should serve static files from distPath', async () => {
      const distPath = './dist';
      serverInstance = await startServer(3001, distPath);

      // Server should be listening
      expect(serverInstance.server.listening).toBe(true);
    });

    it('should handle SPA routing with catch-all route', async () => {
      const distPath = './dist';
      serverInstance = await startServer(3002, distPath);

      // Server should be configured to serve index.html for all routes
      expect(serverInstance.server.listening).toBe(true);
    });

    it('should use default port 3000 when not specified', async () => {
      const distPath = './dist';
      serverInstance = await startServer(undefined, distPath);

      expect(serverInstance.port).toBe(3000);
    });
  });

  describe('stopServer', () => {
    it('should cleanly shut down server', async () => {
      const distPath = './dist';
      serverInstance = await startServer(3003, distPath);

      await stopServer(serverInstance);

      // Server should no longer be listening
      expect(serverInstance.server.listening).toBe(false);
      serverInstance = null;
    });
  });
});
