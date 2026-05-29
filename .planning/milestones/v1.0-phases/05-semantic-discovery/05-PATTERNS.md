# Phase 5: Semantic Discovery - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 9 (4 new, 5 modified)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `electron/services/embeddings.service.ts` | service | transform | `electron/services/content.service.ts` | role-match |
| `electron/database/vec.ts` | database utility | query | `electron/database/fts.ts` | exact |
| `src/hooks/useSemanticLinks.ts` | hook | request-response | `src/hooks/useNotes.ts` | exact |
| `src/components/Notes/RelatedPanel.tsx` | component | request-response | `src/components/Notes/BacklinksPanel.tsx` | exact |
| `electron/database/schema.ts` (extend) | schema | — | `electron/database/schema.ts` | exact |
| `electron/services/notes.service.ts` (extend) | service | CRUD | `electron/services/notes.service.ts` | exact |
| `electron/services/search.service.ts` (extend) | service | query | `electron/services/search.service.ts` | exact |
| `src/hooks/useSearch.ts` (extend) | hook | request-response | `src/hooks/useSearch.ts` | exact |
| `electron/ipc/search.handlers.ts` (extend) | IPC handler | request-response | `electron/ipc/search.handlers.ts` | exact |

## Pattern Assignments

### `electron/services/embeddings.service.ts` (service, transform)

**Analog:** `electron/services/content.service.ts`

**Imports pattern** (lines 1-11):
```typescript
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import sharp from 'sharp';
import { eq, desc } from 'drizzle-orm';
import { content, contentTags } from '../database/schema';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';
```

**Key pattern:** Import external libraries at top, then Drizzle ORM types, then local schema

**Service function structure** (lines 200-256):
```typescript
/**
 * Create new content record with file storage
 * @param data Content input data
 * @param db Drizzle ORM database instance
 * @returns Created content record
 */
export async function createContent(
  data: CreateContentInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Content> {
  // Read file from source path
  const fileBuffer = await fs.readFile(data.filePath);

  // Validate file type using magic bytes
  const { mime, ext } = await validateFileType(fileBuffer);

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

**Key pattern:** JSDoc comments, async functions, step-by-step processing with comments, error handling via throws, return typed results

**Validation pattern** (lines 82-94):
```typescript
/**
 * Validate file type using magic bytes detection
 * @param buffer File buffer to validate
 * @returns Object with mime type and extension
 * @throws Error if file type is not allowed
 */
export async function validateFileType(buffer: Buffer): Promise<{ mime: string; ext: string }> {
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType) {
    throw new Error('Unable to determine file type');
  }

  if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    throw new Error(`File type ${fileType.mime} not allowed`);
  }

  return { mime: fileType.mime, ext: fileType.ext };
}
```

**Key pattern:** Throw errors for validation failures, return structured objects

---

### `electron/database/vec.ts` (database utility, query)

**Analog:** `electron/database/fts.ts`

**Imports pattern** (lines 1-1):
```typescript
import type Database from 'better-sqlite3';
```

**Key pattern:** Import Database type from better-sqlite3 for raw SQL queries

**Setup function pattern** (lines 14-95):
```typescript
/**
 * Setup FTS5 (Full-Text Search) virtual tables and triggers
 *
 * Creates three FTS5 tables for different search modes:
 * 1. notes_fts: Exact matching with diacritic normalization (unicode61)
 * 2. notes_fts_stemmed: Stemming search ("running" matches "run") using porter
 * 3. notes_fts_trigram: Fuzzy/typo-tolerant search using trigram
 *
 * All tables use content='notes' to reference the main notes table without data duplication.
 * Triggers keep FTS5 tables in sync with notes table changes.
 */
export function setupFTS5(db: Database.Database): void {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Create FTS5 virtual table with unicode61 tokenizer (exact matching)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      title,
      body,
      content='notes',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
    );
  `);

  // ... more table creation ...

  // Create triggers to keep FTS5 tables in sync with notes table

  // INSERT trigger
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
      INSERT INTO notes_fts_stemmed(rowid, title, body) VALUES (new.rowid, new.title, new.body);
      INSERT INTO notes_fts_trigram(rowid, title, body) VALUES (new.rowid, new.title, new.body);
    END;
  `);

  // UPDATE trigger
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
      UPDATE notes_fts SET title = new.title, body = new.body WHERE rowid = new.rowid;
      UPDATE notes_fts_stemmed SET title = new.title, body = new.body WHERE rowid = new.rowid;
      UPDATE notes_fts_trigram SET title = new.title, body = new.body WHERE rowid = new.rowid;
    END;
  `);

  // DELETE trigger
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
      DELETE FROM notes_fts WHERE rowid = old.rowid;
      DELETE FROM notes_fts_stemmed WHERE rowid = old.rowid;
      DELETE FROM notes_fts_trigram WHERE rowid = old.rowid;
    END;
  `);

  // Create performance indexes on notes table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
    CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
  `);

  // Create indexes on links table for backlinks queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_links_source_note_id ON links(source_note_id);
    CREATE INDEX IF NOT EXISTS idx_links_target_note_id ON links(target_note_id);
  `);
}
```

**Key pattern:** Multi-line JSDoc, setup function with db.exec() for table/trigger creation, CREATE IF NOT EXISTS for idempotency, indexes for performance

---

### `src/hooks/useSemanticLinks.ts` (hook, request-response)

**Analog:** `src/hooks/useNotes.ts`

**Imports pattern** (lines 1-1):
```typescript
import { useState, useEffect, useCallback } from 'react';
```

**Key pattern:** Import React hooks at top

**Hook structure for fetching data** (lines 38-61):
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

**Key pattern:** useState for data/loading/error, useCallback for fetch function, useEffect to trigger on mount, return data + loading + error + refetch

---

### `src/components/Notes/RelatedPanel.tsx` (component, request-response)

**Analog:** `src/components/Notes/BacklinksPanel.tsx`

**Imports pattern** (lines 1-1):
```typescript
import { useState, useEffect } from 'react';
```

**Interface definitions** (lines 3-12):
```typescript
interface Backlink {
  id: string;
  title: string;
  linkCount: number;
}

interface BacklinksPanelProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
}
```

**Key pattern:** Define data interface and props interface before component

**Component structure** (lines 14-66):
```typescript
export function BacklinksPanel({ noteId, onNavigate }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBacklinks() {
      try {
        setLoading(true);
        const data = await window.api.links.getBacklinks(noteId);
        setBacklinks(data);
      } catch (error) {
        console.error('Failed to fetch backlinks:', error);
        setBacklinks([]);
      } finally {
        setLoading(false);
      }
    }
    fetchBacklinks();
  }, [noteId]);

  if (loading) {
    return (
      <div className="backlinks-panel p-4">
        <h3 className="text-lg font-semibold mb-3">Backlinks</h3>
        <div className="text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="backlinks-panel p-4">
      <h3 className="text-lg font-semibold mb-3">Backlinks</h3>
      {backlinks.length === 0 ? (
        <div className="text-secondary text-sm">No backlinks yet</div>
      ) : (
        <ul className="space-y-2">
          {backlinks.map(link => (
            <li
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className="text-sm text-foreground hover:text-primary cursor-pointer hover:underline"
            >
              {link.title}
              {link.linkCount > 1 && (
                <span className="ml-2 text-xs text-secondary">({link.linkCount})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Key pattern:** useState for data + loading, useEffect with async fetch function, early return for loading state, conditional rendering for empty state, Tailwind CSS classes, clickable list items with hover states

---

### `electron/database/schema.ts` (extend)

**Analog:** `electron/database/schema.ts` (existing patterns)

**Table definition pattern** (lines 6-14):
```typescript
/**
 * Notes table - stores user's knowledge notes
 */
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

**Key pattern:** JSDoc comment above table, export const, sqliteTable with column definitions, inline comments for special columns

**Foreign key pattern** (lines 42-51):
```typescript
/**
 * Links table - stores bidirectional links between notes
 */
export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  source_note_id: text('source_note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  target_note_id: text('target_note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'set null' }),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

**Key pattern:** references() for foreign keys with onDelete behavior, cascade for dependent data, set null for optional references

**Blob column pattern** (lines 111-126):
```typescript
export const content = sqliteTable('content', {
  id: text('id').primaryKey(),
  file_path: text('file_path').notNull(),
  thumbnail_path: text('thumbnail_path'),
  mime_type: text('mime_type').notNull(),
  original_filename: text('original_filename').notNull(),
  file_size: integer('file_size').notNull(),
  extracted_text: text('extracted_text'),
  source: text('source').notNull(),
  confidence_score: integer('confidence_score', { mode: 'number' }), // Using integer for SQLite compatibility; store as 0-100 instead of 0.0-1.0
  metadata: text('metadata'),
  note_id: text('note_id').references(() => notes.id, { onDelete: 'set null' }),
  message_id: text('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

**Key pattern:** Use blob() for binary data (vectors), text() for JSON, integer() for timestamps with mode: 'timestamp'

---

### `electron/services/notes.service.ts` (extend)

**Analog:** `electron/services/notes.service.ts` (existing updateNote function)

**Update function pattern** (lines 69-101):
```typescript
/**
 * Update an existing note
 * @param id Note ID
 * @param data Partial note data to update
 * @param db Drizzle ORM instance
 * @returns Updated note
 * @throws Error if note not found or is deleted
 */
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

  // Update links table if body was changed
  if (data.body !== undefined) {
    await updateNoteLinks(updated.id, updated.body, db);
  }

  return updated as Note;
}
```

**Key pattern:** Check existence first, update with .returning(), post-update side effects (links, embeddings), throw errors for failures

**On-save side effect pattern** (lines 96-98):
```typescript
// Update links table if body was changed
if (data.body !== undefined) {
  await updateNoteLinks(updated.id, updated.body, db);
}
```

**Key pattern:** Conditional side effects based on what changed, call service functions for related updates

---

### `electron/services/search.service.ts` (extend)

**Analog:** `electron/services/search.service.ts` (existing search functions)

**Search function pattern** (lines 12-50):
```typescript
/**
 * Quick navigation search - title-only search with prefix matching
 * Used for autocomplete (Cmd+K) functionality
 *
 * @param db Database instance
 * @param query Search query
 * @param limit Maximum number of results (default: 50)
 * @returns Array of matching notes with id, title, updated_at, and rank
 */
export function quickNavSearch(
  db: Database.Database,
  query: string,
  limit = 50
): Array<{ id: string; title: string; updated_at: number; rank: number }> {
  // Escape FTS5 special characters to prevent syntax errors
  const escapedQuery = query.replace(/['"*]/g, '');

  // Return empty array if query is empty after escaping
  if (!escapedQuery.trim()) {
    return [];
  }

  // Title-only search with prefix matching (append * for prefix)
  const results = db
    .prepare(
      `
    SELECT
      n.id,
      n.title,
      n.updated_at,
      fts.rank
    FROM notes_fts fts
    INNER JOIN notes n ON fts.rowid = n.rowid
    WHERE notes_fts MATCH ?
      AND n.deleted_at IS NULL
    ORDER BY fts.rank
    LIMIT ?
  `
    )
    .all(`title:${escapedQuery}*`, limit) as Array<{
    id: string;
    title: string;
    updated_at: number;
    rank: number;
  }>;

  return results;
}
```

**Key pattern:** Multi-line JSDoc with @param and @returns, input validation, db.prepare() with parameterized queries, type assertion for results, filter deleted notes

**Query structure** (lines 26-40):
```typescript
const results = db
  .prepare(
    `
  SELECT
    n.id,
    n.title,
    n.updated_at,
    fts.rank
  FROM notes_fts fts
  INNER JOIN notes n ON fts.rowid = n.rowid
  WHERE notes_fts MATCH ?
    AND n.deleted_at IS NULL
  ORDER BY fts.rank
  LIMIT ?
`
  )
  .all(`title:${escapedQuery}*`, limit) as Array<{
  id: string;
  title: string;
  updated_at: number;
  rank: number;
}>;
```

**Key pattern:** Multi-line SQL in template string, JOIN to main table, filter deleted_at IS NULL, parameterized queries with .all(), type assertion

---

### `src/hooks/useSearch.ts` (extend)

**Analog:** `src/hooks/useSearch.ts` (existing hook)

**Type definitions** (lines 3-18):
```typescript
interface SearchResult {
  id: string;
  title: string;
  updated_at: number;
  rank: number;
}

interface FullTextSearchResult {
  id: string;
  title: string;
  snippet: string;
  updated_at: number;
  score: number;
}

type SearchMode = 'quickNav' | 'fullText' | 'fuzzy';
```

**Key pattern:** Define result interfaces, use union type for modes

**Hook with mode switching** (lines 20-56):
```typescript
export function useSearch() {
  const [results, setResults] = useState<SearchResult[] | FullTextSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, mode: SearchMode = 'quickNav') => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      let data;

      switch (mode) {
        case 'quickNav':
          data = await window.api.search.quickNav(query);
          break;
        case 'fullText':
          data = await window.api.search.fullText(query);
          break;
        case 'fuzzy':
          data = await window.api.search.fuzzy(query);
          break;
      }

      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { search, results, loading };
}
```

**Key pattern:** useState for results + loading, useCallback with mode parameter, switch statement for mode routing, try/catch with finally for loading state, return function + state

---

### `electron/ipc/search.handlers.ts` (extend)

**Analog:** `electron/ipc/search.handlers.ts` (existing handlers)

**Imports pattern** (lines 1-4):
```typescript
import { ipcMain } from 'electron';
import { logger } from '../logger';
import { getDatabase } from '../database/connection';
import { quickNavSearch, fullTextSearch, fuzzySearch } from '../services/search.service';
```

**Key pattern:** Import ipcMain, logger, database connection, service functions

**Handler registration pattern** (lines 9-42):
```typescript
/**
 * Register all IPC handlers for search operations
 */
export function registerSearchHandlers(): void {
  // Quick navigation search (title-only, for Cmd+K autocomplete)
  ipcMain.handle('search:quickNav', async (event, { query }) => {
    try {
      const db = getDatabase();
      return await quickNavSearch(db, query);
    } catch (error) {
      logger.error('search:quickNav failed', error);
      throw error;
    }
  });

  // Full-text search (title + body with snippets)
  ipcMain.handle('search:fullText', async (event, { query }) => {
    try {
      const db = getDatabase();
      return await fullTextSearch(db, query);
    } catch (error) {
      logger.error('search:fullText failed', error);
      throw error;
    }
  });

  // Fuzzy search (trigram tokenizer for typo tolerance)
  ipcMain.handle('search:fuzzy', async (event, { query }) => {
    try {
      const db = getDatabase();
      return await fuzzySearch(db, query);
    } catch (error) {
      logger.error('search:fuzzy failed', error);
      throw error;
    }
  });
}
```

**Key pattern:** Single registration function, ipcMain.handle with channel name, destructure params from event args, try/catch with logger.error, re-throw errors, call service functions with db instance

---

## Shared Patterns

### Database Connection
**Source:** `electron/database/connection.ts`
**Apply to:** All service functions that need database access

```typescript
import { getDatabase } from '../database/connection';
import { getORM } from '../database/connection';

// For raw SQL queries (FTS5, vector search)
const db = getDatabase();

// For Drizzle ORM queries (CRUD operations)
const orm = getORM();
```

**Key pattern:** Singleton database instances, getDatabase() for raw SQL, getORM() for Drizzle

### Error Handling in Services
**Source:** `electron/services/notes.service.ts`, `electron/services/content.service.ts`
**Apply to:** All service functions

```typescript
// Validation errors - throw immediately
if (!existing) {
  throw new Error(`Note with id ${id} not found or is deleted`);
}

// Operation errors - throw with context
if (!updated) {
  throw new Error(`Failed to update note with id ${id}`);
}
```

**Key pattern:** Throw errors for validation failures and operation failures, include context in error messages

### IPC Error Handling
**Source:** `electron/ipc/search.handlers.ts`
**Apply to:** All IPC handlers

```typescript
ipcMain.handle('channel:name', async (event, { param }) => {
  try {
    const db = getDatabase();
    return await serviceFunction(db, param);
  } catch (error) {
    logger.error('channel:name failed', error);
    throw error;
  }
});
```

**Key pattern:** Try/catch in every handler, log errors with channel name, re-throw to propagate to renderer

### Soft Delete Filtering
**Source:** `electron/services/search.service.ts`, `electron/services/notes.service.ts`
**Apply to:** All queries that return notes

```typescript
// In SQL queries
WHERE n.deleted_at IS NULL

// In Drizzle queries
.where(isNull(notes.deleted_at))
```

**Key pattern:** Always filter deleted_at IS NULL unless explicitly including deleted notes

### UUID Generation
**Source:** `electron/services/notes.service.ts`, `electron/services/links.service.ts`
**Apply to:** All new record creation

```typescript
const id = crypto.randomUUID();
```

**Key pattern:** Use crypto.randomUUID() for all primary keys

### Timestamp Handling
**Source:** `electron/services/notes.service.ts`, `electron/services/content.service.ts`
**Apply to:** All record creation and updates

```typescript
const now = new Date();

// In Drizzle insert/update
.values({
  created_at: now,
  updated_at: now,
})
```

**Key pattern:** Use new Date() for timestamps, Drizzle handles conversion to integer

## No Analog Found

All files have close matches in the codebase.

## Metadata

**Analog search scope:** electron/services/, electron/database/, electron/ipc/, src/hooks/, src/components/Notes/
**Files scanned:** 15
**Pattern extraction date:** 2026-05-25
