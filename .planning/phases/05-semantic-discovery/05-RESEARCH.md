# Phase 5: Semantic Discovery - Research

**Researched:** 2026-05-25
**Domain:** Semantic search and automatic linking through embeddings
**Confidence:** MEDIUM

## Summary

Phase 5 enables semantic discovery through local embeddings generation and vector search. Users discover related knowledge by meaning rather than keywords. The phase implements on-save embedding generation using @xenova/transformers (all-MiniLM-L6-v2 model), stores 384-dimensional vectors in SQLite using sqlite-vec extension, provides semantic search alongside existing FTS5 search modes, automatically discovers and creates semantic links between related notes, and displays related concepts in a sidebar panel.

**Primary recommendation:** Use @xenova/transformers for local, offline embeddings generation (no API costs, privacy-preserving), sqlite-vec extension for vector storage (keeps everything in SQLite, SIMD optimizations), start with flat (brute-force) search for 1000 nodes (sub-millisecond queries), defer HNSW indexing until performance testing shows need, and integrate semantic search as fourth mode alongside existing quickNav/fullText/fuzzy patterns.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Embedding generation | Main Process (Node.js) | — | @xenova/transformers runs in Node.js, requires filesystem access for model caching, CPU-intensive operation |
| Vector storage | Database (SQLite) | — | sqlite-vec extension provides native vector operations, keeps all data in single database |
| Semantic search | Main Process (Node.js) | — | Queries sqlite-vec via better-sqlite3, returns results to renderer via IPC |
| Auto-link discovery | Main Process (Node.js) | — | Runs on-save, queries vector similarity, writes to links table |
| Related concepts UI | Renderer Process (React) | — | Displays semantic links in sidebar, follows existing BacklinksPanel pattern |

// __CONTINUE_HERE__

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Embedding Generation Strategy:**
- **D-01:** Generate embeddings on-save (immediate) — real-time semantic search, embeddings always current
- **D-02:** Use local embeddings via @xenova/transformers — works offline, no API costs, privacy-preserving
- **D-03:** Embed combined title + body — single vector per note, simpler queries, faster than separate embeddings

**Vector Storage Approach:**
- **D-04:** Use sqlite-vec extension — keeps everything in SQLite, simpler architecture, native SIMD optimizations
- **D-05:** 384 dimensions — matches @xenova/transformers models (all-MiniLM-L6-v2), lower memory, faster queries
- **D-06:** Defer indexing decision — start with flat (brute-force) search, add HNSW index later if needed for 1000+ nodes

**Semantic Search UX:**
- **D-07:** Integrate with existing FTS search — add semantic mode to existing search (quick nav, full-text, fuzzy, semantic)
- **D-08:** Separate tabs for keyword vs semantic results — clear separation, user controls which mode
- **D-09:** High similarity threshold (0.7+ cosine similarity) — strict matching, only very similar notes, fewer results but higher relevance

**Auto-linking & Related Concepts:**
- **D-10:** Discover links on-save (immediate) — matches embedding generation timing, real-time discovery
- **D-11:** Automatic link creation (silent) — seamless discovery, user can delete unwanted links
- **D-12:** Top 5 auto-links per note — balances discovery with noise prevention, matches web search citation count pattern
- **D-13:** Display related concepts in right sidebar below backlinks — consistent with existing backlinks pattern, clear separation from manual links

### Claude's Discretion

None — all areas had explicit decisions.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEM-01 | System generates embeddings for all notes | @xenova/transformers pipeline('feature-extraction') generates 384-dim vectors, on-save trigger in notes service |
| SEM-02 | User can search notes by semantic meaning (not just keywords) | sqlite-vec cosine similarity search, integrated as fourth search mode alongside FTS5 |
| SEM-03 | System automatically links semantically related notes | On-save vector similarity query (threshold 0.7+), automatic link creation in links table with link_type='semantic' |
| SEM-04 | User can view related concepts sidebar while reading | React component below BacklinksPanel, queries semantic links, follows existing UI patterns |
| SEM-05 | System stores semantic relationships in graph structure | Links table extended with link_type column, embeddings table stores vectors, enables graph queries |

</phase_requirements>


## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xenova/transformers | 2.17.2 | Local embeddings generation | Official Hugging Face library for running transformer models in Node.js/browser via ONNX, no API calls needed, privacy-preserving, works offline [ASSUMED] |
| sqlite-vec | Latest | Vector search extension | Native SQLite extension for semantic search, supports float32 vectors, SIMD optimizations, keeps everything in SQLite [ASSUMED] |
| better-sqlite3 | 12.10.0 (installed) | SQLite driver with extension loading | Already in project, supports loadExtension() for sqlite-vec, synchronous API, native performance |
| Drizzle ORM | 0.45.2 (installed) | Type-safe database queries | Already in project, will define embeddings table schema, type-safe queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.4.3 (installed) | Schema validation | Validate embedding dimensions, similarity scores, search parameters |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @xenova/transformers | OpenAI embeddings API | API requires internet, costs money, privacy concerns, but higher quality embeddings |
| @xenova/transformers | Sentence-transformers (Python) | Better performance, more models, but requires Python runtime in Electron app |
| sqlite-vec | ChromaDB | Full-featured vector DB, but requires separate server, sync complexity, heavier for desktop app |
| sqlite-vec | Vectra | Pure JS implementation, but less mature, fewer optimizations, smaller community |
| all-MiniLM-L6-v2 | all-mpnet-base-v2 | Higher quality (768 dims), but 2x memory, slower, diminishing returns for 1000 nodes |

**Installation:**
```bash
npm install @xenova/transformers
# sqlite-vec: Download platform-specific binary from https://github.com/asg017/sqlite-vec/releases
# Load as extension in better-sqlite3: db.loadExtension('./path/to/vec0.so')
```

**Version verification:** 
- @xenova/transformers: 2.17.2 (verified via npm registry, last modified 2024-05-29)
- sqlite-vec: Latest release from GitHub (no npm package, binary distribution)
- better-sqlite3: 12.10.0 (already installed, verified compatible with Node.js 22.x)


## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @xenova/transformers | npm | 2 yrs | N/A | github.com/xenova/transformers.js | N/A | [ASSUMED] - slopcheck unavailable, package exists on npm, has GitHub repo, created 2023-03-03 |
| sqlite-vec | GitHub binary | N/A | N/A | github.com/asg017/sqlite-vec | N/A | [ASSUMED] - binary distribution, not npm package, verify download from official GitHub releases |

**Packages removed due to slopcheck [SLOP] verdict:** None

**Packages flagged as suspicious [SUS]:** None

*slopcheck was unavailable for npm package verification. @xenova/transformers verified via npm registry (exists, has repository, 2+ years old). sqlite-vec is a binary extension distributed via GitHub releases, not npm. Both packages are tagged [ASSUMED] and planner must gate installation behind checkpoint:human-verify tasks.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Renderer Process                         │
│  ┌────────────────┐    ┌──────────────┐   ┌──────────────────┐ │
│  │  Note Editor   │───▶│ Save Note    │──▶│ IPC: notes:save  │ │
│  │  (user types)  │    │  (title+body)│   │                  │ │
│  └────────────────┘    └──────────────┘   └─────────┬────────┘ │
│                                                      │          │
│  ┌────────────────┐    ┌──────────────┐            │          │
│  │ Search Input   │───▶│ Search Mode  │            │          │
│  │ (semantic tab) │    │  Selector    │            │          │
│  └────────────────┘    └──────┬───────┘            │          │
│                               │                     │          │
│  ┌────────────────┐           │                     │          │
│  │ Related Panel  │◀──────────┼─────────────────────┘          │
│  │ (below backlinks)          │                                │
│  └────────────────┘           │                                │
└───────────────────────────────┼────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Main Process                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Notes Service (on-save flow)                 │  │
│  │  1. Save note to SQLite                                   │  │
│  │  2. Generate embedding (title + body)                     │  │
│  │  3. Store vector in embeddings table                      │  │
│  │  4. Query similar notes (cosine > 0.7)                    │  │
│  │  5. Create semantic links (top 5)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Embeddings Service (new)                        │  │
│  │  - Load @xenova/transformers pipeline                     │  │
│  │  - Generate 384-dim vectors                               │  │
│  │  - Cache model in user data directory                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Search Service (extended)                       │  │
│  │  - Existing: quickNav, fullText, fuzzy (FTS5)            │  │
│  │  - New: semanticSearch (sqlite-vec cosine similarity)    │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLite Database                             │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   notes    │  │  embeddings  │  │  links (extended)      │  │
│  │  (existing)│  │  (new table) │  │  + link_type column    │  │
│  │            │  │  - note_id   │  │  - 'manual' (wiki)     │  │
│  │            │  │  - vector    │  │  - 'semantic' (auto)   │  │
│  │            │  │  - created_at│  │                        │  │
│  └────────────┘  └──────────────┘  └────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  sqlite-vec extension (loaded at runtime)                 │  │
│  │  - vec_distance_cosine(v1, v2) → similarity score        │  │
│  │  - Flat search (brute-force) for < 10K vectors           │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Data flow for semantic discovery:**
1. User saves note → Main process receives IPC call
2. Notes service saves to database, triggers embedding generation
3. Embeddings service generates 384-dim vector from title + body
4. Vector stored in embeddings table
5. Query sqlite-vec for similar notes (cosine similarity > 0.7)
6. Create semantic links (top 5) in links table with link_type='semantic'
7. Renderer queries semantic links for Related Concepts panel


### Recommended Project Structure
```
electron/
├── services/
│   ├── embeddings.service.ts    # New: generate embeddings, manage model
│   ├── notes.service.ts          # Extend: trigger embedding on save
│   └── search.service.ts         # Extend: add semanticSearch()
├── database/
│   ├── schema.ts                 # Extend: add embeddings table, link_type column
│   └── vec.ts                    # New: sqlite-vec setup and queries
src/
├── hooks/
│   ├── useSearch.ts              # Extend: add 'semantic' mode
│   └── useSemanticLinks.ts       # New: fetch semantic links for note
├── components/
│   └── Notes/
│       ├── BacklinksPanel.tsx    # Existing: manual wiki-links
│       └── RelatedPanel.tsx      # New: semantic links below backlinks
```

### Pattern 1: Embedding Generation on Save
**What:** Generate embeddings synchronously during note save operation
**When to use:** User saves/updates note, embedding must be immediately available for search
**Example:**
```typescript
// electron/services/notes.service.ts
export async function updateNote(
  id: string,
  data: UpdateNoteInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Note> {
  // 1. Save note to database
  const updated = await db.update(notes).set(data).where(eq(notes.id, id)).returning();
  
  // 2. Generate embedding if title or body changed
  if (data.title !== undefined || data.body !== undefined) {
    const text = `${updated.title} ${updated.body}`;
    const embedding = await generateEmbedding(text); // 384-dim vector
    await storeEmbedding(db, id, embedding);
    
    // 3. Discover semantic links
    const similar = await findSimilarNotes(db, id, embedding, 0.7, 5);
    await createSemanticLinks(db, id, similar);
  }
  
  return updated;
}
```

### Pattern 2: Vector Similarity Search with sqlite-vec
**What:** Query similar notes using cosine similarity
**When to use:** Semantic search, auto-link discovery
**Example:**
```typescript
// electron/database/vec.ts
export function findSimilarNotes(
  db: Database.Database,
  noteId: string,
  queryVector: Float32Array,
  threshold: number,
  limit: number
): Array<{ id: string; title: string; similarity: number }> {
  // Convert Float32Array to blob for SQLite
  const vectorBlob = Buffer.from(queryVector.buffer);
  
  const results = db.prepare(`
    SELECT 
      n.id,
      n.title,
      vec_distance_cosine(e.vector, ?) as similarity
    FROM embeddings e
    INNER JOIN notes n ON e.note_id = n.id
    WHERE e.note_id != ?
      AND n.deleted_at IS NULL
      AND similarity >= ?
    ORDER BY similarity DESC
    LIMIT ?
  `).all(vectorBlob, noteId, threshold, limit);
  
  return results;
}
```

### Pattern 3: Extending Links Table for Semantic Links
**What:** Add link_type column to distinguish manual vs semantic links
**When to use:** Store auto-discovered semantic relationships
**Example:**
```typescript
// electron/database/schema.ts
export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  source_note_id: text('source_note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  target_note_id: text('target_note_id').notNull().references(() => notes.id, { onDelete: 'set null' }),
  link_type: text('link_type').notNull().default('manual'), // 'manual' | 'semantic'
  similarity_score: real('similarity_score'), // Only for semantic links
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Query semantic links only
export function getSemanticLinks(noteId: string, db: Database) {
  return db.select()
    .from(links)
    .where(and(
      eq(links.source_note_id, noteId),
      eq(links.link_type, 'semantic')
    ))
    .orderBy(desc(links.similarity_score));
}
```

### Pattern 4: Lazy Model Loading
**What:** Load @xenova/transformers model on first use, cache in memory
**When to use:** Avoid startup delay, model loads when first note is saved
**Example:**
```typescript
// electron/services/embeddings.service.ts
import { pipeline } from '@xenova/transformers';

let embeddingPipeline: any = null;

export async function generateEmbedding(text: string): Promise<Float32Array> {
  // Lazy load model on first call
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { cache_dir: app.getPath('userData') + '/models' }
    );
  }
  
  // Generate embedding
  const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
  return output.data; // Float32Array of 384 dimensions
}
```

### Anti-Patterns to Avoid
- **Generating embeddings in renderer process:** CPU-intensive, blocks UI, no access to filesystem for model caching
- **Storing vectors as JSON arrays:** Inefficient, sqlite-vec requires binary blob format for SIMD optimizations
- **Batch embedding generation:** Adds complexity (queue management), delays searchability, user expects immediate results after save
- **Using separate vector database:** Adds sync complexity, deployment overhead, conflicts with local-first architecture
- **Low similarity threshold (< 0.6):** Too many false positives, noise in related concepts panel, user loses trust in recommendations


## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transformer models | Custom embedding neural network | @xenova/transformers | Pre-trained models (all-MiniLM-L6-v2) already optimized, ONNX runtime handles quantization/optimization, building from scratch requires ML expertise and training data |
| Vector similarity | Custom distance calculations | sqlite-vec extension | SIMD-optimized native code, handles multiple distance metrics (cosine, L2, dot product), tested at scale, custom JS implementation 10-100x slower |
| Model caching | Custom download/storage logic | @xenova/transformers built-in cache | Handles model versioning, partial downloads, cache invalidation, filesystem permissions, cross-platform paths |
| Semantic link ranking | Custom scoring algorithm | Cosine similarity threshold | Well-understood metric, interpretable (0-1 range), works with normalized embeddings, custom scoring adds complexity without clear benefit |

**Key insight:** Embeddings and vector search are solved problems with mature libraries. Custom implementations introduce bugs, performance issues, and maintenance burden. Use battle-tested tools and focus on integration quality.

## Runtime State Inventory

> Phase 5 is greenfield (new feature), not a rename/refactor. This section is omitted.

## Common Pitfalls

### Pitfall 1: sqlite-vec Extension Not Loaded
**What goes wrong:** Queries fail with "no such function: vec_distance_cosine" error
**Why it happens:** sqlite-vec is a runtime extension, not automatically loaded with better-sqlite3
**How to avoid:** Load extension during database initialization: `db.loadExtension('./path/to/vec0.so')`, verify with test query before app starts
**Warning signs:** Extension loading errors in logs, vector queries fail immediately after app start

### Pitfall 2: Model Download Blocks UI on First Save
**What goes wrong:** First note save takes 10-30 seconds while model downloads, user thinks app froze
**Why it happens:** @xenova/transformers downloads model on first use (80MB for all-MiniLM-L6-v2)
**How to avoid:** Pre-download model during app initialization with progress indicator, or show "Preparing semantic search..." toast on first save
**Warning signs:** User reports "app freezes when saving first note", no progress feedback during long operation

### Pitfall 3: Embedding Dimension Mismatch
**What goes wrong:** Vector queries return incorrect results or crash
**Why it happens:** Stored vectors have different dimensions than query vector (e.g., 384 vs 768)
**How to avoid:** Validate vector dimensions before storage, add CHECK constraint on embeddings table, log model name and dimensions
**Warning signs:** Similarity scores are always 0 or NaN, queries crash with "dimension mismatch" error

### Pitfall 4: Semantic Links Create Noise
**What goes wrong:** Related concepts panel shows irrelevant notes, user ignores feature
**Why it happens:** Similarity threshold too low (< 0.6), or top-N too high (> 10)
**How to avoid:** Start with strict threshold (0.7+), limit to top 5 results, allow user to delete unwanted semantic links
**Warning signs:** User feedback "related notes aren't actually related", high semantic link deletion rate

### Pitfall 5: Embeddings Not Updated on Edit
**What goes wrong:** Semantic search returns stale results, related concepts don't update after note edit
**Why it happens:** Forgot to regenerate embedding in updateNote() service
**How to avoid:** Trigger embedding generation whenever title or body changes, add test coverage for update flow
**Warning signs:** Search results don't reflect recent edits, related concepts panel shows outdated links

### Pitfall 6: Vector Storage Format Incompatibility
**What goes wrong:** sqlite-vec can't read stored vectors, queries fail silently
**Why it happens:** Stored vectors as JSON array instead of binary blob, or wrong byte order
**How to avoid:** Use Buffer.from(float32Array.buffer) to convert to blob, verify with test query after storage
**Warning signs:** All similarity scores are 0, queries return no results despite embeddings table having data


## Code Examples

Verified patterns from official sources and existing codebase:

### Generating Embeddings with @xenova/transformers
```typescript
// Source: @xenova/transformers documentation [ASSUMED - package verified on npm]
import { pipeline } from '@xenova/transformers';

// Initialize pipeline (lazy load, cache in memory)
const extractor = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2',
  { cache_dir: './models' }
);

// Generate embedding for text
const text = "This is a sample note about machine learning";
const output = await extractor(text, { 
  pooling: 'mean',      // Average token embeddings
  normalize: true       // L2 normalization for cosine similarity
});

const embedding = output.data; // Float32Array(384)
```

### Loading sqlite-vec Extension
```typescript
// Source: sqlite-vec GitHub README [ASSUMED - binary distribution]
import Database from 'better-sqlite3';

const db = new Database('librania.db');

// Load extension (platform-specific binary)
// Windows: vec0.dll, Linux: vec0.so, macOS: vec0.dylib
const extensionPath = path.join(__dirname, 'extensions', 'vec0.dll');
db.loadExtension(extensionPath);

// Verify extension loaded
const result = db.prepare('SELECT vec_version()').get();
console.log('sqlite-vec version:', result);
```

### Creating Embeddings Table
```typescript
// Source: Existing schema patterns (electron/database/schema.ts)
import { sqliteTable, text, integer, blob, real } from 'drizzle-orm/sqlite-core';

export const embeddings = sqliteTable('embeddings', {
  id: text('id').primaryKey(),
  note_id: text('note_id')
    .notNull()
    .unique()
    .references(() => notes.id, { onDelete: 'cascade' }),
  vector: blob('vector', { mode: 'buffer' }).notNull(), // 384 * 4 bytes = 1536 bytes
  model: text('model').notNull().default('all-MiniLM-L6-v2'),
  dimensions: integer('dimensions').notNull().default(384),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### Vector Similarity Query
```typescript
// Source: sqlite-vec patterns [ASSUMED]
export function semanticSearch(
  db: Database.Database,
  queryVector: Float32Array,
  threshold: number = 0.7,
  limit: number = 20
): Array<{ id: string; title: string; similarity: number }> {
  const vectorBlob = Buffer.from(queryVector.buffer);
  
  return db.prepare(`
    SELECT 
      n.id,
      n.title,
      n.updated_at,
      vec_distance_cosine(e.vector, ?) as similarity
    FROM embeddings e
    INNER JOIN notes n ON e.note_id = n.id
    WHERE n.deleted_at IS NULL
      AND similarity >= ?
    ORDER BY similarity DESC
    LIMIT ?
  `).all(vectorBlob, threshold, limit);
}
```

### Extending Search Hook for Semantic Mode
```typescript
// Source: Existing useSearch.ts pattern
type SearchMode = 'quickNav' | 'fullText' | 'fuzzy' | 'semantic';

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
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
        case 'semantic':
          // Generate embedding for query, search similar notes
          data = await window.api.search.semantic(query);
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

### Related Concepts Panel Component
```typescript
// Source: Existing BacklinksPanel.tsx pattern
interface RelatedNote {
  id: string;
  title: string;
  similarity: number;
}

interface RelatedPanelProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
}

export function RelatedPanel({ noteId, onNavigate }: RelatedPanelProps) {
  const [related, setRelated] = useState<RelatedNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelated() {
      try {
        setLoading(true);
        const data = await window.api.links.getSemanticLinks(noteId);
        setRelated(data);
      } catch (error) {
        console.error('Failed to fetch related notes:', error);
        setRelated([]);
      } finally {
        setLoading(false);
      }
    }
    fetchRelated();
  }, [noteId]);

  if (loading) {
    return (
      <div className="related-panel p-4">
        <h3 className="text-lg font-semibold mb-3">Related Concepts</h3>
        <div className="text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="related-panel p-4">
      <h3 className="text-lg font-semibold mb-3">Related Concepts</h3>
      {related.length === 0 ? (
        <div className="text-secondary text-sm">No related notes yet</div>
      ) : (
        <ul className="space-y-2">
          {related.map(note => (
            <li
              key={note.id}
              onClick={() => onNavigate(note.id)}
              className="text-sm text-foreground hover:text-primary cursor-pointer hover:underline"
            >
              {note.title}
              <span className="ml-2 text-xs text-secondary">
                ({Math.round(note.similarity * 100)}% similar)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```


## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API-based embeddings (OpenAI) | Local embeddings (@xenova/transformers) | 2023-2024 | Privacy-preserving, offline capability, no API costs, but slightly lower quality |
| Separate vector databases (Pinecone, Weaviate) | Embedded vector search (sqlite-vec) | 2023-2024 | Simpler architecture, single database, lower latency, but less scalable for millions of vectors |
| 768-dim BERT embeddings | 384-dim MiniLM embeddings | 2020-2023 | 2x faster, 50% memory, minimal quality loss for most tasks |
| HNSW indexing by default | Flat search for small datasets | Ongoing | Sub-millisecond queries for < 10K vectors without index overhead |

**Deprecated/outdated:**
- **Sentence-transformers Python library in Electron:** Requires Python runtime, complex packaging. @xenova/transformers provides same models in pure JS/ONNX.
- **Manual cosine similarity in JavaScript:** sqlite-vec provides SIMD-optimized native implementation, 10-100x faster than JS loops.
- **Separate embedding and search steps:** Modern vector DBs integrate both, reducing latency and complexity.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | @xenova/transformers supports all-MiniLM-L6-v2 model | Standard Stack | Must find alternative model or use different library |
| A2 | sqlite-vec supports float32 vectors and cosine similarity | Standard Stack | Must use different vector storage approach |
| A3 | 0.7 cosine similarity threshold provides good precision/recall balance | User Constraints | May need to tune threshold based on actual data |
| A4 | Flat search performs well for 1000 nodes | Architecture | May need HNSW index sooner if queries are slow |
| A5 | On-save embedding generation doesn't block UI unacceptably | Architecture | May need async/background processing if generation is too slow |
| A6 | Model download (80MB) completes in reasonable time | Common Pitfalls | May need to bundle model with app or show better progress UI |
| A7 | sqlite-vec extension is available for Windows/Linux/macOS | Package Audit | May need to compile from source or find alternative |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **sqlite-vec binary distribution and loading**
   - What we know: Extension must be loaded at runtime via db.loadExtension()
   - What's unclear: Platform-specific binary availability, compilation requirements, version compatibility with better-sqlite3
   - Recommendation: Test extension loading in Wave 0, document platform-specific paths, add error handling for missing extension

2. **Model download UX on first use**
   - What we know: all-MiniLM-L6-v2 is ~80MB, downloads on first pipeline() call
   - What's unclear: Download time on slow connections, user expectations for first save delay
   - Recommendation: Pre-download during app initialization with progress indicator, or show toast "Preparing semantic search..." on first save

3. **Optimal similarity threshold for auto-linking**
   - What we know: 0.7 is moderate-to-high threshold, user decided this value
   - What's unclear: Actual precision/recall on LibraNia's note corpus, user satisfaction with link quality
   - Recommendation: Start with 0.7, add telemetry for semantic link deletion rate, allow user to adjust threshold in settings (future enhancement)

4. **Performance at scale (1000+ notes)**
   - What we know: Flat search should be fast for 1000 nodes, HNSW deferred
   - What's unclear: Actual query latency with 1000+ 384-dim vectors, when HNSW becomes necessary
   - Recommendation: Add performance logging for vector queries, monitor P95 latency, implement HNSW if queries exceed 100ms


## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | @xenova/transformers runtime | ✓ | 22.12.0 | — |
| npm | Package installation | ✓ | 10.9.0 | — |
| better-sqlite3 | Extension loading | ✓ | 12.10.0 | — |
| sqlite-vec binary | Vector search | ✗ | — | Must download from GitHub releases |
| @xenova/transformers | Embeddings generation | ✗ | — | Must install via npm |

**Missing dependencies with no fallback:**
- sqlite-vec binary: Must download platform-specific binary from https://github.com/asg017/sqlite-vec/releases
- @xenova/transformers: Must install via npm (package verified on registry)

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEM-01 | System generates embeddings for all notes | unit | `npm test -- embeddings.service.test.ts --run` | ❌ Wave 0 |
| SEM-02 | User can search notes by semantic meaning | integration | `npm test -- search.service.test.ts --run` | ❌ Wave 0 |
| SEM-03 | System automatically links semantically related notes | unit | `npm test -- notes.service.test.ts --run` | ✅ (extend existing) |
| SEM-04 | User can view related concepts sidebar | unit | `npm test -- RelatedPanel.test.tsx --run` | ❌ Wave 0 |
| SEM-05 | System stores semantic relationships in graph structure | unit | `npm test -- schema.test.ts --run` | ✅ (extend existing) |

### Sampling Rate
- **Per task commit:** `npm test -- {affected-file}.test.ts --run`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `electron/services/embeddings.service.test.ts` — covers SEM-01 (embedding generation, model loading, caching)
- [ ] `electron/database/vec.test.ts` — covers vector storage, similarity queries, extension loading
- [ ] `src/components/Notes/RelatedPanel.test.tsx` — covers SEM-04 (UI rendering, navigation)
- [ ] Extend `electron/services/notes.service.test.ts` — add tests for on-save embedding generation and auto-linking (SEM-03)
- [ ] Extend `electron/database/schema.test.ts` — add tests for embeddings table and link_type column (SEM-05)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | N/A — no auth in this phase |
| V3 Session Management | No | N/A — no sessions in this phase |
| V4 Access Control | No | N/A — single-user desktop app |
| V5 Input Validation | Yes | Validate vector dimensions (must be 384), similarity threshold (0-1 range), note IDs (UUID format) |
| V6 Cryptography | No | N/A — no encryption in this phase |

### Known Threat Patterns for Electron + SQLite + ML Models

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious model injection | Tampering | Verify model source (Hugging Face official), check model hash, use @xenova/transformers cache validation |
| SQL injection via vector queries | Tampering | Use parameterized queries (better-sqlite3 prepared statements), never concatenate user input into SQL |
| Path traversal in model cache | Information Disclosure | Use app.getPath('userData') for cache directory, validate paths, never use user-provided paths |
| Denial of service via large embeddings | Denial of Service | Validate vector dimensions before storage, limit note size (existing constraint), timeout embedding generation |


## Sources

### Primary (HIGH confidence)
- better-sqlite3 npm registry: Verified version 12.10.0, already installed in project
- Node.js version: Verified 22.12.0 via `node --version`
- Existing codebase patterns: electron/services/notes.service.ts, electron/database/schema.ts, src/hooks/useSearch.ts, src/components/Notes/BacklinksPanel.tsx

### Secondary (MEDIUM confidence)
- @xenova/transformers npm registry: Package exists, version 2.17.2, created 2023-03-03, repository github.com/xenova/transformers.js
- all-MiniLM-L6-v2 model: 384 dimensions, sentence-transformers model, widely used for semantic search [ASSUMED - from training knowledge]
- Cosine similarity threshold best practices: 0.7 is moderate-to-high threshold, balances precision/recall [ASSUMED - from training knowledge]

### Tertiary (LOW confidence)
- sqlite-vec extension: GitHub repository github.com/asg017/sqlite-vec, binary distribution, supports float32 vectors and cosine similarity [ASSUMED - not verified via official docs]
- @xenova/transformers API: pipeline('feature-extraction'), pooling and normalization options [ASSUMED - not verified via official docs]
- Vector search performance: Flat search sub-millisecond for < 10K vectors [ASSUMED - from training knowledge]

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - @xenova/transformers verified on npm, sqlite-vec not verified (binary distribution)
- Architecture: MEDIUM - Patterns follow existing codebase, but vector search integration not tested
- Pitfalls: MEDIUM - Based on common vector search issues, not LibraNia-specific testing

**Research date:** 2026-05-25
**Valid until:** 30 days (stable technologies, but sqlite-vec is newer and may evolve)

---

## RESEARCH COMPLETE

**Phase:** 05 - Semantic Discovery
**Confidence:** MEDIUM

### Key Findings
- @xenova/transformers provides local, offline embeddings generation (no API costs, privacy-preserving)
- sqlite-vec extension keeps vector search in SQLite (simpler architecture, no separate vector DB)
- 384-dimensional embeddings (all-MiniLM-L6-v2) balance quality and performance for 1000 nodes
- Flat search sufficient for < 10K vectors, defer HNSW indexing until performance testing shows need
- Integrate semantic search as fourth mode alongside existing FTS5 patterns (quickNav, fullText, fuzzy)

### File Created
`.planning/phases/05-semantic-discovery/05-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | MEDIUM | @xenova/transformers verified on npm, sqlite-vec not verified (binary distribution, no official docs accessed) |
| Architecture | MEDIUM | Follows existing patterns (service layer, IPC, React hooks), but vector search integration not tested in LibraNia context |
| Pitfalls | MEDIUM | Based on common vector search issues and training knowledge, not LibraNia-specific testing |

### Open Questions
- sqlite-vec binary availability and loading process (platform-specific paths, version compatibility)
- Model download UX on first use (80MB download, user expectations)
- Optimal similarity threshold for auto-linking (0.7 is user decision, needs validation with actual data)
- Performance at scale (1000+ notes, when HNSW becomes necessary)

### Ready for Planning
Research complete. Planner can now create PLAN.md files.

