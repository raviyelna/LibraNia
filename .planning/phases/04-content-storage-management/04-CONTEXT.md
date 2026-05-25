# Phase 4: Content Storage & Management - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Store diverse content types (documents, images) with rich metadata alongside AI-generated knowledge. Users can manually add documents and images to their library. AI-generated answers are stored with text content, diagrams, and images. Every knowledge node has metadata including created date, source, and confidence score.

</domain>

<decisions>
## Implementation Decisions

### File Storage Location & Organization
- **D-01:** Flat directory with UUID filenames — simple, fast lookups, matches existing notes pattern (UUID primary keys)
- **D-02:** Content directory at project root `/content/` — alongside database, simpler than OS-specific paths
- **D-03:** UUID + original extension naming (e.g., `abc123.pdf`) — preserves type info, enables debugging
- **D-04:** Atomic writes via temp file + rename — prevents corruption, matches Phase 1 config pattern

### Document & Image Handling
- **D-05:** Support PDF, DOCX, TXT, MD formats — common formats, good coverage
- **D-06:** Extract text and index in FTS5 — enables search integration with existing notes search
- **D-07:** Support PNG, JPG, WebP image formats — web-optimized, good balance of quality and compatibility
- **D-08:** Store original + generate thumbnails — preserves quality, optimizes UI performance

### Metadata Schema & Extensibility
- **D-09:** Track source as `'manual' | 'ai-generated'` — enables filtering by origin
- **D-10:** Store confidence_score (0.0-1.0) for AI-generated content — enables quality filtering, satisfies CONT-06 requirement
- **D-11:** Metadata stored as JSON blob in metadata column — flexible, matches notes.metadata pattern
- **D-12:** Reuse tags table with content_tags junction — consistent with notes, enables cross-content tagging

### Content-to-Note Linking
- **D-13:** Attachments on notes (note has_many content) — clear ownership, matches attachment mental model
- **D-14:** content.note_id foreign key — straightforward relationship, CASCADE delete works
- **D-15:** SET NULL on note deletion — orphan content preserved, files kept (matches links.target_note_id pattern)
- **D-16:** Wiki-link syntax for content: `[[content:uuid]]` — consistent with existing `[[note-title]]` syntax

### API Design
- **D-17:** Service layer in `electron/services/content.service.ts` — matches existing notes.service.ts, conversation.service.ts pattern
- **D-18:** Standard CRUD operations: createContent, getContent, updateContent, deleteContent — familiar pattern, matches notes API
- **D-19:** Expose via `window.api.content.*` namespace — consistent with window.api.notes.*, window.api.chat.*
- **D-20:** Stream large files with progress events — better UX for uploads/downloads, matches AI streaming pattern

### Claude's Discretion
None — all areas had explicit decisions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CONT-01 through CONT-06 requirements for this phase
- `.planning/PROJECT.md` — Core value (multi-model verification), constraints (local-first)

### Prior Phase Context
- `.planning/phases/01-foundation-application-shell/01-CONTEXT.md` — IPC pattern, config management, atomic file writes pattern
- `.planning/phases/02-core-knowledge-management/02-CONTEXT.md` — Database schema, service layer pattern, FTS5 search, tags system, metadata as JSON blob
- `.planning/phases/03-ai-integration/03-CONTEXT.md` — Streaming pattern, provider abstraction, confidence tracking

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Service layer pattern** (`electron/services/notes.service.ts`, `conversation.service.ts`) — create `content.service.ts` following same structure
- **Database schema** (`electron/database/schema.ts`) — extend with content table using Drizzle ORM
- **Tags system** (`tags` table + `note_tags` junction) — create `content_tags` junction for content tagging
- **FTS5 search** (`notes_fts` tables) — extend for document text indexing
- **IPC handlers** (`electron/ipc/*.handlers.ts`) — create `content.handlers.ts` for file operations
- **Atomic file writes** (Phase 1 config pattern) — reuse temp file + rename approach

### Established Patterns
- **Metadata as JSON blob** — notes.metadata column stores extensible JSON
- **Soft delete** — notes use deleted_at column for recoverability
- **Foreign key relationships** — messages.conversation_id, links.source_note_id use CASCADE/SET NULL
- **UUID primary keys** — notes, tags, conversations all use crypto.randomUUID()
- **Service layer returns typed interfaces** — Note, Tag, Conversation interfaces exported from services

### Integration Points
- **Database schema** — add content table, content_tags junction, extend FTS5
- **IPC API** — register content handlers in main process, expose via contextBridge
- **File system** — create `/content/` directory, implement file operations
- **Search** — integrate document text into existing FTS5 search
- **Tags UI** — extend existing tag management to support content

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for content storage and file handling.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-content-storage-management*
*Context gathered: 2026-05-25*
