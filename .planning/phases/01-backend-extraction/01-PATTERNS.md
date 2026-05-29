# Phase 1: Backend Extraction - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 15 new/modified files
**Analogs found:** 13 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `electron/api/notes.routes.ts` | route | CRUD | `electron/api/routes.ts` | exact |
| `electron/api/ai.routes.ts` | route | request-response | `electron/api/routes.ts` | exact |
| `electron/api/graph.routes.ts` | route | CRUD | `electron/api/routes.ts` | exact |
| `electron/api/content.routes.ts` | route | file-upload | `electron/api/routes.ts` | role-match |
| `electron/api/search.routes.ts` | route | request-response | `electron/api/routes.ts` | exact |
| `electron/api/tags.routes.ts` | route | CRUD | `electron/api/routes.ts` | exact |
| `electron/api/export.routes.ts` | route | request-response | `electron/api/routes.ts` | exact |
| `electron/api/config.routes.ts` | route | CRUD | `electron/api/routes.ts` | exact |
| `electron/websocket/socket.handlers.ts` | websocket | streaming | none | no-analog |
| `electron/middleware/error.middleware.ts` | middleware | request-response | none | no-analog |
| `electron/middleware/upload.middleware.ts` | middleware | file-upload | none | no-analog |
| `electron/services/encryption.service.ts` | service | transform | `electron/services/content.service.ts` | role-match |
| `electron/server.ts` | server | request-response | `electron/server.ts` | exact (modify) |
| `electron/database/connection.ts` | database | initialization | `electron/database/connection.ts` | exact (modify) |


## Pattern Assignments

### `electron/api/notes.routes.ts` (route, CRUD)

**Analog:** `electron/api/routes.ts` (lines 1-230)

**Imports pattern** (lines 1-9):
```typescript
import { Router } from 'express';
import { createConversation, getAllConversations, getConversation, deleteConversation } from '../services/conversation.service';
import { createMessage, getMessagesByConversation } from '../services/message.service';
import { getORM } from '../database/connection';

const router = Router();
```

**Logging middleware pattern** (lines 14-17):
```typescript
router.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});
```

**GET all pattern** (lines 70-78):
```typescript
router.get('/api/conversations', async (req, res) => {
  try {
    const db = getORM();
    const conversations = await getAllConversations(db);
    res.json({ success: true, conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**POST create pattern** (lines 80-92):
```typescript
router.post('/api/conversations', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Missing required field: title' });
    }
    const db = getORM();
    const conversation = await createConversation({ title }, db);
    res.json({ success: true, conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**GET by ID pattern** (lines 94-105):
```typescript
router.get('/api/conversations/:id', async (req, res) => {
  try {
    const db = getORM();
    const conversation = await getConversation(req.params.id, db);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**DELETE pattern** (lines 128-136):
```typescript
router.delete('/api/conversations/:id', async (req, res) => {
  try {
    const db = getORM();
    await deleteConversation(req.params.id, db);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Export pattern** (line 229):
```typescript
export default router;
```

---

### `electron/api/ai.routes.ts` (route, request-response)

**Analog:** `electron/api/routes.ts` (lines 156-227)

**AI chat endpoint pattern** (lines 156-227):
```typescript
router.post('/api/chat', async (req, res) => {
  try {
    const { conversationId, messages, providerId, model } = req.body;

    if (!conversationId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: conversationId, messages (array)'
      });
    }

    // Import AI handlers
    const { callDeepSeek, callClaude, callOpenAI } = await import('../ipc/ai.handlers');

    // Get provider config
    const provider = providerId || 'deepseek';
    const config = loadProviderFromEnv(provider);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: `Provider ${provider} not configured`
      });
    }

    const modelToUse = model || config.model;
    const db = getORM();

    // Save user message
    const userMessage = messages[messages.length - 1];
    if (userMessage.role === 'user') {
      await createMessage({
        conversation_id: conversationId,
        role: userMessage.role,
        content: userMessage.content,
      }, db);
    }

    // Call AI
    let response: string;
    switch (config.id) {
      case 'deepseek':
        response = await callDeepSeek(messages, config.apiKey, modelToUse);
        break;
      case 'claude':
        response = await callClaude(messages, config.apiKey, modelToUse, config.baseURL);
        break;
      case 'openai':
        response = await callOpenAI(messages, config.apiKey, modelToUse, config.baseURL);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported provider: ${config.id}`
        });
    }

    // Save assistant message
    await createMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: response,
      provider_id: config.id,
      model: modelToUse,
    }, db);

    res.json({ success: true, content: response });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

### `electron/api/content.routes.ts` (route, file-upload)

**Analog:** `electron/api/routes.ts` (general structure)

**Service layer pattern from:** `electron/services/content.service.ts` (lines 216-271)

**File validation pattern** (lines 82-107):
```typescript
export async function validateFileType(buffer: Buffer, filePath: string): Promise<{ mime: string; ext: string }> {
  const { fileTypeFromBuffer } = await import('file-type');
  const fileType = await fileTypeFromBuffer(buffer);

  // Primary validation: magic bytes
  if (fileType) {
    if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      throw new Error(`File type ${fileType.mime} not allowed`);
    }
    return { mime: fileType.mime, ext: fileType.ext };
  }

  // Fallback: extension-based detection for text files (no magic bytes)
  const extension = path.extname(filePath).toLowerCase();
  const extensionToMime: Record<string, { mime: string; ext: string }> = {
    '.txt': { mime: 'text/plain', ext: 'txt' },
    '.md': { mime: 'text/markdown', ext: 'md' },
  };

  const mappedType = extensionToMime[extension];
  if (mappedType && ALLOWED_MIME_TYPES.includes(mappedType.mime)) {
    return mappedType;
  }

  throw new Error('Unable to determine file type');
}
```

**Create content pattern** (lines 216-271):
```typescript
export async function createContent(
  data: CreateContentInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Content> {
  // Read file from source path
  const fileBuffer = await fs.readFile(data.filePath);

  // Validate file type using magic bytes with extension fallback
  const { mime, ext } = await validateFileType(fileBuffer, data.filePath);

  // Validate file size
  const fileSize = await validateFileSize(data.filePath);

  // Generate UUID for filename
  const uuid = crypto.randomUUID();
  const destinationPath = `content/${uuid}.${ext}`;

  // Ensure content directory exists
  await fs.mkdir('content', { recursive: true });

  // Write file atomically
  await writeFileAtomic(destinationPath, fileBuffer);

  // Extract text from documents
  const extractedText = await extractText(destinationPath, mime);

  // Generate thumbnail for images
  const thumbnailPath = await generateThumbnail(destinationPath, mime);

  // Get original filename
  const originalFilename = path.basename(data.filePath);

  // Insert metadata to database
  const now = new Date();
  const [record] = await db
    .insert(content)
    .values({
      id: uuid,
      file_path: destinationPath,
      thumbnail_path: thumbnailPath,
      mime_type: mime,
      original_filename: originalFilename,
      file_size: fileSize,
      extracted_text: extractedText || null,
      source: data.source,
      confidence_score: data.confidence_score ?? null,
      metadata: null,
      note_id: data.note_id ?? null,
      message_id: data.message_id ?? null,
      created_at: now,
      updated_at: now,
    })
    .returning();

  return record as Content;
}
```

---

### `electron/websocket/socket.handlers.ts` (websocket, streaming)

**No direct analog** — Use Socket.IO documentation patterns from RESEARCH.md

**Socket.IO setup pattern from RESEARCH.md** (lines 256-306):
```typescript
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
```

---

### `electron/middleware/error.middleware.ts` (middleware, request-response)

**No direct analog** — Use Express error handling pattern

**Error handling pattern from existing routes** (lines 70-78 in routes.ts):
```typescript
// Standard try-catch pattern used throughout routes.ts
router.get('/api/conversations', async (req, res) => {
  try {
    const db = getORM();
    const conversations = await getAllConversations(db);
    res.json({ success: true, conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Centralized error middleware pattern** (Express standard):
```typescript
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('[ERROR]', err.stack || err);
  
  // Default to 500 if no status code set
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    success: false,
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
```

---

### `electron/middleware/upload.middleware.ts` (middleware, file-upload)

**No direct analog** — Use Multer configuration from RESEARCH.md

**Multer configuration pattern from RESEARCH.md** (lines 437-502):
```typescript
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
```

---

### `electron/services/encryption.service.ts` (service, transform)

**Analog:** `electron/services/content.service.ts` (service structure)

**Service structure pattern** (lines 1-11):
```typescript
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { content, contentTags } from '../database/schema';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';

export interface CreateContentInput {
  filePath: string;
  source: 'manual' | 'ai-generated';
}
```

**Encryption pattern from RESEARCH.md** (lines 350-419):
```typescript
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

---


### `electron/server.ts` (server, request-response) — MODIFY EXISTING

**Current file:** `electron/server.ts` (lines 1-79)

**Socket.IO integration pattern from RESEARCH.md** (lines 616-662):
```typescript
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
      console.log(\`Server started on http://localhost:\${port}\`);
      resolve({ server, io, port });
    });
    server.on('error', reject);
  });
}
```

**Key changes:**
- Import http and Socket.IO
- Create HTTP server with http.createServer(app)
- Initialize Socket.IO with CORS config
- Call setupSocketHandlers(io) before starting server
- Return io instance in resolved promise

---

### `electron/database/connection.ts` (database, initialization) — MODIFY EXISTING

**Current file:** `electron/database/connection.ts` (lines 1-214)

**Path resolution pattern from RESEARCH.md** (lines 316-340):
```typescript
import path from 'path';
import { promises as fs } from 'fs';

function getDatabasePath(): string {
  // Priority: env var > CLI flag > config file > default
  const dbPath = 
    process.env.LIBRANIA_DB_PATH ||
    (process.env.LIBRANIA_DATA_DIR && path.join(process.env.LIBRANIA_DATA_DIR, 'librania.db')) ||
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

**Key changes:**
- Add getDatabasePath() function with env var priority
- Replace hardcoded path with getDatabasePath() call
- Ensure parent directory exists before creating database

---


## Shared Patterns

### IPC Handler to HTTP Route Conversion

**Source:** `electron/ipc/notes.handlers.ts` + `electron/api/routes.ts`
**Apply to:** All route files

**IPC handler pattern** (notes.handlers.ts lines 20-35):
```typescript
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
```

**HTTP route equivalent** (routes.ts lines 80-92):
```typescript
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

**Conversion rules:**
1. ipcMain.handle(channel, handler) becomes router.METHOD(path, handler)
2. event parameter removed (no IPC context)
3. data parameter becomes req.body or req.params
4. Return value becomes res.json({ success: true, data })
5. Errors become HTTP status codes (400, 404, 500)
6. mainWindow.webContents.send() becomes io.emit() for real-time updates

---

### Service Layer Integration

**Source:** `electron/services/notes.service.ts`
**Apply to:** All route files

**Pattern:**
```typescript
// Import service functions
import { createNote, getAllNotes, getNoteById, updateNote, deleteNote } from '../services/notes.service';
import { getORM } from '../database/connection';

// Use in route handler
router.post('/api/notes', async (req, res) => {
  try {
    const db = getORM();
    const note = await createNote(req.body, db);
    res.status(201).json({ success: true, note });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Key points:**
- Always get DB instance with getORM() at start of handler
- Pass DB instance to service functions
- Service functions handle business logic, routes handle HTTP concerns
- Preserve existing service layer — no changes needed

---

### Error Handling

**Source:** `electron/api/routes.ts` (consistent pattern throughout)
**Apply to:** All route files

**Pattern:**
```typescript
router.post('/api/resource', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.requiredField) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: requiredField' 
      });
    }
    
    // Business logic
    const result = await someService(req.body);
    
    // Success response
    res.status(201).json({ success: true, result });
  } catch (error: any) {
    // Error response
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Status codes:**
- 200: Success (GET, PUT, DELETE)
- 201: Created (POST)
- 400: Bad request (validation errors)
- 404: Not found
- 500: Internal server error

---

### Logging

**Source:** `electron/logger.ts` + `electron/api/routes.ts`
**Apply to:** All route files

**Pattern:**
```typescript
import { logger } from '../logger';

router.post('/api/notes', async (req, res) => {
  try {
    logger.info('API: POST /api/notes', { title: req.body.title });
    // ... handler logic
  } catch (error) {
    logger.error('POST /api/notes failed', error as Error);
    throw error;
  }
});
```

**Logger methods:**
- logger.info(message, context?) — Info level
- logger.error(message, error?) — Error level with stack trace
- logger.warn(message) — Warning level
- logger.debug(message) — Debug level

---


## No Analog Found

Files with no close match in the codebase (use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `electron/websocket/socket.handlers.ts` | websocket | streaming | No WebSocket handlers exist yet — use Socket.IO documentation patterns from RESEARCH.md |
| `electron/middleware/error.middleware.ts` | middleware | request-response | No middleware directory exists — use Express error handling patterns |
| `electron/middleware/upload.middleware.ts` | middleware | file-upload | No middleware directory exists — use Multer configuration from RESEARCH.md |

---

## Metadata

**Analog search scope:** electron/ipc/, electron/api/, electron/services/, electron/database/
**Files scanned:** 25 files (11 IPC handlers, 1 route file, 13 services, database connection)
**Pattern extraction date:** 2026-05-29

**IPC Handler to Route Mapping:**
- `electron/ipc/notes.handlers.ts` → `electron/api/notes.routes.ts`
- `electron/ipc/ai.handlers.ts` → `electron/api/ai.routes.ts` + `electron/websocket/socket.handlers.ts`
- `electron/ipc/content.handlers.ts` → `electron/api/content.routes.ts`
- `electron/ipc/graph.handlers.ts` → `electron/api/graph.routes.ts`
- `electron/ipc/search.handlers.ts` → `electron/api/search.routes.ts`
- `electron/ipc/tags.handlers.ts` → `electron/api/tags.routes.ts`
- `electron/ipc/export.handlers.ts` → `electron/api/export.routes.ts`
- `electron/ipc/config.handlers.ts` → `electron/api/config.routes.ts`

**Service Layer (reuse as-is):**
- `electron/services/notes.service.ts` — CRUD operations
- `electron/services/content.service.ts` — File upload/validation
- `electron/services/conversation.service.ts` — Conversation management
- `electron/services/message.service.ts` — Message storage
- All other services in `electron/services/` directory

