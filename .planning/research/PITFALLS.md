# Domain Pitfalls: AI-Powered Knowledge Management

**Domain:** AI-powered personal knowledge management with multi-model verification and neural visualization
**Researched:** 2026-05-24
**Confidence:** MEDIUM (based on RAG/semantic search research, graph visualization patterns, and multi-model AI systems)

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Embedding Model Lock-In Without Migration Strategy
**What goes wrong:** You generate embeddings for semantic linking using one model (e.g., OpenAI text-embedding-3-small), then later need to switch models. All existing embeddings become incompatible, requiring complete re-embedding of the entire knowledge base.

**Why it happens:** 
- Different embedding models produce vectors in different dimensional spaces
- No cross-model compatibility (768-dim from one model ≠ 768-dim from another)
- Embedding generation seems like a one-time setup decision

**Consequences:** 
- Cannot switch embedding providers without losing all semantic links
- Re-embedding thousands of documents is expensive and time-consuming
- User's carefully curated knowledge graph breaks during migration
- Semantic search quality degrades if you try to mix embeddings from different models

**Prevention:** 
- Store embedding model version/provider metadata with each vector
- Design schema to support multiple embedding versions coexisting
- Implement lazy re-embedding (re-embed on access, not all at once)
- Consider embedding model as part of your data versioning strategy
- Plan for incremental migration: new content uses new model, old content migrates gradually

**Detection:** 
- User wants to switch from OpenAI to local embedding model
- Embedding API provider changes pricing or deprecates model
- New embedding model offers better quality but incompatible dimensions

**Phase impact:** Foundation phase must design embedding storage with versioning from day one.

---

### Pitfall 2: Multi-Model Verification That Amplifies Shared Biases
**What goes wrong:** You verify answers by running them through Claude, GPT, and DeepSeek, assuming disagreement means error. But all three models trained on similar internet data share the same systematic biases and hallucinations, so they agree on incorrect information.

**Why it happens:**
- All major LLMs trained on overlapping internet-scale datasets
- Models learn similar patterns and make correlated errors
- Consensus ≠ correctness when models share training distribution
- No ground truth oracle to validate against

**Consequences:**
- False confidence in incorrect answers because "all models agree"
- Subtle factual errors pass verification
- System stores misinformation with high confidence scores
- User trusts verified answers that are actually wrong

**Prevention:**
- Require citation/source grounding, not just model agreement
- Implement fact-checking against external knowledge bases (Wikipedia, academic sources)
- Flag low-confidence areas even when models agree
- Use models with different training cutoffs to detect temporal inconsistencies
- Add human verification for high-stakes knowledge domains
- Track verification failures over time to identify systematic blind spots

**Detection:**
- All models confidently agree on factually incorrect information
- Verified answers contradict reliable external sources
- User reports errors in "verified" knowledge
- Models agree but cannot provide citations

**Phase impact:** Verification phase must implement source-grounding, not just model consensus.

---

### Pitfall 3: Naive Auto-Linking Creates Semantic Spaghetti
**What goes wrong:** You auto-link knowledge nodes based on semantic similarity above a threshold (e.g., cosine similarity > 0.7). The graph becomes an unusable mess of connections where everything links to everything, obscuring meaningful relationships.

**Why it happens:**
- Fixed similarity thresholds don't account for topic density
- High-level concepts (e.g., "machine learning") semantically similar to hundreds of nodes
- No distinction between strong vs. weak relationships
- Transitive connections create exponential link growth

**Consequences:**
- 3D visualization becomes unreadable hairball
- Navigation becomes useless (every node has 50+ links)
- Meaningful connections buried in noise
- Performance degrades (rendering thousands of edges)
- User loses trust in auto-linking and disables it

**Prevention:**
- Use adaptive thresholds based on local graph density
- Implement link strength tiers (strong/medium/weak) with visual distinction
- Limit max links per node (e.g., top 10 most relevant)
- Use graph algorithms to prune redundant transitive links
- Allow user to adjust sensitivity per topic/domain
- Implement "link explanation" showing why connection was made
- Consider temporal relevance (recent nodes weighted higher)

**Detection:**
- Average node degree > 20 connections
- User complaints about cluttered visualization
- Graph layout algorithms fail to converge
- Rendering performance drops below 30fps

**Phase impact:** Auto-linking phase needs sophisticated link pruning, not just similarity threshold.

---

### Pitfall 4: SQLite Vector Search Hits Performance Wall
**What goes wrong:** You store embeddings in SQLite with a vector extension (sqlite-vec or sqlite-vss). Works great for first 1,000 nodes, then semantic search becomes unusably slow (5+ seconds per query) as knowledge base grows to 10,000+ nodes.

**Why it happens:**
- SQLite vector extensions use brute-force or simple indexing
- No advanced indexing (HNSW, IVF) in most SQLite vector solutions
- Disk I/O bottleneck for large vector tables
- Single-threaded query execution

**Consequences:**
- Search latency increases linearly with dataset size
- User experience degrades as library grows
- Cannot scale to "lifetime knowledge base" vision
- Forced migration to dedicated vector database (major rewrite)

**Prevention:**
- Benchmark with realistic dataset sizes (10K, 100K nodes) early
- Set performance SLAs (e.g., <200ms for semantic search)
- Design abstraction layer for vector storage from day one
- Consider hybrid approach: SQLite for metadata, specialized vector DB for embeddings
- Evaluate sqlite-vss with FAISS integration for better indexing
- Plan migration path to Qdrant/Milvus/Chroma if needed
- Implement caching for frequently accessed embeddings

**Detection:**
- Semantic search latency > 1 second
- Query time increases noticeably with each 1,000 nodes added
- CPU pegged during similarity searches
- User complaints about slow search

**Phase impact:** Storage architecture phase must validate vector search performance at scale.

---

### Pitfall 5: 3D Graph Visualization Becomes Unusable at Scale
**What goes wrong:** Your beautiful 3D neural network visualization works perfectly with 50 nodes. At 1,000+ nodes (the stated requirement), it becomes a laggy, disorienting mess where users can't find anything.

**Why it happens:**
- Force-directed layout algorithms are O(n²) without optimization
- Rendering thousands of nodes + edges overwhelms GPU
- 3D navigation is inherently harder than 2D for information retrieval
- No spatial memory (nodes move every time layout recalculates)
- Occlusion makes distant nodes invisible

**Consequences:**
- Frame rate drops below 30fps, feels sluggish
- Users get lost in 3D space, can't find nodes
- Force simulation never stabilizes with large graphs
- Memory usage spikes (Electron + Three.js + large graph)
- Feature becomes a gimmick users avoid

**Prevention:**
- Implement level-of-detail rendering (distant nodes as billboards)
- Use instanced rendering for nodes (InstancedMesh in Three.js)
- Apply Barnes-Hut approximation for force calculations (O(n log n))
- Offload physics to Web Worker
- Add 2D fallback view for large graphs
- Implement spatial indexing (octree) for culling
- Freeze layout after stabilization (don't recalculate on every change)
- Provide filtered views (show subgraph, not entire network)
- Use clustering to group related nodes visually

**Detection:**
- FPS drops below 30 with >500 nodes
- Layout calculation takes >5 seconds
- Users report difficulty navigating graph
- Memory usage >500MB for visualization alone

**Phase impact:** Visualization phase must implement LOD and spatial optimization from start.

---

## Moderate Pitfalls

### Pitfall 6: Citation Tracking Breaks Down
**What goes wrong:** AI generates answers with citations, but links break, sources become inaccessible, or citation format is inconsistent across providers.

**Why it happens:**
- Web URLs change or disappear (link rot)
- Different AI providers format citations differently
- No validation that cited source actually supports the claim
- Citations stored as plain text, not structured data

**Prevention:**
- Archive cited web pages locally (snapshot at research time)
- Store structured citation metadata (URL, title, access date, excerpt)
- Validate citations are reachable before storing
- Normalize citation format across AI providers
- Implement citation health checks (periodic link validation)

**Detection:**
- User clicks citation and gets 404
- Citations missing for verified answers
- Inconsistent citation formats in UI

**Phase impact:** Research/storage phase needs citation archival, not just URL storage.

---

### Pitfall 7: No Confidence Calibration Across AI Providers
**What goes wrong:** Claude's confidence scores don't align with GPT's or DeepSeek's. You can't meaningfully compare or aggregate confidence across models.

**Why it happens:**
- Each provider uses different confidence calibration
- Some models overconfident, others underconfident
- No standardized confidence metric across providers
- Confidence scores may not be exposed via API

**Prevention:**
- Calibrate confidence scores empirically per provider
- Use agreement rate as proxy for confidence
- Track historical accuracy per provider to adjust weights
- Implement provider-agnostic confidence tiers (high/medium/low)
- Don't rely solely on model-reported confidence

**Detection:**
- One provider always reports high confidence
- Verification failures don't correlate with low confidence
- User questions answers marked "high confidence"

**Phase impact:** Verification phase needs confidence calibration, not raw scores.

---

### Pitfall 8: Electron Memory Bloat with Large Knowledge Base
**What goes wrong:** Electron app memory usage grows to 2GB+ as knowledge base expands, causing slowdowns and crashes.

**Why it happens:**
- Loading entire knowledge graph into memory
- Chromium + Node.js baseline overhead
- Memory leaks from event listeners or DOM references
- Large images/diagrams stored in memory

**Prevention:**
- Lazy load knowledge nodes (load on demand, not upfront)
- Use virtual scrolling for lists
- Implement pagination for graph queries
- Store media files on disk, load as needed
- Profile memory usage regularly
- Use IndexedDB for caching, not in-memory structures
- Clean up event listeners and DOM references

**Detection:**
- Memory usage >1GB with moderate knowledge base
- App becomes sluggish over time
- Crashes with "out of memory" errors
- Task manager shows high memory usage

**Phase impact:** Desktop app architecture phase must design for lazy loading.

---

### Pitfall 9: Schema Evolution Breaks Existing Knowledge
**What goes wrong:** You add new node types or relationship properties, but existing knowledge doesn't have those fields, causing inconsistent behavior.

**Why it happens:**
- No migration strategy for schema changes
- Queries assume all nodes have same structure
- UI expects fields that don't exist on old nodes

**Prevention:**
- Version your schema explicitly
- Write migrations for schema changes
- Design queries to handle missing fields gracefully
- Use optional fields with defaults
- Test with mixed-version data

**Detection:**
- Errors when viewing old knowledge nodes
- Missing data in UI for older entries
- Queries fail on legacy nodes

**Phase impact:** Storage phase needs schema versioning from day one.

---

### Pitfall 10: Web Search API Costs Spiral Out of Control
**What goes wrong:** Each research query triggers multiple web searches across verification models, racking up API costs faster than expected.

**Why it happens:**
- No caching of search results
- Each model runs independent searches
- No rate limiting or cost tracking
- Users trigger expensive research queries frequently

**Prevention:**
- Cache search results (deduplicate across models)
- Implement cost tracking and user budgets
- Rate limit research queries
- Reuse search results across verification models
- Provide cost estimates before expensive operations
- Consider self-hosted search (SearXNG) for cost control

**Detection:**
- Unexpected API bills
- Search API rate limits hit
- User complaints about slow research (due to rate limiting)

**Phase impact:** Research phase needs search result caching and cost controls.

---

## Minor Pitfalls

### Pitfall 11: Manual Document Import Lacks Metadata
**What goes wrong:** Users can add documents manually, but without AI-generated summaries and links, they become isolated nodes.

**Prevention:**
- Auto-generate embeddings for manual imports
- Suggest links to existing knowledge
- Extract metadata (title, date, keywords) automatically
- Prompt user to add context during import

**Detection:**
- Manual documents have no connections
- Users complain imported docs are "lost" in graph

---

### Pitfall 12: No Undo for AI-Generated Content
**What goes wrong:** AI generates incorrect answer, user accepts it, then realizes mistake but cannot undo.

**Prevention:**
- Implement version history for knowledge nodes
- Allow rollback to previous versions
- Provide "reject verification" option
- Auto-save before AI modifications

**Detection:**
- User requests to delete and re-research topics
- Support requests about fixing wrong answers

---

### Pitfall 13: Graph Layout Non-Deterministic
**What goes wrong:** Every time user opens the app, the 3D graph layout is different, making spatial memory useless.

**Prevention:**
- Seed force-directed layout with saved positions
- Save stabilized layout to database
- Only recalculate layout when graph structure changes
- Provide "reset layout" option for manual control

**Detection:**
- User complaints about "can't find nodes"
- Nodes in different positions each session

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Foundation/Storage | Embedding model lock-in (Pitfall 1) | Design for multi-version embeddings from start |
| Verification | Shared bias amplification (Pitfall 2) | Require source grounding, not just consensus |
| Auto-linking | Semantic spaghetti (Pitfall 3) | Implement link strength tiers and pruning |
| Storage Architecture | SQLite vector search scaling (Pitfall 4) | Benchmark at 10K+ nodes, plan migration path |
| Visualization | 3D performance collapse (Pitfall 5) | LOD rendering, Barnes-Hut, Web Workers |
| Research | Web search cost spiral (Pitfall 10) | Cache results, track costs, rate limit |
| Desktop App | Electron memory bloat (Pitfall 8) | Lazy loading, virtual scrolling, profiling |
| Schema Design | Schema evolution breaks old data (Pitfall 9) | Version schema, write migrations |

---

## Research Confidence Assessment

| Area | Confidence | Source Quality |
|------|------------|----------------|
| RAG/Semantic Search Pitfalls | HIGH | Well-documented in current research and production systems |
| Multi-Model Verification | MEDIUM | Emerging area, less production experience documented |
| Graph Visualization Performance | HIGH | Established patterns from Three.js and graph viz communities |
| SQLite Vector Search Limits | MEDIUM | Based on extension documentation and community reports |
| Electron Performance | HIGH | Well-documented challenges in large-scale Electron apps |
| Auto-Linking Challenges | MEDIUM | Inferred from semantic search and knowledge graph research |

---

## Sources

Research synthesized from web search results on:
- RAG retrieval augmented generation common problems
- Semantic search knowledge graph pitfalls
- Embedding model drift and semantic search degradation
- Multi-model AI verification cross-validation challenges
- SQLite vector search performance limitations
- Desktop Electron app performance memory issues with large datasets
- Three.js force-directed graph layout performance optimization
- AI hallucination detection verification strategies
- Knowledge management system user adoption failure reasons

Note: Many findings are LOW-MEDIUM confidence based on web search synthesis. Recommend validating critical pitfalls (especially #1, #2, #4, #5) with official documentation and prototyping during relevant phases.
