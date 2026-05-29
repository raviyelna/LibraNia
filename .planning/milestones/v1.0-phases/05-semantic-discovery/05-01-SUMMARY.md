---
phase: 05-semantic-discovery
plan: 01
subsystem: database
tags: [schema, embeddings, vector-search, semantic-links]
dependency_graph:
  requires: [02-01-database-foundation, 04-01-content-schema]
  provides: [embeddings-table, semantic-links-support]
  affects: [notes-service, search-service]
tech_stack:
  added: [sqlite-vec-schema, vector-blob-storage]
  patterns: [one-to-one-embedding, link-type-discrimination]
key_files:
  created:
    - tests/embeddings.schema.test.ts
  modified:
    - electron/database/schema.ts
    - electron/database/connection.ts
decisions:
  - id: D-05-01
    choice: "Store embeddings as blob with buffer mode in Drizzle ORM"
    rationale: "Enables efficient binary storage of 384 float32 values (1536 bytes), compatible with sqlite-vec extension"
  - id: D-05-02
    choice: "Use link_type column to distinguish manual vs semantic links"
    rationale: "Allows single links table to handle both wiki-links and auto-discovered semantic relationships, simplifies queries"
  - id: D-05-03
    choice: "Make similarity_score nullable on links table"
    rationale: "Only semantic links have similarity scores, manual links leave this NULL, avoids separate tables"
metrics:
  duration_minutes: 7
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 2
  test_files_created: 1
  tests_added: 8
  commits: 2
  completed_date: "2026-05-26"
---

# Phase 5 Plan 01: Semantic Search Foundation Summary

**One-liner:** Extended database schema with embeddings table for 384-dim vector storage and links table modifications to distinguish manual wiki-links from semantic auto-links.

## What Was Built

### Embeddings Table
Created new `embeddings` table with one-to-one relationship to notes:
- **Columns:** id, note_id (UNIQUE), vector (BLOB), model, dimensions, created_at, updated_at
- **Foreign key:** note_id → notes.id with CASCADE delete
- **Vector storage:** BLOB type with buffer mode, stores 384 float32 values (1536 bytes)
- **Defaults:** model='all-MiniLM-L6-v2', dimensions=384

### Links Table Extensions
Extended existing `links` table to support semantic relationships:
- **link_type column:** TEXT NOT NULL DEFAULT 'manual' ('manual' for wiki-links, 'semantic' for auto-discovered)
- **similarity_score column:** REAL (nullable, stores cosine similarity 0.0-1.0 for semantic links only)

### Database Initialization
Updated `electron/database/connection.ts` to create embeddings table during initialization, following existing table creation pattern.

### Test Coverage
Created comprehensive test suite with 8 tests:
1. Embeddings table structure validation (7 columns)
2. note_id UNIQUE constraint and CASCADE delete foreign key
3. Vector blob type and dimensions default value
4. Links table link_type column with default 'manual'
5. Links table similarity_score column (nullable real)
6. Embedding CRUD operations with 384-dim vector blob
7. Cascade delete behavior (deleting note removes embedding)
8. Semantic vs manual link creation (with/without similarity_score)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

### Vector Storage Format
Chose `blob('vector', { mode: 'buffer' })` in Drizzle ORM for vector storage. This provides:
- Efficient binary storage (1536 bytes for 384 float32 values)
- Direct compatibility with sqlite-vec extension
- Type-safe Buffer handling in TypeScript
- No serialization overhead (raw binary data)

### Single Links Table Approach
Extended existing links table rather than creating separate semantic_links table:
- **Benefit:** Simpler schema, unified link queries
- **Trade-off:** Nullable similarity_score column (only used for semantic links)
- **Rationale:** link_type column provides clear discrimination, avoids JOIN complexity

### One-to-One Embedding Relationship
Enforced one-to-one relationship between notes and embeddings via UNIQUE constraint on note_id:
- **Benefit:** Prevents duplicate embeddings for same note
- **Benefit:** Simplifies queries (no GROUP BY needed)
- **Benefit:** CASCADE delete ensures cleanup when note deleted

## Requirements Fulfilled

- **SEM-01 (partial):** Database foundation for embedding storage established
- **SEM-05 (partial):** Graph structure extended to store semantic relationships with link_type discrimination

## Verification Results

All 8 schema tests passing:
```
✓ Test 1: embeddings table exists with 7 columns
✓ Test 2: embeddings.note_id has UNIQUE constraint and CASCADE delete
✓ Test 3: embeddings.vector is blob type, dimensions defaults to 384
✓ Test 4: links table has link_type column with default 'manual'
✓ Test 5: links table has similarity_score column (nullable real)
✓ Test 6: Can insert embedding with 384-dim vector blob and retrieve it
✓ Test 7: Deleting note cascades to embeddings table
✓ Test 8: Can create semantic link with similarity_score, manual link without score
```

**Command:** `npx vitest embeddings.schema.test.ts --run`
**Result:** 8/8 tests passed

## Known Stubs

None - schema implementation is complete with no placeholder values.

## Threat Flags

None - no new security-relevant surface introduced beyond planned schema changes.

## Integration Points

### Downstream Dependencies
- **embeddings.service.ts** (Plan 05-02): Will use embeddings table to store generated vectors
- **search.service.ts** (Plan 05-03): Will query embeddings table for semantic search
- **notes.service.ts** (Plan 05-02): Will trigger embedding generation on note save
- **links queries** (Plan 05-04): Will filter by link_type to distinguish manual vs semantic links

### Schema Compatibility
- **Backward compatible:** Existing links table queries continue to work (link_type defaults to 'manual')
- **Migration safe:** New embeddings table independent of existing tables
- **Foreign key integrity:** CASCADE delete ensures no orphaned embeddings

## Performance Considerations

### Storage Overhead
- **Per note:** 1536 bytes (384 float32 values) + metadata (~100 bytes) ≈ 1.6 KB
- **1000 notes:** ~1.6 MB total embedding storage
- **Acceptable:** Well within desktop app storage constraints

### Query Impact
- **Links table:** Additional columns add minimal overhead (TEXT + REAL)
- **Embeddings table:** UNIQUE constraint on note_id enables fast lookups
- **Index recommendation:** Consider adding index on link_type for semantic link queries (defer to performance testing)

## Files Changed

### Created
- `tests/embeddings.schema.test.ts` (308 lines) - Comprehensive schema validation tests

### Modified
- `electron/database/schema.ts` (+20 lines) - Added embeddings table definition, extended links table
- `electron/database/connection.ts` (+13 lines) - Added embeddings table creation in initDatabase

## Commits

- **61ab258:** test(05-01): add failing tests for embeddings schema (RED phase)
- **2df2036:** feat(05-01): implement embeddings table and extend links table (GREEN phase)

## Duration

**Total time:** 7 minutes

## Next Steps

1. **Plan 05-02:** Implement embeddings service with @xenova/transformers for vector generation
2. **Plan 05-03:** Extend search service with semantic search mode using sqlite-vec
3. **Plan 05-04:** Implement auto-linking service to discover and create semantic links on note save
4. **Plan 05-05:** Build Related Concepts UI panel to display semantic links

## Self-Check: PASSED

### Created Files Verification
```bash
✓ tests/embeddings.schema.test.ts exists (308 lines)
```

### Modified Files Verification
```bash
✓ electron/database/schema.ts contains embeddings table export
✓ electron/database/schema.ts contains link_type and similarity_score columns
✓ electron/database/connection.ts creates embeddings table in initDatabase
```

### Commits Verification
```bash
✓ 61ab258 exists (RED phase - tests only)
✓ 2df2036 exists (GREEN phase - implementation)
```

### Test Execution Verification
```bash
✓ npx vitest embeddings.schema.test.ts --run exits 0
✓ All 8 tests passing
```

All verification checks passed.
