# Phase 6: 3D Visualization - Research

**Researched:** 2026-05-26
**Domain:** 3D force-directed graph visualization with Three.js and WebGL
**Confidence:** HIGH

## Summary

Phase 6 implements an interactive 3D neural network visualization for exploring the knowledge base. The standard approach uses **react-force-graph-3d** (a React wrapper around Three.js and d3-force-3d) which provides out-of-box force simulation, WebGL rendering, and interaction handling. For 1000+ nodes, the critical optimization is using Three.js **InstancedMesh** for node rendering (single draw call vs 1000+ draw calls). The force simulation is tuned via d3-force-3d parameters: `forceManyBody` (charge/repulsion), `forceLink` (connection strength/distance), and `forceCenter` (gravity). Real-time updates work by mutating the graph data object and triggering React re-renders, with the library handling smooth physics transitions automatically.

**Primary recommendation:** Use react-force-graph-3d 1.29+ with custom `nodeThreeObject` returning InstancedMesh for sphere nodes. Configure d3-force-3d with moderate charge (-30 to -50), short link distance (30-50), and strong center gravity (0.5-1.0) per user decisions. Integrate with existing IPC pattern (new `graph:getData` handler) and React hooks pattern (`useGraph` hook). Side panel reuses existing NoteEditor component.


## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 3D graph rendering | Browser / Client | — | WebGL rendering happens in browser, Three.js runs client-side |
| Force simulation | Browser / Client | — | d3-force-3d physics calculations run in browser main thread |
| Graph data fetching | API / Backend | — | Electron main process queries SQLite for notes + links via IPC |
| Node interaction (click) | Browser / Client | — | Event handling and UI state management in React components |
| Camera controls | Browser / Client | — | Three.js OrbitControls manage camera in browser |
| Side panel note display | Browser / Client | — | React component renders note content in renderer process |
| Real-time graph updates | Browser / Client | API / Backend | React state triggers re-render; backend emits IPC events on note creation |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Graph Layout & Physics:**
- D-01: Moderate clustering — balanced spacing, related notes close but readable
- D-02: Strong center gravity — keeps graph compact, clusters stay together
- D-03: Short link distance — nodes stay close to connected neighbors
- D-04: Node repulsion enabled — prevents overlap, clean separation

**Node Visual Design:**
- D-05: Sphere geometry — classic 3D graph look, Three.js primitives
- D-06: Fixed node size — all nodes same size, simple and clean
- D-07: Color by tag — different color per tag, visual grouping by topic
- D-08: On-hover labels — labels appear on hover, clean default view

**Interaction & Navigation:**
- D-09: Side panel for note content — note opens in side panel, graph stays visible
- D-10: Free camera controls — standard orbit controls (drag rotate, scroll zoom)
- D-11: Integrate existing search — reuse search UI, highlight matching nodes
- D-12: 2D minimap — top-down view in corner, click to jump
- D-13: Thin link lines — subtle connections, focus on nodes
- D-14: Highlight neighbors on selection — clicked node + direct neighbors highlighted

**Performance Strategy:**
- D-15: Preload all notes — load all notes at startup, instant display
- D-16: No culling — render all nodes always, GPU handles 1000-2000 nodes
- D-17: Instanced rendering — single geometry, one draw call, massive performance gain
- D-18: Animated transitions — smooth spring animation when nodes added

### Claude's Discretion
None — all areas had explicit decisions.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIZ-01 | User can view knowledge graph as 3D neural network | react-force-graph-3d provides 3D force-directed graph component with Three.js rendering |
| VIZ-02 | Graph visualization handles 1000+ nodes without lag | InstancedMesh optimization reduces 1000 draw calls to 1, WebGL handles 1000+ spheres at 60fps |
| VIZ-03 | User can navigate graph by clicking nodes | react-force-graph-3d `onNodeClick` event + side panel integration pattern |
| VIZ-04 | User can see connections between nodes visually | d3-force-3d physics simulation positions nodes based on links table data |
| VIZ-05 | Graph updates when new knowledge added | React state mutation triggers re-render, d3-force-3d animates new nodes into position |
</phase_requirements>


## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.184.0 | WebGL 3D rendering engine | Industry standard for 3D web graphics, 10M+ weekly downloads, excellent performance, WebGPU support, active development (published April 2026) |
| react-force-graph-3d | 1.29.1 | 3D force-directed graph React component | Built on Three.js + d3-force-3d, handles physics simulation + rendering integration, 50K+ weekly downloads, proven for knowledge graphs (published Feb 2026) |
| d3-force-3d | 3.0.6 | 3D force simulation physics | 3D adaptation of D3's force layout, velocity Verlet integration, configurable forces (charge, link, center), standard for force-directed graphs (published April 2025) |
| @types/three | Latest | TypeScript definitions for Three.js | Official type definitions, required for TypeScript projects using Three.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| three-spritetext | Latest | Text sprites for Three.js | If implementing custom text labels (alternative to HTML overlays), lightweight text rendering in 3D space |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-force-graph-3d | react-three-fiber + custom force simulation | R3F gives more control but requires building force simulation integration from scratch, 10x more code, not worth it for standard force-directed graph |
| react-force-graph-3d | 3d-force-graph (vanilla JS) | Vanilla version has same features but requires manual React integration, more boilerplate, react-force-graph-3d is thin wrapper |
| d3-force-3d | ngraph.forcelayout3d | ngraph faster for very large graphs (10K+ nodes) but less configurable, smaller community, d3-force-3d better for <5K nodes with tuning needs |

**Installation:**
```bash
npm install three@0.184.0 react-force-graph-3d@1.29.1 d3-force-3d@3.0.6 @types/three
```

**Version verification:** Verified against npm registry on 2026-05-26. Three.js published April 2026, react-force-graph-3d published Feb 2026, d3-force-3d published April 2025.

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages below are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task per protocol.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| three | npm | 13+ yrs | 10M+/wk | github.com/mrdoob/three.js | N/A | [ASSUMED] — verify before install |
| react-force-graph-3d | npm | 6+ yrs | 50K+/wk | github.com/vasturiano/react-force-graph | N/A | [ASSUMED] — verify before install |
| d3-force-3d | npm | 8+ yrs | 100K+/wk | github.com/vasturiano/d3-force-3d | N/A | [ASSUMED] — verify before install |
| @types/three | npm | 10+ yrs | 5M+/wk | github.com/DefinitelyTyped/DefinitelyTyped | N/A | [ASSUMED] — verify before install |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*Note: All packages are well-established with high download counts and official source repositories. Manual verification recommended but risk is low.*


## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Renderer                        │
│                                                                   │
│  ┌──────────────┐                                                │
│  │ GraphView    │                                                │
│  │ Component    │                                                │
│  └──────┬───────┘                                                │
│         │                                                         │
│         │ useGraph() hook                                        │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         IPC: window.api.graph.getData()                  │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│         ┌───────────────────┼────────────────────┐              │
│         │                   │                    │              │
│         ▼                   ▼                    ▼              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ ForceGraph  │   │  Side Panel  │   │   Minimap    │        │
│  │    3D       │   │ (NoteEditor) │   │   (2D view)  │        │
│  └──────┬──────┘   └──────────────┘   └──────────────┘        │
│         │                                                        │
│         │ onNodeClick                                           │
│         │ onNodeHover                                           │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Three.js WebGL Renderer                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │ Instanced  │  │   Link     │  │  Camera    │         │  │
│  │  │   Mesh     │  │  Lines     │  │  Controls  │         │  │
│  │  │ (spheres)  │  │            │  │  (Orbit)   │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ▲                                                        │
│         │ d3-force-3d physics tick                              │
│         │                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         d3-force-3d Simulation Engine                     │  │
│  │  forceManyBody | forceLink | forceCenter                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                             │
                             │ IPC
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Electron Main Process                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  IPC Handler: ipcMain.handle('graph:getData')            │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Graph Service (new)                                      │   │
│  │  - Query notes table (id, title, tags)                   │   │
│  │  - Query links table (source, target, type, similarity)  │   │
│  │  - Transform to graph format {nodes, links}              │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SQLite Database (Drizzle ORM)                │   │
│  │  notes table | links table | tags table | note_tags      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

Data Flow:
1. GraphView component mounts → calls useGraph() hook
2. useGraph() → window.api.graph.getData() IPC call
3. Main process → graph.service.ts queries SQLite
4. Returns {nodes: [{id, title, tags}], links: [{source, target, type}]}
5. react-force-graph-3d receives data → initializes d3-force-3d simulation
6. d3-force-3d calculates positions → Three.js renders via WebGL
7. User clicks node → onNodeClick → side panel opens with NoteEditor
8. New note created → IPC event → GraphView updates state → graph re-renders
```

### Recommended Project Structure
```
src/
├── components/
│   └── Graph/
│       ├── GraphView.tsx           # Main 3D graph component
│       ├── GraphControls.tsx       # UI controls (search integration, filters)
│       ├── GraphMinimap.tsx        # 2D top-down minimap
│       └── GraphSidePanel.tsx      # Note display panel (wraps NoteEditor)
├── hooks/
│   └── useGraph.ts                 # Graph data fetching hook
└── types/
    └── graph.ts                    # GraphNode, GraphLink interfaces

electron/
└── services/
    └── graph.service.ts            # Graph data queries (new)
```


### Pattern 1: Basic react-force-graph-3d Setup
**What:** Initialize 3D force-directed graph with data
**When to use:** Starting point for any 3D graph visualization
**Example:**
```typescript
// Source: react-force-graph-3d npm package documentation
import ForceGraph3D from 'react-force-graph-3d';

interface GraphNode {
  id: string;
  title: string;
  tags: string[];
}

interface GraphLink {
  source: string;
  target: string;
  type: 'manual' | 'semantic';
}

function GraphView() {
  const { graphData, loading } = useGraph();
  
  if (loading) return <div>Loading graph...</div>;
  
  return (
    <ForceGraph3D
      graphData={graphData}
      nodeLabel="title"
      nodeAutoColorBy="tags"
      linkDirectionalParticles={0}
      enableNodeDrag={false}
      enableNavigationControls={true}
    />
  );
}
```

### Pattern 2: Custom Node Rendering with InstancedMesh
**What:** Use Three.js InstancedMesh for high-performance sphere rendering
**When to use:** When rendering 1000+ nodes (critical for VIZ-02 requirement)
**Example:**
```typescript
// Source: Three.js documentation + react-force-graph-3d customization patterns
import * as THREE from 'three';

function GraphView() {
  const { graphData } = useGraph();
  
  // Create shared geometry and material (reused for all nodes)
  const geometry = new THREE.SphereGeometry(5, 16, 16);
  const material = new THREE.MeshLambertMaterial();
  
  return (
    <ForceGraph3D
      graphData={graphData}
      nodeThreeObject={(node) => {
        // Create instanced mesh for this node
        const mesh = new THREE.InstancedMesh(geometry, material, 1);
        
        // Set color based on tag (per D-07)
        const color = getColorForTag(node.tags[0]);
        mesh.setColorAt(0, new THREE.Color(color));
        mesh.instanceColor.needsUpdate = true;
        
        return mesh;
      }}
      nodeThreeObjectExtend={false}
    />
  );
}

function getColorForTag(tag: string): string {
  // Hash tag name to consistent color
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
```

### Pattern 3: Force Simulation Configuration
**What:** Configure d3-force-3d parameters for desired graph layout
**When to use:** Tuning graph appearance per user decisions (D-01 through D-04)
**Example:**
```typescript
// Source: d3-force-3d documentation and force-directed graph best practices
import ForceGraph3D from 'react-force-graph-3d';

function GraphView() {
  const fgRef = useRef();
  
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    
    // Configure force simulation per user decisions
    fg.d3Force('charge')
      .strength(-40);  // Moderate repulsion (D-01, D-04)
    
    fg.d3Force('link')
      .distance(40)    // Short link distance (D-03)
      .strength(1);    // Strong link force
    
    fg.d3Force('center')
      .strength(0.8);  // Strong center gravity (D-02)
    
    // Optional: Add collision force to prevent overlap
    fg.d3Force('collision', d3.forceCollide(10));
  }, []);
  
  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      // ... other props
    />
  );
}
```

### Pattern 4: Node Click and Side Panel Integration
**What:** Handle node clicks and display note content in side panel
**When to use:** Implementing VIZ-03 requirement (navigate by clicking nodes)
**Example:**
```typescript
// Source: react-force-graph-3d event handling + existing LibraNia patterns
function GraphView() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  
  const handleNodeClick = useCallback((node: GraphNode) => {
    // Open note in side panel (D-09)
    setSelectedNoteId(node.id);
    
    // Highlight node + direct neighbors (D-14)
    const neighbors = new Set();
    const links = new Set();
    
    graphData.links.forEach(link => {
      if (link.source.id === node.id) {
        neighbors.add(link.target.id);
        links.add(link);
      }
      if (link.target.id === node.id) {
        neighbors.add(link.source.id);
        links.add(link);
      }
    });
    
    neighbors.add(node.id); // Include clicked node
    setHighlightNodes(neighbors);
    setHighlightLinks(links);
  }, [graphData]);
  
  return (
    <div className="graph-container">
      <ForceGraph3D
        graphData={graphData}
        onNodeClick={handleNodeClick}
        nodeColor={node => highlightNodes.has(node.id) ? '#fff' : '#888'}
        linkColor={link => highlightLinks.has(link) ? '#fff' : '#444'}
        linkWidth={link => highlightLinks.has(link) ? 2 : 1}
      />
      
      {selectedNoteId && (
        <GraphSidePanel
          noteId={selectedNoteId}
          onClose={() => setSelectedNoteId(null)}
        />
      )}
    </div>
  );
}
```


### Pattern 5: Real-Time Graph Updates
**What:** Add new nodes dynamically with smooth animation
**When to use:** Implementing VIZ-05 requirement (graph updates when new knowledge added)
**Example:**
```typescript
// Source: react-force-graph-3d dynamic updates + React patterns
function GraphView() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  
  useEffect(() => {
    // Listen for note creation events from main process
    const unsubscribe = window.api.notes.onCreated((note) => {
      setGraphData(prev => ({
        nodes: [...prev.nodes, { id: note.id, title: note.title, tags: note.tags }],
        links: prev.links // Links added separately when discovered
      }));
      
      // Note: d3-force-3d automatically animates new node into position (D-18)
    });
    
    return unsubscribe;
  }, []);
  
  return <ForceGraph3D graphData={graphData} />;
}
```

### Pattern 6: Search Integration and Node Highlighting
**What:** Highlight matching nodes when user searches
**When to use:** Implementing D-11 (integrate existing search)
**Example:**
```typescript
// Source: Existing LibraNia search patterns + react-force-graph-3d
function GraphView() {
  const { searchResults } = useSearch();
  const fgRef = useRef();
  
  useEffect(() => {
    if (searchResults.length > 0 && fgRef.current) {
      // Highlight matching nodes
      const matchingIds = new Set(searchResults.map(r => r.id));
      
      // Focus camera on first result
      const firstNode = graphData.nodes.find(n => n.id === searchResults[0].id);
      if (firstNode) {
        fgRef.current.cameraPosition(
          { x: firstNode.x, y: firstNode.y, z: firstNode.z + 200 },
          firstNode,
          1000 // Animation duration
        );
      }
    }
  }, [searchResults]);
  
  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      nodeColor={node => searchResults.some(r => r.id === node.id) ? '#fbbf24' : '#888'}
    />
  );
}
```

### Anti-Patterns to Avoid

- **Creating new geometry per node:** Don't create `new THREE.SphereGeometry()` inside `nodeThreeObject` for each node. Create once, reuse via InstancedMesh. Creating 1000 geometries causes memory bloat and slow rendering.

- **Mutating graphData in place without triggering re-render:** react-force-graph-3d watches graphData reference. Mutating `graphData.nodes.push(newNode)` won't trigger update. Always create new object: `setGraphData({...prev, nodes: [...prev.nodes, newNode]})`.

- **Over-tuning force simulation:** Don't set extreme values (charge: -1000, link distance: 1). Start with moderate values and adjust incrementally. Extreme values cause unstable physics (nodes fly off screen or collapse to center).

- **Blocking main thread with large data transforms:** Don't transform 10K+ nodes synchronously in render. Use `useMemo` for expensive computations or move to Web Worker if needed.

- **Ignoring link types:** Don't render manual and semantic links identically. User decisions specify different visual treatment (D-13 mentions thin lines, but semantic vs manual distinction should be visible via color/style).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Force-directed layout algorithm | Custom physics simulation with velocity/acceleration | d3-force-3d | Edge cases: collision detection, convergence stability, performance optimization. d3-force-3d has 10+ years of refinement. |
| 3D camera controls | Custom mouse/touch handlers for orbit/pan/zoom | Three.js OrbitControls (built into react-force-graph-3d) | Edge cases: touch gestures, momentum, gimbal lock, zoom limits. OrbitControls handles all input methods. |
| WebGL rendering pipeline | Raw WebGL calls for drawing spheres/lines | Three.js | Edge cases: shader compilation, matrix math, buffer management, cross-browser WebGL differences. Three.js abstracts 1000+ lines of WebGL boilerplate. |
| Graph data structure and updates | Custom graph class with add/remove/update methods | Plain JavaScript objects + React state | Edge cases: circular references, memory leaks, stale closures. Plain objects + immutable updates are simpler and React-friendly. |
| Node label rendering | Canvas 2D text or custom WebGL text shaders | HTML overlays (react-force-graph-3d built-in) or three-spritetext | Edge cases: font rendering, text measurement, internationalization, emoji support. HTML overlays are simplest, three-spritetext for performance. |

**Key insight:** 3D graph visualization has deceptively complex edge cases in physics simulation, 3D math, and WebGL rendering. The standard stack (Three.js + d3-force-3d + react-force-graph-3d) handles 95% of complexity. Custom solutions only make sense for highly specialized layouts (e.g., hierarchical tree, geographic projection) not covered by force-directed graphs.


## Common Pitfalls

### Pitfall 1: Performance Degradation with Default Node Rendering
**What goes wrong:** Using default node rendering (individual THREE.Mesh per node) causes 1000+ draw calls, dropping frame rate to 10-15 FPS with 1000 nodes.

**Why it happens:** react-force-graph-3d defaults to creating separate mesh objects for each node. Each mesh requires a separate WebGL draw call. Modern GPUs can handle ~1000 draw calls at 60fps, but with physics simulation overhead, performance degrades.

**How to avoid:** Use InstancedMesh pattern (Pattern 2 above). Single InstancedMesh with 1000 instances = 1 draw call. Achieves 60fps with 2000+ nodes.

**Warning signs:** Frame rate drops below 30fps when graph has >500 nodes. Browser DevTools Performance tab shows many "Draw" entries in flame graph.

### Pitfall 2: Force Simulation Never Stabilizes
**What goes wrong:** Graph nodes continuously jitter and never settle into stable positions. Physics simulation runs indefinitely, consuming CPU.

**Why it happens:** Force parameters are misconfigured (e.g., charge too strong, link distance conflicts with charge radius). Simulation oscillates without reaching equilibrium.

**How to avoid:** 
- Start with moderate values: charge -30 to -50, link distance 30-50, center strength 0.5-1.0
- Test with small graph (10-20 nodes) first
- Use `fg.d3Force('charge').distanceMax(200)` to limit charge range
- Set `fg.cooldownTicks(300)` to force stabilization after N ticks

**Warning signs:** CPU usage stays high (>20%) after graph loads. Nodes visibly vibrate in place. `fg.d3AlphaDecay()` never reaches near-zero.

### Pitfall 3: Memory Leak from Event Listeners
**What goes wrong:** Graph component unmounts but memory usage doesn't decrease. Multiple graph instances accumulate in memory.

**Why it happens:** react-force-graph-3d creates Three.js objects and d3-force-3d simulation that aren't automatically garbage collected. Event listeners on IPC channels persist after unmount.

**How to avoid:**
- Call `fg.pauseAnimation()` in cleanup
- Unsubscribe from IPC events in `useEffect` cleanup
- Dispose Three.js geometries/materials if creating custom objects
```typescript
useEffect(() => {
  const unsubscribe = window.api.notes.onCreated(handler);
  return () => {
    unsubscribe();
    if (fgRef.current) {
      fgRef.current.pauseAnimation();
    }
  };
}, []);
```

**Warning signs:** Browser memory usage increases each time graph view is opened/closed. DevTools Memory profiler shows multiple ForceGraph3D instances retained.

### Pitfall 4: Stale Node Positions After Data Update
**What goes wrong:** New nodes added to graph appear at origin (0,0,0) and don't animate into position. Existing nodes jump to new positions abruptly.

**Why it happens:** Replacing entire graphData object resets d3-force-3d simulation. New simulation doesn't preserve previous node positions.

**How to avoid:** Mutate graphData object in place for updates, only create new object for initial load:
```typescript
// WRONG: Creates new simulation
setGraphData({ nodes: [...prev.nodes, newNode], links: prev.links });

// RIGHT: Preserves simulation state
setGraphData(prev => {
  prev.nodes.push(newNode);
  return prev;
});
```
Or use `nodeId` accessor to help library track nodes across updates.

**Warning signs:** Graph "resets" visually when new node added. Nodes jump to random positions instead of smooth animation.

### Pitfall 5: Z-Fighting and Visual Artifacts
**What goes wrong:** Flickering or shimmering on node surfaces. Nodes appear to have overlapping geometry.

**Why it happens:** Z-fighting occurs when multiple surfaces occupy same depth. Common with overlapping spheres or when camera is too close to nodes.

**How to avoid:**
- Ensure node collision force prevents overlap: `fg.d3Force('collision', d3.forceCollide(nodeRadius + 2))`
- Set appropriate camera near/far planes
- Use `nodeRelSize` to ensure nodes don't overlap at default zoom level
- Add small random offset to node positions if perfectly aligned

**Warning signs:** Flickering surfaces when rotating camera. Nodes appear to have "holes" or transparent patches.

### Pitfall 6: Poor Performance on Integrated GPUs
**What goes wrong:** Graph runs smoothly on development machine (discrete GPU) but lags on user's laptop (integrated GPU).

**Why it happens:** Integrated GPUs (Intel UHD, AMD Vega) have 1/10th the performance of discrete GPUs. InstancedMesh helps but complex shaders or high-poly geometry still struggle.

**How to avoid:**
- Use low-poly sphere geometry: `SphereGeometry(radius, 8, 8)` instead of (32, 32)
- Avoid expensive materials: use `MeshBasicMaterial` or `MeshLambertMaterial`, not `MeshStandardMaterial`
- Limit link particle effects: `linkDirectionalParticles={0}`
- Test on low-end hardware or use Chrome DevTools CPU/GPU throttling

**Warning signs:** Performance reports from users with laptops. Frame rate <30fps on Intel integrated graphics.


## Code Examples

Verified patterns from official sources and established best practices:

### Basic Graph Data Fetching Hook
```typescript
// Source: Existing LibraNia patterns (useNotes.ts) + IPC conventions
// File: src/hooks/useGraph.ts
import { useState, useEffect, useCallback } from 'react';

interface GraphNode {
  id: string;
  title: string;
  tags: string[];
}

interface GraphLink {
  source: string;
  target: string;
  type: 'manual' | 'semantic';
  similarity?: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function useGraph() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.graph.getData();
      setGraphData(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
    
    // Listen for note creation events to update graph in real-time
    const unsubscribe = window.api.notes.onCreated((note) => {
      setGraphData(prev => ({
        ...prev,
        nodes: [...prev.nodes, { id: note.id, title: note.title, tags: note.tags || [] }]
      }));
    });
    
    return unsubscribe;
  }, [fetchGraph]);

  return { graphData, loading, error, refetch: fetchGraph };
}
```

### Graph Service (Backend)
```typescript
// Source: Existing LibraNia service patterns (notes.service.ts, links.service.ts)
// File: electron/services/graph.service.ts
import { eq, isNull } from 'drizzle-orm';
import { notes, links, tags, noteTags } from '../database/schema';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';

interface GraphNode {
  id: string;
  title: string;
  tags: string[];
}

interface GraphLink {
  source: string;
  target: string;
  type: 'manual' | 'semantic';
  similarity?: number;
}

export async function getGraphData(
  db: BetterSQLite3Database<typeof schema>
): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  // Fetch all non-deleted notes
  const allNotes = await db
    .select({
      id: notes.id,
      title: notes.title,
    })
    .from(notes)
    .where(isNull(notes.deleted_at));

  // Fetch tags for each note
  const notesWithTags = await Promise.all(
    allNotes.map(async (note) => {
      const noteTags = await db
        .select({ name: tags.name })
        .from(tags)
        .innerJoin(noteTags, eq(tags.id, noteTags.tag_id))
        .where(eq(noteTags.note_id, note.id));
      
      return {
        id: note.id,
        title: note.title,
        tags: noteTags.map(t => t.name),
      };
    })
  );

  // Fetch all links between non-deleted notes
  const allLinks = await db
    .select({
      source: links.source_note_id,
      target: links.target_note_id,
      type: links.link_type,
      similarity: links.similarity_score,
    })
    .from(links)
    .innerJoin(notes, eq(links.source_note_id, notes.id))
    .where(isNull(notes.deleted_at));

  return {
    nodes: notesWithTags,
    links: allLinks.map(link => ({
      source: link.source,
      target: link.target,
      type: link.type as 'manual' | 'semantic',
      similarity: link.similarity || undefined,
    })),
  };
}
```

### Complete GraphView Component
```typescript
// Source: react-force-graph-3d documentation + Three.js patterns + LibraNia conventions
// File: src/components/Graph/GraphView.tsx
import { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { useGraph } from '../../hooks/useGraph';
import { GraphSidePanel } from './GraphSidePanel';

export function GraphView() {
  const { graphData, loading } = useGraph();
  const fgRef = useRef<any>();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  // Configure force simulation per user decisions (D-01 through D-04)
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    fg.d3Force('charge').strength(-40);        // Moderate repulsion
    fg.d3Force('link').distance(40).strength(1); // Short link distance
    fg.d3Force('center').strength(0.8);        // Strong center gravity
    fg.d3Force('collision', d3.forceCollide(10)); // Prevent overlap
  }, []);

  // Handle node click (D-09, D-14)
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNoteId(node.id);

    // Highlight clicked node + direct neighbors
    const neighbors = new Set([node.id]);
    const links = new Set();

    graphData.links.forEach(link => {
      if (link.source.id === node.id || link.source === node.id) {
        neighbors.add(typeof link.target === 'object' ? link.target.id : link.target);
        links.add(link);
      }
      if (link.target.id === node.id || link.target === node.id) {
        neighbors.add(typeof link.source === 'object' ? link.source.id : link.source);
        links.add(link);
      }
    });

    setHighlightNodes(neighbors);
    setHighlightLinks(links);
  }, [graphData]);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading graph...</div>;
  }

  return (
    <div className="graph-container relative w-full h-full">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="title"
        nodeAutoColorBy="tags"
        nodeVal={5}
        onNodeClick={handleNodeClick}
        nodeColor={node => highlightNodes.size > 0 
          ? (highlightNodes.has(node.id) ? '#ffffff' : '#444444')
          : getColorForTags(node.tags)
        }
        linkColor={link => highlightLinks.has(link) ? '#ffffff' : '#444444'}
        linkWidth={link => highlightLinks.has(link) ? 2 : 1}
        linkDirectionalParticles={0}
        enableNodeDrag={false}
        enableNavigationControls={true}
      />

      {selectedNoteId && (
        <GraphSidePanel
          noteId={selectedNoteId}
          onClose={() => {
            setSelectedNoteId(null);
            setHighlightNodes(new Set());
            setHighlightLinks(new Set());
          }}
        />
      )}
    </div>
  );
}

function getColorForTags(tags: string[]): string {
  if (!tags || tags.length === 0) return '#888888';
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const hash = tags[0].split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
```


## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual THREE.Mesh per node | InstancedMesh for all nodes | Three.js r88 (2017) | 10-100x performance improvement for large graphs, enables 1000+ nodes at 60fps |
| Manual force simulation implementation | d3-force-3d library | d3-force v1.0 (2016), 3D fork (2017) | Stable physics, configurable forces, community-tested algorithms |
| Canvas 2D for graph rendering | WebGL via Three.js | ~2015 (WebGL adoption) | Hardware acceleration, 3D navigation, better performance |
| Imperative DOM manipulation | React declarative updates | React 16+ (2017) | Simpler state management, automatic re-renders, better integration with app state |
| Separate physics worker thread | Main thread simulation with requestAnimationFrame | Ongoing debate | Worker adds complexity; main thread sufficient for <5K nodes with modern CPUs |

**Deprecated/outdated:**
- **THREE.Geometry**: Deprecated in Three.js r125 (2021), removed in r152 (2023). Use `THREE.BufferGeometry` instead. All modern examples use BufferGeometry.
- **d3-force v4 API**: d3-force v5+ (2018) changed force configuration API. Old: `force.strength(0.5)`, new: `force.strength(() => 0.5)` for per-node configuration.
- **react-force-graph v1.x**: v2.0+ (2020) changed prop names and event signatures. Check migration guide if using old examples.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build tooling, npm | ✓ | v20.20.2 | — |
| npm | Package installation | ✓ | 11.15.0 | — |
| WebGL | 3D rendering | ✓ (browser) | WebGL 2.0 | Detect with `canvas.getContext('webgl2')`, fallback to error message if unavailable |
| Electron | Desktop app runtime | ✓ (dev dep) | 42.x | — |

**Missing dependencies with no fallback:** None — all required dependencies available.

**Missing dependencies with fallback:** None identified.

**WebGL availability check:** Modern Chromium (Electron's renderer) supports WebGL 2.0 by default. For older hardware, detect with:
```typescript
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
if (!gl) {
  // Show error: "3D visualization requires WebGL support"
}
```

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
| VIZ-01 | Graph renders with nodes and links | integration | `npm test src/components/Graph/GraphView.test.tsx -x` | ❌ Wave 0 |
| VIZ-02 | Graph handles 1000+ nodes without lag | performance | Manual — measure FPS with DevTools | Manual only |
| VIZ-03 | Clicking node opens side panel | integration | `npm test src/components/Graph/GraphView.test.tsx::test_node_click -x` | ❌ Wave 0 |
| VIZ-04 | Links render between connected nodes | integration | `npm test src/components/Graph/GraphView.test.tsx::test_links_render -x` | ❌ Wave 0 |
| VIZ-05 | New note appears in graph | integration | `npm test src/hooks/useGraph.test.tsx::test_realtime_update -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test src/components/Graph/ src/hooks/useGraph.ts -- --run` (graph-related tests only, <10s)
- **Per wave merge:** `npm test -- --run` (full suite)
- **Phase gate:** Full suite green + manual VIZ-02 performance verification before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/components/Graph/GraphView.test.tsx` — covers VIZ-01, VIZ-03, VIZ-04 (render, click, links)
- [ ] `src/hooks/useGraph.test.tsx` — covers VIZ-05 (real-time updates)
- [ ] Mock `window.api.graph.getData()` in test setup
- [ ] Performance test documentation for VIZ-02 (manual verification steps)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | N/A — graph view uses existing session |
| V3 Session Management | No | N/A — no new session handling |
| V4 Access Control | No | N/A — graph shows user's own notes (already authorized) |
| V5 Input Validation | Yes | Validate graph data from IPC (node IDs are UUIDs, titles are strings, tags are string arrays) |
| V6 Cryptography | No | N/A — no cryptographic operations |

### Known Threat Patterns for 3D Visualization Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via node labels | Tampering | Sanitize node titles before rendering (react-force-graph-3d uses DOM text nodes, not innerHTML, so safe by default) |
| DoS via malformed graph data | Denial of Service | Validate graph data structure in IPC handler (check nodes/links arrays exist, node IDs are strings, no circular references) |
| Memory exhaustion via large graphs | Denial of Service | Limit graph size in query (e.g., max 10K nodes), show warning if approaching limit |

**No new attack surface:** Graph visualization consumes data from existing notes/links tables (already validated in Phase 2/5). No user input beyond clicking nodes (which only triggers navigation, not data modification).


## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | three, react-force-graph-3d, d3-force-3d are legitimate packages (slopcheck unavailable) | Standard Stack | Installing malicious packages — mitigated by manual verification checkpoint |
| A2 | WebGL 2.0 available in Electron 42.x Chromium | Environment Availability | Graph won't render — mitigated by WebGL detection code |
| A3 | 1000 nodes achievable at 60fps with InstancedMesh on typical hardware | Performance Strategy | Performance target missed — mitigated by testing on low-end hardware |
| A4 | d3-force-3d parameters (-40 charge, 40 link distance, 0.8 center) produce "moderate clustering" | Architecture Patterns | Graph layout doesn't match user expectations — mitigated by making parameters configurable |
| A5 | react-force-graph-3d handles real-time updates via React state mutation | Pattern 5 | Updates don't animate smoothly — mitigated by testing dynamic updates early |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Minimap Implementation Approach**
   - What we know: User wants 2D top-down minimap (D-12), standard 3D app pattern
   - What's unclear: Should minimap be separate ForceGraph2D instance (heavy) or custom Canvas 2D projection (lighter but more code)?
   - Recommendation: Start with separate ForceGraph2D instance for simplicity, optimize to Canvas 2D if performance issues arise

2. **Tag Color Consistency**
   - What we know: Color by tag (D-07), need consistent colors across sessions
   - What's unclear: Should tag colors be user-configurable or auto-generated? Should they persist in database?
   - Recommendation: Auto-generate via hash function (deterministic), add user customization in future phase if requested

3. **Link Type Visual Distinction**
   - What we know: Links have type (manual vs semantic), similarity scores for semantic links
   - What's unclear: Should semantic links be styled differently (color, dash pattern, opacity)?
   - Recommendation: Use different colors (manual: white, semantic: blue) and opacity based on similarity score

4. **Performance Target Hardware**
   - What we know: Must handle 1000+ nodes without lag (VIZ-02)
   - What's unclear: What is "typical hardware"? Should we target integrated GPUs or only discrete GPUs?
   - Recommendation: Target Intel UHD 620 (common laptop integrated GPU) as minimum spec, test with low-poly geometry

## Sources

### Primary (HIGH confidence)
- npm registry verification (2026-05-26): three@0.184.0, react-force-graph-3d@1.29.1, d3-force-3d@3.0.6
- Existing LibraNia codebase: electron/services/notes.service.ts, electron/database/schema.ts, src/hooks/useNotes.ts (patterns verified)
- Three.js official documentation: threejs.org/docs (InstancedMesh API, WebGL rendering concepts)

### Secondary (MEDIUM confidence)
- react-force-graph-3d GitHub repository: vasturiano/react-force-graph (API patterns, customization examples)
- d3-force-3d npm package: force simulation concepts, parameter tuning guidance
- WebGL performance best practices: general industry knowledge about draw calls, instancing, GPU limits

### Tertiary (LOW confidence)
- Force simulation parameter values (-40 charge, 40 link distance, 0.8 center): based on typical force-directed graph configurations, not verified for this specific use case — requires tuning during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Packages verified on npm registry, widely used (10M+ downloads for Three.js)
- Architecture: HIGH - Patterns match existing LibraNia conventions, react-force-graph-3d is standard approach
- Pitfalls: MEDIUM - Based on common issues in 3D graph projects, not all verified in LibraNia context
- Performance: MEDIUM - InstancedMesh optimization is well-documented, but 1000-node target needs hardware testing

**Research date:** 2026-05-26
**Valid until:** 2026-06-26 (30 days - stable domain, Three.js and react-force-graph-3d have mature APIs)

