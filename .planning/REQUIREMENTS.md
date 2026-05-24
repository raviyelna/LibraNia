# Requirements: LibraNia

**Defined:** 2026-05-24
**Core Value:** Answers must be verified by multiple AI models before storage — ensuring knowledge in the library is cross-validated and trustworthy.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Knowledge Management

- [ ] **KNOW-01**: User can create notes with rich text/markdown
- [ ] **KNOW-02**: User can edit existing notes
- [ ] **KNOW-03**: User can delete notes
- [ ] **KNOW-04**: User can search notes with full-text search (<100ms response)
- [ ] **KNOW-05**: User can create bidirectional links between notes using [[wiki-style]] syntax
- [ ] **KNOW-06**: User can view backlinks panel showing what links to current note
- [ ] **KNOW-07**: User can add tags/labels to notes for organization
- [ ] **KNOW-08**: User can browse notes by tags
- [ ] **KNOW-09**: All notes stored locally in SQLite database
- [ ] **KNOW-10**: User can export notes to markdown/JSON format

### AI Integration

- [ ] **AI-01**: User can configure AI provider (Claude CLI, GPT, DeepSeek)
- [ ] **AI-02**: User can set API key for each provider
- [ ] **AI-03**: User can set custom base URL for each provider (blank = default)
- [ ] **AI-04**: User can select which model to use per provider
- [ ] **AI-05**: User can ask questions through chat interface
- [ ] **AI-06**: AI generates answers using configured provider
- [ ] **AI-07**: AI can generate summaries of notes
- [ ] **AI-08**: AI researches topics using web search
- [ ] **AI-09**: AI researches topics using model knowledge
- [ ] **AI-10**: AI answers include citations to sources

### Content Storage

- [ ] **CONT-01**: User can manually add documents to library
- [ ] **CONT-02**: User can manually add images to library
- [ ] **CONT-03**: AI-generated answers stored with text content
- [ ] **CONT-04**: AI-generated answers stored with diagrams
- [ ] **CONT-05**: AI-generated answers stored with images
- [ ] **CONT-06**: Each knowledge node has metadata (created date, source, confidence)

### Semantic Discovery

- [ ] **SEM-01**: System generates embeddings for all notes
- [ ] **SEM-02**: User can search notes by semantic meaning (not just keywords)
- [ ] **SEM-03**: System automatically links semantically related notes
- [ ] **SEM-04**: User can view related concepts sidebar while reading
- [ ] **SEM-05**: System stores semantic relationships in graph structure

### Visualization

- [ ] **VIZ-01**: User can view knowledge graph as 3D neural network
- [ ] **VIZ-02**: Graph visualization handles 1000+ nodes without lag
- [ ] **VIZ-03**: User can navigate graph by clicking nodes
- [ ] **VIZ-04**: User can see connections between nodes visually
- [ ] **VIZ-05**: Graph updates when new knowledge added

### Application

- [ ] **APP-01**: Desktop app runs as native application
- [ ] **APP-02**: Desktop app can run in web-based mode
- [ ] **APP-03**: User can switch between desktop and web mode
- [ ] **APP-04**: App supports dark mode
- [ ] **APP-05**: App works offline (except AI/web search calls)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Model Verification

- **VERIFY-01**: System queries multiple AI providers for same question
- **VERIFY-02**: System compares answers across providers
- **VERIFY-03**: System generates confidence score based on agreement
- **VERIFY-04**: User sees confidence score for each knowledge node
- **VERIFY-05**: System flags conflicting answers for user review

### Advanced Features

- **ADV-01**: System generates diagrams automatically (Mermaid/PlantUML)
- **ADV-02**: User can import notes from Obsidian/Notion
- **ADV-03**: System tracks version history of notes
- **ADV-04**: System provides smart suggestions ("link this to X")
- **ADV-05**: User can create question templates for research
- **ADV-06**: API for custom extensions

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cloud sync | Conflicts with local-first privacy promise |
| Real-time collaboration | Single-user focus, massive complexity |
| Social features | Dilutes focus on personal knowledge management |
| Mobile app | Desktop-first for complex visualization |
| Video content processing | High complexity, storage overhead for v1 |
| Built-in AI training | Users expect to use existing models |
| Blockchain/Web3 | Adds complexity without clear value |
| Gamification | Knowledge work is intrinsically motivated |
| Calendar integration | Feature creep, many tools do this |
| Task management | Different domain, tools like Todoist exist |
| Email integration | Scope creep, users can copy/paste |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (To be filled by roadmapper) | | |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 41 ⚠️

---
*Requirements defined: 2026-05-24*
*Last updated: 2026-05-24 after initial definition*
