# Phase 5: Semantic Discovery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 05-semantic-discovery
**Areas discussed:** Embedding generation strategy, Vector storage approach, Semantic search UX, Auto-linking & related concepts

---

## Embedding Generation Strategy

### When should embeddings be generated?

| Option | Description | Selected |
|--------|-------------|----------|
| On-save (immediate) | Generate embeddings immediately when note/content saved. Real-time semantic search, but may slow down saves. | ✓ |
| Batch (scheduled) | Background job generates embeddings periodically (every 5 min). Faster saves, but semantic search lags behind edits. | |
| Hybrid (new=immediate, edits=batch) | Hybrid: generate on-save for new notes, batch-update for edits. Balances responsiveness with performance. | |

**User's choice:** On-save (immediate)

### Which embedding model should we use?

| Option | Description | Selected |
|--------|-------------|----------|
| Local (@xenova/transformers) | Run transformer models in-browser/Node.js via @xenova/transformers. Works offline, no API costs, ~384 dims. Recommended for privacy. | ✓ |
| API (OpenAI embeddings) | Use OpenAI embeddings API (text-embedding-3-small). Higher quality (1536 dims), requires API key and internet. | |
| User configurable | Let user choose in settings (like AI providers). Flexibility, but more config complexity. | |

**User's choice:** Local (@xenova/transformers)

### What content should be embedded?

| Option | Description | Selected |
|--------|-------------|----------|
| Combined (title + body) | Single embedding from title + body concatenated. Simpler, one vector per note, faster queries. | ✓ |
| Separate (title, body) | Separate embeddings for title and body. More precise matching, but 2x storage and query complexity. | |
| Combined with tags | Title + body + tags concatenated. Tags influence semantic meaning, better topic clustering. | |

**User's choice:** Combined (title + body)

---

## Vector Storage Approach

### Where should vectors be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| sqlite-vec extension | SQLite extension for vector search. Keeps everything in one database, simpler architecture, native SIMD optimizations. Recommended. | ✓ |
| Separate vector DB | Separate vector database (ChromaDB, Vectra). More features, but requires separate server/process and sync complexity. | |
| In-memory (no persistence) | In-memory only (rebuild on startup). Fastest queries, but no persistence across restarts. | |

**User's choice:** sqlite-vec extension

### What vector dimensionality?

| Option | Description | Selected |
|--------|-------------|----------|
| 384 dimensions | Small, fast, works well for @xenova/transformers models (all-MiniLM-L6-v2). Lower memory, faster queries. Recommended for local embeddings. | ✓ |
| 768 dimensions | Better quality, more nuanced semantic matching. 2x storage vs 384. Good for larger knowledge bases (1000+ notes). | |
| 1536 dimensions | Highest quality (OpenAI standard). 4x storage vs 384. Overkill for local models, only needed if switching to API later. | |

**User's choice:** 384 dimensions

### What indexing strategy for vector search?

| Option | Description | Selected |
|--------|-------------|----------|
| Flat (no index) | No index, brute-force search. Simple, works well for <1000 vectors. Matches Phase 6 requirement (1000+ nodes). | |
| HNSW index | Hierarchical Navigable Small World index. Faster queries for 1000+ vectors, but more complex setup and memory overhead. | |
| Defer indexing decision | Start flat, add HNSW later if needed. Simpler for Phase 5, can optimize in Phase 6 when graph visualization adds load. | ✓ |

**User's choice:** Defer indexing decision

---

## Semantic Search UX

### How should semantic search integrate with existing FTS search?

| Option | Description | Selected |
|--------|-------------|----------|
| Integrate with existing FTS search | Add semantic mode to existing search (quick nav, full-text, fuzzy, semantic). Unified search experience, reuses existing UI. | ✓ |
| Separate semantic search UI | New semantic search UI separate from keyword search. Clear distinction, but fragments search experience. | |
| Semantic-first (FTS fallback) | Replace FTS with semantic-first (fallback to FTS if no semantic results). Simpler UX, but loses keyword precision. | |

**User's choice:** Integrate with existing FTS search

### How should semantic results be presented alongside keyword results?

| Option | Description | Selected |
|--------|-------------|----------|
| Mixed (keyword + semantic merged) | Merge keyword + semantic results, sort by combined score. Single unified list, best of both worlds. | |
| Separate tabs (keyword \| semantic) | Show semantic results in separate tab from keyword results. Clear separation, user controls which mode. | ✓ |
| Stacked (keyword first, then semantic) | Show semantic results below keyword results in same list. Keyword first (familiar), semantic adds discovery. | |

**User's choice:** Separate tabs (keyword | semantic)

### What similarity threshold for "related" notes?

| Option | Description | Selected |
|--------|-------------|----------|
| High (0.7+ similarity) | Cosine similarity >= 0.7. Strict, only very similar notes. Fewer results, higher relevance. | ✓ |
| Medium (0.5+ similarity) | Cosine similarity >= 0.5. Balanced, moderately similar notes. Good for discovery without noise. | |
| Low (0.3+ similarity) | Cosine similarity >= 0.3. Loose, more exploratory. More results, may include tangentially related notes. | |

**User's choice:** High (0.7+ similarity)

---

## Auto-linking & Related Concepts

### When should semantic links be discovered?

| Option | Description | Selected |
|--------|-------------|----------|
| On-save (immediate) | Generate links immediately when note saved. Real-time discovery, matches on-save embedding generation. | ✓ |
| Background job (periodic) | Background job finds links periodically (every 5 min). Less intrusive, but discovery lags behind edits. | |
| Manual trigger only | Manual trigger only (user clicks "Find related"). Full user control, no automatic behavior. | |

**User's choice:** On-save (immediate)

### How should semantic links be created?

| Option | Description | Selected |
|--------|-------------|----------|
| Automatic (silent creation) | Create links automatically without user confirmation. Seamless discovery, but user has less control. Can always delete unwanted links. | ✓ |
| Suggested (user confirms) | Show suggestions, user clicks to create. More control, but requires manual action. Matches wiki-link autocomplete pattern. | |
| Display only (no link creation) | Show in sidebar only, don't create actual links. Non-invasive, but semantic relationships not persisted in links table. | |

**User's choice:** Automatic (silent creation)

### How many auto-links per note to prevent noise?

| Option | Description | Selected |
|--------|-------------|----------|
| Top 3 links per note | Top 3 most similar notes. Focused, prevents noise, keeps backlinks panel manageable. | |
| Top 5 links per note | Top 5 most similar notes. More discovery, still reasonable. Matches web search citation count (D-14 from Phase 3). | ✓ |
| Top 10 links per note | Top 10 most similar notes. Maximum discovery, but may clutter backlinks panel. | |

**User's choice:** Top 5 links per note

### Where should related concepts be displayed?

| Option | Description | Selected |
|--------|-------------|----------|
| Right sidebar (below backlinks) | Right sidebar below backlinks panel. Consistent with existing backlinks pattern, clear separation from manual links. | ✓ |
| Inline (above editor) | Inline suggestions above editor. More prominent, but takes vertical space from content. | |
| Merged with backlinks panel | Merge with backlinks panel (show both manual + semantic). Unified view, but harder to distinguish link types. | |

**User's choice:** Right sidebar (below backlinks)

---

## Claude's Discretion

None — all areas had explicit decisions.

## Deferred Ideas

None — discussion stayed within phase scope.
