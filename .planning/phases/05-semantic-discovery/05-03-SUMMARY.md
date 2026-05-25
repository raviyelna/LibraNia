---
phase: 05-semantic-discovery
plan: 03
subsystem: embeddings-and-vector-search
tags: [embeddings, vector-search, transformers, sqlite-vec, semantic-discovery]
dependency_graph:
  requires: [05-01-schema, 05-02-packages]
  provides: [embeddings-generation, vector-similarity-search]
  affects: [notes-service, search-service, semantic-links]
tech_stack:
  added: [@xenova/transformers-integration, sqlite-vec-extension-loading]
  patterns: [lazy-model-loading, buffer-vector-conversion, cosine-similarity-search]
key_files:
  created:
    - electron/services/embeddings.service.ts
    - electron/database/vec.ts
    - tests/embeddings.service.test.ts
    - tests/vec.test.ts
    - electron/extensions/vec0.dll
  modified:
    - electron/database/connection.ts
decisions:
  - id: D-05-04
    choice: "Lazy-load @xenova/transformers pipeline on first generateEmbedding call"
    rationale: "Avoids startup delay (~80MB model download on first use), model cached in userData/models for subsequent launches per D-02"
  - id: D-05-05
    choice: "Convert Float32Array to Buffer for SQLite blob storage"
    rationale: "sqlite-vec expects little-endian float32 blobs, Buffer.from(vector.buffer) provides efficient binary storage without serialization overhead"
  - id: D-05-06
    choice: "Convert vec_distance_cosine to similarity score (1 - distance)"
    rationale: "sqlite-vec returns distance (lower = more similar), converting to similarity (higher = more similar) provides intuitive 0.0-1.0 range for threshold filtering"
  - id: D-05-07
    choice: "Graceful degradation for sqlite-vec extension loading failure"
    rationale: "Per T-05-12, log error but continue app initialization - semantic search unavailable but app remains functional"
metrics:
  duration_minutes: 10
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 1
  test_files_created: 2
  tests_added: 19
  commits: 2
  completed_date: "2026-05-25"
---

# Phase 5 Plan 03: Embeddings Service Summary

**Embeddings service with lazy-loaded @xenova/transformers pipeline generates 384-dim normalized vectors, vector search utilities with sqlite-vec extension enable cosine similarity queries with threshold filtering**

## What Was Built

### Embeddings Service (electron/services/embeddings.service.ts)
Created comprehensive embeddings service with 5 exported functions:

**generateEmbedding(text: string): Promise<Float32Array>**
- Lazy-loads all-MiniLM-L6-v2 model on first call using @xenova/transformers pipeline
- Model cached in `app.getPath('userData')/models` directory per D-02
- Generates 384-dimensional embeddings with mean pooling and normalization
- Returns Float32Array with L2 norm ≈ 1.0
- Throws error if text is empty

**storeEmbedding(noteId, vector, db): Promise<void>**
- Validates vector dimensions (384) per T-05-11 threat mitigation
- Converts Float32Array to Buffer for SQLite blob storage
- Inserts to embeddings table with UUID, note_id, vector blob, model, dimensions, timestamps

**getEmbedding(noteId, db): Promise<Float32Array | null>**
- Queries embeddings table by note_id
- Converts Buffer back to Float32Array for use in similarity calculations
- Returns null if embedding not found

**updateEmbedding(noteId, vector, db): Promise<void>**
- Updates existing embedding vector and updated_at timestamp
- Validates vector dimensions before update
- Throws error if embedding not found

**deleteEmbedding(noteId, db): Promise<void>**
- Removes embedding by note_id
- Note: CASCADE delete handles this automatically when note deleted

### Vector Search Utilities (electron/database/vec.ts)
Created vector search infrastructure with 2 exported functions:

**setupVectorExtension(db): void**
- Determines platform-specific extension path (vec0.dll for Windows, vec0.so for Linux, vec0.dylib for macOS)
- Loads sqlite-vec extension using db.loadExtension()
- Verifies successful loading by calling vec_version()
- Throws descriptive error if extension fails to load

**findSimilarNotes(db, noteId, queryVector, threshold, limit): SimilarNote[]**
- Queries embeddings table using vec_distance_cosine function
- Converts cosine distance to similarity score: `similarity = 1 - distance`
- Filters by similarity >= threshold (typically 0.7+ per D-09)
- Excludes query note itself (noteId != ?)
- Excludes soft-deleted notes (deleted_at IS NULL)
- Orders by similarity DESC
- Respects limit parameter (top N results)
- Returns array of {id, title, similarity}

### Database Integration (electron/database/connection.ts)
Updated initDatabase function to load sqlite-vec extension:
- Calls setupVectorExtension(db) after FTS5 setup
- Wrapped in try/catch for graceful degradation per T-05-12
- Logs error but continues if extension fails to load
- Semantic search unavailable but app remains functional

### Binary Extension (electron/extensions/vec0.dll)
- sqlite-vec extension binary for Windows (283KB)
- Copied from main repo to worktree for testing
- Provides vec_distance_cosine and vec_version functions

### Test Coverage
Created comprehensive test suites with 19 total tests:

**embeddings.service.test.ts (11 tests):**
1. generateEmbedding returns Float32Array of 384 dimensions
2. generateEmbedding normalizes embeddings (L2 norm ≈ 1.0)
3. Pipeline loads lazily on first call, reuses cached instance
4. generateEmbedding throws error if text is empty
5. storeEmbedding inserts embedding with correct note_id and vector blob
6. getEmbedding retrieves embedding by note_id, returns Float32Array
7. getEmbedding returns null if not found
8. updateEmbedding updates vector and updated_at timestamp
9. updateEmbedding throws error if note_id not found
10. deleteEmbedding removes embedding by note_id
11. generateEmbedding combines title and body per D-03

**vec.test.ts (8 tests):**
1. setupVectorExtension loads extension without errors
2. vec_version() function available after extension loads
3. findSimilarNotes returns empty array when no embeddings exist
4. findSimilarNotes returns notes with similarity >= threshold, ordered DESC
5. findSimilarNotes excludes query note itself
6. findSimilarNotes excludes soft-deleted notes
7. findSimilarNotes respects limit parameter
8. findSimilarNotes returns similarity scores in 0.0-1.0 range

## Deviations from Plan

None - plan executed exactly as written. Both TDD tasks followed RED → GREEN cycle successfully.

## Technical Decisions

### Lazy Model Loading Strategy
Implemented lazy loading for @xenova/transformers pipeline to avoid startup delay:
- Module-level `embeddingPipeline` variable initialized to null
- First generateEmbedding call loads pipeline with cache_dir configuration
- Subsequent calls reuse cached pipeline instance
- Model (~80MB) downloads on first use, cached for future launches
- Aligns with D-02 (local embeddings) and RESEARCH.md Pattern 4

### Vector Storage Format
Chose Buffer.from(Float32Array.buffer) for vector storage:
- sqlite-vec expects little-endian float32 blobs
- Direct buffer conversion provides efficient binary storage (1536 bytes for 384 dimensions)
- No serialization overhead (raw binary data)
- Conversion back to Float32Array: `new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)`

### Cosine Similarity Conversion
Converted vec_distance_cosine output to similarity score:
- sqlite-vec returns distance where lower = more similar
- Converted to similarity: `similarity = 1 - distance`
- Provides intuitive 0.0-1.0 range where higher = more similar
- Enables threshold filtering with >= operator (similarity >= 0.7)

### Graceful Degradation for Extension Loading
Wrapped setupVectorExtension in try/catch per T-05-12:
- Logs error to console if extension fails to load
- App continues initialization without crashing
- Semantic search unavailable but core functionality remains
- Acceptable trade-off for desktop app (extension loading is platform-specific)

## Requirements Fulfilled

- **SEM-01:** System generates embeddings for all notes - embeddings service implements generation with @xenova/transformers
- **SEM-02:** User can search notes by semantic meaning - vector search utilities enable cosine similarity queries

## Verification Results

All 19 tests passing:

**embeddings.service.test.ts:**
```
✓ generateEmbedding returns Float32Array of 384 dimensions
✓ generateEmbedding normalizes embeddings (L2 norm ≈ 1.0)
✓ Pipeline loads lazily on first call, reuses cached instance
✓ generateEmbedding throws error if text is empty
✓ storeEmbedding inserts embedding with correct note_id and vector blob
✓ getEmbedding retrieves embedding by note_id, returns Float32Array
✓ getEmbedding returns null if not found
✓ updateEmbedding updates vector and updated_at timestamp
✓ updateEmbedding throws error if note_id not found
✓ deleteEmbedding removes embedding by note_id
✓ generateEmbedding combines title and body per D-03
```

**vec.test.ts:**
```
✓ setupVectorExtension loads extension without errors
✓ vec_version() function available after extension loads
✓ findSimilarNotes returns empty array when no embeddings exist
✓ findSimilarNotes returns notes with similarity >= threshold, ordered DESC
✓ findSimilarNotes excludes query note itself
✓ findSimilarNotes excludes soft-deleted notes
✓ findSimilarNotes respects limit parameter
✓ findSimilarNotes returns similarity scores in 0.0-1.0 range
```

**Commands:**
- `npm test -- embeddings.service.test.ts --run` → 11/11 tests passed
- `npm test -- vec.test.ts --run` → 8/8 tests passed

## Known Stubs

None - implementation is complete with no placeholder values or hardcoded data.

## Threat Flags

None - no new security-relevant surface introduced beyond planned threat mitigations:
- T-05-11 mitigated: Vector dimension validation in storeEmbedding/updateEmbedding
- T-05-12 accepted: Extension loading failure handled with graceful degradation

## Integration Points

### Downstream Dependencies
- **notes.service.ts** (Plan 05-04): Will call generateEmbedding and storeEmbedding on note save
- **search.service.ts** (Plan 05-04): Will call findSimilarNotes for semantic search mode
- **auto-linking service** (Plan 05-04): Will use findSimilarNotes to discover semantic relationships
- **Related concepts UI** (Plan 05-05): Will query semantic links discovered by auto-linking service

### API Surface
**Embeddings Service:**
- `generateEmbedding(text)` - Generate 384-dim embedding from combined title+body
- `storeEmbedding(noteId, vector, db)` - Store embedding in database
- `getEmbedding(noteId, db)` - Retrieve embedding by note_id
- `updateEmbedding(noteId, vector, db)` - Update existing embedding
- `deleteEmbedding(noteId, db)` - Remove embedding

**Vector Search:**
- `setupVectorExtension(db)` - Load sqlite-vec extension (called in initDatabase)
- `findSimilarNotes(db, noteId, queryVector, threshold, limit)` - Find similar notes by cosine similarity

## Performance Considerations

### Model Loading
- First-time download: ~80MB, 10-30 seconds on typical broadband
- Subsequent launches: instant (model cached in userData/models)
- Lazy loading avoids startup delay
- User expectation: one-time setup acceptable if communicated

### Embedding Generation
- ~50-100ms per note on modern CPU (per RESEARCH.md)
- Acceptable for on-save operation per D-01
- Single vector per note (title + body combined) per D-03

### Vector Search Performance
- 1000 notes @ 384 dims = ~1.5MB total vector data
- Flat search (brute-force): sub-millisecond queries per RESEARCH.md
- HNSW indexing deferred per D-06 (not needed until 10K+ vectors)
- SIMD optimizations in sqlite-vec provide native performance

### Storage Overhead
- Per embedding: 1536 bytes (384 float32 values) + metadata (~100 bytes) ≈ 1.6 KB
- 1000 notes: ~1.6 MB total embedding storage
- Acceptable for desktop app

## Files Changed

### Created
- `electron/services/embeddings.service.ts` (171 lines) - Embeddings generation and CRUD operations
- `electron/database/vec.ts` (103 lines) - Vector search utilities with sqlite-vec integration
- `tests/embeddings.service.test.ts` (220 lines) - Comprehensive embeddings service tests
- `tests/vec.test.ts` (248 lines) - Vector search utilities tests
- `electron/extensions/vec0.dll` (283 KB) - sqlite-vec extension binary for Windows

### Modified
- `electron/database/connection.ts` (+8 lines) - Added setupVectorExtension call with graceful degradation

## Commits

- **e3c0f7f:** feat(05-03): implement embeddings service with @xenova/transformers
- **2e06940:** feat(05-03): implement vector search utilities with sqlite-vec integration

## Duration

**Total time:** 10 minutes
**Started:** 2026-05-25T17:37:31Z
**Completed:** 2026-05-25T17:47:52Z

## Next Steps

1. **Plan 05-04:** Integrate embeddings generation into notes.service.ts save flow (on-save trigger per D-01)
2. **Plan 05-04:** Extend search service with semantic search mode using findSimilarNotes
3. **Plan 05-04:** Implement auto-linking service to discover and create semantic links (threshold 0.7+, top 5 per D-12)
4. **Plan 05-05:** Build Related Concepts UI panel to display semantic links in sidebar

## Self-Check: PASSED

### Created Files Verification
```bash
✓ electron/services/embeddings.service.ts exists (171 lines)
✓ electron/database/vec.ts exists (103 lines)
✓ tests/embeddings.service.test.ts exists (220 lines)
✓ tests/vec.test.ts exists (248 lines)
✓ electron/extensions/vec0.dll exists (283 KB)
```

### Modified Files Verification
```bash
✓ electron/database/connection.ts imports setupVectorExtension
✓ electron/database/connection.ts calls setupVectorExtension in initDatabase
✓ setupVectorExtension wrapped in try/catch for graceful degradation
```

### Commits Verification
```bash
✓ e3c0f7f exists (embeddings service implementation)
✓ 2e06940 exists (vector search utilities implementation)
```

### Test Execution Verification
```bash
✓ npm test -- embeddings.service.test.ts --run exits 0
✓ All 11 embeddings tests passing
✓ npm test -- vec.test.ts --run exits 0
✓ All 8 vector search tests passing
```

All verification checks passed.
