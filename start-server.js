#!/usr/bin/env node
/**
 * Standalone server starter for testing web version
 * Usage: npx tsx start-server.js
 */

import { startServer } from './electron/server.ts';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, 'dist');
const port = process.env.PORT || 3000;

console.log('Starting LibraNia web server...');
console.log(`Serving frontend from: ${distPath}`);
console.log(`Port: ${port}`);

startServer(port, distPath)
  .then(({ port: actualPort }) => {
    console.log(`\n✓ Server running at http://localhost:${actualPort}`);
    console.log('\nPress Ctrl+C to stop\n');
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});
