# Migration Plan: Electron → Pure Node.js CLI Server

## Goal
Remove all Electron dependencies. LibraNia becomes pure Node.js CLI server with web UI.

## Architecture Changes

### Before (Current)
```
electron/
├── main.ts              # Electron app entry (BrowserWindow, Tray, IPC)
├── preload.ts           # Context bridge
├── ipc/                 # IPC handlers (18 files)
├── api/                 # Express routes ✅
├── services/            # Business logic ✅
├── database/            # SQLite + Drizzle ✅
└── websocket/           # Socket.IO handlers ⚠️
```

### After (Target)
```
backend/
├── server.ts            # Express + Socket.IO entry
├── api/                 # Express routes (moved)
├── services/            # Business logic (moved)
├── database/            # SQLite + Drizzle (moved)
└── websocket/           # Socket.IO handlers (refactored)

bin/
└── librania.js          # CLI entry point

src/                     # Frontend (React) - unchanged
```

## Migration Steps

### Phase 1: Create Backend Structure
**What:** New directory structure for pure Node backend

**Actions:**
1. Create `backend/` directory at project root
2. Move folders:
   - `electron/database/` → `backend/database/`
   - `electron/services/` → `backend/services/`
   - `electron/api/` → `backend/api/`
   - `electron/middleware/` → `backend/middleware/`
   - `electron/prompts/` → `backend/prompts/`
   - `electron/tools/` → `backend/tools/`
   - `electron/store/` → `backend/store/`
3. Copy `electron/server.ts` → `backend/server.ts`
4. Copy `electron/logger.ts` → `backend/logger.ts`

**Files affected:** ~60 files moved

---

### Phase 2: Fix Embeddings Service
**What:** Remove `app.getPath('userData')` dependency

**File:** `backend/services/embeddings.service.ts`

**Change:**
```typescript
// Before
import { app } from 'electron';
const cache_dir = path.join(app.getPath('userData'), 'models');

// After
function getModelsDir(): string {
  if (process.env.LIBRANIA_MODELS_DIR) {
    return process.env.LIBRANIA_MODELS_DIR;
  }
  if (process.env.LIBRANIA_DATA_DIR) {
    return path.join(process.env.LIBRANIA_DATA_DIR, 'models');
  }
  return path.join(process.cwd(), 'data', 'models');
}

const cache_dir = getModelsDir();
```

**Why:** Electron `app.getPath` not available in Node. Use env vars instead.

---

### Phase 3: Extract IPC Business Logic
**What:** Move business logic from IPC handlers to services

**Problem:** IPC handlers in `electron/ipc/*.handlers.ts` contain business logic mixed with `ipcMain.handle()` calls.

**Solution:** Extract pure functions, leave IPC wrappers in electron/ (for future Electron support if needed).

**Example - AI handlers:**

**Before:** `electron/ipc/ai.handlers.ts`
```typescript
import { ipcMain, BrowserWindow } from 'electron';

export async function callDeepSeek(...) { /* logic */ }
export async function callClaude(...) { /* logic */ }
export async function callOpenAI(...) { /* logic */ }

export function registerAIHandlers(mainWindow?: BrowserWindow) {
  ipcMain.handle('ai:chat', async (event, request) => {
    // calls callDeepSeek/callClaude/callOpenAI
  });
}
```

**After:** `backend/services/ai/ai-chat.service.ts`
```typescript
// Pure functions, no electron imports
export async function callDeepSeek(...) { /* logic */ }
export async function callClaude(...) { /* logic */ }
export async function callOpenAI(...) { /* logic */ }
export async function handleAIChat(request: ChatRequest) { /* logic */ }
```

**Files to extract:**
- `electron/ipc/ai.handlers.ts` → `backend/services/ai/ai-chat.service.ts`
- `electron/ipc/notes.handlers.ts` → `backend/services/notes.service.ts` (already exists, merge)
- `electron/ipc/graph.handlers.ts` → `backend/services/graph.service.ts`
- `electron/ipc/search.handlers.ts` → `backend/services/search.service.ts`
- `electron/ipc/tags.handlers.ts` → `backend/services/tags.service.ts`
- `electron/ipc/content.handlers.ts` → `backend/services/content.service.ts`
- `electron/ipc/export.handlers.ts` → `backend/services/export.service.ts`
- `electron/ipc/config.handlers.ts` → `backend/services/config.service.ts`

**Count:** 8 services to extract

---

### Phase 4: Refactor WebSocket Handlers
**What:** Remove IPC handler imports from websocket

**File:** `electron/websocket/socket.handlers.ts`

**Before:**
```typescript
import { callClaude, callDeepSeek, callOpenAI } from '../ipc/ai.handlers.js';

export function setupSocketHandlers(io: Server) {
  socket.on('ai:chat', async (data) => {
    // calls callClaude/callDeepSeek/callOpenAI
  });
}
```

**After:** `backend/websocket/socket.handlers.ts`
```typescript
import { callClaude, callDeepSeek, callOpenAI } from '../services/ai/ai-chat.service.js';

export function setupSocketHandlers(io: Server) {
  socket.on('ai:chat', async (data) => {
    // calls service functions directly
  });
}
```

**Why:** WebSocket handlers need AI functions, not IPC wrappers.

---

### Phase 5: Update API Routes
**What:** Update imports in API routes to point to backend/

**Files:** All `backend/api/*.routes.ts` files (10 files)

**Change pattern:**
```typescript
// Before
import { someService } from '../services/some.service.js';
import { getDatabase } from '../database/connection.js';

// After (paths stay same, just moved to backend/)
import { someService } from '../services/some.service.js';
import { getDatabase } from '../database/connection.js';
```

**Why:** Folder structure preserved, relative imports stay same.

---

### Phase 6: Update Server Entry Point
**What:** Clean up `backend/server.ts` to remove Electron fallback

**File:** `backend/server.ts`

**Before:**
```typescript
try {
  const { default: apiRoutes } = await import('./api/routes.js');
  const { setupSocketHandlers } = await import('./websocket/socket.handlers.js');
  // ... setup
} catch (error) {
  console.warn('Running in minimal mode - API routes unavailable');
  // ... minimal server
}
```

**After:**
```typescript
import apiRoutes from './api/routes.js';
import { setupSocketHandlers } from './websocket/socket.handlers.js';

export async function startServer(port: number, distPath: string) {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());
  
  // API routes
  app.use(apiRoutes);
  
  // HTTP server
  const server = http.createServer(app);
  
  // Socket.IO
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  setupSocketHandlers(io);
  
  // Static files
  app.use(express.static(distPath));
  app.use((req, res) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
  
  // Start server
  await new Promise((resolve) => server.listen(port, resolve));
  return { server, io, port };
}
```

**Why:** No try/catch needed. Always load full API.

---

### Phase 7: Update TypeScript Config
**What:** Update `tsconfig.backend.json` to compile backend/

**File:** `tsconfig.backend.json`

**Before:**
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["electron/**/*.ts", "src/**/*.ts"]
}
```

**After:**
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["backend/**/*.ts", "src/**/*.ts"]
}
```

**Why:** Compile backend/ instead of electron/.

---

### Phase 8: Update Package.json
**What:** Update build scripts and file paths

**File:** `package.json`

**Changes:**
```json
{
  "main": "dist/backend/server.js",
  "files": [
    "bin/",
    "dist/backend/**/*.js",
    "dist/src/**/*.js",
    "!dist/**/*.test.js",
    "backend/extensions/",
    "dist/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build:backend": "tsc -p tsconfig.backend.json --noEmitOnError false || true",
    "start:cli": "tsx bin/librania.js start"
  }
}
```

**Why:** Point to backend/ instead of electron/.

---

### Phase 9: Update bin/librania.js
**What:** Update imports to use backend/

**File:** `bin/librania.js`

**Before:**
```javascript
import { startServer } from '../dist/electron/server.js';
const { stopServer } = await import('../dist/electron/server.js');
```

**After:**
```javascript
import { startServer } from '../dist/backend/server.js';
const { stopServer } = await import('../dist/backend/server.js');
```

**Why:** Server now in backend/.

---

### Phase 10: Fix Import Extensions
**What:** Add .js extensions to all imports in backend/

**Action:**
```bash
find dist/backend -name "*.js" -type f -exec sed -i \
  "s|from '\.\./\([^']*\)'|from '../\1.js'|g; \
   s|from '\./\([^']*\)'|from './\1.js'|g; \
   s|\.js\.js|.js|g" {} \;
```

**Why:** ESM requires .js extensions in imports.

---

### Phase 11: Update Frontend API Client
**What:** Check if `src/api/` needs updates

**Files:** `src/api/*.ts`

**Check:** Do these files import from electron/? 
- **Answer:** No. Frontend uses HTTP/WebSocket, not IPC.

**Action:** No changes needed.

---

### Phase 12: Archive Electron Code
**What:** Move unused Electron files to archive/

**Action:**
```bash
mkdir archive/
mv electron/ archive/electron/
```

**Keep for reference:**
- `electron/main.ts` - window management patterns
- `electron/preload.ts` - IPC bridge patterns
- `electron/tray.ts` - system tray implementation
- `electron/ipc/` - IPC handler patterns

**Why:** May want Electron desktop app later. Keep code for reference.

---

### Phase 13: Test Build
**What:** Verify compilation works

**Commands:**
```bash
npm run build:backend
npm run build:frontend
npm pack
```

**Expected output:**
- `dist/backend/` contains compiled JS
- `dist/src/` contains compiled JS
- Package includes both

---

### Phase 14: Test Installation
**What:** Test package install and CLI

**Commands:**
```bash
cd /tmp
mkdir test-librania
cd test-librania
npm init -y
npm install /path/to/librania-0.1.0.tgz
npm rebuild better-sqlite3 sharp
npx librania start --no-browser
```

**Expected:** Server starts with full API routes, no "minimal mode" warning.

---

### Phase 15: Test API Endpoints
**What:** Verify all API routes work

**Test:**
```bash
# Health check
curl http://localhost:3000/api/health

# Notes
curl http://localhost:3000/api/notes

# Graph
curl http://localhost:3000/api/graph/data

# AI providers
curl http://localhost:3000/api/ai/providers
```

**Expected:** All endpoints return valid responses.

---

### Phase 16: Test WebSocket
**What:** Verify WebSocket streaming works

**Test:** Open browser console at `http://localhost:3000`:
```javascript
const socket = io('http://localhost:3000');
socket.on('connect', () => console.log('Connected'));
socket.emit('ai:chat', {
  conversationId: 'test-123',
  messages: [{ role: 'user', content: 'Hello' }],
  providerId: 'deepseek'
});
socket.on('ai:stream', (data) => console.log('Stream:', data));
```

**Expected:** Receive streaming responses.

---

### Phase 17: Update Documentation
**What:** Update README and CLAUDE.md

**Files:**
- `README.md` - remove Electron references, update install instructions
- `CLAUDE.md` - update tech stack section

**Changes:**
```markdown
## Technology Stack

### Backend
- Node.js 18+ (pure Node, no Electron)
- Express 5.x - HTTP API
- Socket.IO - WebSocket streaming
- better-sqlite3 - SQLite database
- Drizzle ORM - type-safe queries

### Frontend
- React 19 - UI framework
- Vite 6 - build tool
- Three.js - 3D graph visualization
```

---

### Phase 18: Clean Up Dependencies
**What:** Remove Electron dependencies from package.json

**File:** `package.json`

**Remove:**
```json
{
  "dependencies": {
    "electron": "^XX.X.X",           // Remove
    "electron-builder": "^XX.X.X",   // Remove
    "electron-rebuild": "^XX.X.X"    // Remove
  },
  "scripts": {
    "rebuild": "electron-rebuild"    // Remove
  }
}
```

**Keep:**
- All other dependencies (Express, Socket.IO, better-sqlite3, etc.)

---

## Summary

**Files moved:** ~60 files
**Files modified:** ~15 files
**Files deleted:** 0 (archived instead)
**New files:** 0 (restructure only)

**Breaking changes:**
- No desktop app (Electron removed)
- CLI-only deployment
- Web UI accessed via browser

**Benefits:**
- Smaller bundle (no Electron: 120MB → 10MB)
- Lower memory (200MB → 50MB)
- Easier deployment (Docker, cloud, VPS)
- Simpler architecture (no IPC layer)

**Trade-offs:**
- No native desktop features (system tray, native menus, file dialogs)
- No offline installer (npm install required)
- Browser required (not standalone app)
