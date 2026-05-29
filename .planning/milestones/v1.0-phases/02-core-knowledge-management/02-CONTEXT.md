---
phase: 2
phase_name: Core Knowledge Management
created: 2026-05-25
status: locked
---

# Context: Phase 2 - Core Knowledge Management

**Phase Goal:** Users can create, organize, and search their personal knowledge base with bidirectional linking

**Requirements:** KNOW-01 through KNOW-10

---

## Locked Decisions

### 1. Note Editor Experience

**Decision:** Hybrid markdown editor (markdown with inline formatting hints)

**Rationale:** Balances power-user markdown efficiency with visual feedback for casual editing. Users type markdown but see formatting hints inline.

**Implementation guidance:**
- Use markdown as storage format
- Render formatting hints inline (bold, italic, headers show styled)
- Support standard markdown shortcuts (Ctrl+B for bold, etc.)
- Live preview optional but not required for Phase 2

---

### 2. Database Schema Design

**Notes table structure:**
```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata TEXT, -- JSON blob for extensibility
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Rationale:** Separate fields enable efficient title-only queries, FTS indexing flexibility, and clear schema evolution path.

**Tags storage:**
```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE note_tags (
  note_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

**Rationale:** Junction table enables efficient tag queries, prevents duplicates, supports tag renaming without touching notes.

**Links storage:**
```sql
CREATE TABLE links (
  id TEXT PRIMARY KEY,
  source_note_id TEXT NOT NULL,
  target_note_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE SET NULL
);
```

**Rationale:** Dedicated table enables fast backlink queries. Parse inline markdown on save to populate table. Table is source of truth for link existence checks.

**Versioning:**
```sql
CREATE TABLE note_versions (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata TEXT,
  version_number INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

**Rationale:** Track edit history for undo/recovery. Snapshot on every save. Retention policy TBD (could limit to last N versions or time window).

---

### 3. Search Implementation

**FTS5 configuration:**
```sql
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title,
  body,
  tokenize='unicode61 remove_diacritics 2'
);

-- Separate FTS table for porter stemming
CREATE VIRTUAL TABLE notes_fts_stemmed USING fts5(
  title,
  body,
  tokenize='porter unicode61 remove_diacritics 2'
);

-- Trigram for fuzzy search
CREATE VIRTUAL TABLE notes_fts_trigram USING fts5(
  title,
  body,
  tokenize='trigram'
);
```

**Rationale:** Three FTS tables support different search modes:
- `unicode61` for exact matching with diacritic normalization
- `porter` for stemming ("running" matches "run")
- `trigram` for fuzzy/typo-tolerant search

**Search scope:**
- **Quick nav:** Title-only search (autocomplete, Cmd+K)
- **Full-text search:** Separate search UI, searches both title and body

**Ranking:**
- Custom scoring formula: `BM25(match) * recency_boost * manual_relevance`
- Recency boost: notes edited in last 7 days get 1.5x multiplier
- Manual relevance: user can pin/boost specific notes (stored in metadata)

**Implementation guidance:**
- Quick nav uses `notes_fts` with `title MATCH ?` only
- Full-text uses all three FTS tables, merges results, applies custom scoring
- Sub-100ms requirement: add indexes on `updated_at`, `created_at`

---

### 4. Wiki-Link Syntax & Behavior

**Link creation UX:**
- Type `[[` triggers autocomplete dropdown
- Fuzzy search across note titles
- Arrow keys to navigate, Enter to insert
- Esc to cancel

**Non-existent links:**
- Render as dimmed/grayed text in preview
- Click dimmed link → create new note with that title
- No validation on typing (allow broken links during drafting)

**Link display:**
- Edit mode: show raw syntax `[[note-id]]` or `[[note-id|alias]]`
- Preview mode: render as clickable link with title or alias
- Support aliases: `[[note-id|Custom Display Text]]`

**Case sensitivity:**
- Case-insensitive matching (normalize to lowercase for lookups)
- Preserve original case in display

**Syntax:**
- Standard: `[[note-title]]` (looks up by title, case-insensitive)
- With alias: `[[note-title|display text]]`
- No support for `[[note-id]]` by ID (title-based linking only for Phase 2)

---

### 5. Backlinks Panel Design

**Location:** Right sidebar, always visible when note is open

**Content:** Just titles (linked note names), clickable to navigate

**Sorting:** By relevance (most mentions first)
- Count number of links from each source note
- Sort descending by link count
- Secondary sort: alphabetical by title

**Implementation guidance:**
- Query `links` table: `SELECT source_note_id, COUNT(*) FROM links WHERE target_note_id = ? GROUP BY source_note_id ORDER BY COUNT(*) DESC`
- Join with `notes` table to get titles
- Render as simple list with click handlers

---

### 6. Tag System Architecture

**Tag creation:**
- Free-form typing (create tags on-the-fly)
- Autocomplete from existing tags (dropdown after typing `#`)
- No predefined list

**Tag hierarchy:** Flat tags only (`#javascript`, `#react`)
- No nested tags in Phase 2 (defer to future phase)

**Tag display:** Separate metadata panel (below title, above editor)

**Tag limits:** Unlimited tags per note

**Implementation guidance:**
- Tag input: multi-select with autocomplete
- Store tags in `note_tags` junction table
- Display as chips/badges in metadata panel
- Click tag → filter notes by that tag

---

### 7. Export Format & Scope

**Export granularity:** All options available, user chooses at export time:
- Single note (current note only)
- Selected notes (multi-select in note list)
- All notes (full library)
- By tag (all notes with specific tag)

**Markdown export:**
- Convert wiki-links to standard markdown: `[[note-title]]` → `[note-title](note-id.md)`
- Include YAML frontmatter with metadata:
  ```yaml
  ---
  id: note-id
  title: Note Title
  tags: [tag1, tag2]
  created: 2026-05-25T12:00:00Z
  updated: 2026-05-25T14:30:00Z
  ---
  ```
- One `.md` file per note
- Export to user-selected directory

**JSON export:**
- Flat array of note objects
- Include all fields: id, title, body, tags, created_at, updated_at, metadata
- Include relationships: links array (source/target pairs), backlinks array
- Single `.json` file
- Structure:
  ```json
  {
    "notes": [
      {
        "id": "note-1",
        "title": "Note Title",
        "body": "Note content...",
        "tags": ["tag1", "tag2"],
        "created_at": 1716638400,
        "updated_at": 1716638400,
        "metadata": {},
        "links": ["note-2", "note-3"],
        "backlinks": ["note-4"]
      }
    ]
  }
  ```

---

### 8. Delete Behavior & Safety

**Delete confirmation:** Always confirm with modal dialog
- Show note title
- Show backlink count if > 0
- "Delete" and "Cancel" buttons

**Delete type:** Both soft and hard delete
- Default: Soft delete (move to trash, recoverable)
- Shift+Delete: Hard delete (permanent, bypass trash)
- Trash retention: 30 days, then auto-purge

**Orphaned link handling:** Show as broken/dimmed in source notes
- Render as `~~[[deleted-note-title]]~~` (strikethrough + dimmed)
- Click broken link → show "Note deleted" message
- Do not auto-remove link syntax (preserve context)

**Cascade behavior:** Preserve all tags (manual cleanup)
- Deleting a note does NOT delete its tags
- Tags remain in `tags` table even if unused
- User can manually delete unused tags via tag management UI (future phase)

**Implementation guidance:**
- Soft delete: add `deleted_at` column to `notes` table, filter `WHERE deleted_at IS NULL` in queries
- Hard delete: `DELETE FROM notes WHERE id = ?` (cascades via foreign keys)
- Trash UI: separate view showing `WHERE deleted_at IS NOT NULL`, with "Restore" and "Delete Permanently" actions

---

## Technical Constraints

- SQLite as database (already decided in Phase 1)
- better-sqlite3 driver (deferred from Phase 1, add in this phase)
- Electron IPC for main↔renderer communication
- React for UI components
- Search must return results in <100ms (KNOW-04 requirement)

---

## Out of Scope for Phase 2

- Nested/hierarchical tags (flat tags only)
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

---

## Success Criteria (from ROADMAP.md)

1. User can create notes with rich text/markdown formatting
2. User can edit and delete existing notes
3. User can search notes with full-text search returning results in under 100ms
4. User can create bidirectional links using [[wiki-style]] syntax and view backlinks panel
5. User can organize notes with tags and browse by tag
6. User can export their entire knowledge base to markdown or JSON format

---

## Dependencies

- Phase 1 complete (Electron app shell, theme system, navigation)
- better-sqlite3 installed and working with Electron 42
- Drizzle ORM for type-safe queries

---

*Context locked: 2026-05-25*
*All decisions captured from user discussion*
