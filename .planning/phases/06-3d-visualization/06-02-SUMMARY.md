---
phase: 06-3d-visualization
plan: 02
subsystem: backend-graph-data
tags: [graph-service, ipc-handlers, data-layer, 3d-visualization]
dependency_graph:
  requires: [06-01]
  provides: [graph-data-api]
  affects: [electron-main, electron-services, electron-ipc]
tech_stack:
  added: []
  patterns: [service-layer, ipc-handlers, drizzle-orm-queries]
key_files:
  created:
    - electron/services/graph.service.ts
    - electron/ipc/graph.handlers.ts
    - src/types/graph.ts
    - electron/services/graph.service.test.ts
    - electron/ipc/graph.handlers.test.ts
  modified:
    - electron/main.ts
    - electron/preload.ts
decisions:
  - id: D-06-02-01
    choice: Query tags via junction table for each note individually
    rationale: Simpler implementation, acceptable performance for typical graph sizes (100-1000 nodes)
    alternatives: [Single query with GROUP_CONCAT, Separate tags query with post-processing]
  - id: D-06-02-02
    choice: Return empty graph on error instead of throwing
    rationale: Graceful degradation - UI can show empty graph rather than crashing
    alternatives: [Throw error to renderer, Return error object with details]
  - id: D-06-02-03
    choice: Include similarity score only for semantic links
    rationale: Manual links don't have similarity scores, optional field keeps type clean
    alternatives: [Always include similarity (null for manual), Separate types for manual/semantic links]
metrics:
  duration_minutes: 18
  tasks_completed: 3
  tests_added: 10
  files_created: 5
  files_modified: 2
  lines_added: 538
  commits: 5
---

# Phase 6 Plan 2: Graph Service and IPC Handlers Summary

Backend graph data layer for 3D visualization - queries notes and links tables, exposes graph:getData IPC channel.

## What Was Built

Created complete backend data layer for 3D graph visualization:

**Graph Service** (`electron/services/graph.service.ts`):
- `getGraphData()` function queries notes and links tables
- Returns structured GraphData with nodes (id, title, tags[]) and links (source, target, type, similarity)
- Excludes soft-deleted notes and links to deleted notes
- Queries tags via note_tags junction table for each note
- Handles empty graph gracefully (returns empty arrays)

**TypeScript Types** (`src/types/graph.ts`):
- GraphNode interface: id, title, tags array
- GraphLink interface: source, target, type ('manual' | 'semantic'), optional similarity
- GraphData interface: nodes and links arrays

**IPC Handlers** (`electron/ipc/graph.handlers.ts`):
- Registered `graph:getData` IPC channel
- Calls getGraphData service and returns result
- Error handling returns empty graph on failure (graceful degradation)
- Logging for debugging

**Preload API** (`electron/preload.ts`):
- Exposed `window.api.graph.getData()` to renderer
- Follows existing API pattern (notes, tags, search namespaces)

**Main Process Integration** (`electron/main.ts`):
- Imported and registered graph handlers after database initialization
- Follows existing handler registration pattern

## Test Coverage

**Service Layer Tests** (`graph.service.test.ts` - 6 tests):
- Empty graph returns empty nodes/links
- Nodes include id, title, tags array
- Links include source, target, type, similarity
- Deleted notes excluded from nodes
- Links to deleted notes excluded
- Nodes with no tags return empty array

**IPC Handler Tests** (`graph.handlers.test.ts` - 4 tests):
- Handler registration verified
- Handler returns graph data correctly
- Handler returns empty graph on error
- Handler logs errors

All tests passing (10/10).

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

**D-06-02-01: Individual tag queries per note**
- Chose to query tags via junction table for each note in a loop
- Simpler implementation, acceptable performance for typical graph sizes
- Alternative (single query with GROUP_CONCAT) would be more complex and SQLite-specific

**D-06-02-02: Empty graph on error**
- Return `{ nodes: [], links: [] }` on error instead of throwing
- Allows UI to gracefully show empty graph rather than crashing
- Errors still logged for debugging

**D-06-02-03: Optional similarity field**
- Only include similarity score for semantic links (undefined for manual links)
- Keeps GraphLink type clean and semantically correct
- Alternative (always include with null) would be less type-safe

## Integration Points

**Upstream Dependencies:**
- Phase 6 Plan 1 (06-01): Three.js and react-force-graph-3d packages installed
- Database schema (notes, links, tags, note_tags tables)
- Existing service patterns (notes.service.ts, links.service.ts)

**Downstream Consumers:**
- Phase 6 Plan 3 (06-03): 3D graph component will call window.api.graph.getData()
- Renderer process can now fetch graph data via IPC

**Data Flow:**
1. Renderer calls `window.api.graph.getData()`
2. IPC invokes `graph:getData` handler
3. Handler calls `getGraphData(db)` service
4. Service queries notes, tags, links tables
5. Returns GraphData to renderer

## Performance Characteristics

**Query Complexity:**
- Notes query: O(n) where n = number of notes
- Tags query: O(n * m) where m = average tags per note (typically 2-5)
- Links query: O(l) where l = number of links
- Total: O(n * m + l) - acceptable for typical graph sizes (100-1000 nodes)

**Memory:**
- Graph data held in memory during query execution
- Typical graph (500 nodes, 1000 links): ~100KB in memory
- No caching (fresh query each time) - acceptable for local database

**Optimization Opportunities (if needed):**
- Batch tag queries with single GROUP_CONCAT query
- Add caching layer with invalidation on note/link changes
- Paginate large graphs (load visible nodes first)

## Known Issues

None.

## Next Steps

**Immediate (Phase 6 Plan 3):**
- Create 3D graph visualization component using react-force-graph-3d
- Call window.api.graph.getData() to fetch graph data
- Render nodes and links in 3D space
- Add basic camera controls (zoom, pan, rotate)

**Future Enhancements:**
- Add filtering (by tag, date range, search query)
- Add graph layout algorithms (force-directed, hierarchical, circular)
- Add node clustering for large graphs
- Add real-time updates (watch for note/link changes)

## Verification

All success criteria met:

- [x] GraphNode, GraphLink, GraphData TypeScript interfaces defined
- [x] getGraphData service queries notes and links tables
- [x] Service returns nodes with id, title, tags array
- [x] Service returns links with source, target, type, similarity
- [x] Service excludes deleted notes and links to deleted notes
- [x] IPC handler graph:getData registered and calls service
- [x] Preload exposes window.api.graph.getData()
- [x] Error handling returns empty graph on failure
- [x] Handler registered in main.ts
- [x] All tests passing (10/10)

## Self-Check: PASSED

**Created files verified:**
- electron/services/graph.service.ts: EXISTS
- electron/ipc/graph.handlers.ts: EXISTS
- src/types/graph.ts: EXISTS
- electron/services/graph.service.test.ts: EXISTS
- electron/ipc/graph.handlers.test.ts: EXISTS

**Commits verified:**
- 8abca4f: test(06-02): add failing test for graph service
- 02523a2: feat(06-02): implement graph service with data queries
- 54826b7: test(06-02): add failing test for graph IPC handlers
- cbf54b5: feat(06-02): create IPC handlers for graph operations
- f57fc14: feat(06-02): register graph handlers in main process

All commits present in git history.
