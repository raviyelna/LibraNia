# Phase 3: AI Integration - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 21 new/modified files
**Analogs found:** 18 / 21

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `electron/services/ai/providers/base.provider.ts` | interface | — | `electron/services/notes.service.ts` | role-match |
| `electron/services/ai/providers/claude.provider.ts` | service | request-response | `electron/services/notes.service.ts` | role-match |
| `electron/services/ai/providers/openai.provider.ts` | service | request-response | `electron/services/notes.service.ts` | role-match |
| `electron/services/ai/providers/deepseek.provider.ts` | service | request-response | `electron/services/notes.service.ts` | role-match |
| `electron/services/ai/ai.service.ts` | service | request-response | `electron/services/notes.service.ts` | exact |
| `electron/services/ai/websearch.service.ts` | service | request-response | `electron/services/search.service.ts` | exact |
| `electron/services/conversation.service.ts` | service | CRUD | `electron/services/notes.service.ts` | exact |
| `electron/ipc/ai.handlers.ts` | middleware | request-response | `electron/ipc/notes.handlers.ts` | exact |
| `electron/store/secure.store.ts` | utility | — | `electron/main.ts` (Store usage) | partial-match |
| `electron/database/schema.ts` | model | — | `electron/database/schema.ts` | exact |
| `src/components/Chat/ChatInterface.tsx` | component | — | `src/components/Notes/NoteEditor.tsx` | role-match |
| `src/components/Chat/MessageList.tsx` | component | — | `src/components/Notes/NotesList.tsx` | exact |
| `src/components/Chat/MessageInput.tsx` | component | — | `src/components/Notes/NoteEditor.tsx` | partial-match |
| `src/components/Chat/MessageBubble.tsx` | component | — | `src/components/Notes/NotesList.tsx` | partial-match |
| `src/components/Chat/CitationList.tsx` | component | — | `src/components/Notes/BacklinksPanel.tsx` | role-match |
| `src/components/Chat/ProviderBadge.tsx` | component | — | `src/components/ui/Button.tsx` | partial-match |
| `src/components/Settings/AIProviderSettings.tsx` | component | — | `src/components/Settings/ModeSettings.tsx` | exact |
| `src/hooks/useChat.ts` | hook | request-response | `src/hooks/useNotes.ts` | exact |
| `src/hooks/useConversations.ts` | hook | CRUD | `src/hooks/useNotes.ts` | exact |
| `src/hooks/useAIProviders.ts` | hook | CRUD | `src/hooks/useNotes.ts` | exact |
| `src/routes/Chat.tsx` | route | — | `src/routes/Library.tsx` | exact |


## Pattern Assignments

### `electron/database/schema.ts` (model, schema extension)

**Analog:** `electron/database/schema.ts` (existing schema)

**Import pattern** (lines 1-1):
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
```

**Table definition pattern** (lines 6-14):
```typescript
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  metadata: text('metadata'), // JSON blob for extensibility
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deleted_at: integer('deleted_at', { mode: 'timestamp' }), // Soft delete
});
```

**Foreign key pattern** (lines 29-37):
```typescript
export const noteTags = sqliteTable('note_tags', {
  note_id: text('note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  tag_id: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: { columns: [table.note_id, table.tag_id] },
}));
```

**Apply to:** conversations, messages, citations tables

---

### `electron/services/conversation.service.ts` (service, CRUD)

**Analog:** `electron/services/notes.service.ts`

**Import pattern** (lines 1-5):
```typescript
import { eq, isNull, isNotNull, desc, and } from 'drizzle-orm';
import { notes } from '../database/schema';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';
```

**Type definitions** (lines 7-27):
```typescript
export interface CreateNoteInput {
  title: string;
  body: string;
  metadata?: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  metadata: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
```

**Create operation pattern** (lines 35-58):
```typescript
export async function createNote(
  data: CreateNoteInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Note> {
  const now = new Date();
  const id = crypto.randomUUID();

  const [note] = await db
    .insert(notes)
    .values({
      id,
      title: data.title,
      body: data.body,
      metadata: data.metadata || null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })
    .returning();

  return note as Note;
}
```

**Update operation pattern** (lines 69-101):
```typescript
export async function updateNote(
  id: string,
  data: UpdateNoteInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Note> {
  const now = new Date();

  // Check if note exists and is not deleted
  const existing = await getNoteById(id, db, false);
  if (!existing) {
    throw new Error(`Note with id ${id} not found or is deleted`);
  }

  const [updated] = await db
    .update(notes)
    .set({
      ...data,
      updated_at: now,
    })
    .where(and(eq(notes.id, id), isNull(notes.deleted_at)))
    .returning();

  if (!updated) {
    throw new Error(`Failed to update note with id ${id}`);
  }

  return updated as Note;
}
```

**Query pattern** (lines 163-179):
```typescript
export async function getNoteById(
  id: string,
  db: BetterSQLite3Database<typeof schema>,
  includeDeleted: boolean = false
): Promise<Note | null> {
  const conditions = includeDeleted
    ? eq(notes.id, id)
    : and(eq(notes.id, id), isNull(notes.deleted_at));

  const [note] = await db
    .select()
    .from(notes)
    .where(conditions)
    .limit(1);

  return note ? (note as Note) : null;
}
```

---

### `electron/ipc/ai.handlers.ts` (middleware, IPC handlers)

**Analog:** `electron/ipc/notes.handlers.ts`

**Import pattern** (lines 1-12):
```typescript
import { ipcMain } from 'electron';
import { logger } from '../logger';
import { getORM } from '../database/connection';
import {
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  getNoteById,
  getAllNotes,
  getDeletedNotes,
} from '../services/notes.service';
```

**Handler registration pattern** (lines 19-32):
```typescript
export function registerNotesHandlers() {
  const orm = getORM();

  // Create note
  ipcMain.handle('notes:create', async (event, data) => {
    try {
      logger.info('IPC: notes:create', { title: data.title });
      const note = await createNote(data, orm);
      return note;
    } catch (error) {
      logger.error('notes:create failed', error as Error);
      throw error;
    }
  });
```

**Error handling pattern** (lines 23-32):
```typescript
ipcMain.handle('notes:create', async (event, data) => {
  try {
    logger.info('IPC: notes:create', { title: data.title });
    const note = await createNote(data, orm);
    return note;
  } catch (error) {
    logger.error('notes:create failed', error as Error);
    throw error;
  }
});
```

**Apply to:** All AI IPC handlers (chat:send, chat:stream, provider:validate, etc.)

---

### `electron/store/secure.store.ts` (utility, encrypted storage)

**Analog:** `electron/main.ts` (lines 4, 28)

**electron-store import and initialization** (lines 4, 28):
```typescript
import Store from 'electron-store';

// Initialize electron-store for config
const store = new Store();
```

**Usage pattern for get/set**:
```typescript
// Get value
const value = store.get('key');

// Set value
store.set('key', value);
```

**Apply to:** Encrypted API key storage with encryptionKey option

---

### `src/hooks/useChat.ts` (hook, request-response)

**Analog:** `src/hooks/useNotes.ts`

**Import pattern** (lines 1-1):
```typescript
import { useState, useEffect, useCallback } from 'react';
```

**Type definitions** (lines 3-11):
```typescript
interface Note {
  id: string;
  title: string;
  body: string;
  metadata: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
```

**List hook pattern** (lines 13-36):
```typescript
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.notes.getAll();
      setNotes(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, error, refetch: fetchNotes };
}
```

**Single item hook pattern** (lines 38-61):
```typescript
export function useNote(id: string, includeDeleted = false) {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNote = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.notes.getById(id, includeDeleted);
      setNote(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id, includeDeleted]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  return { note, loading, error, refetch: fetchNote };
}
```

**Mutation hook pattern** (lines 63-77):
```typescript
export function useCreateNote() {
  const [loading, setLoading] = useState(false);

  const createNote = useCallback(async (data: { title: string; body: string; metadata?: string }) => {
    setLoading(true);
    try {
      const note = await window.api.notes.create(data);
      return note;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createNote, loading };
}
```

**Apply to:** useChat, useConversations, useAIProviders hooks

---

### `src/components/Settings/AIProviderSettings.tsx` (component, settings UI)

**Analog:** `src/components/Settings/ModeSettings.tsx`

**Import pattern** (lines 1-10):
```typescript
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
```

**Type definitions** (lines 12-18):
```typescript
type AppMode = 'desktop' | 'web';

interface AppConfig {
  mode: AppMode;
  theme: 'light' | 'dark' | 'system';
  windowBounds: { x: number; y: number; width: number; height: number } | null;
  serverPort: number;
}
```

**Component structure with state** (lines 21-42):
```typescript
export function ModeSettings() {
  const [currentMode, setCurrentMode] = useState<AppMode>('desktop');
  const [selectedMode, setSelectedMode] = useState<AppMode>('desktop');
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load current mode from config
    const loadConfig = async () => {
      try {
        const config: AppConfig = await window.api.getConfig();
        setCurrentMode(config.mode);
        setSelectedMode(config.mode);
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);
```

**Form with radio buttons** (lines 84-118):
```typescript
<div className="space-y-3">
  <label className="flex items-start space-x-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
    <input
      type="radio"
      name="mode"
      value="desktop"
      checked={selectedMode === 'desktop'}
      onChange={(e) => setSelectedMode(e.target.value as AppMode)}
      className="mt-1"
    />
    <div className="flex-1">
      <div className="font-medium text-foreground">Desktop</div>
      <div className="text-sm text-secondary">
        Run as native desktop application (recommended)
      </div>
    </div>
  </label>
</div>
```

**Apply/Save button pattern** (lines 120-130):
```typescript
<div className="flex items-center justify-between pt-4 border-t border-border">
  <p className="text-sm text-secondary">
    {selectedMode !== currentMode && 'Restart required to apply changes'}
  </p>
  <Button
    onClick={handleApply}
    disabled={selectedMode === currentMode}
  >
    Apply
  </Button>
</div>
```

**Confirmation dialog pattern** (lines 133-151):
```typescript
<Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Restart Required</DialogTitle>
      <DialogDescription>
        Changing the application mode requires restarting LibraNia. Would you like to restart now?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={handleCancel}>
        Cancel
      </Button>
      <Button onClick={handleRestart}>
        Restart Now
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Apply to:** AIProviderSettings component for API key configuration

---

### `src/components/Chat/MessageList.tsx` (component, list display)

**Analog:** `src/components/Notes/NotesList.tsx`

**Import pattern** (lines 1-2):
```typescript
import { useState } from 'react';
import { useNotes, useCreateNote } from '../../hooks/useNotes';
```

**Component props pattern** (lines 4-7):
```typescript
interface NotesListProps {
  selectedNoteId?: string;
  onSelectNote: (noteId: string) => void;
}
```

**Component structure with hooks** (lines 9-12):
```typescript
export function NotesList({ selectedNoteId, onSelectNote }: NotesListProps) {
  const { notes, loading } = useNotes();
  const { createNote } = useCreateNote();
  const [searchQuery, setSearchQuery] = useState('');
```

**Loading state** (lines 23-29):
```typescript
if (loading) {
  return (
    <div className="notes-list p-4">
      <div className="text-secondary">Loading...</div>
    </div>
  );
}
```

**List rendering with map** (lines 55-68):
```typescript
filteredNotes.map(note => (
  <div
    key={note.id}
    className={`p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
      selectedNoteId === note.id ? 'selected bg-accent' : ''
    }`}
    onClick={() => onSelectNote(note.id)}
  >
    <h3 className="font-medium text-foreground mb-1 truncate">{note.title}</h3>
    <span className="text-sm text-secondary">
      {new Date(note.updated_at).toLocaleDateString()}
    </span>
  </div>
))
```

**Apply to:** MessageList component for displaying chat messages

---

### `src/routes/Chat.tsx` (route, page layout)

**Analog:** `src/routes/Library.tsx`

**Three-column layout** (lines 14-68):
```typescript
return (
  <div className="library-layout flex h-screen">
    <aside className="notes-sidebar w-64 border-r border-border overflow-y-auto">
      <NotesList
        selectedNoteId={selectedNoteId || undefined}
        onSelectNote={setSelectedNoteId}
      />
    </aside>

    <main className="notes-main flex-1 flex flex-col overflow-hidden">
      {selectedNoteId ? (
        <div className="flex-1 overflow-y-auto">
          <NoteEditor noteId={selectedNoteId} />
        </div>
      ) : (
        <div className="empty-state flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome</h2>
            <p className="text-secondary">Select a note to get started</p>
          </div>
        </div>
      )}
    </main>
  </div>
);
```

**Apply to:** Chat route with conversation list sidebar + chat interface main area

---

## Shared Patterns

### IPC Communication Pattern
**Source:** `electron/preload.ts` (lines 15-87)
**Apply to:** All AI-related IPC calls

```typescript
contextBridge.exposeInMainWorld('api', {
  notes: {
    create: (data) => ipcRenderer.invoke('notes:create', data),
    update: (data) => ipcRenderer.invoke('notes:update', data),
    getAll: () => ipcRenderer.invoke('notes:getAll'),
  },
});
```

**Pattern for AI:** Add similar structure for chat, provider, conversation operations

---

### Error Handling Pattern
**Source:** `electron/ipc/notes.handlers.ts` (lines 23-32)
**Apply to:** All service and IPC handler functions

```typescript
ipcMain.handle('notes:create', async (event, data) => {
  try {
    logger.info('IPC: notes:create', { title: data.title });
    const note = await createNote(data, orm);
    return note;
  } catch (error) {
    logger.error('notes:create failed', error as Error);
    throw error;
  }
});
```

---

### Logging Pattern
**Source:** `electron/ipc/notes.handlers.ts` (lines 2, 25, 29)
**Apply to:** All main process operations

```typescript
import { logger } from '../logger';

logger.info('IPC: notes:create', { title: data.title });
logger.error('notes:create failed', error as Error);
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `electron/services/ai/providers/base.provider.ts` | interface | — | No provider abstraction pattern exists yet |
| `electron/services/ai/providers/claude.provider.ts` | service | streaming | No streaming service pattern exists yet |
| `electron/services/ai/providers/openai.provider.ts` | service | streaming | No streaming service pattern exists yet |

**Note:** For these files, use the patterns from RESEARCH.md (Pattern 1: AIProvider Interface, Pattern 2: Streaming with IPC)

---

## Metadata

**Analog search scope:** electron/services/, electron/ipc/, src/components/, src/hooks/, src/routes/
**Files scanned:** 25
**Pattern extraction date:** 2026-05-25

**Key patterns identified:**
- Service layer: CRUD operations with Drizzle ORM, error handling, type-safe interfaces
- IPC handlers: ipcMain.handle with try-catch, logger integration, ORM access
- React hooks: useState/useEffect/useCallback pattern, loading/error states, window.api calls
- Components: Tailwind CSS styling, Radix UI primitives, forwardRef pattern
- Database schema: sqliteTable with text/integer types, foreign keys with cascade
- Settings UI: Radio button forms, confirmation dialogs, async config loading

