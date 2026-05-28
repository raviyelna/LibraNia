/**
 * Standalone HTTP API server for testing
 * Run: npx tsx test-http-server.ts
 */

import express from 'express';
import apiRoutes from './electron/api/routes';
import { initDatabase } from './electron/database/connection';

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function start() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`\n✅ HTTP API Server running on http://localhost:${PORT}`);
      console.log(`\nAvailable endpoints:`);
      console.log(`  GET  /health`);
      console.log(`  GET  /api/providers`);
      console.log(`  POST /api/providers`);
      console.log(`  GET  /api/conversations`);
      console.log(`  POST /api/conversations`);
      console.log(`  POST /api/chat`);
      console.log(`\nSee HTTP-API.md for full documentation\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

