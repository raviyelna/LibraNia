# Phase 5: Semantic Discovery - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable semantic search and automatic linking through embeddings. Users discover related knowledge by meaning, not just keywords. System generates embeddings for all notes, provides semantic search alongside keyword search, automatically links semantically related notes, and displays related concepts while reading.

</domain>

<decisions>
## Implementation Decisions

### Embedding Generation Strategy
- **D-01:** Generate embeddings on-save (immediate) — real-time semantic search, embeddings always current
- **D-02:** Use local embeddings via @xenova/transformers — works offline, no API costs, privacy-preserving
- **D-03:** Embed combined title + body — single vector per note, simpler queries, faster than separate embeddings

### Vector Storage Approach
- **D-04:** Use sqlite-vec extension — keeps everything in SQLite, simpler architecture, native SIMD optimizations
- **D-05:** 384 dimensions — matches @xenova/transformers models (all-MiniLM-L6-v2), lower memory, faster queries
- **D-06:** Defer indexing decision — start with flat (brute-force) search, add HNSW index later if needed for 1000+ nodes

### Semantic Search UX
- **D-07:** Integrate with existing FTS search — add semantic mode to existing search (quick nav, full-text, fuzzy, semantic)
- **D-08:** Separate tabs for keyword vs semantic results — clear separation, user controls which mode
- **D-09:** High similarity threshold (0.7+ cosine similarity) — strict matching, only very similar notes, fewer results but higher relevance

### Auto-linking & Related Concepts
- **D-10:** Discover links on-save (immediate) — matches embedding generation timing, real-time discovery
- **D-11:** Automatic link creation (silent) — seamless discovery, user can delete unwanted links
- **D-12:** Top 5 auto-links per note — balances discovery with noise prevention, matches web search citation count pattern
- **D-13:** Display related concepts in right sidebar below backlinks — consistent with existing backlinks pattern, clear separation from manual links

### Claude's Discretion
None — all areas had explicit decisions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SEM-01 through SEM-05 requirements for this phase
- `.planning/PROJECT.md` — Core value (multi-model verification), constraints (local-first, offline capability)

### Prior Phase Context
- `.planning/phases/02-core-knowledge-management/02-CONTEXT.md` — Database schema, FTS5 search infrastructure, service layer pattern, React hooks pattern, links table structure
- `.planning/phases/04-content-storage-management/04-CONTEXT.md` — Content table with extracted_text, metadata as JSON blob, service layer pattern

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **FTS5 search infrastructure** (`electron/database/fts.ts`, `electron/ipc/search.handlers.ts`) — extend with semantic search mode
- **Service layer pattern** (`electron/services/notes.service.ts`, `content.service.ts`) — create `embeddings.service.ts` following same structure
- **React hooks pattern** (`src/hooks/useSearch.ts`) — extend with semantic search mode, create `useSemanticSearch.ts`
- **Database schema** (`electron/database/schema.ts`) — add embeddings table using Drizzle ORM
- **Links table** (`links` table with CASCADE delete) — reuse for semantic links, add `link_type` column to distinguish manual vs semantic

### Established Patterns
- **On-save triggers** — notes service already updates FTS5 on save, add embedding generation to same flow
- **UUID primary keys** — notes, tags, conversations all use crypto.randomUUID()
- **Soft delete** — notes use deleted_at column, semantic links should respect this
- **IPC communication** — renderer calls `window.api.*`, main process handles via `ipcMain.handle()`
- **Search modes** — existing quickNav/fullText/fuzzy pattern, add semantic as fourth mode

### Integration Points
- **Database schema** — add embeddings table (note_id, vector, created_at), extend links table with link_type column
- **Search handlers** — extend `electron/ipc/search.handlers.ts` with semantic search handler
- **Search UI** — extend `src/components/Notes/QuickNav.tsx` or search UI with semantic tab
- **Note editor** — trigger embedding generation in save flow, display related concepts in sidebar
- **Backlinks panel** — add related concepts section below existing backlinks

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for embedding generation and vector search.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-semantic-discovery*
*Context gathered: 2026-05-25*
