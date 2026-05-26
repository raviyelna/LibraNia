# Phase 6: 3D Visualization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 06-3d-visualization
**Areas discussed:** Graph layout & physics, Node visual design, Interaction & navigation, Performance strategy

---

## Graph Layout & Physics

### Force simulation strength

| Option | Description | Selected |
|--------|-------------|----------|
| Moderate clustering | Balanced spacing. Related notes close but readable. Matches typical knowledge graph UX. Good starting point. | ✓ |
| Tight clustering | Dense packing. Maximizes connections visible. Risk: overlapping labels, hard to click individual nodes. | |
| Loose spacing | Spread out. Easy to see individual nodes. Risk: feels disconnected, harder to see relationship patterns. | |

**User's choice:** Moderate clustering (Recommended)

### Center gravity

| Option | Description | Selected |
|--------|-------------|----------|
| Strong center gravity | Stronger pull. Keeps graph compact. Related clusters stay together. Good for dense knowledge bases. | ✓ |
| Weak center gravity | Weaker pull. Allows clusters to drift apart. Better for seeing distinct topic groups. | |
| No center gravity | No center pull. Pure force-directed layout. Clusters can separate completely. | |

**User's choice:** Strong center gravity (Recommended)

### Link distance

| Option | Description | Selected |
|--------|-------------|----------|
| Short link distance | Shorter links. Nodes stay close to connected neighbors. Compact graph. Easier to see local relationships. | ✓ |
| Medium link distance | Medium links. Balance between local and global view. More breathing room. | |
| Long link distance | Long links. Nodes spread out even when connected. Better for seeing overall structure. | |

**User's choice:** Short link distance (Recommended)

### Node collision

| Option | Description | Selected |
|--------|-------------|----------|
| Node repulsion enabled | Nodes repel each other. Prevents overlap. Standard force-directed behavior. Clean separation. | ✓ |
| No node repulsion | No repulsion. Nodes can overlap. Denser packing. Risk: overlapping makes clicking harder. | |

**User's choice:** Node repulsion enabled (Recommended)

---

## Node Visual Design

### Node shape

| Option | Description | Selected |
|--------|-------------|----------|
| Spheres | Classic 3D graph look. Easy to render. Works well with Three.js primitives. Clean aesthetic. | ✓ |
| Cubes | Sharp edges. More geometric. Slightly heavier to render at scale. | |
| Sprites (2D billboards) | Flat circles facing camera. Lighter rendering. Less 3D feel but better performance. | |
| Custom geometry | Custom mesh (neuron-like, organic shapes). Unique look but more complex rendering. | |

**User's choice:** Spheres (Recommended)

### Node sizing

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed size | All nodes same size. Simple, clean. Treats all knowledge equally. Easier to click. | ✓ |
| Scale by connections | Size by connection count. Highly-linked notes bigger. Shows importance visually. Risk: big nodes dominate view. | |
| Scale by recency | Size by recency. Recent notes bigger. Emphasizes new knowledge. Older notes fade to background. | |

**User's choice:** Fixed size (Recommended)

### Color scheme

| Option | Description | Selected |
|--------|-------------|----------|
| Color by tag | Different color per tag. Visual grouping by topic. Matches existing tag system. Untagged notes get default color. | ✓ |
| Color by recency | Gradient from old (cool colors) to new (warm colors). Shows knowledge timeline. Easy to spot recent additions. | |
| Color by source | Color by note type (manual vs AI-generated). Distinguishes source. Matches Phase 4 content.source pattern. | |
| Uniform color | Single color for all nodes. Minimal, clean. Focuses on structure over categorization. | |

**User's choice:** Color by tag (Recommended)

### Label visibility

| Option | Description | Selected |
|--------|-------------|----------|
| On-hover labels | Labels appear when hovering over node. Clean default view. Shows detail on demand. Standard 3D graph UX. | ✓ |
| Always visible labels | All labels always visible. Maximum information. Risk: overlapping text, visual clutter at scale. | |
| No labels (click to reveal) | No labels in 3D view. Cleanest look. User must click node to see title. More exploratory feel. | |

**User's choice:** On-hover labels (Recommended)

---

## Interaction & Navigation

### Click behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Side panel | Note opens in side panel. Graph stays visible. Can navigate graph while reading. Matches existing sidebar pattern (backlinks, related). | ✓ |
| Replace graph view | Note replaces graph view. Full-screen reading. Click back to return to graph. Simpler navigation. | |
| Modal overlay | Note opens in modal overlay. Graph dimmed behind. Close modal to return. Standard dialog pattern. | |

**User's choice:** Side panel (Recommended)

### Camera controls

| Option | Description | Selected |
|--------|-------------|----------|
| Free camera | Standard orbit controls. Left-drag rotates, right-drag pans, scroll zooms. Familiar 3D navigation. No limits. | ✓ |
| Constrained camera | Constrained rotation. Prevent upside-down view. Limit zoom range. More predictable but less freedom. | |
| Preset views | Preset viewpoints. Top/side/front buttons. Snap to angles. Easier for non-3D users but less exploratory. | |

**User's choice:** Free camera (Recommended)

### Search integration

| Option | Description | Selected |
|--------|-------------|----------|
| Integrate existing search | Reuse existing search UI. Matching nodes highlight in graph. Camera focuses on results. Integrates with Phase 2 FTS + Phase 5 semantic search. | ✓ |
| Graph-specific filter | Separate graph-only search. Filter visible nodes. Hide non-matches. Simpler but duplicates search UI. | |
| No search integration | No search integration. Graph shows all nodes always. User navigates by clicking. Simplest implementation. | |

**User's choice:** Integrate existing search (Recommended)

### Overview/orientation

| Option | Description | Selected |
|--------|-------------|----------|
| 2D minimap | 2D minimap in corner. Shows full graph from top-down. Current view highlighted. Click to jump. Standard 3D app pattern. | ✓ |
| Breadcrumb navigation | Breadcrumb trail. Shows path from root to current node. Linear navigation. Simpler but less spatial. | |
| No overview | No overview. User relies on camera controls and search. Cleanest UI but harder to orient. | |

**User's choice:** 2D minimap (Recommended)

### Link rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Thin link lines | Thin lines. Subtle connections. Keeps focus on nodes. Clean look. Standard graph style. | ✓ |
| Thick link lines | Thick lines. Emphasizes relationships. Easier to see connection patterns. Risk: visual clutter. | |
| Variable by link type | Variable thickness by link type. Manual links thick, semantic links thin. Shows relationship strength visually. | |

**User's choice:** Thin link lines (Recommended)

### Selection feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight neighbors | Highlight clicked node + direct neighbors. Dim everything else. Shows immediate connections. Standard graph interaction. | ✓ |
| Highlight path | Highlight full path to selected node. Shows relationship chain. More complex but reveals structure. | |
| No highlighting | No highlighting. All nodes stay same brightness. Simpler but harder to see relationships. | |

**User's choice:** Highlight neighbors (Recommended)

---

## Performance Strategy

### Data loading

| Option | Description | Selected |
|--------|-------------|----------|
| Preload all | Load all notes at startup. Instant graph display. Simple implementation. Works well for <5000 notes. Matches local-first architecture. | ✓ |
| Lazy load on-demand | Load visible nodes first. Fetch neighbors on-demand. Complex but scales better. Risk: loading delays during navigation. | |
| Progressive loading | Load in chunks as user explores. Balance between preload and lazy. More complex state management. | |

**User's choice:** Preload all (Recommended)

### Culling strategy

| Option | Description | Selected |
|--------|-------------|----------|
| No culling | Render all nodes always. Simplest. Works well for 1000-2000 nodes. GPU handles it. No complexity. | ✓ |
| Frustum culling | Hide nodes outside camera frustum. Reduces draw calls. Standard 3D optimization. Adds complexity. | |
| Distance culling | Hide nodes beyond distance threshold. Keeps nearby nodes visible. Good for large graphs. More complex. | |

**User's choice:** No culling (Recommended)

### Rendering approach

| Option | Description | Selected |
|--------|-------------|----------|
| Instanced rendering | Single geometry for all nodes. GPU renders in one draw call. Massive performance gain for 1000+ nodes. Standard Three.js optimization. | ✓ |
| Individual meshes | Individual mesh per node. Simpler code. Easier to customize per-node. Slower at scale but more flexible. | |
| Hybrid instancing | Hybrid approach. Instance common nodes, individual meshes for special cases. Complex but flexible. | |

**User's choice:** Instanced rendering (Recommended)

### Real-time updates

| Option | Description | Selected |
|--------|-------------|----------|
| Animated transitions | Smooth spring animation. Node fades in, springs to position. Polished feel. Slight performance cost per animation. | ✓ |
| Instant updates | Instant appearance. Node pops into place. No animation overhead. Simpler, faster. Less polished. | |
| Batched animations | Batch updates. Collect changes, animate once per batch. Reduces animation overhead. More complex state management. | |

**User's choice:** Animated transitions (Recommended)

---

## Claude's Discretion

None — all areas had explicit decisions.

## Deferred Ideas

None — discussion stayed within phase scope.
