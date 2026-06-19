#!/usr/bin/env node
import { startServer } from './dist/backend/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3001;
const distPath = path.join(__dirname, 'dist');

console.log('Starting LibraNia server...');

startServer(port, distPath)
  .then((instance) => {
    console.log(`\nLibraNia server running at http://localhost:${instance.port}`);
    console.log('Press Ctrl+C to stop\n');
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
