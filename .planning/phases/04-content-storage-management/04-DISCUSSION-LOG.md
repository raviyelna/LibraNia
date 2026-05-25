# Phase 4: Content Storage & Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 04-content-storage-management
**Areas discussed:** File storage location & organization, Document & image handling, Metadata schema & extensibility, Content-to-note linking, API design

---

## File Storage Location & Organization

### Question 1: Where should files live on disk?

| Option | Description | Selected |
|--------|-------------|----------|
| Flat directory with UUID filenames | Simple, fast lookups. Existing pattern: notes use UUID primary keys. Trade-off: no semantic organization on disk. | ✓ |
| Organized by type/date | Human-readable structure. Easier debugging. Trade-off: path changes if type/date changes, needs migration logic. | |
| Type-based folders only | Balance: type folders, flat within each. Trade-off: still needs type classification logic. | |

**User's choice:** Flat directory with UUID filenames (Recommended)

### Question 2: Where should the content directory be located?

| Option | Description | Selected |
|--------|-------------|----------|
| Project root /content/ directory | Store in user data directory alongside database. Existing: config.json in project root. Trade-off: simple but mixes concerns. | ✓ |
| Electron app.getPath('userData') + /content/ | OS-appropriate location (AppData on Windows, ~/Library on Mac). Existing: electron-store uses this. Trade-off: harder to find manually. | |
| User-configurable content directory | User picks location on first launch. Trade-off: flexibility but needs migration UI if changed. | |

**User's choice:** Project root /content/ directory

### Question 3: What file naming convention?

| Option | Description | Selected |
|--------|-------------|----------|
| UUID + original extension | Store original extension in database, reconstruct on read. Existing: notes store metadata as JSON. Trade-off: simple, preserves type info. | ✓ |
| UUID only, no extension | No extension, infer from MIME type in metadata. Trade-off: cleaner filenames but harder debugging. | |
| Content-addressed | Hash-based deduplication. Trade-off: saves space but loses upload history. | |

**User's choice:** UUID + original extension (e.g., abc123.pdf) (Recommended)

### Question 4: How should file writes be handled for safety?

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic writes (temp file + rename) | Atomic writes prevent corruption. Existing: Phase 1 config uses temp file + rename. Trade-off: slightly slower but safer. | ✓ |
| Direct write to final location | Faster but risky if interrupted. Trade-off: simpler code, corruption risk. | |
| Write + checksum verification | Verify integrity after write. Trade-off: slower, catches corruption but doesn't prevent it. | |

**User's choice:** Atomic writes (temp file + rename) (Recommended)

---

## Document & Image Handling

### Question 1: Which document formats should be supported?

| Option | Description | Selected |
|--------|-------------|----------|
| PDF, DOCX, TXT, MD | Common formats, good coverage. Existing: markdown in notes. Trade-off: needs multiple parsers. | ✓ |
| Text-only (TXT, MD) | Simpler, fewer dependencies. Trade-off: limits usefulness. | |
| All common formats | Maximum flexibility. Trade-off: complex validation, security risks. | |

**User's choice:** PDF, DOCX, TXT, MD (Recommended)

### Question 2: Should document text be extracted for search?

| Option | Description | Selected |
|--------|-------------|----------|
| Extract text and index in FTS5 | Extract text for search integration. Existing: FTS5 for notes. Trade-off: processing time on upload, enables powerful search. | ✓ |
| Store only, no text extraction | Faster uploads, no processing. Trade-off: documents not searchable by content. | |
| Store immediately, extract text in background | Best of both worlds. Trade-off: more complex, async processing needed. | |

**User's choice:** Extract text and index in FTS5 (Recommended)

### Question 3: Which image formats should be supported?

| Option | Description | Selected |
|--------|-------------|----------|
| PNG, JPG, WebP | Web-optimized formats. Existing: no image handling yet. Trade-off: good balance of quality and compatibility. | ✓ |
| PNG, JPG only | Maximum compatibility. Trade-off: larger files, no modern format benefits. | |
| PNG, JPG, WebP, SVG | Include vector graphics. Trade-off: needs SVG sanitization for security. | |

**User's choice:** PNG, JPG, WebP (Recommended)

### Question 4: How should images be stored and optimized?

| Option | Description | Selected |
|--------|-------------|----------|
| Store original + generate thumbnails | Store originals, generate thumbnails for UI. Existing: no image processing. Trade-off: uses more disk but preserves quality. | ✓ |
| Compress originals, no thumbnails | Compress on upload to save space. Trade-off: lossy, can't recover original quality. | |
| Store originals only, no optimization | Simplest approach. Trade-off: slower UI, large memory usage for big images. | |

**User's choice:** Store original + generate thumbnails (Recommended)

---

## Metadata Schema & Extensibility

### Question 1: How should content source be tracked?

| Option | Description | Selected |
|--------|-------------|----------|
| source: 'manual' \| 'ai-generated' | Track origin. Existing: messages table has provider_id. Trade-off: enables filtering by source. | ✓ |
| No source field | No source tracking. Trade-off: simpler schema, loses provenance. | |
| source_type + source_detail | More granular. Trade-off: complex, may need enum updates. | |

**User's choice:** source: 'manual' | 'ai-generated' (Recommended)

### Question 2: Should confidence scores be stored for AI-generated content?

| Option | Description | Selected |
|--------|-------------|----------|
| confidence_score: 0.0-1.0 for AI content | AI confidence scores for verification. Requirement CONT-06 mentions confidence. Trade-off: enables quality filtering. | ✓ |
| No confidence scores | Simpler schema. Trade-off: loses quality signal, can't filter low-confidence content. | |
| confidence_level: 'low' \| 'medium' \| 'high' | More nuanced. Trade-off: complex, subjective categories. | |

**User's choice:** confidence_score: 0.0-1.0 for AI content (Recommended)

### Question 3: How should metadata be stored in the database?

| Option | Description | Selected |
|--------|-------------|----------|
| JSON blob in metadata column | Flexible, extensible. Existing: notes.metadata is JSON blob. Trade-off: consistent pattern, easy to extend. | ✓ |
| Dedicated columns for each field | Type-safe, indexed. Trade-off: schema changes need migrations. | |
| Core fields as columns + JSON for extensions | Best of both. Trade-off: more complex schema. | |

**User's choice:** JSON blob in metadata column (Recommended)

### Question 4: How should content be tagged/categorized?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse tags table with content_tags junction | Reuse existing tags system. Existing: tags table + note_tags junction. Trade-off: consistent with notes, enables cross-content tagging. | ✓ |
| Separate content_tags table | Separate namespace. Trade-off: more tables, prevents tag confusion. | |
| Store tags as JSON array in metadata | Simpler. Trade-off: no tag management UI, harder to browse. | |

**User's choice:** Reuse tags table with content_tags junction (Recommended)

---

## Content-to-Note Linking

### Question 1: How should content relate to notes?

| Option | Description | Selected |
|--------|-------------|----------|
| Attachments on notes (note has_many content) | Content can attach to notes. Existing: links table for note-to-note. Trade-off: clear ownership, matches attachment mental model. | ✓ |
| Standalone content library | Content is first-class. Trade-off: more flexible but less clear ownership. | |
| Bidirectional many-to-many | Maximum flexibility. Trade-off: complex queries, many-to-many junction table needed. | |

**User's choice:** Attachments on notes (note has_many content) (Recommended)

### Question 2: How should the note-to-content relationship be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| content.note_id foreign key | Simple foreign key. Existing: messages.conversation_id uses this. Trade-off: straightforward, CASCADE delete works. | ✓ |
| note_content junction table | Separate table. Existing: note_tags junction. Trade-off: overkill for one-to-many. | |
| Store note_id in content.metadata JSON | No database link. Trade-off: flexible but loses referential integrity. | |

**User's choice:** content.note_id foreign key (Recommended)

### Question 3: What happens to content when a note is deleted?

| Option | Description | Selected |
|--------|-------------|----------|
| SET NULL (orphan content, keep files) | Keep content when note deleted. Existing: links use SET NULL for targets. Trade-off: preserves content, orphans visible. | ✓ |
| CASCADE (delete content when note deleted) | Delete content with note. Existing: messages CASCADE with conversations. Trade-off: cleaner but loses content. | |
| Soft delete content when note soft-deleted | Soft delete both. Existing: notes use deleted_at. Trade-off: recoverable but complex queries. | |

**User's choice:** SET NULL (orphan content, keep files) (Recommended)

### Question 4: How should content be referenced from note body?

| Option | Description | Selected |
|--------|-------------|----------|
| Wiki-link syntax for content: [[content:uuid]] | Inline references. Existing: wiki-links use [[note-title]]. Trade-off: consistent syntax, searchable. | ✓ |
| Markdown links: [title](content://uuid) | Markdown standard. Trade-off: familiar but verbose for internal refs. | |
| Attachments panel only, no inline references | No inline syntax. Trade-off: simpler parsing, less discoverable. | |

**User's choice:** Wiki-link syntax for content: [[content:uuid]] (Recommended)

---

## API Design

### Question 1: Where should content management logic live?

| Option | Description | Selected |
|--------|-------------|----------|
| Service layer in electron/services/content.service.ts | Matches existing pattern. Existing: notes.service.ts, conversation.service.ts. Trade-off: consistent architecture. | ✓ |
| IPC handlers call database directly | Direct database access. Trade-off: simpler but bypasses service layer pattern. | |
| Standalone content module with its own structure | Separate module. Trade-off: more isolated but breaks existing pattern. | |

**User's choice:** Service layer in electron/services/content.service.ts (Recommended)

### Question 2: What operations should the content API expose?

| Option | Description | Selected |
|--------|-------------|----------|
| createContent, getContent, updateContent, deleteContent | Standard CRUD. Existing: notes have createNote, updateNote, deleteNote, getNoteById, getAllNotes. Trade-off: familiar pattern. | ✓ |
| uploadContent, downloadContent, attachToNote, detachFromNote | More semantic. Trade-off: clearer intent but more methods. | |
| saveContent, loadContent only | Minimal surface. Trade-off: simpler but less discoverable. | |

**User's choice:** createContent, getContent, updateContent, deleteContent (Recommended)

### Question 3: How should content APIs be exposed to renderer?

| Option | Description | Selected |
|--------|-------------|----------|
| window.api.content.* namespace | Matches existing pattern. Existing: window.api.notes.*, window.api.chat.*. Trade-off: consistent with Phase 2 & 3. | ✓ |
| window.api.uploadFile, window.api.getFile, etc. | Flatter structure. Trade-off: simpler but less organized. | |
| window.library.* namespace | Separate namespace. Trade-off: clearer separation but inconsistent with existing. | |

**User's choice:** window.api.content.* namespace (Recommended)

### Question 4: How should large file uploads/downloads be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Stream large files with progress events | Streaming for large files. Existing: AI uses streaming for tokens. Trade-off: better UX for large uploads/downloads. | ✓ |
| Synchronous read/write, no streaming | Simpler implementation. Trade-off: blocks UI, no progress feedback. | |
| Async read/write, no progress events | Non-blocking. Trade-off: complex error handling, no progress. | |

**User's choice:** Stream large files with progress events (Recommended)

---

## Claude's Discretion

None — all areas had explicit decisions.

## Deferred Ideas

None — discussion stayed within phase scope.
