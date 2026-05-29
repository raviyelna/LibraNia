# Phase 3: CLI & Server Launcher - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 2 new files
**Analogs found:** 2 / 2

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `bin/librania.js` | CLI entry point | request-response | `start-server.js` | exact |
| `package.json` | config | — | `package.json` (existing) | exact |

## Pattern Assignments

### `bin/librania.js` (CLI entry point, request-response)

**Analog:** `start-server.js` (lines 1-36)

**Shebang and imports pattern** (lines 1-9):
```javascript
#!/usr/bin/env node
/**
 * Standalone server starter for testing web version
 * Usage: npx tsx start-server.js
 */

import { startServer } from './electron/server.ts';
import path from 'path';
import { fileURLToPath } from 'url';
```

**ES module path resolution pattern** (lines 11-14):
```javascript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, 'dist');
```

**Server startup pattern** (lines 21-29):
```javascript
startServer(port, distPath)
  .then(({ port: actualPort }) => {
    console.log(`\n✓ Server running at http://localhost:${actualPort}`);
    console.log('\nPress Ctrl+C to stop\n');
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
```

**Graceful shutdown pattern** (lines 32-35):
```javascript
// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});
```

**Key differences for new CLI:**
- Add commander.js for argument parsing (--port, --no-browser, --data-dir)
- Add `open` package call after server starts (unless --no-browser)
- Extend port retry from 1 to 5 attempts
- Add environment variable setting from CLI flags
- Add Socket.IO cleanup in shutdown handler

---

### `electron/server.ts` (server module, request-response) - MODIFY

**Analog:** `electron/server.ts` (lines 68-87)

**Current port retry pattern** (lines 74-86):
```typescript
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use, trying ${port + 1}`);
    // Try next port
    const nextPort = port + 1;
    server.listen(nextPort, () => {
      console.log(`Web server started on http://localhost:${nextPort}`);
      resolve({ server, io, port: nextPort });
    });
  } else {
    reject(error);
  }
});
```

**Pattern to extend:** Convert single retry to loop with 5 attempts (see RESEARCH.md lines 485-512 for extended pattern)

---

### `package.json` (config) - MODIFY

**Analog:** `package.json` (existing)

**Current structure** (lines 1-14):
```json
{
  "name": "librania",
  "version": "0.1.0",
  "description": "AI-Powered Knowledge Management with Multi-Model Verification",
  "main": "dist-electron/main.js",
  "author": "LibraNia Team",
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview",
    "rebuild": "electron-rebuild",
    "test": "vitest",
    "test:api": "tsx test-api.ts"
  }
}
```

**Pattern to add:**
```json
{
  "bin": {
    "librania": "./bin/librania.js"
  }
}
```

**Dependencies to add:**
```json
{
  "dependencies": {
    "commander": "^14.0.3",
    "open": "^11.0.0"
  }
}
```

---

## Shared Patterns

### Environment Variable Precedence
**Source:** `electron/database/connection.ts` (lines 17-30)
**Apply to:** CLI flag processing in `bin/librania.js`

```typescript
/**
 * Get database path with priority: LIBRANIA_DB_PATH > LIBRANIA_DATA_DIR/librania.db > ./data/librania.db
 * @returns Resolved database path
 */
function getDatabasePath(): string {
  // Priority 1: Explicit database path from environment
  if (process.env.LIBRANIA_DB_PATH) {
    return process.env.LIBRANIA_DB_PATH;
  }

  // Priority 2: Data directory from environment + default filename
  if (process.env.LIBRANIA_DATA_DIR) {
    return path.join(process.env.LIBRANIA_DATA_DIR, 'librania.db');
  }

  // Priority 3: Default to ./data/librania.db in current working directory
  return path.join(process.cwd(), 'data', 'librania.db');
}
```

**Pattern:** CLI flags should SET environment variables, server reads environment variables. This maintains precedence: flag > env var > default.

### Server Instance Management
**Source:** `electron/server.ts` (lines 9-13, 68-87)
**Apply to:** CLI shutdown handler

```typescript
export interface ServerInstance {
  server: http.Server;
  io: SocketIOServer;
  port: number;
}
```

**Pattern:** `startServer()` returns Promise<ServerInstance> with server, io, and port. CLI must store this to properly close both HTTP server and Socket.IO on shutdown.

### Error Handling with Exit Codes
**Source:** `start-server.js` (lines 26-29)
**Apply to:** All CLI error paths

```javascript
.catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
```

**Pattern:** Log error to stderr, exit with code 1 for failures. Success exits with code 0.

### Import Pattern for ES Modules
**Source:** `start-server.js` (lines 7-9, 11-12)
**Apply to:** All path resolution in CLI

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

**Pattern:** ES modules don't have `__dirname`, must use `import.meta.url` with `fileURLToPath()` to resolve paths relative to script location.

### Express Router Pattern
**Source:** `electron/api/routes.ts` (lines 22-28)
**Apply to:** Understanding server structure (no changes needed)

```typescript
const router = Router();

// Middleware
router.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});
```

**Pattern:** Server already has Express router setup with logging middleware. CLI just needs to call `startServer()`.

---

## No Analog Found

No files without analogs — all patterns exist in codebase.

---

## New Patterns from RESEARCH.md

### Commander.js CLI Structure
**Source:** RESEARCH.md (lines 175-217)
**Apply to:** `bin/librania.js`

```javascript
import { Command } from 'commander';

const program = new Command();

program
  .name('librania')
  .description('LibraNia - AI-Powered Knowledge Management')
  .version('0.1.0');

program
  .command('start')
  .description('Start the LibraNia server')
  .option('-p, --port <number>', 'port to run server on', '3000')
  .option('--no-browser', 'do not open browser automatically')
  .option('-d, --data-dir <path>', 'data directory path')
  .action(async (options) => {
    const port = parseInt(options.port);
    
    // Set environment variables from CLI flags
    if (options.dataDir) {
      process.env.LIBRANIA_DATA_DIR = options.dataDir;
    }
    
    // Start server
    const { port: actualPort } = await startServer(port, './dist');
    console.log(`✓ Server running at http://localhost:${actualPort}`);
    
    // Open browser unless --no-browser flag
    if (options.browser !== false) {
      try {
        await open(`http://localhost:${actualPort}`);
      } catch (error) {
        console.warn('Could not open browser automatically:', error.message);
      }
    }
  });

program.parse();
```

### Browser Launch with Error Handling
**Source:** RESEARCH.md (lines 386-408)
**Apply to:** `bin/librania.js` after server starts

```javascript
import open from 'open';

try {
  const { port: actualPort } = await startServer(port, distPath);
  console.log(`✓ Server running at http://localhost:${actualPort}`);
  
  await open(`http://localhost:${actualPort}`);
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
```

**Pattern:** Call `open()` after server Promise resolves. Catch errors and log warning but continue running (non-blocking).

### Enhanced Graceful Shutdown
**Source:** RESEARCH.md (lines 445-479)
**Apply to:** `bin/librania.js` signal handlers

```javascript
let serverInstance = null;

async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  
  if (!serverInstance) {
    process.exit(0);
    return;
  }
  
  // Disconnect all Socket.IO clients
  const sockets = await serverInstance.io.fetchSockets();
  sockets.forEach(socket => socket.disconnect(true));
  
  // Close Socket.IO server
  serverInstance.io.close();
  
  // Close HTTP server
  serverInstance.server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
```

**Pattern:** Store server instance, disconnect Socket.IO clients, close servers, add timeout fallback.

### Port Retry with Extended Attempts
**Source:** RESEARCH.md (lines 485-512)
**Apply to:** Modify `electron/server.ts` port conflict handling

```javascript
async function startServerWithRetry(port, distPath, maxRetries = 5) {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const tryPort = port + attempt;
    
    try {
      const instance = await startServer(tryPort, distPath);
      if (attempt > 0) {
        console.log(`Started on port ${tryPort} (default ${port} was busy)`);
      }
      return instance;
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        lastError = error;
        if (attempt < maxRetries - 1) {
          console.log(`Port ${tryPort} in use, trying ${tryPort + 1}...`);
          continue;
        }
      } else {
        throw error; // Non-port-conflict error, fail immediately
      }
    }
  }
  
  throw new Error(`Could not find available port after ${maxRetries} attempts. Last tried: ${port + maxRetries - 1}`);
}
```

**Pattern:** Loop through 5 port attempts, only retry on EADDRINUSE, fail immediately on other errors.

---

## Metadata

**Analog search scope:** 
- Root directory (start-server.js, package.json)
- electron/ directory (server.ts, database/connection.ts, api/routes.ts)
- RESEARCH.md patterns

**Files scanned:** 6 existing files
**Pattern extraction date:** 2026-05-29

**Key insights:**
- `start-server.js` is nearly identical to target CLI structure, just needs commander.js and open package
- Server already has port conflict handling, just needs extension from 1 to 5 retries
- Environment variable precedence pattern well-established in database/connection.ts
- ES module path resolution pattern consistent across codebase
- Socket.IO cleanup pattern available in RESEARCH.md, not yet in codebase
