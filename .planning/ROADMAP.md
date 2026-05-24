# Roadmap: LibraNia

**Created:** 2026-05-24
**Granularity:** Standard (6 phases)
**Coverage:** 41/41 v1 requirements mapped

## Phases

- [ ] **Phase 1: Foundation & Application Shell** - Desktop app infrastructure with native and web modes
- [ ] **Phase 2: Core Knowledge Management** - Note creation, editing, search, and bidirectional linking
- [ ] **Phase 3: AI Integration** - Multi-provider AI configuration, chat interface, and research capabilities
- [ ] **Phase 4: Content Storage & Management** - Document/image storage with rich metadata
- [ ] **Phase 5: Semantic Discovery** - Embeddings generation, semantic search, and automatic linking
- [ ] **Phase 6: 3D Visualization** - Interactive neural network graph visualization

## Phase Details

### Phase 1: Foundation & Application Shell
**Goal**: Users can launch the application in desktop or web mode with a functional UI framework
**Depends on**: Nothing (first phase)
**Requirements**: APP-01, APP-02, APP-03, APP-04, APP-05
**Success Criteria** (what must be TRUE):
  1. User can launch the application as a native desktop app
  2. User can switch between desktop and web-based modes
  3. User can toggle between light and dark mode
  4. Application works offline (no network required for basic functionality)
  5. Application shell displays with navigation structure ready for features
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Project initialization, Electron setup, React app scaffold (✓ Complete)
- [x] 01-02-PLAN.md — Theme system, navigation structure, collapsible sidebar (✓ Complete)
- [ ] 01-03-PLAN.md — Mode switching (desktop/web), window management, system tray
- [ ] 01-04-PLAN.md — Error handling, logging, offline functionality

---

### Phase 2: Core Knowledge Management
**Goal**: Users can create, organize, and search their personal knowledge base with bidirectional linking
**Depends on**: Phase 1
**Requirements**: KNOW-01, KNOW-02, KNOW-03, KNOW-04, KNOW-05, KNOW-06, KNOW-07, KNOW-08, KNOW-09, KNOW-10
**Success Criteria** (what must be TRUE):
  1. User can create notes with rich text/markdown formatting
  2. User can edit and delete existing notes
  3. User can search notes with full-text search returning results in under 100ms
  4. User can create bidirectional links using [[wiki-style]] syntax and view backlinks panel
  5. User can organize notes with tags and browse by tag
  6. User can export their entire knowledge base to markdown or JSON format
**Plans**: TBD
**UI hint**: yes

---

### Phase 3: AI Integration
**Goal**: Users can configure AI providers and interact with AI to research topics and generate summaries
**Depends on**: Phase 2
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08, AI-09, AI-10
**Success Criteria** (what must be TRUE):
  1. User can configure multiple AI providers (Claude CLI, GPT, DeepSeek) with API keys and custom base URLs
  2. User can select which model to use for each provider
  3. User can ask questions through a chat interface and receive AI-generated answers
  4. AI can research topics using both web search and model knowledge
  5. AI-generated answers include citations to sources
  6. AI can generate summaries of existing notes
**Plans**: TBD
**UI hint**: yes

---

### Phase 4: Content Storage & Management
**Goal**: Users can store diverse content types with rich metadata alongside AI-generated knowledge
**Depends on**: Phase 3
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06
**Success Criteria** (what must be TRUE):
  1. User can manually add documents and images to their library
  2. AI-generated answers are stored with text content, diagrams, and images
  3. Every knowledge node has metadata including created date, source, and confidence score
  4. User can view metadata for any knowledge node
  5. Content is stored locally in SQLite with proper file organization
**Plans**: TBD

---

### Phase 5: Semantic Discovery
**Goal**: Users can discover related knowledge through semantic search and automatic linking
**Depends on**: Phase 4
**Requirements**: SEM-01, SEM-02, SEM-03, SEM-04, SEM-05
**Success Criteria** (what must be TRUE):
  1. System generates embeddings for all notes automatically
  2. User can search notes by semantic meaning, not just keywords
  3. System automatically links semantically related notes without manual intervention
  4. User can view a related concepts sidebar while reading any note
  5. Semantic relationships are stored in a graph structure for efficient querying
**Plans**: TBD
**UI hint**: yes

---

### Phase 6: 3D Visualization
**Goal**: Users can explore their knowledge base as an interactive 3D neural network
**Depends on**: Phase 5
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05
**Success Criteria** (what must be TRUE):
  1. User can view their knowledge graph as a 3D neural network visualization
  2. Graph visualization handles 1000+ nodes without lag or performance degradation
  3. User can navigate the graph by clicking nodes to view content
  4. User can see visual connections between related nodes
  5. Graph updates automatically when new knowledge is added
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Application Shell | 2/4 | In progress | - |
| 2. Core Knowledge Management | 0/0 | Not started | - |
| 3. AI Integration | 0/0 | Not started | - |
| 4. Content Storage & Management | 0/0 | Not started | - |
| 5. Semantic Discovery | 0/0 | Not started | - |
| 6. 3D Visualization | 0/0 | Not started | - |

---

## Research Flags

Phases requiring deeper research during planning:

- **Phase 3**: Validate multi-provider abstraction patterns, test API integration strategies
- **Phase 5**: Benchmark sqlite-vec performance at scale, test embedding model quality, tune similarity thresholds
- **Phase 6**: Prototype 3D rendering with 1000+ nodes, validate performance optimizations (LOD, instanced rendering)

---

*Roadmap created: 2026-05-24*
*Last updated: 2026-05-24*
