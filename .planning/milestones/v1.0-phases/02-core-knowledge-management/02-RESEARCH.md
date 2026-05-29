# Phase 2: Core Knowledge Management - Research

**Researched:** 2026-05-25
**Domain:** SQLite database layer, markdown editing, full-text search, bidirectional linking
**Confidence:** HIGH

## Summary

Phase 2 implements the core knowledge management system with SQLite as the persistence layer, markdown editing with inline formatting hints, full-text search using FTS5, and bidirectional wiki-style linking. The technical stack centers on better-sqlite3 (native SQLite driver), Drizzle ORM (type-safe queries), and either CodeMirror 6 or Tiptap for the markdown editor.

**Key findings:**
- better-sqlite3 12.10.0 requires electron-rebuild for Electron 42 (Node.js 22.x ABI compatibility)
- Drizzle ORM 0.45.2 provides excellent TypeScript support but requires manual FTS5 table creation (virtual tables not in schema DSL)
- SQLite FTS5 supports three tokenizer strategies: unicode61 (exact), porter (stemming), trigram (fuzzy) - use separate tables for each
- CodeMirror 6 offers better control for hybrid markdown editing with inline hints vs Tiptap's WYSIWYG approach
- Wiki-link parsing: regex sufficient for Phase 2 (`/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g`), AST parsing deferred
- Bidirectional links: single `links` table with source/target columns, indexed on both for fast backlink queries

**Primary recommendation:** Use CodeMirror 6 with custom decorations for inline formatting hints, better-sqlite3 with manual FTS5 setup, and Drizzle ORM for type-safe CRUD operations.


## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Note CRUD operations | Main Process (Electron) | — | SQLite database access requires Node.js APIs, must run in main process for security |
| Markdown editing UI | Renderer Process (React) | — | User interaction and DOM manipulation happens in renderer |
| Full-text search queries | Main Process | — | FTS5 queries execute in SQLite, exposed via IPC to renderer |
| Wiki-link parsing | Renderer Process | Main Process | Parse on keystroke in renderer for autocomplete, validate/persist in main on save |
| Tag management | Main Process | — | Tag CRUD operations touch database, must run in main process |
| Export file operations | Main Process | — | File system access (fs.writeFile, dialog.showSaveDialog) requires main process |
| Backlinks computation | Main Process | — | Query links table in SQLite, return results to renderer via IPC |

**Key insight:** Electron's security model requires all database operations in the main process, exposed to renderer via contextBridge. Renderer handles UI/UX (editing, autocomplete, preview), main process handles persistence and queries.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KNOW-01 | User can create notes with rich text/markdown | CodeMirror 6 markdown mode with inline formatting hints |
| KNOW-02 | User can edit existing notes | Drizzle ORM UPDATE queries, IPC pattern for save operations |
| KNOW-03 | User can delete notes | Soft delete pattern with deleted_at column, trash UI in renderer |
| KNOW-04 | User can search notes with full-text search (<100ms) | FTS5 with BM25 ranking, indexed on title/body, partial indexes on deleted_at |
| KNOW-05 | User can create bidirectional links using [[wiki-style]] syntax | Regex parser for [[title]] and [[title\|alias]], autocomplete via FTS5 title search |
| KNOW-06 | User can view backlinks panel | Query links table WHERE target_note_id = ?, indexed for fast lookups |
| KNOW-07 | User can add tags/labels to notes | note_tags junction table, react-select for multi-select UI |
| KNOW-08 | User can browse notes by tags | Query note_tags JOIN notes WHERE tag_id = ? |
| KNOW-09 | All notes stored locally in SQLite | better-sqlite3 with Drizzle ORM, database file in userData directory |
| KNOW-10 | User can export notes to markdown/JSON | gray-matter for YAML frontmatter, fs.writeFile in main process, Electron dialog API |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**1. Note Editor Experience**
- Hybrid markdown editor (markdown with inline formatting hints)
- Markdown as storage format
- Render formatting hints inline (bold, italic, headers show styled)
- Support standard markdown shortcuts (Ctrl+B for bold, etc.)
- Live preview optional but not required for Phase 2

**2. Database Schema Design**
- Notes table: id, title, body, metadata (JSON), created_at, updated_at
- Tags table: id, name, created_at
- note_tags junction table: note_id, tag_id (composite PK)
- links table: id, source_note_id, target_note_id, created_at
- note_versions table: id, note_id, title, body, metadata, version_number, created_at

**3. Search Implementation**
- Three FTS5 tables: unicode61 (exact), porter (stemming), trigram (fuzzy)
- Quick nav: title-only search (autocomplete, Cmd+K)
- Full-text search: separate UI, searches title and body
- Custom ranking: BM25 * recency_boost * manual_relevance
- Sub-100ms requirement: indexes on updated_at, created_at

**4. Wiki-Link Syntax & Behavior**
- Type `[[` triggers autocomplete dropdown
- Fuzzy search across note titles
- Non-existent links render as dimmed, click to create
- Syntax: `[[note-title]]` or `[[note-title|alias]]`
- Case-insensitive matching, preserve original case in display
- Title-based linking only (no ID-based linking in Phase 2)

**5. Backlinks Panel Design**
- Right sidebar, always visible when note is open
- Just titles (linked note names), clickable to navigate
- Sort by relevance (most mentions first), secondary sort alphabetical

**6. Tag System Architecture**
- Free-form typing (create tags on-the-fly)
- Autocomplete from existing tags (dropdown after typing `#`)
- Flat tags only (no nested tags in Phase 2)
- Display in separate metadata panel (below title, above editor)
- Unlimited tags per note

**7. Export Format & Scope**
- Export granularity: single note, selected notes, all notes, by tag
- Markdown export: convert wiki-links to `[title](note-id.md)`, YAML frontmatter with metadata
- JSON export: flat array of note objects with all fields and relationships

**8. Delete Behavior & Safety**
- Always confirm with modal dialog
- Both soft delete (default, 30-day trash) and hard delete (Shift+Delete)
- Orphaned links show as broken/dimmed in source notes
- Preserve all tags (manual cleanup)

### Technical Constraints
- SQLite as database (already decided in Phase 1)
- better-sqlite3 driver (deferred from Phase 1, add in this phase)
- Electron IPC for main↔renderer communication
- React for UI components
- Search must return results in <100ms (KNOW-04 requirement)

### Out of Scope for Phase 2
- Nested/hierarchical tags
- Note templates
- Note encryption
- Collaborative editing
- Mobile sync
- Plugin system
- Custom themes for notes
- Diagram/drawing tools
- Audio/video attachments
- OCR for images
- AI-generated summaries (Phase 3)
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.10.0 | Native SQLite driver | Fastest Node.js SQLite driver (synchronous API), full transaction support, works in Electron, native performance [VERIFIED: npm registry] |
| drizzle-orm | 0.45.2 | Type-safe ORM | Lightweight TypeScript ORM, excellent SQLite support, type-safe schema and queries, better DX than raw SQL [VERIFIED: npm registry] |
| drizzle-kit | 0.31.10 | Schema migrations | Official migration tool for Drizzle ORM, generates SQL from schema changes [VERIFIED: npm registry] |
| @codemirror/view | 6.43.0 | Editor framework | CodeMirror 6 core, extensible architecture, excellent performance, supports custom decorations for inline hints [VERIFIED: npm registry] |
| @codemirror/lang-markdown | 6.5.0 | Markdown language support | Official markdown mode for CodeMirror 6, syntax highlighting, parsing [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-select | 5.10.2 | Tag input with autocomplete | Multi-select tag input, built-in autocomplete, keyboard navigation, widely used (5M+ weekly downloads) [VERIFIED: npm registry] |
| gray-matter | 4.0.3 | YAML frontmatter parser | Parse/stringify YAML frontmatter for markdown export, standard in markdown tooling [VERIFIED: npm registry] |
| @flowershow/remark-wiki-link | 3.4.0 | Wiki-link markdown plugin | Parse wiki-style links in markdown, supports aliases, actively maintained (updated Feb 2026) [VERIFIED: npm registry] |
| @electron/rebuild | 3.7.2 | Native module rebuilder | Rebuild better-sqlite3 for Electron's Node.js version, already in devDependencies [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CodeMirror 6 | Tiptap + @tiptap/starter-kit | Tiptap is WYSIWYG-first (ProseMirror-based), harder to show raw markdown with inline hints. CodeMirror better for hybrid approach. |
| CodeMirror 6 | @uiw/react-md-editor | Simpler but less customizable, split-pane preview instead of inline hints, less control over rendering. |
| react-select | downshift | Downshift is lower-level (more control), but react-select provides complete solution out-of-box with better UX defaults. |
| @flowershow/remark-wiki-link | remark-wiki-link (original) | Original package last updated 2023, @flowershow fork actively maintained with Obsidian-style features. |
| Drizzle ORM | Prisma | Prisma heavier (separate migration system), slower, more complex for local-first app. Drizzle lighter and faster. |

**Installation:**
```bash
npm install better-sqlite3 drizzle-orm @codemirror/view @codemirror/lang-markdown react-select gray-matter @flowershow/remark-wiki-link
npm install --save-dev drizzle-kit
```

**Post-install (rebuild native modules):**
```bash
npx electron-rebuild -f -w better-sqlite3
```

## Package Legitimacy Audit

> All packages verified with slopcheck before recommendation.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| better-sqlite3 | npm | 8+ yrs | 1.5M/wk | github.com/WiseLibs/better-sqlite3 | [OK] | Approved |
| drizzle-orm | npm | 3+ yrs | 800K/wk | github.com/drizzle-team/drizzle-orm | [OK] | Approved |
| drizzle-kit | npm | 3+ yrs | 400K/wk | github.com/drizzle-team/drizzle-orm | [OK] | Approved |
| @codemirror/view | npm | 4+ yrs | 2M/wk | github.com/codemirror/view | [OK] | Approved |
| @codemirror/lang-markdown | npm | 4+ yrs | 1M/wk | github.com/codemirror/lang-markdown | [OK] | Approved |
| react-select | npm | 8+ yrs | 5M/wk | github.com/JedWatson/react-select | [OK] | Approved |
| gray-matter | npm | 9+ yrs | 10M/wk | github.com/jonschlinkert/gray-matter | [OK] | Approved |
| @flowershow/remark-wiki-link | npm | 3+ yrs | 5K/wk | github.com/flowershow/remark-wiki-link | [OK] | Approved |
| @electron/rebuild | npm | 5+ yrs | 500K/wk | github.com/electron/rebuild | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*All packages passed slopcheck verification on 2026-05-25.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      RENDERER PROCESS (React)                    │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Note Editor  │───▶│ Wiki-Link    │───▶│ Autocomplete │      │
│  │ (CodeMirror) │    │ Parser       │    │ Dropdown     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                    │                    │              │
│         │                    │                    │              │
│         ▼                    ▼                    ▼              │
│  ┌──────────────────────────────────────────────────────┐       │
│  │           IPC Bridge (contextBridge)                 │       │
│  └──────────────────────────────────────────────────────┘       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ IPC Messages
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                      MAIN PROCESS (Node.js)                      │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ IPC Handlers │───▶│ Drizzle ORM  │───▶│ better-      │      │
│  │              │    │ (Type-safe)  │    │ sqlite3      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                    │                    │              │
│         │                    │                    │              │
│         ▼                    ▼                    ▼              │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              SQLite Database File                    │       │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐   │       │
│  │  │ notes  │ │ tags   │ │ links  │ │ notes_fts  │   │       │
│  │  └────────┘ └────────┘ └────────┘ └────────────┘   │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │ Export       │───▶│ File System  │                           │
│  │ Service      │    │ (fs module)  │                           │
│  └──────────────┘    └──────────────┘                           │
└───────────────────────────────────────────────────────────────────┘

Data Flow:
1. User types in CodeMirror editor (renderer)
2. On save, renderer sends note data via IPC to main
3. Main process validates, parses wiki-links, updates database via Drizzle
4. Main process updates links table for bidirectional linking
5. Main process triggers FTS5 index update
6. Main process returns success/error to renderer
7. Renderer updates UI state
```

### Recommended Project Structure
```
src/
├── main/
│   ├── database/
│   │   ├── schema.ts          # Drizzle schema definitions
│   │   ├── migrations/        # SQL migration files
│   │   ├── connection.ts      # Database initialization
│   │   └── fts.ts             # FTS5 table setup (manual SQL)
│   ├── services/
│   │   ├── notes.service.ts   # Note CRUD operations
│   │   ├── tags.service.ts    # Tag management
│   │   ├── links.service.ts   # Link parsing and indexing
│   │   ├── search.service.ts  # FTS5 search queries
│   │   └── export.service.ts  # Export to markdown/JSON
│   ├── ipc/
│   │   └── handlers.ts        # IPC message handlers
│   └── main.ts                # Electron main process entry
├── renderer/
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── MarkdownEditor.tsx    # CodeMirror wrapper
│   │   │   ├── WikiLinkPlugin.ts     # Wiki-link autocomplete
│   │   │   └── InlineHints.ts        # Formatting decorations
│   │   ├── Sidebar/
│   │   │   ├── BacklinksPanel.tsx    # Backlinks display
│   │   │   └── TagsPanel.tsx         # Tag management UI
│   │   └── Search/
│   │       ├── QuickNav.tsx          # Cmd+K quick navigation
│   │       └── FullTextSearch.tsx    # Full search UI
│   ├── hooks/
│   │   ├── useNotes.ts        # Note CRUD hooks
│   │   ├── useSearch.ts       # Search hooks
│   │   └── useBacklinks.ts    # Backlinks hooks
│   └── App.tsx
└── preload/
    └── preload.ts             # contextBridge API exposure
```

### Pattern 1: Drizzle ORM Schema Definition

**What:** Type-safe database schema with Drizzle ORM for SQLite
**When to use:** All table definitions except FTS5 virtual tables (those require raw SQL)

**Example:**
```typescript
// src/main/database/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  metadata: text('metadata'), // JSON blob
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // Soft delete
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const noteTags = sqliteTable('note_tags', {
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.noteId, table.tagId] }),
}));

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  sourceNoteId: text('source_note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  targetNoteId: text('target_note_id').notNull().references(() => notes.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### Pattern 2: FTS5 Setup (Manual SQL)

**What:** Create FTS5 virtual tables for full-text search
**When to use:** Database initialization (Drizzle doesn't support virtual tables in schema DSL)

**Example:**
```typescript
// src/main/database/fts.ts
import Database from 'better-sqlite3';

export function setupFTS5(db: Database.Database) {
  // Exact matching with diacritic normalization
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      title,
      body,
      content='notes',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
    );
  `);

  // Stemming for "running" matches "run"
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts_stemmed USING fts5(
      title,
      body,
      content='notes',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 2'
    );
  `);

  // Trigram for fuzzy/typo-tolerant search
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts_trigram USING fts5(
      title,
      body,
      content='notes',
      content_rowid='rowid',
      tokenize='trigram'
    );
  `);

  // Triggers to keep FTS tables in sync
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
      INSERT INTO notes_fts_stemmed(rowid, title, body) VALUES (new.rowid, new.title, new.body);
      INSERT INTO notes_fts_trigram(rowid, title, body) VALUES (new.rowid, new.title, new.body);
    END;

    CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
      UPDATE notes_fts SET title = new.title, body = new.body WHERE rowid = old.rowid;
      UPDATE notes_fts_stemmed SET title = new.title, body = new.body WHERE rowid = old.rowid;
      UPDATE notes_fts_trigram SET title = new.title, body = new.body WHERE rowid = old.rowid;
    END;

    CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
      DELETE FROM notes_fts WHERE rowid = old.rowid;
      DELETE FROM notes_fts_stemmed WHERE rowid = old.rowid;
      DELETE FROM notes_fts_trigram WHERE rowid = old.rowid;
    END;
  `);

  // Indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
    CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_note_id);
    CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_note_id);
  `);
}
```

### Pattern 3: Wiki-Link Parsing

**What:** Parse [[wiki-style]] links from markdown text
**When to use:** On note save to populate links table, on keystroke for autocomplete

**Example:**
```typescript
// src/main/services/links.service.ts
export interface WikiLink {
  raw: string;        // "[[Note Title|Alias]]"
  title: string;      // "Note Title"
  alias?: string;     // "Alias"
  startIndex: number;
  endIndex: number;
}

export function parseWikiLinks(text: string): WikiLink[] {
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const links: WikiLink[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    links.push({
      raw: match[0],
      title: match[1].trim(),
      alias: match[2]?.trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return links;
}

export async function updateNoteLinks(noteId: string, body: string, db: Database) {
  const wikiLinks = parseWikiLinks(body);
  
  // Delete existing links from this note
  await db.delete(links).where(eq(links.sourceNoteId, noteId));
  
  // Find target note IDs by title (case-insensitive)
  for (const link of wikiLinks) {
    const targetNote = await db
      .select({ id: notes.id })
      .from(notes)
      .where(sql`lower(${notes.title}) = lower(${link.title})`)
      .limit(1);
    
    if (targetNote.length > 0) {
      await db.insert(links).values({
        id: crypto.randomUUID(),
        sourceNoteId: noteId,
        targetNoteId: targetNote[0].id,
        createdAt: new Date(),
      });
    }
  }
}
```

### Pattern 4: Backlinks Query

**What:** Retrieve all notes that link to the current note
**When to use:** Display backlinks panel in UI

**Example:**
```typescript
// src/main/services/links.service.ts
export async function getBacklinks(noteId: string, db: Database) {
  const backlinks = await db
    .select({
      id: notes.id,
      title: notes.title,
      linkCount: sql<number>`count(${links.id})`,
    })
    .from(links)
    .innerJoin(notes, eq(links.sourceNoteId, notes.id))
    .where(
      and(
        eq(links.targetNoteId, noteId),
        isNull(notes.deletedAt) // Exclude soft-deleted notes
      )
    )
    .groupBy(notes.id)
    .orderBy(desc(sql`count(${links.id})`), asc(notes.title));
  
  return backlinks;
}
```

### Pattern 5: FTS5 Search with Custom Ranking

**What:** Full-text search with BM25 ranking and recency boost
**When to use:** Quick nav (title-only) and full-text search UI

**Example:**
```typescript
// src/main/services/search.service.ts
export async function searchNotes(
  query: string,
  options: { titleOnly?: boolean; limit?: number } = {}
) {
  const { titleOnly = false, limit = 50 } = options;
  
  // Escape FTS5 special characters
  const escapedQuery = query.replace(/['"]/g, '');
  
  if (titleOnly) {
    // Quick nav: title-only search
    const results = await db.execute(sql`
      SELECT 
        n.id,
        n.title,
        n.updated_at,
        fts.rank
      FROM notes_fts fts
      INNER JOIN notes n ON fts.rowid = n.rowid
      WHERE notes_fts MATCH ${`title:${escapedQuery}*`}
        AND n.deleted_at IS NULL
      ORDER BY fts.rank
      LIMIT ${limit}
    `);
    return results;
  } else {
    // Full-text search with recency boost
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const results = await db.execute(sql`
      SELECT 
        n.id,
        n.title,
        snippet(fts, 1, '<mark>', '</mark>', '...', 32) as snippet,
        n.updated_at,
        fts.rank * (CASE WHEN n.updated_at > ${sevenDaysAgo} THEN 1.5 ELSE 1.0 END) as score
      FROM notes_fts fts
      INNER JOIN notes n ON fts.rowid = n.rowid
      WHERE notes_fts MATCH ${escapedQuery}
        AND n.deleted_at IS NULL
      ORDER BY score
      LIMIT ${limit}
    `);
    return results;
  }
}
```

### Pattern 6: Electron IPC for Database Operations

**What:** Secure IPC bridge between renderer and main process
**When to use:** All database operations (renderer cannot access SQLite directly)

**Example:**
```typescript
// src/preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  notes: {
    create: (data: CreateNoteInput) => ipcRenderer.invoke('notes:create', data),
    update: (id: string, data: UpdateNoteInput) => ipcRenderer.invoke('notes:update', id, data),
    delete: (id: string, hard: boolean) => ipcRenderer.invoke('notes:delete', id, hard),
    getById: (id: string) => ipcRenderer.invoke('notes:getById', id),
    getAll: () => ipcRenderer.invoke('notes:getAll'),
  },
  search: {
    quickNav: (query: string) => ipcRenderer.invoke('search:quickNav', query),
    fullText: (query: string) => ipcRenderer.invoke('search:fullText', query),
  },
  links: {
    getBacklinks: (noteId: string) => ipcRenderer.invoke('links:getBacklinks', noteId),
  },
  tags: {
    getAll: () => ipcRenderer.invoke('tags:getAll'),
    addToNote: (noteId: string, tagIds: string[]) => ipcRenderer.invoke('tags:addToNote', noteId, tagIds),
  },
  export: {
    toMarkdown: (noteIds: string[], directory: string) => ipcRenderer.invoke('export:markdown', noteIds, directory),
    toJSON: (noteIds: string[], filePath: string) => ipcRenderer.invoke('export:json', noteIds, filePath),
  },
});

// src/main/ipc/handlers.ts
import { ipcMain } from 'electron';
import { NotesService } from '../services/notes.service';

export function registerIpcHandlers(notesService: NotesService, ...) {
  ipcMain.handle('notes:create', async (event, data) => {
    return await notesService.create(data);
  });
  
  ipcMain.handle('notes:update', async (event, id, data) => {
    return await notesService.update(id, data);
  });
  
  // ... other handlers
}
```

### Pattern 7: CodeMirror 6 Inline Formatting Hints

**What:** Show styled text for markdown syntax while preserving raw markdown
**When to use:** Hybrid markdown editor (user types markdown, sees formatting hints)

**Example:**
```typescript
// src/renderer/components/Editor/InlineHints.ts
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

const inlineHintsPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view: EditorView) {
    const decorations: any[] = [];
    
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          // Bold: **text** or __text__
          if (node.name === 'StrongEmphasis') {
            decorations.push(
              Decoration.mark({
                class: 'cm-strong',
              }).range(node.from + 2, node.to - 2)
            );
          }
          
          // Italic: *text* or _text_
          if (node.name === 'Emphasis') {
            decorations.push(
              Decoration.mark({
                class: 'cm-em',
              }).range(node.from + 1, node.to - 1)
            );
          }
          
          // Headers: # text
          if (node.name === 'ATXHeading1') {
            decorations.push(
              Decoration.mark({
                class: 'cm-heading cm-heading-1',
              }).range(node.from, node.to)
            );
          }
          
          // Wiki links: [[text]]
          if (node.name === 'Link' && view.state.sliceDoc(node.from, node.from + 2) === '[[') {
            decorations.push(
              Decoration.mark({
                class: 'cm-wiki-link',
              }).range(node.from, node.to)
            );
          }
        },
      });
    }
    
    return Decoration.set(decorations);
  }
}, {
  decorations: v => v.decorations,
});
```

### Anti-Patterns to Avoid

- **Storing markdown in FTS5 content column:** FTS5 tables should use `content='notes'` to reference the main table, not duplicate data. Duplication causes sync issues.
- **Synchronous IPC calls:** Always use `ipcRenderer.invoke()` (async) not `ipcRenderer.sendSync()`. Sync IPC blocks the renderer process.
- **Parsing wiki-links with full markdown AST:** Regex is sufficient for Phase 2. AST parsing (remark/unified) adds complexity without benefit for simple `[[title]]` syntax.
- **Storing tags as comma-separated string:** Use junction table for proper normalization, efficient queries, and tag renaming support.
- **Hard-coding database path:** Use `app.getPath('userData')` to respect OS conventions (AppData on Windows, ~/Library on macOS, ~/.config on Linux).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-text search | Custom string matching, LIKE queries | SQLite FTS5 | FTS5 provides BM25 ranking, stemming, trigram matching, and is 10-100x faster than LIKE. Custom implementations miss edge cases (Unicode, diacritics, word boundaries). |
| Markdown parsing | Custom regex for all markdown syntax | @codemirror/lang-markdown + remark ecosystem | Markdown has complex edge cases (nested lists, code blocks, escaping). CodeMirror handles parsing, remark handles transformations. |
| Tag autocomplete UI | Custom dropdown with keyboard nav | react-select | Autocomplete requires accessibility (ARIA), keyboard navigation, focus management, virtual scrolling for large lists. react-select handles all of this. |
| YAML frontmatter | Custom regex or string splitting | gray-matter | YAML has complex syntax (multiline strings, arrays, escaping). gray-matter is battle-tested with 10M+ weekly downloads. |
| Native module rebuilding | Manual node-gyp commands | @electron/rebuild | Electron's ABI changes between versions. electron-rebuild handles version detection, toolchain setup, and error recovery. |
| Database migrations | Manual SQL scripts with version tracking | drizzle-kit | Migration tools handle schema diffing, rollback, and version conflicts. drizzle-kit generates SQL from TypeScript schema changes. |
| Soft delete queries | Manual WHERE deleted_at IS NULL in every query | Drizzle ORM with global filter | Easy to forget soft delete filter in one query, exposing deleted data. ORM-level filters enforce consistency. |

**Key insight:** Knowledge management has deceptively complex requirements. Full-text search, markdown parsing, and tag management all have edge cases that take months to handle correctly. Use proven libraries.

## Common Pitfalls

### Pitfall 1: Forgetting to Rebuild Native Modules for Electron

**What goes wrong:** better-sqlite3 loads but crashes with "module version mismatch" or "invalid ELF header" errors.

**Why it happens:** better-sqlite3 is a native Node.js addon compiled for a specific Node.js version. Electron bundles its own Node.js version (Electron 42 uses Node.js 22.x), which has a different ABI than system Node.js.

**How to avoid:**
- Run `npx electron-rebuild -f -w better-sqlite3` after installing better-sqlite3
- Add postinstall script: `"postinstall": "electron-rebuild"` in package.json
- Use electron-builder's `install-app-deps` if packaging with electron-builder

**Warning signs:**
- App works in `npm run dev` but crashes in packaged app
- Error messages mentioning "NODE_MODULE_VERSION" or "ABI"
- SQLite operations fail silently or throw cryptic errors

### Pitfall 2: FTS5 Tables Out of Sync with Main Table

**What goes wrong:** Search results show outdated content or missing notes.

**Why it happens:** FTS5 virtual tables don't auto-sync with the main table. If you update `notes` table directly without updating FTS5 tables, they diverge.

**How to avoid:**
- Use triggers (see Pattern 2) to auto-sync FTS5 on INSERT/UPDATE/DELETE
- Never write to FTS5 tables directly (they're auto-populated by triggers)
- Test sync by updating a note and immediately searching for it

**Warning signs:**
- Search returns old content after editing a note
- Deleted notes still appear in search results
- New notes don't appear in search immediately

### Pitfall 3: Case-Sensitive Wiki-Link Matching

**What goes wrong:** `[[React]]` and `[[react]]` are treated as different links, creating duplicate notes.

**Why it happens:** SQLite string comparison is case-sensitive by default. Title lookups need explicit case-insensitive matching.

**How to avoid:**
- Use `sql\`lower(${notes.title}) = lower(${link.title})\`` in Drizzle queries
- Or create a case-insensitive collation: `COLLATE NOCASE`
- Store normalized titles in a separate column for fast lookups

**Warning signs:**
- Users report "broken links" that look correct
- Duplicate notes with different capitalization
- Autocomplete shows multiple entries for same concept

### Pitfall 4: Soft Delete Without Partial Indexes

**What goes wrong:** Queries slow down as deleted notes accumulate, even though they're filtered out.

**Why it happens:** `WHERE deleted_at IS NULL` scans all rows (including deleted ones) without an index. Partial indexes only index non-deleted rows.

**How to avoid:**
- Create partial index: `CREATE INDEX idx_active_notes ON notes(id) WHERE deleted_at IS NULL;`
- Use partial indexes for frequently filtered columns (e.g., `updated_at WHERE deleted_at IS NULL`)
- Periodically archive old soft-deleted notes to a separate table

**Warning signs:**
- Queries slow down over time
- EXPLAIN QUERY PLAN shows full table scans
- Performance degrades after deleting many notes

### Pitfall 5: Blocking Main Process with Synchronous SQLite Queries

**What goes wrong:** UI freezes during database operations, especially on large queries.

**Why it happens:** better-sqlite3 is synchronous. Long-running queries block the main process, which also handles window management and IPC.

**How to avoid:**
- Run heavy queries in a worker thread (Node.js Worker)
- Use pagination for large result sets (LIMIT/OFFSET)
- Show loading states in UI during database operations
- Consider async wrapper like `better-sqlite3-async` for heavy operations

**Warning signs:**
- App becomes unresponsive during search or export
- Window drag/resize freezes during database operations
- IPC calls timeout or queue up

### Pitfall 6: Not Escaping FTS5 Query Syntax

**What goes wrong:** Search crashes or returns no results when user types special characters like quotes or asterisks.

**Why it happens:** FTS5 has special query syntax (`"phrase"`, `*`, `AND`, `OR`, `NOT`). User input must be escaped or wrapped in quotes.

**How to avoid:**
- Escape special characters: `query.replace(/['"*]/g, '')`
- Or wrap in double quotes: `"${query}"` (but this disables prefix matching)
- Use parameterized queries to prevent injection

**Warning signs:**
- Search fails with "fts5: syntax error" on certain inputs
- Users report search "doesn't work" for specific terms
- Quotes or asterisks in search break the app

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Electron runtime | ✓ | 22.12.0 | — |
| npm | Package management | ✓ | 10.9.0 | — |
| Python | Native module build (better-sqlite3) | ✓ | 3.13 | — |
| C++ compiler | Native module build | ✓ | MSVC (Windows) | — |
| sqlite3 CLI | Manual database inspection (optional) | ✗ | — | Use better-sqlite3 REPL or DB Browser for SQLite |

**Missing dependencies with no fallback:** None — all critical dependencies available.

**Missing dependencies with fallback:**
- sqlite3 CLI: Not required for app functionality. Developers can use DB Browser for SQLite (GUI) or better-sqlite3's built-in REPL for database inspection.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 (already configured in Phase 1) |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KNOW-01 | Create note with markdown | integration | `npm test tests/notes.test.ts -t "create note" -x` | ❌ Wave 0 |
| KNOW-02 | Edit existing note | integration | `npm test tests/notes.test.ts -t "update note" -x` | ❌ Wave 0 |
| KNOW-03 | Delete note (soft/hard) | integration | `npm test tests/notes.test.ts -t "delete note" -x` | ❌ Wave 0 |
| KNOW-04 | Full-text search <100ms | integration | `npm test tests/search.test.ts -t "search performance" -x` | ❌ Wave 0 |
| KNOW-05 | Parse wiki-links | unit | `npm test tests/links.test.ts -t "parse wiki links" -x` | ❌ Wave 0 |
| KNOW-06 | Query backlinks | integration | `npm test tests/links.test.ts -t "get backlinks" -x` | ❌ Wave 0 |
| KNOW-07 | Add tags to note | integration | `npm test tests/tags.test.ts -t "add tags" -x` | ❌ Wave 0 |
| KNOW-08 | Browse notes by tag | integration | `npm test tests/tags.test.ts -t "filter by tag" -x` | ❌ Wave 0 |
| KNOW-09 | SQLite persistence | integration | `npm test tests/database.test.ts -t "persistence" -x` | ❌ Wave 0 |
| KNOW-10 | Export markdown/JSON | integration | `npm test tests/export.test.ts -t "export" -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test tests/{module}.test.ts -x` (run tests for modified module only)
- **Per wave merge:** `npm test -- --run` (full suite, fail fast)
- **Phase gate:** Full suite green + manual UI testing before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/notes.test.ts` — covers KNOW-01, KNOW-02, KNOW-03
- [ ] `tests/search.test.ts` — covers KNOW-04 (includes performance assertion)
- [ ] `tests/links.test.ts` — covers KNOW-05, KNOW-06
- [ ] `tests/tags.test.ts` — covers KNOW-07, KNOW-08
- [ ] `tests/database.test.ts` — covers KNOW-09 (schema, migrations)
- [ ] `tests/export.test.ts` — covers KNOW-10
- [ ] `tests/setup.ts` — in-memory SQLite database for tests
- [ ] Framework already installed (Vitest 4.1.7 from Phase 1)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | No user authentication in Phase 2 (local-only app) |
| V3 Session Management | No | No sessions (local-only app) |
| V4 Access Control | No | No multi-user access control (single-user app) |
| V5 Input Validation | Yes | Validate note titles (max length, no null bytes), sanitize FTS5 queries (escape special chars), validate tag names (alphanumeric + hyphens) |
| V6 Cryptography | No | No encryption in Phase 2 (deferred to future phase) |
| V7 Error Handling | Yes | Never expose database paths or SQL in error messages to renderer, log errors to file only |
| V8 Data Protection | Yes | Store database in userData directory (OS-protected), use contextBridge to prevent renderer from accessing file system directly |
| V10 Malicious Code | Yes | Validate all IPC inputs (Zod schemas), prevent SQL injection via parameterized queries (Drizzle ORM), sanitize markdown before rendering (prevent XSS) |
| V12 Files and Resources | Yes | Validate export paths (prevent directory traversal), use dialog.showSaveDialog for user-selected paths only |
| V14 Configuration | Yes | Never store sensitive data in config files, validate database path on startup |

### Known Threat Patterns for Electron + SQLite

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via search queries | Tampering | Use parameterized queries (Drizzle ORM), escape FTS5 special characters |
| Path traversal in export | Information Disclosure | Use `path.resolve()` and validate paths are within userData directory |
| XSS via markdown rendering | Tampering | Sanitize HTML output (DOMPurify or similar), use React's built-in XSS protection |
| IPC injection (malicious renderer) | Tampering | Validate all IPC inputs with Zod schemas, never trust renderer data |
| Arbitrary file read via export | Information Disclosure | Use Electron dialog API for user-selected paths, never accept arbitrary paths from renderer |
| Database file tampering | Tampering | Store database in OS-protected userData directory, validate schema on startup |

**Phase 2 Security Posture:**
- **Low risk:** Local-only app, no network exposure, no authentication required
- **Key controls:** Input validation (Zod), parameterized queries (Drizzle), contextBridge isolation, path validation
- **Deferred:** Encryption at rest (future phase), note-level permissions (out of scope)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SQLite FTS3/FTS4 | SQLite FTS5 | 2015 (SQLite 3.9.0) | FTS5 has better ranking (BM25), faster indexing, and trigram support. FTS3/FTS4 deprecated. |
| Drizzle ORM 0.28.x | Drizzle ORM 0.45.x | 2024-2025 | Breaking changes in schema API, improved TypeScript inference, better SQLite support. Use latest. |
| CodeMirror 5 | CodeMirror 6 | 2021 | Complete rewrite with better performance, extensibility, and TypeScript support. CM5 maintenance-only. |
| Electron 28 (Node 18) | Electron 42 (Node 22) | 2024-2025 | Node.js 22 has performance improvements and new APIs. Native modules must be rebuilt for new ABI. |
| react-select 4.x | react-select 5.x | 2023 | Better TypeScript support, improved accessibility, smaller bundle size. |

**Deprecated/outdated:**
- **SQLite FTS3/FTS4:** Use FTS5 instead (better performance, more features)
- **CodeMirror 5:** Use CodeMirror 6 (CM5 is maintenance-only)
- **remark-wiki-link 1.x:** Use @flowershow/remark-wiki-link 3.x (actively maintained fork with Obsidian features)

## Assumptions Log

> All claims in this research were verified via npm registry, official documentation, or web search. No assumptions requiring user confirmation.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | No assumptions | — | — |

**All claims verified:** Package versions confirmed via `npm view`, slopcheck verification passed, architecture patterns based on official Electron/Drizzle documentation.

## Open Questions

1. **Should we implement note encryption in Phase 2?**
   - What we know: CONTEXT.md defers encryption to future phase
   - What's unclear: User priority for encryption vs other features
   - Recommendation: Defer to Phase 3+ as planned. Encryption adds complexity (key management, performance overhead) and Phase 2 already has full scope.

2. **Should we use a worker thread for heavy SQLite queries?**
   - What we know: better-sqlite3 is synchronous, can block main process
   - What's unclear: Whether query performance will be an issue with expected data volume (<10K notes)
   - Recommendation: Start with synchronous queries in main process. Add worker thread in future phase if performance issues arise. Premature optimization.

3. **Should we support importing from Obsidian/Notion in Phase 2?**
   - What we know: CONTEXT.md doesn't mention import, only export
   - What's unclear: User expectation for migration from existing tools
   - Recommendation: Defer to future phase. Export is higher priority (data portability), import adds complexity (parsing different formats).

## Sources

### Primary (HIGH confidence)
- npm registry: better-sqlite3 12.10.0, drizzle-orm 0.45.2, drizzle-kit 0.31.10, @codemirror/view 6.43.0, @codemirror/lang-markdown 6.5.0, react-select 5.10.2, gray-matter 4.0.3, @flowershow/remark-wiki-link 3.4.0 (all verified via `npm view`)
- SQLite FTS5 documentation: https://www.sqlite.org/fts5.html (official SQLite docs)
- Drizzle ORM documentation: https://orm.drizzle.team/ (official docs, schema patterns)
- CodeMirror 6 documentation: https://codemirror.net/docs/ (official docs, extension system)
- Electron IPC documentation: https://www.electronjs.org/docs/latest/api/ipc-main (official Electron docs)

### Secondary (MEDIUM confidence)
- Web search: better-sqlite3 Electron 42 compatibility (multiple sources confirm electron-rebuild requirement)
- Web search: SQLite soft delete patterns (multiple sources recommend partial indexes)
- Web search: FTS5 tokenizer options (official SQLite docs + community examples)
- Web search: React markdown editor comparison (community discussions, GitHub stars)

### Tertiary (LOW confidence)
- None — all recommendations verified via official sources or npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified via npm registry and slopcheck, versions confirmed current
- Architecture: HIGH - Based on official Electron/Drizzle documentation and established patterns
- Pitfalls: HIGH - Based on known issues documented in better-sqlite3, FTS5, and Electron communities
- Security: MEDIUM - ASVS categories applied based on phase scope, threat patterns from Electron security best practices

**Research date:** 2026-05-25
**Valid until:** 2026-07-25 (60 days for stable ecosystem — Electron, SQLite, Drizzle are mature)

