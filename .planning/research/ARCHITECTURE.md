# Architecture Patterns: AI-Powered Knowledge Management

**Domain:** Personal knowledge management with AI research and neural visualization
**Researched:** 2026-05-24
**Overall confidence:** HIGH

## Recommended Architecture

LibraNia follows a **local-first RAG (Retrieval-Augmented Generation) architecture** with hybrid search capabilities and multi-model verification. The system combines structured knowledge graphs with semantic vector search, wrapped in a desktop application.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Desktop App Layer                         │
│                    (Electron/Tauri + React)                      │
└────────────┬────────────────────────────────────────┬───────────┘
             │                                        │
    ┌────────▼────────┐                     ┌────────▼────────┐
    │  Query Interface │                     │  3D Visualization│
    │   & Chat UI      │                     │   (Three.js)     │
    └────────┬─────────┘                     └────────┬─────────┘
             │                                        │
┌────────────▼────────────────────────────────────────▼───────────┐
│                     Orchestration Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AI Provider  │  │  Research    │  │   Graph      │          │
│  │ Coordinator  │  │  Agent       │  │   Builder    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────┬────────────────────────────────────────┬───────────┘
             │                                        │
┌────────────▼────────────────────────────────────────▼───────────┐
│                      Storage Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   SQLite     │  │  Vector DB   │  │  File Store  │          │
│  │  (metadata)  │  │ (embeddings) │  │ (docs/imgs)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
             │                                        │
    ┌────────▼────────┐                     ┌────────▼────────┐
    │  External APIs  │                     │  Local Models   │
    │ (Claude/GPT/DS) │                     │  (embeddings)   │
    └─────────────────┘                     └─────────────────┘
```

## Component Boundaries

| Component | Responsibility | Communicates With | Data Flow |
|-----------|---------------|-------------------|-----------|
| **Desktop App Layer** | UI rendering, user interaction, window management | Orchestration Layer | User queries → Orchestration; Results → UI |
| **Query Interface** | Chat UI, question input, answer display | Research Agent, Graph Builder | Questions out, answers + citations in |
| **3D Visualization** | Interactive graph rendering, node navigation | Graph Builder, Storage Layer | Graph data in, user interactions out |
| **AI Provider Coordinator** | Multi-provider abstraction, API routing, model selection | External APIs, Research Agent | Requests to APIs, responses to agents |
| **Research Agent** | Web search, multi-model verification, answer synthesis | AI Provider Coordinator, Storage Layer | Query → search → verify → store |
| **Graph Builder** | Semantic linking, relationship discovery, graph updates | Storage Layer, Vector DB | Embeddings → relationships → graph structure |
| **SQLite (metadata)** | Structured data, FTS5 keyword search, graph edges | All orchestration components | CRUD operations, keyword queries |
| **Vector DB** | Semantic embeddings, similarity search | Graph Builder, Research Agent | Store vectors, retrieve similar nodes |
| **File Store** | Documents, images, diagrams, raw content | Storage Layer components | Write files, read for display |
| **External APIs** | LLM inference, web search results | AI Provider Coordinator | API calls out, responses in |
| **Local Models** | Embedding generation (optional local inference) | Vector DB, Graph Builder | Text in, embeddings out |

## Data Flow

### Primary Flow: Question → Answer → Storage

```
1. User asks question
   ↓
2. Query Interface → Research Agent
   ↓
3. Research Agent → AI Provider Coordinator
   ↓
4. Coordinator dispatches to multiple AI providers (Claude, GPT, DeepSeek)
   ↓
5. Each provider researches (web search + model knowledge)
   ↓
6. Multi-model verification compares answers
   ↓
7. Verified answer → Storage Layer (SQLite + Vector DB + File Store)
   ↓
8. Graph Builder analyzes semantic relationships
   ↓
9. New edges created in graph
   ↓
10. Answer + graph view → Query Interface → User
```

### Secondary Flow: Manual Document Addition

```
1. User uploads document
   ↓
2. File Store saves raw content
   ↓
3. Document chunked for processing
   ↓
4. Embeddings generated (local or API)
   ↓
5. Chunks stored in Vector DB
   ↓
6. Metadata stored in SQLite
   ↓
7. Graph Builder discovers relationships
   ↓
8. Graph updated with new node + edges
```

### Tertiary Flow: Graph Navigation

```
1. User clicks node in 3D visualization
   ↓
2. 3D Visualization → Storage Layer (fetch node details)
   ↓
3. SQLite returns metadata + related nodes
   ↓
4. Vector DB returns semantically similar nodes
   ↓
5. Combined results → 3D Visualization
   ↓
6. Graph updates to highlight connections
```

## Patterns to Follow

### Pattern 1: Multi-Model Verification (Consensus Pattern)
**What:** Multiple AI models independently answer the same question, then results are compared for agreement.

**When:** Before storing any AI-generated answer in the knowledge base.

**Implementation:**
```typescript
interface VerificationResult {
  consensus: boolean;
  confidence: number;
  agreedAnswer: string;
  disagreements: string[];
  sources: ModelResponse[];
}

async function verifyAnswer(question: string): Promise<VerificationResult> {
  // Dispatch to multiple providers in parallel
  const responses = await Promise.all([
    claudeProvider.research(question),
    gptProvider.research(question),
    deepseekProvider.research(question)
  ]);
  
  // Compare responses for factual agreement
  const consensus = compareResponses(responses);
  
  // Only store if consensus reached
  if (consensus.confidence > 0.7) {
    return { consensus: true, agreedAnswer: consensus.merged, ... };
  }
  
  return { consensus: false, disagreements: consensus.conflicts, ... };
}
```

**Why:** Reduces hallucinations, increases trustworthiness of stored knowledge.

### Pattern 2: Hybrid Search (Keyword + Semantic)
**What:** Combine SQLite FTS5 for exact keyword matching with vector similarity for semantic search.

**When:** User searches existing knowledge or system discovers related nodes.

**Implementation:**
```typescript
interface SearchResult {
  node_id: string;
  title: string;
  score: number;
  match_type: 'keyword' | 'semantic' | 'hybrid';
}

async function hybridSearch(query: string): Promise<SearchResult[]> {
  // Parallel search
  const [keywordResults, semanticResults] = await Promise.all([
    sqliteSearch(query),  // FTS5 full-text search
    vectorSearch(query)   // Embedding similarity
  ]);
  
  // Merge and rerank
  const merged = mergeResults(keywordResults, semanticResults);
  return rerank(merged, query);
}
```

**Why:** Keyword search catches exact matches, semantic search finds conceptually related content.

### Pattern 3: Lazy Graph Building
**What:** Graph relationships computed asynchronously after content storage, not blocking user interaction.

**When:** After new content added to knowledge base.

**Implementation:**
```typescript
async function storeAnswer(answer: Answer): Promise<void> {
  // Immediate: Store content
  await storage.saveAnswer(answer);
  
  // Immediate: Return to user
  ui.displayAnswer(answer);
  
  // Background: Build relationships
  queueGraphUpdate(answer.id);
}

// Separate worker process
async function processGraphQueue() {
  const pendingNodes = await queue.getPending();
  
  for (const nodeId of pendingNodes) {
    const embeddings = await generateEmbeddings(nodeId);
    const similar = await vectorDB.findSimilar(embeddings, threshold=0.75);
    await graph.createEdges(nodeId, similar);
  }
}
```

**Why:** Keeps UI responsive, allows expensive semantic analysis to run in background.

### Pattern 4: Provider Abstraction Layer
**What:** Unified interface for multiple LLM providers with automatic fallback and load balancing.

**When:** Any AI operation (research, verification, embedding generation).

**Implementation:**
```typescript
interface AIProvider {
  name: string;
  research(query: string): Promise<ResearchResult>;
  verify(answer: string): Promise<VerificationScore>;
  isAvailable(): Promise<boolean>;
}

class ProviderCoordinator {
  private providers: AIProvider[];
  
  async dispatch(operation: Operation): Promise<Result> {
    // Try primary provider
    const primary = this.providers[0];
    if (await primary.isAvailable()) {
      try {
        return await primary.execute(operation);
      } catch (error) {
        // Fallback to next provider
        return this.fallback(operation, 1);
      }
    }
  }
}
```

**Why:** Resilience against API failures, flexibility to switch providers, cost optimization.

### Pattern 5: Chunking Strategy for Documents
**What:** Split large documents into semantic chunks with overlap for context preservation.

**When:** Processing user-uploaded documents or long AI-generated answers.

**Implementation:**
```typescript
interface Chunk {
  id: string;
  content: string;
  start_pos: number;
  end_pos: number;
  parent_doc: string;
  overlap_prev: string;
  overlap_next: string;
}

function chunkDocument(doc: string, chunkSize=512, overlap=50): Chunk[] {
  // Semantic chunking: split on paragraph boundaries
  const paragraphs = doc.split('\n\n');
  const chunks: Chunk[] = [];
  
  let currentChunk = '';
  let position = 0;
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length > chunkSize) {
      chunks.push(createChunk(currentChunk, position));
      // Keep overlap for context
      currentChunk = currentChunk.slice(-overlap) + para;
    } else {
      currentChunk += para;
    }
    position += para.length;
  }
  
  return chunks;
}
```

**Why:** Maintains context across chunks, improves retrieval accuracy, handles large documents.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous Graph Updates
**What:** Blocking user interaction while computing semantic relationships and graph edges.

**Why bad:** Graph analysis is computationally expensive (embedding generation, similarity calculations). Blocking the UI creates poor user experience.

**Instead:** Use lazy graph building (Pattern 3) with background workers. Store content immediately, compute relationships asynchronously.

### Anti-Pattern 2: Single Model Dependency
**What:** Relying on only one AI provider without fallback or verification.

**Why bad:** API failures break the system, hallucinations go undetected, vendor lock-in.

**Instead:** Use provider abstraction (Pattern 4) with multi-model verification (Pattern 1). Always have fallback providers configured.

### Anti-Pattern 3: Storing Raw Embeddings in SQLite BLOBs
**What:** Using SQLite BLOB columns for vector embeddings without specialized extensions.

**Why bad:** No efficient similarity search, full table scans required, poor performance at scale.

**Instead:** Use sqlite-vec extension or separate vector database (Chroma, LanceDB). SQLite for metadata and graph structure, vector DB for embeddings.

### Anti-Pattern 4: Global Embedding Model
**What:** Using the same embedding model for all content types (questions, documents, code, images).

**Why bad:** Different content types have different semantic structures. One model may not capture all nuances.

**Instead:** Use specialized embedding models per content type or multi-modal embeddings. Allow model selection in configuration.

### Anti-Pattern 5: Eager Loading Entire Graph
**What:** Loading all nodes and edges into memory for 3D visualization on startup.

**Why bad:** Memory explosion with large knowledge bases (1000+ nodes), slow startup, browser crashes.

**Instead:** Implement viewport-based loading with level-of-detail (LOD). Load only visible nodes, use instancing for distant nodes, progressive rendering.

### Anti-Pattern 6: Unstructured File Storage
**What:** Saving documents and images with random filenames in a flat directory.

**Why bad:** Difficult to manage, no content-addressable storage, orphaned files, backup complexity.

**Instead:** Use content-addressable storage (hash-based filenames) with directory sharding. Store metadata in SQLite with file references.

## Scalability Considerations

| Concern | At 100 nodes | At 1,000 nodes | At 10,000 nodes |
|---------|--------------|----------------|-----------------|
| **Graph Rendering** | Full graph in memory, simple force-directed layout | Viewport culling, LOD for distant nodes | Spatial indexing (octree), instanced rendering, WebGL optimization |
| **Vector Search** | In-memory similarity, brute force acceptable | sqlite-vec with HNSW index | Dedicated vector DB (Chroma/Milvus), approximate nearest neighbor |
| **Embedding Generation** | API calls acceptable | Batch processing, local model consideration | Local embedding model (ONNX), GPU acceleration, caching |
| **Graph Traversal** | Recursive CTEs in SQLite | Indexed adjacency lists, materialized paths | Graph-specific storage (edge tables), breadth-first indexing |
| **Storage Size** | Single SQLite file (<100MB) | SQLite + file store (<1GB) | Sharded storage, compression, archival strategy |
| **UI Responsiveness** | Synchronous operations OK | Web Workers for heavy computation | Streaming results, progressive rendering, virtualization |

## Technology Stack Recommendations

### Desktop Framework
**Recommended:** Tauri (Rust + WebView)
- **Why:** 3-10MB binaries vs 50-100MB for Electron, lower memory usage, better security model
- **Trade-off:** Smaller ecosystem than Electron, Rust learning curve for backend
- **When to use Electron instead:** Need Node.js ecosystem dependencies, team only knows JavaScript

### 3D Visualization
**Recommended:** Three.js with react-three-fiber
- **Why:** Mature WebGL library, extensive documentation, good performance for 1000+ nodes
- **Optimization:** Use instanced rendering for repeated node geometries, frustum culling, LOD
- **Alternative:** D3-force-3d for simpler force-directed graphs without full 3D control

### Vector Database
**Recommended:** sqlite-vec extension (for <10K nodes) or Chroma (for larger scale)
- **Why sqlite-vec:** Single-file storage, no separate process, good for local-first
- **Why Chroma:** Better performance at scale, more advanced indexing, Python/JS clients
- **Trade-off:** sqlite-vec simpler deployment, Chroma better for growth

### Embedding Model
**Recommended:** Local ONNX model (all-MiniLM-L6-v2 or similar)
- **Why:** Privacy-preserving, no API costs, fast inference on CPU
- **Size:** ~80MB model, 384-dimensional embeddings
- **Alternative:** OpenAI text-embedding-3-small API for better quality (higher cost)

### Graph Storage
**Recommended:** SQLite with edge tables + recursive CTEs
- **Why:** Simple, local-first, good performance for <10K nodes
- **Schema:**
```sql
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  created_at INTEGER
);

CREATE TABLE edges (
  source_id TEXT,
  target_id TEXT,
  weight REAL,
  relationship_type TEXT,
  PRIMARY KEY (source_id, target_id)
);

CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);
```

## Build Order Implications

### Phase 1: Core Storage + Single Provider
**Build first:** SQLite schema, file storage, single AI provider integration
**Why:** Establishes data foundation, validates storage patterns
**Dependencies:** None
**Risk:** Low - well-understood technologies

### Phase 2: Multi-Provider + Verification
**Build second:** Provider abstraction, multi-model verification, consensus logic
**Why:** Core differentiator, must work before adding complexity
**Dependencies:** Phase 1 storage
**Risk:** Medium - coordination logic complexity

### Phase 3: Embedding + Semantic Search
**Build third:** Embedding generation, vector storage, hybrid search
**Why:** Enables auto-linking, requires stable storage layer
**Dependencies:** Phase 1 storage, Phase 2 for embedding API calls
**Risk:** Medium - performance tuning required

### Phase 4: Graph Building + Relationships
**Build fourth:** Semantic linking, relationship discovery, graph updates
**Why:** Depends on embeddings and search working well
**Dependencies:** Phase 3 embeddings
**Risk:** High - complex algorithms, performance critical

### Phase 5: 3D Visualization
**Build fifth:** Three.js integration, graph rendering, interaction
**Why:** Presentation layer, depends on graph data being available
**Dependencies:** Phase 4 graph structure
**Risk:** Medium - performance optimization needed

### Phase 6: Research Agent + Web Search
**Build sixth:** Web search integration, research orchestration, citation handling
**Why:** Feature enhancement, not core to storage/graph
**Dependencies:** Phase 2 multi-provider
**Risk:** Low - external API integration

**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
**Parallel Opportunities:** Phase 6 can develop alongside Phase 4-5

## Sources

**HIGH confidence sources:**
- RAG architecture patterns from web search (multiple sources on retrieval-augmented generation)
- Vector database integration patterns from web search (sqlite-vec, Chroma documentation)
- Three.js performance optimization from web search (official documentation patterns)
- Multi-model verification patterns from web search (consensus mechanisms, chain-of-verification)
- Local-first architecture principles from web search (CRDT patterns, offline-first design)

**MEDIUM confidence sources:**
- Hybrid search implementation patterns (FTS5 + vector search integration)
- Graph database SQLite integration (edge table patterns, recursive CTEs)
- Desktop framework comparison (Electron vs Tauri trade-offs)

**Technology documentation:**
- sqlite-vec: /asg017/sqlite-vec (Context7)
- Three.js: /mrdoob/three.js (Context7)
- SQLite FTS5: Official SQLite documentation
- WebGL performance: Three.js official guides

**Note:** Architecture patterns synthesized from multiple web search results on semantic search pipelines, RAG systems, knowledge management architectures, and local-first design principles. All patterns verified against multiple sources for consistency.
