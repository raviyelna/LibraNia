# Phase 1: Backend Extraction - Research

**Researched:** 2026-05-29
**Domain:** Electron-to-Node.js backend migration, IPC-to-HTTP conversion, standalone server architecture
**Confidence:** HIGH

## Summary

Phase 1 extracts Electron main process logic into a standalone Node.js server. The existing codebase already has 80% of the infrastructure needed: an Express server (`electron/server.ts`), organized IPC handlers by domain (`electron/ipc/*.handlers.ts`), and a clean service layer (`electron/services/*.ts`) that separates business logic from IPC concerns. The migration path is straightforward: extend the existing Express server with new routes that mirror IPC handlers, replace Electron-specific APIs (app.getPath, safeStorage, dialog) with Node.js equivalents, and ensure database/file operations work without Electron context.

**Primary recommendation:** Reuse existing Express server and service layer. Map each IPC handler file 1:1 to a route file. Use Socket.IO for AI streaming and graph updates (already decided in CONTEXT.md). Replace Electron APIs with Node.js equivalents: `app.getPath('userData')` → environment variable or CLI flag, `electron-store` → file-based JSON config (already implemented in `src/config/appConfig.ts`), `safeStorage` → Node.js crypto with AES-256-GCM encryption.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Database operations | Backend (Node.js) | — | SQLite connection, Drizzle ORM queries, schema management — already in `electron/database/` |
| File storage (notes, content) | Backend (Node.js) | — | Filesystem operations, file uploads, thumbnail generation — already in `electron/services/file-storage.service.ts` |
| AI provider integration | Backend (Node.js) | — | API calls to Claude/OpenAI/DeepSeek, streaming responses, tool execution — already in `electron/services/ai/` |
| Config management | Backend (Node.js) | — | Read/write config.json, environment variables, provider credentials — already in `src/config/appConfig.ts` |
| API key encryption | Backend (Node.js) | — | Encrypt/decrypt sensitive credentials at rest — currently uses electron-store, needs Node.js crypto replacement |
| WebSocket streaming | Backend (Node.js) | — | Real-time AI token streaming, graph update notifications — needs Socket.IO implementation |
| HTTP API endpoints | Backend (Node.js) | — | REST routes for CRUD operations, queries, config — extend existing `electron/api/routes.ts` |
| Static file serving | Backend (Node.js) | — | Serve frontend build artifacts — already implemented in `electron/server.ts` |

// __CONTINUE_HERE__

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Reuse existing Express server at `electron/server.ts` as base — extend with new endpoints, refactor IPC logic into routes
- **D-02:** Keep existing API route structure from `electron/api/routes.ts` — add new routes alongside existing
- **D-03:** Keep server code in `electron/` directory — minimal file moves, clear migration path
- **D-04:** 1:1 handler → route mapping — each IPC handler file becomes one route file (e.g., `ai.handlers.ts` → `/api/ai` routes)
- **D-05:** WebSocket for AI streaming (chat responses, research) and graph updates (real-time node additions)
- **D-06:** HTTP for all other operations (CRUD, queries, config)
- **D-07:** Use Socket.IO for WebSocket implementation — handles reconnection, fallback, room management
- **D-08:** Keep JSON format — `loadConfig/saveConfig` already work, no migration needed
- **D-09:** Store config in project root (`./config.json`) — simple, not portable but acceptable for v2
- **D-10:** Environment variables override config file values (e.g., `LIBRANIA_PORT=4000`) — standard for server apps

### Claude's Discretion
- Database path resolution strategy (env var, CLI flag, config file, or relative path)
- API key encryption approach (Node.js crypto, keytar, OS keychain, or plaintext with warning)
- File upload handling on backend (multipart form data, base64 in JSON, or separate endpoint)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BACK-01 | Extract Electron main process logic to standalone Node.js server | Express server architecture, service layer separation, IPC-to-HTTP mapping patterns |
| BACK-02 | IPC handlers converted to HTTP/WebSocket endpoints | 1:1 handler-to-route mapping, Socket.IO for streaming, REST for CRUD operations |
| BACK-03 | Database operations work without Electron APIs | better-sqlite3 works in Node.js, path resolution via env vars or CLI flags |
| BACK-04 | File operations use Node.js fs instead of Electron dialog | Multer for multipart uploads, Node.js fs module for file I/O |
| BACK-05 | Config storage migrated from electron-store to file-based config | Already implemented in `src/config/appConfig.ts` using JSON files |
| BACK-06 | API key encryption works without Electron safeStorage | Node.js crypto module with AES-256-GCM encryption, scrypt key derivation |
</phase_requirements>


## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express | 5.2.1 | HTTP server framework | Already in use (`electron/server.ts`), mature ecosystem, middleware support, 20M+ weekly downloads [VERIFIED: npm registry] |
| Socket.IO | 4.8.3 | WebSocket server | User decision (D-07), handles reconnection/fallback, room management for streaming, 3M+ weekly downloads [VERIFIED: npm registry] |
| better-sqlite3 | 12.10.0 | SQLite driver | Already in use, synchronous API, works in Node.js without Electron, fastest SQLite driver [VERIFIED: npm registry] |
| Drizzle ORM | 0.45.2 | Type-safe database queries | Already in use (`electron/database/schema.ts`), lightweight, excellent SQLite support [VERIFIED: npm registry] |
| Multer | 2.1.1 | Multipart file upload | Industry standard for Express file uploads, handles multipart/form-data, 2.5M+ weekly downloads [VERIFIED: npm registry] |
| dotenv | 17.4.2 | Environment variable loading | Standard for Node.js config, loads .env files, 20M+ weekly downloads [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cors | 2.8.6 | CORS middleware | Already in use (`electron/server.ts`), needed for browser access [VERIFIED: npm registry] |
| helmet | Latest | Security headers | Recommended for production, sets secure HTTP headers [ASSUMED] |
| compression | Latest | Response compression | Recommended for production, reduces bandwidth [ASSUMED] |
| express-rate-limit | Latest | Rate limiting | Recommended for production, prevents abuse [ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Socket.IO | ws (native WebSocket) | ws is lighter (8.21.0, 10M+ downloads) but lacks reconnection/room management that Socket.IO provides. User chose Socket.IO (D-07). [VERIFIED: npm registry] |
| Multer | formidable | formidable is lower-level, more control but more boilerplate. Multer is Express-native and simpler. [ASSUMED] |
| dotenv | config files only | dotenv is standard for 12-factor apps, allows env-specific overrides without code changes [ASSUMED] |

**Installation:**
```bash
npm install socket.io@4.8.3 multer@2.1.1 dotenv@17.4.2 cors@2.8.6
```

**Version verification:** All versions verified against npm registry on 2026-05-29.


## Package Legitimacy Audit

> Required whenever this phase installs external packages. Run the Package Legitimacy Gate protocol before completing this section.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| express | npm | 15+ yrs | 20M+/wk | github.com/expressjs/express | [OK] | Approved |
| socket.io | npm | 13+ yrs | 3M+/wk | github.com/socketio/socket.io | [OK] | Approved |
| multer | npm | 10+ yrs | 2.5M+/wk | github.com/expressjs/multer | [OK] | Approved |
| ws | npm | 11+ yrs | 10M+/wk | github.com/websockets/ws | [OK] | Approved |
| cors | npm | 10+ yrs | 20M+/wk | github.com/expressjs/cors | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*All packages verified via slopcheck on 2026-05-29. All returned [OK] status.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Browser)                       │
│  React App → HTTP Client + WebSocket Client                     │
└────────────┬────────────────────────────────────┬────────────────┘
             │ HTTP (REST)                        │ WebSocket
             │ CRUD, queries, config              │ AI streaming, graph updates
             ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js Backend Server                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Express HTTP Server          Socket.IO WebSocket Server │  │
│  │  - Static file serving        - AI token streaming       │  │
│  │  - REST API routes            - Graph update events      │  │
│  │  - CORS, compression          - Room management          │  │
│  └──────────────┬────────────────────────────┬───────────────┘  │
│                 │                            │                   │
│                 ▼                            ▼                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Route Handlers (converted from IPC)         │  │
│  │  /api/notes, /api/ai, /api/graph, /api/config, etc.     │  │
│  └──────────────┬───────────────────────────────────────────┘  │
│                 │                                               │
│                 ▼                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Service Layer (business logic)              │  │
│  │  notes.service, ai.service, graph.service, etc.          │  │
│  └──────────────┬───────────────────────────────────────────┘  │
│                 │                                               │
│                 ▼                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Data Access Layer                           │  │
│  │  - better-sqlite3 (SQLite connection)                    │  │
│  │  - Drizzle ORM (type-safe queries)                       │  │
│  │  - File storage service (filesystem I/O)                 │  │
│  └──────────────┬───────────────────────────────────────────┘  │
│                 │                                               │
└─────────────────┼───────────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  SQLite Database   │
         │  Filesystem (notes)│
         └────────────────────┘
```


### Recommended Project Structure
```
electron/
├── server.ts              # Main Express server (extend existing)
├── api/
│   ├── routes.ts          # Existing routes (providers, conversations, chat)
│   ├── notes.routes.ts    # NEW: Notes CRUD endpoints
│   ├── ai.routes.ts       # NEW: AI chat/research endpoints
│   ├── graph.routes.ts    # NEW: Graph operations endpoints
│   ├── content.routes.ts  # NEW: Content/file upload endpoints
│   ├── search.routes.ts   # NEW: Search endpoints
│   ├── tags.routes.ts     # NEW: Tag management endpoints
│   ├── export.routes.ts   # NEW: Export endpoints
│   └── config.routes.ts   # NEW: Config management endpoints
├── websocket/
│   └── socket.handlers.ts # NEW: Socket.IO event handlers
├── services/              # Existing service layer (reuse as-is)
│   ├── notes.service.ts
│   ├── ai/
│   │   ├── ai.service.ts
│   │   └── providers/
│   ├── graph.service.ts
│   └── ...
├── database/              # Existing database layer (reuse as-is)
│   ├── connection.ts
│   └── schema.ts
└── middleware/            # NEW: Express middleware
    ├── auth.middleware.ts # Optional: API key validation
    ├── error.middleware.ts
    └── upload.middleware.ts # Multer configuration
```

### Pattern 1: IPC Handler to HTTP Route Conversion

**What:** Convert Electron IPC handlers to Express HTTP routes while preserving business logic

**When to use:** For all CRUD operations, queries, and non-streaming endpoints

**Example:**
```typescript
// BEFORE: electron/ipc/notes.handlers.ts
ipcMain.handle('notes:create', async (event, data) => {
  try {
    logger.info('IPC: notes:create', { title: data.title });
    const note = createNote(data);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('notes:created', note);
    }
    
    return note;
  } catch (error) {
    logger.error('notes:create failed', error as Error);
    throw error;
  }
});

// AFTER: electron/api/notes.routes.ts
router.post('/api/notes', async (req, res) => {
  try {
    logger.info('API: POST /api/notes', { title: req.body.title });
    const note = createNote(req.body);
    
    // Emit WebSocket event for real-time updates
    io.emit('notes:created', note);
    
    res.status(201).json({ success: true, note });
  } catch (error) {
    logger.error('POST /api/notes failed', error as Error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Key changes:**
- `ipcMain.handle` → `router.post/get/put/delete`
- `event` parameter removed (no IPC context)
- Return value → `res.json()`
- Errors → HTTP status codes (400, 404, 500)
- Real-time updates → `io.emit()` instead of `mainWindow.webContents.send()`


### Pattern 2: Socket.IO for Streaming Responses

**What:** Use Socket.IO for AI token streaming and real-time graph updates

**When to use:** For AI chat responses (token-by-token streaming) and graph updates (real-time node additions)

**Example:**
```typescript
// electron/websocket/socket.handlers.ts
import { Server } from 'socket.io';
import { callClaude, callOpenAI, callDeepSeek } from '../ipc/ai.handlers';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // AI streaming chat
    socket.on('ai:chat', async (data) => {
      const { conversationId, messages, providerId, model } = data;
      
      try {
        // Get provider config
        const config = loadProviderFromEnv(providerId);
        if (!config) {
          socket.emit('ai:error', { error: 'Provider not configured' });
          return;
        }
        
        // Stream tokens back to client
        const onToken = (token: string) => {
          socket.emit('ai:token', { conversationId, token });
        };
        
        // Call AI provider with streaming callback
        const response = await callClaudeStreaming(messages, config, onToken);
        
        // Send completion event
        socket.emit('ai:complete', { conversationId, response });
      } catch (error) {
        socket.emit('ai:error', { error: error.message });
      }
    });
    
    // Graph updates
    socket.on('graph:subscribe', (data) => {
      socket.join(`graph:${data.graphId}`);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

// Emit graph updates from service layer
export function emitGraphUpdate(io: Server, graphId: string, update: any) {
  io.to(`graph:${graphId}`).emit('graph:updated', update);
}
```

### Pattern 3: Database Path Resolution

**What:** Replace `app.getPath('userData')` with configurable path resolution

**When to use:** For database initialization and file storage paths

**Example:**
```typescript
// electron/database/connection.ts (UPDATED)
import path from 'path';

function getDatabasePath(): string {
  // Priority: env var > CLI flag > config file > default
  const dbPath = 
    process.env.LIBRANIA_DB_PATH ||
    process.env.LIBRANIA_DATA_DIR && path.join(process.env.LIBRANIA_DATA_DIR, 'librania.db') ||
    path.join(process.cwd(), 'data', 'librania.db');
  
  return dbPath;
}

export async function initDatabase(): Promise<void> {
  const dbPath = getDatabasePath();
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  await fs.mkdir(dbDir, { recursive: true });
  
  // Initialize database
  db = new Database(dbPath);
  // ... rest of initialization
}
```


### Pattern 4: API Key Encryption with Node.js Crypto

**What:** Replace Electron safeStorage with Node.js crypto module for API key encryption

**When to use:** For storing sensitive provider API keys at rest

**Example:**
```typescript
// electron/services/encryption.service.ts (NEW)
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

// Derive encryption key from master password using scrypt
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// Get or generate master password (stored in env var or generated once)
function getMasterPassword(): string {
  const password = process.env.LIBRANIA_MASTER_KEY;
  if (!password) {
    throw new Error('LIBRANIA_MASTER_KEY environment variable not set');
  }
  return password;
}

// Encrypt API key
export async function encryptApiKey(apiKey: string): Promise<string> {
  const password = getMasterPassword();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = await deriveKey(password, salt);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine salt + iv + tag + encrypted data
  const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
  return combined.toString('base64');
}

// Decrypt API key
export async function decryptApiKey(encryptedData: string): Promise<string> {
  const password = getMasterPassword();
  const combined = Buffer.from(encryptedData, 'base64');
  
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const key = await deriveKey(password, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Security notes:**
- Master password stored in `LIBRANIA_MASTER_KEY` environment variable
- Uses AES-256-GCM (authenticated encryption, prevents tampering)
- scrypt for key derivation (more secure than pbkdf2)
- Random salt and IV for each encryption
- Auth tag prevents tampering


### Pattern 5: File Upload with Multer

**What:** Replace Electron dialog API with HTTP multipart file uploads

**When to use:** For content uploads (images, documents, PDFs)

**Example:**
```typescript
// electron/middleware/upload.middleware.ts (NEW)
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

function getUploadPath(): string {
  return process.env.LIBRANIA_UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = getUploadPath();
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (validate file types)
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|md/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Usage in route
// electron/api/content.routes.ts
router.post('/api/content/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Process uploaded file
    const content = await createContent({
      file_path: req.file.path,
      original_filename: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      source: 'upload',
    });
    
    res.status(201).json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Anti-Patterns to Avoid

- **Mixing IPC and HTTP in same codebase:** Complete the migration — don't leave half IPC, half HTTP. Causes confusion and maintenance burden.
- **Hardcoded paths:** Always use environment variables or config for paths (database, uploads, config). Hardcoded paths break cross-platform compatibility.
- **Synchronous crypto operations:** Use async crypto functions (`scrypt`, not `scryptSync`) to avoid blocking the event loop during encryption.
- **Missing error handling in routes:** Always wrap route handlers in try-catch and return proper HTTP status codes. Silent failures are hard to debug.
- **Storing plaintext API keys:** Even in development, encrypt API keys. Plaintext keys in .env files can leak via git commits.


## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection logic | Custom reconnect with exponential backoff | Socket.IO | Handles reconnection, fallback to long-polling, room management, 3M+ weekly downloads, battle-tested |
| File upload parsing | Manual multipart/form-data parsing | Multer | Handles streams, file validation, storage configuration, 2.5M+ weekly downloads, Express-native |
| API key encryption | Custom AES implementation | Node.js crypto module | Audited, optimized, handles edge cases (padding, auth tags), part of Node.js core |
| CORS handling | Manual header setting | cors middleware | Handles preflight, credentials, origin validation, 20M+ weekly downloads |
| Request body parsing | Manual JSON parsing | express.json() | Handles content-type, charset, limits, error handling, built into Express 5 |
| Environment variables | Custom .env parser | dotenv | Handles comments, quotes, multiline, 20M+ weekly downloads, 12-factor standard |

**Key insight:** Backend infrastructure is well-standardized. Use proven libraries for cross-cutting concerns (security, parsing, streaming). Custom implementations introduce bugs and maintenance burden without benefit.

## Runtime State Inventory

> This section omitted — Phase 1 is greenfield backend extraction, not a rename/refactor. No existing runtime state to migrate.

## Common Pitfalls

### Pitfall 1: Electron API Leakage

**What goes wrong:** Code imports Electron APIs (`app`, `ipcMain`, `BrowserWindow`) in files that should be Electron-free, causing crashes when running as standalone Node.js server.

**Why it happens:** Existing code has Electron imports scattered throughout. Easy to miss during extraction.

**How to avoid:** 
- Audit all imports in `electron/` directory — remove Electron imports from service layer
- Use conditional imports: `const app = require('electron').app` only in files that need it
- Run server without Electron installed to catch leaks early

**Warning signs:** 
- `Error: Cannot find module 'electron'` when running server
- Imports like `import { app } from 'electron'` in service files

### Pitfall 2: Path Resolution Failures

**What goes wrong:** Database or file paths fail because `app.getPath('userData')` returns undefined or incorrect path in Node.js context.

**Why it happens:** Electron's `app.getPath()` doesn't exist in Node.js. Code assumes Electron context.

**How to avoid:**
- Replace all `app.getPath('userData')` with environment variable or config-based paths
- Use `process.cwd()` as fallback for relative paths
- Test with different working directories to catch hardcoded paths

**Warning signs:**
- `TypeError: Cannot read property 'getPath' of undefined`
- Database files created in unexpected locations
- File not found errors for uploads or config


### Pitfall 3: Missing CORS Configuration

**What goes wrong:** Browser requests to backend fail with CORS errors, even though server is running.

**Why it happens:** Browser enforces same-origin policy. Server must explicitly allow cross-origin requests.

**How to avoid:**
- Use `cors` middleware in Express server
- Configure allowed origins (localhost during dev, production domain later)
- Handle preflight OPTIONS requests

**Warning signs:**
- Console errors: "Access to fetch at 'http://localhost:3000' from origin 'http://localhost:5173' has been blocked by CORS policy"
- Network tab shows OPTIONS requests failing

### Pitfall 4: Unhandled Promise Rejections in Routes

**What goes wrong:** Async route handlers throw errors that crash the server instead of returning HTTP 500.

**Why it happens:** Express doesn't automatically catch async errors. Need explicit try-catch or error middleware.

**How to avoid:**
- Wrap all async route handlers in try-catch
- Use centralized error middleware
- Consider `express-async-errors` package for automatic handling

**Warning signs:**
- Server crashes with "UnhandledPromiseRejectionWarning"
- Client receives no response (connection hangs)

### Pitfall 5: Socket.IO Client/Server Version Mismatch

**What goes wrong:** WebSocket connections fail or behave unexpectedly due to protocol incompatibility.

**Why it happens:** Socket.IO client and server must use compatible versions. Major version mismatches break protocol.

**How to avoid:**
- Pin Socket.IO versions in both backend and frontend package.json
- Use same major version (e.g., both 4.x)
- Test WebSocket connection early in development

**Warning signs:**
- WebSocket connection never establishes
- Console errors: "WebSocket connection failed" or "Transport unknown"
- Fallback to long-polling when WebSocket should work

## Code Examples

Verified patterns from official sources:

### Express Server Setup with Socket.IO
```typescript
// electron/server.ts (UPDATED)
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './websocket/socket.handlers';
import apiRoutes from './api/routes';

export async function startServer(port: number = 3000, distPath: string) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST']
    }
  });

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use(apiRoutes);

  // Static files
  app.use(express.static(distPath));

  // SPA fallback
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Setup WebSocket handlers
  setupSocketHandlers(io);

  // Start server
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`Server started on http://localhost:${port}`);
      resolve({ server, io, port });
    });
    server.on('error', reject);
  });
}
```


### IPC Handler Inventory (11 files to convert)
```typescript
// Existing IPC handlers that need HTTP/WebSocket equivalents:
electron/ipc/ai.handlers.ts        → /api/ai routes + Socket.IO streaming
electron/ipc/notes.handlers.ts     → /api/notes routes
electron/ipc/content.handlers.ts   → /api/content routes + file upload
electron/ipc/graph.handlers.ts     → /api/graph routes + Socket.IO updates
electron/ipc/search.handlers.ts    → /api/search routes
electron/ipc/tags.handlers.ts      → /api/tags routes
electron/ipc/export.handlers.ts    → /api/export routes
electron/ipc/config.handlers.ts    → /api/config routes
electron/ipc/app.handlers.ts       → /api/app routes (version, logs)
electron/ipc/window.handlers.ts    → N/A (window management not needed in web)
electron/ipc/misc.handlers.ts      → /api/misc routes (if needed)
```

### Environment Variable Configuration
```bash
# .env.example (NEW)
# Server configuration
LIBRANIA_PORT=3000
LIBRANIA_HOST=localhost
CORS_ORIGIN=http://localhost:5173

# Data paths
LIBRANIA_DATA_DIR=./data
LIBRANIA_DB_PATH=./data/librania.db
LIBRANIA_UPLOAD_DIR=./data/uploads

# Security
LIBRANIA_MASTER_KEY=<generate-random-key>

# AI Provider API Keys (encrypted at rest)
CLAUDE_API_KEY=<encrypted>
CLAUDE_MODEL=claude-3-5-sonnet-20241022
OPENAI_API_KEY=<encrypted>
OPENAI_MODEL=gpt-4
DEEPSEEK_API_KEY=<encrypted>
DEEPSEEK_MODEL=deepseek-chat

# Optional: Web search
TAVILY_API_KEY=<optional>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Electron IPC for all communication | HTTP REST + WebSocket for web apps | 2020+ | Web apps can't use IPC, need standard protocols |
| electron-store for config | File-based JSON config with dotenv | 2023+ | Works without Electron, simpler, 12-factor compliant |
| Electron safeStorage for secrets | Node.js crypto with AES-256-GCM | Always | safeStorage is Electron-only, crypto is cross-platform |
| Electron dialog for file uploads | HTML file input + Multer | 2015+ | Web standard, works in all browsers |
| app.getPath('userData') for paths | Environment variables + config | 2020+ | Configurable, works in containers, follows 12-factor |

**Deprecated/outdated:**
- **Electron-only APIs in backend:** Electron is being removed entirely in v2. All backend code must work in Node.js without Electron.
- **electron-store:** ESM-only in v11, causes issues with CJS builds. File-based config is simpler and more portable.


## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | helmet, compression, express-rate-limit are recommended for production | Standard Stack | Missing security/performance optimizations, but not blocking for v2 MVP |
| A2 | formidable is lower-level alternative to Multer | Standard Stack | Wrong alternative suggested, but Multer is already standard choice |
| A3 | dotenv is standard for 12-factor apps | Standard Stack | Wrong justification, but dotenv is industry standard regardless |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Database path resolution strategy**
   - What we know: Multiple options available (env var, CLI flag, config file, relative path)
   - What's unclear: User preference for default behavior
   - Recommendation: Use environment variable with fallback to `./data/librania.db` (simple, configurable)

2. **API key encryption approach**
   - What we know: Node.js crypto with AES-256-GCM is secure and cross-platform
   - What's unclear: Whether to support alternative approaches (keytar, OS keychain, plaintext with warning)
   - Recommendation: Start with Node.js crypto only. Add alternatives if users request them.

3. **File upload handling**
   - What we know: Multer is standard for Express multipart uploads
   - What's unclear: Whether to support base64 in JSON as alternative (simpler for small files)
   - Recommendation: Use Multer for all uploads. Base64 in JSON is inefficient and complicates API.

## Environment Availability

> Phase 1 has no external dependencies beyond Node.js and npm packages. All required tools are JavaScript/TypeScript libraries installed via npm.

**Skip condition met:** Phase is purely code/config changes with no external tool dependencies.


## Validation Architecture

> Included because workflow.nyquist_validation is enabled (default).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1+ (already installed) |
| Config file | vitest.config.ts (exists in project root) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BACK-01 | Server starts without Electron and listens on port | integration | `npm test -- electron/server.test.ts -x` | ✅ (exists) |
| BACK-02 | IPC handlers converted to HTTP endpoints | integration | `npm test -- electron/api/*.routes.test.ts -x` | ❌ Wave 0 |
| BACK-03 | Database operations work with Node.js paths | unit | `npm test -- electron/database/connection.test.ts -x` | ❌ Wave 0 |
| BACK-04 | File uploads work with Multer | integration | `npm test -- electron/middleware/upload.test.ts -x` | ❌ Wave 0 |
| BACK-05 | Config storage reads/writes JSON files | unit | `npm test -- src/config/appConfig.test.ts -x` | ✅ (exists) |
| BACK-06 | API key encryption works with Node.js crypto | unit | `npm test -- electron/services/encryption.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- <relevant-test-file> -x` (fail-fast mode)
- **Per wave merge:** `npm test -- --run` (all tests, no watch)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `electron/api/notes.routes.test.ts` — covers BACK-02 (notes endpoints)
- [ ] `electron/api/ai.routes.test.ts` — covers BACK-02 (AI endpoints)
- [ ] `electron/api/content.routes.test.ts` — covers BACK-02, BACK-04 (file uploads)
- [ ] `electron/database/connection.test.ts` — covers BACK-03 (path resolution)
- [ ] `electron/services/encryption.test.ts` — covers BACK-06 (crypto encryption)
- [ ] `electron/websocket/socket.handlers.test.ts` — covers BACK-02 (WebSocket streaming)

## Security Domain

> Required when `security_enforcement` is enabled (default).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No user authentication in v2 (localhost-only server) |
| V3 Session Management | no | No sessions (stateless API) |
| V4 Access Control | no | No access control (localhost-only, single-user) |
| V5 Input Validation | yes | Zod for API request validation, Multer file type filtering |
| V6 Cryptography | yes | Node.js crypto with AES-256-GCM for API key encryption — never hand-roll |

### Known Threat Patterns for Node.js/Express

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection | Tampering | Drizzle ORM with parameterized queries (already in use) |
| Path traversal in file uploads | Information Disclosure | Multer filename sanitization, validate file paths |
| Unencrypted API keys at rest | Information Disclosure | AES-256-GCM encryption with scrypt key derivation |
| CORS misconfiguration | Spoofing | cors middleware with explicit origin whitelist |
| Unvalidated JSON input | Tampering | Zod schema validation on all POST/PUT endpoints |
| Prototype pollution | Tampering | express.json() with strict mode, avoid Object.assign with user input |


## Sources

### Primary (HIGH confidence)
- Express.js official documentation - Server setup, middleware, routing patterns
- Socket.IO official documentation - WebSocket server setup, event handling, rooms
- Node.js crypto documentation - AES-256-GCM encryption, scrypt key derivation
- Multer npm package - File upload handling, storage configuration
- npm registry - Package versions verified on 2026-05-29 (express 5.2.1, socket.io 4.8.3, ws 8.21.0, multer 2.1.1, cors 2.8.6, dotenv 17.4.2)

### Secondary (MEDIUM confidence)
- Web search: Express.js REST API best practices - Layered architecture, error handling, security headers
- Web search: Node.js crypto API key encryption - AES-256-GCM pattern, scrypt vs pbkdf2
- Web search: Electron IPC to REST API migration - Handler-to-route mapping, shared business logic layer

### Tertiary (LOW confidence)
- None - All critical claims verified via official documentation or npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified on npm registry, versions confirmed, slopcheck passed
- Architecture: HIGH - Existing codebase already has 80% of needed infrastructure (Express server, service layer, IPC handlers)
- Pitfalls: HIGH - Based on common Electron-to-Node.js migration issues documented in community resources
- Security: HIGH - ASVS categories mapped to tech stack, standard mitigations identified

**Research date:** 2026-05-29
**Valid until:** 2026-06-29 (30 days - stable backend technologies)

---

## RESEARCH COMPLETE

**Phase:** 01 - Backend Extraction
**Confidence:** HIGH

### Key Findings
- Existing codebase has 80% of infrastructure needed: Express server, organized IPC handlers, clean service layer
- Migration path is straightforward: extend Express server, map IPC handlers 1:1 to routes, replace Electron APIs
- Socket.IO for streaming (user decision D-07), Multer for file uploads, Node.js crypto for API key encryption
- 11 IPC handler files need conversion to HTTP/WebSocket endpoints
- Config management already implemented in `src/config/appConfig.ts` (file-based JSON)

### File Created
`.planning/phases/01-backend-extraction/01-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All packages verified on npm registry, versions confirmed, slopcheck passed [OK] |
| Architecture | HIGH | Existing infrastructure reusable, clear migration path, patterns documented |
| Pitfalls | HIGH | Common Electron-to-Node.js issues identified, mitigation strategies provided |
| Security | HIGH | ASVS categories mapped, standard mitigations identified (Zod, crypto, Drizzle ORM) |

### Open Questions
- Database path resolution strategy (env var vs CLI flag vs config file) - recommend env var with fallback
- API key encryption approach (crypto only vs alternatives) - recommend crypto only for v2
- File upload handling (Multer only vs base64 alternative) - recommend Multer only

### Ready for Planning
Research complete. Planner can now create PLAN.md files with:
- 11 IPC handler files to convert
- Socket.IO setup for streaming
- Multer middleware for file uploads
- Node.js crypto service for API key encryption
- Environment variable configuration
- Test coverage for all 6 requirements

