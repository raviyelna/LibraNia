---
phase: 06-3d-visualization
plan: 05
subsystem: graph-visualization
tags: [real-time, search, minimap, ui, performance]
dependency_graph:
  requires: [06-04, 02-03, useSearch]
  provides: [real-time-graph-updates, search-highlighting, minimap-navigation]
  affects: [GraphView, GraphControls, useGraph, notes.handlers]
tech_stack:
  added: [react-force-graph-2d@1.29.1]
  patterns: [real-time-events, IPC-streaming, search-integration, 2D-minimap]
key_files:
  created:
    - src/components/Graph/GraphMinimap.tsx
    - src/components/Graph/GraphMinimap.test.tsx
    - src/components/Graph/GraphControls.test.tsx
  modified:
    - src/hooks/useGraph.ts
    - src/hooks/useGraph.test.ts
    - src/components/Graph/GraphView.tsx
    - src/components/Graph/GraphView.test.tsx
    - src/components/Graph/GraphControls.tsx
    - electron/preload.ts
    - electron/ipc/notes.handlers.ts
    - electron/main.ts
decisions:
  - decision: "Real-time updates via IPC events instead of polling"
    rationale: "More efficient, immediate updates, follows existing streaming pattern from AI handlers"
  - decision: "Search uses quickNav mode by default"
    rationale: "Fastest search mode, suitable for graph navigation, user can switch modes if needed"
  - decision: "Search highlighting takes priority over neighbor highlighting"
    rationale: "User intent: when searching, search results should be most visible"
  - decision: "Minimap uses separate ForceGraph2D instance"
    rationale: "Simpler than custom 2D projection, leverages existing force-directed layout"
metrics:
  duration: "15m 10s"
  tasks_completed: 5
  files_created: 3
  files_modified: 8
  tests_added: 19
  commits: 6
---

# Phase 6 Plan 05: Real-Time Updates, Search Integration, and Minimap

**One-liner:** Real-time graph updates via IPC events, search highlighting with camera focus, and 2D minimap for navigation

## What Was Built

### Real-Time Graph Updates (Task 1)
- **useGraph hook** subscribes to `notes:created` IPC events on mount
- New notes automatically added to graph data with `tags` array normalization
- Event listener cleanup on unmount prevents memory leaks
- **IPC infrastructure:**
  - Added `window.api.notes.onCreated` in preload.ts
  - Modified `notes:create` handler to emit `notes:created` event
  - Moved `registerNotesHandlers` after window creation to access mainWindow
- **Animation:** d3-force-3d automatically animates new nodes into position (no additional code needed per RESEARCH.md Pattern 5)
- **Tests:** 5 new test cases covering subscription, node addition, cleanup, and tag handling

### Search Integration (Task 2)
- **GraphControls component:**
  - Search input field with Tailwind styling
  - Uses existing `useSearch` hook (quickNav mode by default)
  - Executes search automatically on query change
  - Passes matching node IDs to parent via `onSearchResults` callback
- **GraphView highlighting:**
  - Search matches highlighted in yellow/gold (#fbbf24)
  - Camera focuses on first search result with smooth 1000ms animation
  - Node color priority: search matches > neighbor highlighting > tag colors
  - Clearing search input removes highlighting
- **Component hierarchy:** GraphView → GraphControls with callback prop
- **Tests:** 4 GraphControls tests, updated GraphView tests with mock

### 2D Minimap (Task 3)
- **GraphMinimap component:**
  - Uses `react-force-graph-2d@1.29.1` (same author as 3D version)
  - Positioned in bottom-right corner (192x192px)
  - Shows all nodes as small gray dots (#888), links as dark gray (#444)
  - Transparent background, no zoom/pan interaction
  - Clicking node jumps main camera to that location
- **Integration:**
  - Rendered in GraphView with `handleMinimapClick` callback
  - Camera jump uses `cameraPosition` with 1000ms animation
  - Minimap updates reactively when graph data changes
- **Tests:** 10 test cases covering rendering, configuration, interaction, and updates

### Memory Management (Task 5)
- **Cleanup on unmount:**
  - Added `useEffect` cleanup to pause ForceGraph3D animation
  - Prevents memory leaks when graph component unmounts
  - Event listeners already cleaned up in useGraph hook (Task 1)
  - Shared Three.js geometry/material already handled (Plan 04)

## Deviations from Plan

None - plan executed exactly as written.

## Test Results

**All graph-related tests passing:**
- useGraph: 10/10 tests passing (5 existing + 5 new real-time tests)
- GraphControls: 4/4 tests passing
- GraphView: 18/18 tests passing
- GraphMinimap: 10/10 tests passing
- **Total:** 42 graph tests passing

**Full test suite:** 578/594 tests passing (16 pre-existing failures in appConfig.test.ts, unrelated to this plan)

## Requirements Fulfilled

- **VIZ-05:** Graph updates automatically when new knowledge added ✓
- **D-11:** Search integration with existing FTS/semantic search ✓
- **D-12:** 2D minimap for navigation ✓
- **D-18:** Smooth animations for new nodes (d3-force-3d automatic) ✓

## Known Issues

None.

## Performance Notes

- Real-time updates use IPC events (no polling overhead)
- Search executes on every keystroke (debouncing could be added if needed)
- Minimap renders separate 2D graph (minimal overhead for 1000+ nodes)
- Memory cleanup prevents leaks on component unmount

## Integration Points

**Upstream dependencies:**
- Phase 2 FTS search (quickNav, fullText, fuzzy)
- Phase 5 semantic search
- Phase 6 Plan 04 (instanced rendering, force simulation)

**Downstream consumers:**
- Real-time updates work with any note creation (editor, AI chat, import)
- Search integration reuses existing search infrastructure
- Minimap provides navigation for large graphs (1000+ nodes)

## Future Enhancements

- Debounce search input to reduce query frequency
- Add search mode selector (quickNav, fullText, fuzzy, semantic)
- Minimap viewport indicator showing current camera view
- Real-time updates for note edits and deletions (not just creation)

## Self-Check: PASSED

**Created files exist:**
```bash
FOUND: src/components/Graph/GraphMinimap.tsx
FOUND: src/components/Graph/GraphMinimap.test.tsx
FOUND: src/components/Graph/GraphControls.test.tsx
```

**Commits exist:**
```bash
FOUND: 873647a (test scaffold)
FOUND: ccff9d4 (real-time updates)
FOUND: 6733882 (search integration)
FOUND: d287f81 (install dependency)
FOUND: 76502ce (minimap component)
FOUND: df6a43a (memory management)
```

**Tests passing:**
- All 42 graph-related tests passing
- No regressions in existing tests
