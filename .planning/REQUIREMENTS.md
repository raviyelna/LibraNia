# Requirements: LibraNia

**Defined:** 2026-05-24
**Core Value:** Answers must be verified by multiple AI models before storage — ensuring knowledge in the library is cross-validated and trustworthy.

## v2 Requirements (Active Milestone)

Requirements for v2.0 - Cross-Platform Web Architecture migration.

### CLI & Server
- [ ] **CLI-01**: Single command `librania start` launches backend server
- [ ] **CLI-02**: Server auto-opens default browser to web UI
- [ ] **CLI-03**: Server runs on configurable port (default 3000)
- [ ] **CLI-04**: CLI works on Linux and Windows
- [ ] **CLI-05**: Server can run headless (no browser open) with `--no-browser` flag
- [ ] **CLI-06**: Graceful shutdown on Ctrl+C

### Backend Migration
- [x] **BACK-01**: Extract Electron main process logic to standalone Node.js server ✓ 2026-05-29
- [x] **BACK-02**: IPC handlers converted to HTTP/WebSocket endpoints ✓ 2026-05-29
- [x] **BACK-03**: Database operations work without Electron APIs ✓ 2026-05-29
- [x] **BACK-04**: File operations use Node.js fs instead of Electron dialog ✓ 2026-05-29
- [x] **BACK-05**: Config storage migrated from electron-store to file-based config ✓ 2026-05-29
- [x] **BACK-06**: API key encryption works without Electron safeStorage ✓ 2026-05-29

### Frontend Migration
- [x] **FRONT-01**: Remove Electron renderer IPC calls ✓ 2026-05-29
- [x] **FRONT-02**: Replace `window.api.*` with HTTP/WebSocket clients ✓ 2026-05-29
- [x] **FRONT-03**: File uploads use HTML file input instead of Electron dialog ✓ 2026-05-29
- [x] **FRONT-04**: Frontend builds as static assets served by backend ✓ 2026-05-29
- [x] **FRONT-05**: All existing features work in browser (notes, chat, graph, library) ✓ 2026-05-29

### Cross-Platform
- [ ] **PLAT-01**: CLI executable works on Linux (bash/zsh)
- [ ] **PLAT-02**: CLI executable works on Windows (cmd/PowerShell)
- [ ] **PLAT-03**: Database paths resolve correctly on both platforms
- [ ] **PLAT-04**: File paths use platform-agnostic separators
- [ ] **PLAT-05**: Native dependencies (better-sqlite3, sharp) build on both platforms

### Packaging
- [x] **PKG-01**: npm package with `librania` CLI binary ✓ 2026-05-29
- [x] **PKG-02**: Bundled frontend assets in package ✓ 2026-05-29
- [ ] **PKG-03**: Installation via `npm install -g librania`
- [x] **PKG-04**: Version command `librania --version` ✓ 2026-05-29
- [x] **PKG-05**: Help command `librania --help` ✓ 2026-05-29

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BACK-01 | Phase 1 | ✓ Complete (01-01) |
| BACK-02 | Phase 1 | ✓ Complete (01-01) |
| BACK-03 | Phase 1 | ✓ Complete (01-02) |
| BACK-04 | Phase 1 | ✓ Complete (01-01) |
| BACK-05 | Phase 1 | ✓ Complete (01-02) |
| BACK-06 | Phase 1 | ✓ Complete (01-01) |
| FRONT-01 | Phase 2 | ✓ Complete (02-03) |
| FRONT-02 | Phase 2 | ✓ Complete (02-01) |
| FRONT-03 | Phase 2 | ✓ Complete (02-03) |
| FRONT-04 | Phase 2 | ✓ Complete (02-04) |
| FRONT-05 | Phase 2 | ✓ Complete (02-04) |
| CLI-01 | Phase 3 | Pending |
| CLI-02 | Phase 3 | Pending |
| CLI-03 | Phase 3 | Pending |
| CLI-04 | Phase 3 | Pending |
| CLI-05 | Phase 3 | Pending |
| CLI-06 | Phase 3 | Pending |
| PKG-01 | Phase 4 | ✓ Complete (04-01) |
| PKG-02 | Phase 4 | ✓ Complete (04-01) |
| PKG-03 | Phase 4 | Pending |
| PKG-04 | Phase 4 | ✓ Complete (04-01) |
| PKG-05 | Phase 4 | ✓ Complete (04-01) |
| PLAT-01 | Phase 5 | Pending |
| PLAT-02 | Phase 5 | Pending |
| PLAT-03 | Phase 5 | Pending |
| PLAT-04 | Phase 5 | Pending |
| PLAT-05 | Phase 5 | Pending |

## v1 Requirements (Completed)

Requirements for v1.0 - AI-Powered Knowledge Management (COMPLETE 2026-05-27).

### Knowledge Management
- [x] **KNOW-01**: User can create notes with rich text/markdown
- [x] **KNOW-02**: User can edit existing notes
- [x] **KNOW-03**: User can delete notes
- [x] **KNOW-04**: User can search notes with full-text search (<100ms response)
- [x] **KNOW-05**: User can create bidirectional links between notes using [[wiki-style]] syntax
- [x] **KNOW-06**: User can view backlinks panel showing what links to current note
- [x] **KNOW-07**: User can add tags/labels to notes for organization
- [x] **KNOW-08**: User can browse notes by tags
- [x] **KNOW-09**: All notes stored locally in SQLite database
- [x] **KNOW-10**: User can export notes to markdown/JSON format

### AI Integration
- [x] **AI-01**: User can configure AI provider (Claude CLI, GPT, DeepSeek)
- [x] **AI-02**: User can set API key for each provider
- [x] **AI-03**: User can set custom base URL for each provider (blank = default)
- [x] **AI-04**: User can select which model to use per provider
- [x] **AI-05**: User can ask questions through chat interface
- [x] **AI-06**: AI generates answers using configured provider
- [x] **AI-07**: AI can generate summaries of notes
- [x] **AI-08**: AI researches topics using web search
- [x] **AI-09**: AI researches topics using model knowledge
- [x] **AI-10**: AI answers include citations to sources

### Content Storage
- [x] **CONT-01**: User can manually add documents to library
- [x] **CONT-02**: User can manually add images to library
- [x] **CONT-03**: AI-generated answers stored with text content
- [x] **CONT-04**: AI-generated answers stored with diagrams
- [x] **CONT-05**: AI-generated answers stored with images
- [x] **CONT-06**: Each knowledge node has metadata (created date, source, confidence)

### Semantic Discovery
- [x] **SEM-01**: System generates embeddings for all notes
- [x] **SEM-02**: User can search notes by semantic meaning (not just keywords)
- [x] **SEM-03**: System automatically links semantically related notes
- [x] **SEM-04**: User can view related concepts sidebar while reading
- [x] **SEM-05**: System stores semantic relationships in graph structure

### Visualization
- [x] **VIZ-01**: User can view knowledge graph as 3D neural network
- [x] **VIZ-02**: Graph visualization handles 1000+ nodes without lag
- [x] **VIZ-03**: User can navigate graph by clicking nodes
- [x] **VIZ-04**: User can see connections between nodes visually
- [x] **VIZ-05**: Graph updates when new knowledge added

### Application
- [x] **APP-01**: Desktop app runs as native application
- [x] **APP-02**: Desktop app can run in web-based mode
- [x] **APP-03**: User can switch between desktop and web mode
- [x] **APP-04**: App supports dark mode
- [x] **APP-05**: App works offline (except AI/web search calls)

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

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
| Electron desktop app | Replaced by web architecture in v2 |
| Native system tray | Web apps don't have system tray access |
| Native file dialogs | Use HTML file input instead |
| Auto-updates | npm handles package updates |
| Code signing | Not needed for npm packages |

---
*Requirements defined: 2026-05-24*
*Last updated: 2026-05-29 after v2 milestone roadmap creation*
