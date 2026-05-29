#!/usr/bin/env tsx
import { startServer } from './electron/server.js';
import { initDatabase } from './electron/database/connection.js';
import { initFileStorage } from './electron/services/file-storage.service.js';
import path from 'path';

const port = process.env.LIBRANIA_PORT ? parseInt(process.env.LIBRANIA_PORT) : 3000;
const distPath = 'dist';

// Determine data directory
const dataDir = process.env.LIBRANIA_DATA_DIR || path.join(process.cwd(), 'data');

console.log('Starting LibraNia web server...');
console.log('Data directory:', dataDir);
console.log('Initializing database...');

// Initialize database and file storage
initDatabase();
initFileStorage(dataDir);

console.log('Starting HTTP server...');
startServer(port, distPath)
  .then(({ port }) => {
    console.log(`✓ Server running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop');
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
