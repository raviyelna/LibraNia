# Phase 6: 3D Visualization - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive 3D neural network graph visualization for exploring knowledge base. Users view their knowledge graph as a 3D neural network, navigate by clicking nodes, see visual connections between related nodes, and watch the graph update automatically when new knowledge is added. Must handle 1000+ nodes without lag.

</domain>

<decisions>
## Implementation Decisions

### Graph Layout & Physics
- **D-01:** Moderate clustering — balanced spacing, related notes close but readable, matches typical knowledge graph UX
- **D-02:** Strong center gravity — keeps graph compact, related clusters stay together, good for dense knowledge bases
- **D-03:** Short link distance — nodes stay close to connected neighbors, compact graph, easier to see local relationships
- **D-04:** Node repulsion enabled — prevents overlap, clean separation, standard force-directed behavior

### Node Visual Design
- **D-05:** Sphere geometry — classic 3D graph look, easy to render, works well with Three.js primitives
- **D-06:** Fixed node size — all nodes same size, simple and clean, treats all knowledge equally, easier to click
- **D-07:** Color by tag — different color per tag, visual grouping by topic, matches existing tag system, untagged notes get default color
- **D-08:** On-hover labels — labels appear when hovering over node, clean default view, shows detail on demand

### Interaction & Navigation
- **D-09:** Side panel for note content — note opens in side panel, graph stays visible, can navigate graph while reading, matches existing sidebar pattern (backlinks, related)
- **D-10:** Free camera controls — standard orbit controls (left-drag rotates, right-drag pans, scroll zooms), familiar 3D navigation, no limits
- **D-11:** Integrate existing search — reuse existing search UI, matching nodes highlight in graph, camera focuses on results, integrates with Phase 2 FTS + Phase 5 semantic search
- **D-12:** 2D minimap — shows full graph from top-down in corner, current view highlighted, click to jump, standard 3D app pattern
- **D-13:** Thin link lines — subtle connections, keeps focus on nodes, clean look, standard graph style
- **D-14:** Highlight neighbors on selection — highlight clicked node + direct neighbors, dim everything else, shows immediate connections

### Performance Strategy
- **D-15:** Preload all notes — load all notes at startup, instant graph display, simple implementation, works well for <5000 notes, matches local-first architecture
- **D-16:** No culling — render all nodes always, simplest approach, works well for 1000-2000 nodes, GPU handles it
- **D-17:** Instanced rendering — single geometry for all nodes, GPU renders in one draw call, massive performance gain for 1000+ nodes, standard Three.js optimization
- **D-18:** Animated transitions — smooth spring animation, node fades in and springs to position, polished feel

### Claude's Discretion
None — all areas had explicit decisions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — VIZ-01 through VIZ-05 requirements for this phase
- `.planning/PROJECT.md` — Core value (multi-model verification), constraints (local-first, 1000+ node performance requirement)

### Prior Phase Context
- `.planning/phases/02-core-knowledge-management/02-CONTEXT.md` — Database schema (notes, links tables), UUID primary keys, service layer pattern, React hooks pattern
- `.planning/phases/05-semantic-discovery/05-CONTEXT.md` — Links table with link_type column (manual vs semantic), embeddings table, semantic relationships stored in graph structure

### Technology Stack
- `CLAUDE.md` — Three.js r172+, react-force-graph-3d 1.24+, d3-force-3d for physics simulation (locked in tech stack section)

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **React hooks pattern** (`src/hooks/useNotes.ts`, `useSearch.ts`) — create `useGraph.ts` for graph data fetching
- **Service layer pattern** (`electron/services/notes.service.ts`) — query notes + links for graph data
- **Database schema** (`electron/database/schema.ts`) — notes table (id, title, metadata), links table (source_note_id, target_note_id, link_type), tags table for color mapping
- **Sidebar pattern** (`src/components/Notes/BacklinksPanel.tsx`, `RelatedPanel.tsx`) — reuse for note content display when node clicked
- **Search integration** (`src/hooks/useSearch.ts`, `src/components/Notes/QuickNav.tsx`) — extend to highlight matching nodes in graph

### Established Patterns
- **UUID primary keys** — notes use crypto.randomUUID(), graph nodes keyed by note.id
- **Link types** — links.link_type distinguishes manual vs semantic (from Phase 5), can style differently in graph
- **Tag system** — notes have tags via note_tags junction, use for node coloring
- **IPC communication** — renderer calls `window.api.*`, main process handles via `ipcMain.handle()`

### Integration Points
- **Graph route** — add `/graph` route alongside `/notes` and `/chat` in main navigation
- **Data fetching** — IPC handler to fetch all notes + links for graph rendering
- **Search integration** — extend existing search to emit events that graph component listens to
- **Note panel** — reuse existing NoteEditor component in side panel when node clicked
- **Real-time updates** — subscribe to note creation/update events, add nodes to graph dynamically

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for 3D graph visualization with Three.js and react-force-graph-3d.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-3d-visualization*
*Context gathered: 2026-05-26*
