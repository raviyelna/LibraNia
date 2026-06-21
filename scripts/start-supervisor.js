import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer, stopServer } from '../dist/backend/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const logsDir = path.join(root, 'test-logs');
const mcpDir = path.join(root, 'mcp-server');
const mcpLogPath = path.join(logsDir, 'mcp-server.log');
const defaultPort = 3001;
const webPort = process.env.LIBRANIA_PORT ? parseInt(process.env.LIBRANIA_PORT, 10) : defaultPort;

let mcpProcess = null;
let serverInstance = null;
let shuttingDown = false;

function startMcpServer() {
  fs.mkdirSync(logsDir, { recursive: true });
  const logStream = fs.createWriteStream(mcpLogPath, { flags: 'a' });
  mcpProcess = spawn(process.execPath, ['bin/librania-mcp.cjs'], {
    cwd: mcpDir,
    env: {
      ...process.env,
      LIBRANIA_DATA_DIR: dataDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  mcpProcess.stdout.pipe(logStream);
  mcpProcess.stderr.pipe(logStream);
  mcpProcess.once('exit', (code, signal) => {
    if (!shuttingDown) {
      console.warn(`MCP server stopped unexpectedly (${signal || code}). See test-logs\\mcp-server.log`);
    }
  });

  console.log(`MCP server started. Logs: ${path.relative(root, mcpLogPath)}`);
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\nShutting down LibraNia...');

  const timeout = setTimeout(() => {
    console.warn('Shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, 5000);

  try {
    if (mcpProcess && !mcpProcess.killed) {
      mcpProcess.kill('SIGTERM');
    }
    if (serverInstance) {
      await stopServer(serverInstance);
    }
    clearTimeout(timeout);
    console.log('LibraNia stopped');
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error during shutdown:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));

try {
  process.env.LIBRANIA_DATA_DIR = dataDir;
  startMcpServer();
  serverInstance = await startServer(webPort, path.join(root, 'dist'));
  console.log(`\nLibraNia server running at http://localhost:${serverInstance.port}`);
  console.log('Press Ctrl+C once to stop\n');
} catch (error) {
  console.error('Failed to start LibraNia:', error instanceof Error ? error.message : error);
  await shutdown(1);
}
