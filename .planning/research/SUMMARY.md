# Research Summary: LibraNia

**Project:** AI-Powered Knowledge Management System with Multi-Model Verification
**Research Date:** 2026-05-24
**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

LibraNia is an AI-powered personal knowledge management system that combines local-first storage with multi-model verification and 3D neural network visualization. The research reveals a clear path forward: build on proven RAG (Retrieval-Augmented Generation) architecture patterns while differentiating through multi-model consensus verification and immersive graph visualization.

The recommended approach uses Tauri for the desktop framework (3-10MB bundles vs 120MB+ for Electron), SQLite with vector extensions for hybrid search, and Three.js for 3D visualization. The core differentiator—multi-model verification—requires careful implementation to avoid amplifying shared biases across AI providers. Success depends on grounding verification in citations and external sources, not just model consensus.

Critical risks center on scalability: vector search performance degrades beyond 10K nodes without proper indexing, 3D graph visualization becomes unusable without level-of-detail rendering and spatial optimization, and embedding model lock-in can force expensive re-indexing. These risks are manageable with proper architecture decisions in the foundation phase, but retrofitting solutions later would require significant rework.

---

## Key Findings

### From STACK.md

**Recommended Core Technologies:**
- **Tauri 2.0+** — Desktop framework with 10-40x smaller bundles than Electron, lower memory footprint, Rust backend for security
- **React 19.x + Zustand + TanStack Query** — UI framework with concurrent rendering for smooth graph updates, lightweight state management
- **Three.js r172+ + react-force-graph-3d** — 3D WebGL rendering with physics-based force-directed layout out-of-the-box
- **SQLite + better-sqlite3 + sqlite-vec** — Local-first storage with vector search extension, keeps everything in single database
- **Drizzle ORM 0.36+** — Lightweight TypeScript ORM with excellent SQLite support
- **@anthropic-ai/sdk + openai + @xenova/transformers** — Multi-provider AI integration with local embeddings generation
- **Tailwind CSS 4.x + Radix UI + shadcn/ui** — Utility-first styling with accessible, customizable components

**Critical Version Requirements:**
- Tauri 2.0+ (stable release, smaller bundles)
- React 19.x (concurrent rendering needed for graph updates)
- Three.js r172+ (WebGPU support for future-proofing)
- sqlite-vec (native vector search in SQLite)

**Key Trade-offs:**
- Tauri over Electron: Smaller ecosystem but 10x better performance and bundle size
- sqlite-vec over ChromaDB: Simpler deployment but limited to ~10K nodes before performance degrades
- Local embeddings (@xenova/transformers) over API: Privacy-preserving and cost-free but ~80MB model size

### From FEATURES.md

**Table Stakes (Must-Have for v1):**
- Basic note creation/editing with markdown support
- Full-text search (<100ms for 10K+ notes)
- Bidirectional linking with [[wiki-style]] syntax
- Backlinks panel showing what links to current note
- Tags/labels with hierarchical support
- Local storage (SQLite) for data ownership
- Export functionality (markdown/JSON) for portability
- AI chat interface for natural language queries
- AI-generated summaries per-note and cross-note
- Semantic search using embeddings + vector search
- Auto-tagging/categorization to reduce manual work
- Dark mode

**Differentiators (Competitive Advantage):**
- **Multi-model verification** — Cross-validate AI answers across Claude/GPT/DeepSeek (core differentiator)
- **3D neural network visualization** — Intuitive understanding of knowledge connections
- **Web research integration** — AI fetches current information with citations
- **Automatic semantic linking** — Discover non-obvious connections between notes
- **Knowledge confidence scores** — Show verification trustworthiness based on multi-model agreement
- **Configurable AI providers** — User chooses models for flexibility and cost control
- **Citation tracking** — Track sources for AI-generated content to build trust

**Anti-Features (Explicitly Avoid):**
- Cloud sync (conflicts with local-first privacy)
- Real-time collaboration (single-user focus, massive complexity)
- Mobile app in v1 (desktop-first for complex visualization)
- Video content processing (high complexity, storage overhead)
- Blockchain/Web3 (complexity without clear value)
- Task management/calendar integration (feature creep)

**Feature Dependencies:**
```
Semantic search → Embeddings generation → AI provider configured
Multi-model verification → Multiple AI providers configured
Automatic semantic linking → Semantic search + Embeddings
3D visualization → Graph data structure + Semantic linking
Knowledge confidence scores → Multi-model verification
```

### From ARCHITECTURE.md

**Recommended Architecture Pattern:** Local-first RAG with hybrid search and multi-model verification

**Component Structure:**
1. **Desktop App Layer** (Tauri + React) — UI rendering, user interaction
2. **Orchestration Layer** — AI Provider Coordinator, Research Agent, Graph Builder
3. **Storage Layer** — SQLite (metadata), Vector DB (embeddings), File Store (documents)
4. **External Integration** — AI APIs (Claude/GPT/DeepSeek), Local Models (embeddings)

**Critical Patterns to Follow:**
- **Multi-Model Verification (Consensus Pattern)** — Multiple AI models independently answer, compare for agreement before storing
- **Hybrid Search** — Combine SQLite FTS5 keyword search with vector similarity for semantic search
- **Lazy Graph Building** — Compute relationships asynchronously after content storage, don't block UI
- **Provider Abstraction Layer** — Unified interface for multiple LLM providers with automatic fallback
- **Chunking Strategy** — Split large documents into semantic chunks with overlap for context preservation

**Anti-Patterns to Avoid:**
- Synchronous graph updates (blocks UI during expensive computation)
- Single model dependency (API failures break system, hallucinations undetected)
- Storing raw embeddings in SQLite BLOBs (no efficient similarity search)
- Eager loading entire graph (memory explosion with 1000+ nodes)

**Scalability Thresholds:**
- **100 nodes:** Full graph in memory acceptable, brute-force vector search OK
- **1,000 nodes:** Need viewport culling, LOD rendering, sqlite-vec with HNSW index
- **10,000 nodes:** Require dedicated vector DB, spatial indexing (octree), instanced rendering, local embedding model

### From PITFALLS.md

**Critical Pitfalls (Cause Rewrites):**

1. **Embedding Model Lock-In** — Switching embedding models requires re-embedding entire knowledge base; different models produce incompatible vector spaces
   - **Prevention:** Store embedding model version metadata, design schema for multiple versions coexisting, implement lazy re-embedding

2. **Multi-Model Verification Amplifies Shared Biases** — All LLMs trained on similar data share systematic biases, consensus ≠ correctness
   - **Prevention:** Require citation/source grounding, implement fact-checking against external knowledge bases, flag low-confidence areas even when models agree

3. **Naive Auto-Linking Creates Semantic Spaghetti** — Fixed similarity thresholds create unusable graph where everything links to everything
   - **Prevention:** Adaptive thresholds based on local graph density, link strength tiers, limit max links per node (top 10), prune redundant transitive links

4. **SQLite Vector Search Hits Performance Wall** — Works great for 1,000 nodes, becomes unusably slow (5+ seconds) at 10,000+ nodes
   - **Prevention:** Benchmark at 10K+ nodes early, design abstraction layer for vector storage, plan migration path to Qdrant/Milvus/Chroma

5. **3D Graph Visualization Becomes Unusable at Scale** — Beautiful with 50 nodes, laggy disorienting mess at 1,000+ nodes
   - **Prevention:** Level-of-detail rendering, instanced rendering, Barnes-Hut approximation (O(n log n)), offload physics to Web Worker, provide 2D fallback

**Moderate Pitfalls:**
- Citation tracking breaks down (link rot, inconsistent formats)
- No confidence calibration across AI providers
- Electron memory bloat with large knowledge base
- Schema evolution breaks existing knowledge
- Web search API costs spiral out of control

**Minor Pitfalls:**
- Manual document import lacks metadata
- No undo for AI-generated content
- Graph layout non-deterministic (spatial memory useless)

---

## Implications for Roadmap

### Suggested Phase Structure

Based on architectural dependencies and risk mitigation, recommend **6 phases**:

#### Phase 1: Core Knowledge Management (4-6 weeks)
**Rationale:** Establish data foundation before adding AI complexity. Without basic note-taking, there's nothing to enhance with AI.

**Delivers:**
- Basic note creation/editing with markdown
- Full-text search (SQLite FTS5)
- Bidirectional linking + backlinks panel
- Tags/labels for organization
- Local storage (SQLite schema)
- Export functionality (markdown/JSON)
- Dark mode UI

**Features from FEATURES.md:** Table stakes foundation
**Pitfalls to avoid:** Schema evolution (Pitfall #9) — design schema with versioning from day one
**Research needed:** NO — well-documented patterns

---

#### Phase 2: Single AI Provider Integration (3-4 weeks)
**Rationale:** Prove AI integration works with one provider before adding multi-model verification complexity. Establishes provider abstraction pattern.

**Delivers:**
- AI chat interface for natural language queries
- Configurable AI provider (start with Claude or GPT)
- AI-generated summaries per-note
- Provider abstraction layer for future multi-provider support
- Basic citation tracking

**Features from FEATURES.md:** AI chat interface, AI-generated summaries, configurable providers
**Pitfalls to avoid:** Single model dependency (Anti-Pattern #2) — build abstraction layer even for single provider
**Research needed:** NO — standard API integration patterns

---

#### Phase 3: Embeddings + Semantic Search (4-5 weeks)
**Rationale:** Enables semantic discovery and auto-linking. Must work well before building graph relationships on top.

**Delivers:**
- Local embedding generation (@xenova/transformers)
- Vector storage (sqlite-vec extension)
- Semantic search with embeddings
- Hybrid search (keyword + semantic)
- Embedding model versioning

**Features from FEATURES.md:** Semantic search, foundation for auto-linking
**Pitfalls to avoid:** 
- Embedding model lock-in (Pitfall #1) — store model version metadata from start
- SQLite vector search performance wall (Pitfall #4) — benchmark at 10K nodes, design abstraction layer
**Research needed:** YES — validate sqlite-vec performance at scale, test embedding model quality

---

#### Phase 4: Multi-Model Verification (5-6 weeks)
**Rationale:** Core differentiator. Requires stable AI integration and storage layer. Complex coordination logic needs focused attention.

**Delivers:**
- Multiple AI provider support (Claude + GPT + DeepSeek)
- Multi-model verification with consensus logic
- Knowledge confidence scores based on agreement
- Citation grounding and validation
- Web research integration for current information

**Features from FEATURES.md:** Multi-model verification (core differentiator), web research integration, knowledge confidence scores
**Pitfalls to avoid:**
- Shared bias amplification (Pitfall #2) — require source grounding, not just consensus
- Web search API cost spiral (Pitfall #10) — cache results, track costs, rate limit
**Research needed:** YES — test verification strategies, validate consensus algorithms, prototype citation grounding

---

#### Phase 5: Graph Building + Auto-Linking (4-5 weeks)
**Rationale:** Depends on embeddings working well. Complex algorithms for relationship discovery need performance tuning.

**Delivers:**
- Automatic semantic linking between notes
- Graph data structure with edge tables
- Relationship discovery algorithms
- Link strength tiers (strong/medium/weak)
- Lazy graph building (background processing)

**Features from FEATURES.md:** Automatic semantic linking, graph-based navigation
**Pitfalls to avoid:** Semantic spaghetti (Pitfall #3) — adaptive thresholds, link pruning, max links per node
**Research needed:** YES — tune similarity thresholds, test link pruning algorithms, validate graph quality

---

#### Phase 6: 3D Neural Visualization (6-8 weeks)
**Rationale:** Presentation layer depends on graph data being available. High-risk feature needs performance optimization from start.

**Delivers:**
- Three.js + react-force-graph-3d integration
- 3D force-directed graph layout
- Interactive navigation (zoom, pan, rotate)
- Node/edge rendering with visual distinction
- Level-of-detail rendering for performance
- Spatial optimization (octree, instanced rendering)

**Features from FEATURES.md:** 3D neural network visualization (differentiator)
**Pitfalls to avoid:** 3D performance collapse (Pitfall #5) — LOD rendering, Barnes-Hut, Web Workers from start
**Research needed:** YES — prototype with 1000+ nodes, validate performance, test navigation UX

---

### Phase Dependencies

```
Phase 1 (Core) → Phase 2 (Single AI) → Phase 3 (Embeddings) → Phase 4 (Multi-Model)
                                                              ↘
                                                                Phase 5 (Graph) → Phase 6 (3D Viz)
```

**Critical Path:** 1 → 2 → 3 → 4 → 5 → 6 (sequential)
**Parallel Opportunities:** Phase 4 (Multi-Model) can partially overlap with Phase 5 (Graph) if teams are separate

### Research Flags

**Phases requiring `/gsd-plan-phase --research-phase <N>`:**
- **Phase 3** — Validate sqlite-vec performance, test embedding models, benchmark at scale
- **Phase 4** — Test verification strategies, prototype consensus algorithms, validate citation grounding
- **Phase 5** — Tune similarity thresholds, test link pruning, validate graph quality metrics
- **Phase 6** — Prototype 3D rendering with 1000+ nodes, validate performance optimizations, test navigation UX

**Phases with well-documented patterns (skip research):**
- **Phase 1** — Standard CRUD, SQLite schema design, FTS5 search
- **Phase 2** — Standard API integration, provider abstraction patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Tauri 2.0, React 19, Three.js r172, sqlite-vec all verified as current stable versions. Trade-offs well-documented. |
| **Features** | MEDIUM | Based on training data about competitors (Obsidian, Notion, Mem.ai, Reflect). May not reflect 2026 features. Need validation with direct product testing and user interviews. |
| **Architecture** | HIGH | RAG patterns, hybrid search, multi-model verification well-documented in current research. Local-first design principles established. |
| **Pitfalls** | MEDIUM | Critical pitfalls (embedding lock-in, shared biases, semantic spaghetti, vector search scaling, 3D performance) based on documented challenges. Some inferred from domain knowledge. |

### Gaps to Address

**During Phase Planning:**
1. **Competitor feature validation** — Direct testing of Obsidian, Notion, Mem.ai, Reflect in 2026 to validate feature assumptions
2. **User research** — Interviews with target audience (knowledge workers, researchers) to validate feature priorities
3. **Embedding model selection** — Benchmark all-MiniLM-L6-v2 vs alternatives for quality/performance trade-offs
4. **Vector search scaling** — Prototype sqlite-vec with 10K+ nodes to validate performance or plan migration to dedicated vector DB
5. **3D visualization UX** — User testing of 3D navigation vs 2D graph view to validate investment in 3D rendering
6. **Multi-model verification strategy** — Prototype consensus algorithms and citation grounding to validate approach before full implementation

**During Development:**
1. **API cost modeling** — Track actual costs for multi-provider verification and web research to validate business model
2. **Performance benchmarking** — Continuous testing at 100/1K/10K node scales to catch performance regressions early
3. **Accessibility compliance** — Manual testing with assistive technologies (screen readers, keyboard navigation) for 3D visualization

---

## Sources

### STACK.md Sources
- Tauri 2.0 documentation (Context7 `/websites/v2_tauri_app`)
- Electron documentation (Context7 `/websites/electronjs`)
- Three.js documentation (Context7 `/mrdoob/three.js`)
- better-sqlite3 (Context7 `/wiselibs/better-sqlite3`)
- Web search verification: Vite 6, TypeScript 5.7, React 19, sqlite-vec, Tailwind CSS v4, Vitest 2.1.8, Prettier 3.4.2

### FEATURES.md Sources
- Training data about Obsidian, Roam Research, Notion, Mem.ai, Reflect (MEDIUM confidence)
- Domain knowledge of knowledge management patterns (HIGH confidence)
- Analysis of LibraNia's unique positioning (HIGH confidence)
- **Note:** Web search tools encountered technical issues; recommendations need validation with 2026 competitor testing

### ARCHITECTURE.md Sources
- RAG architecture patterns from web search (HIGH confidence)
- Vector database integration patterns (sqlite-vec, Chroma documentation)
- Three.js performance optimization (official documentation)
- Multi-model verification patterns (consensus mechanisms, chain-of-verification)
- Local-first architecture principles (CRDT patterns, offline-first design)

### PITFALLS.md Sources
- RAG/semantic search research (HIGH confidence)
- Graph visualization patterns (HIGH confidence)
- Multi-model AI systems (MEDIUM confidence — emerging area)
- SQLite vector search limits (MEDIUM confidence — based on extension docs and community reports)
- Electron performance challenges (HIGH confidence — well-documented)

---

## Ready for Requirements

All research files synthesized. Key findings extracted. Roadmap implications defined with 6-phase structure. Research flags identified for Phases 3-6. Confidence assessed honestly with gaps documented.

**Next Steps:**
1. Orchestrator proceeds to requirements definition
2. Use this summary to inform roadmap creation
3. Plan deeper research for Phases 3-6 during phase planning
4. Validate feature assumptions with competitor testing and user interviews

---

**Research Complete:** 2026-05-24
**Files Synthesized:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Output:** .planning/research/SUMMARY.md
