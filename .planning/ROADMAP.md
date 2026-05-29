# Roadmap: LibraNia v2.0

**Milestone:** v2.0 - Cross-Platform Web Architecture
**Created:** 2026-05-29
**Granularity:** Standard
**Total Phases:** 5

## Goal

Transform LibraNia from Electron desktop app to cross-platform CLI + web server architecture. User runs single command (`librania start`) on Linux or Windows, server launches, browser opens, all v1 features work.

## Phases

- [ ] **Phase 1: Backend Extraction** - Extract Electron main process to standalone Node.js server
- [ ] **Phase 2: Frontend Adaptation** - Replace Electron IPC with HTTP/WebSocket clients
- [ ] **Phase 3: CLI & Server Launcher** - Create CLI entry point with auto-browser launch
- [ ] **Phase 4: Packaging & Distribution** - Bundle as npm package with binary
- [ ] **Phase 5: Cross-Platform Validation** - Test on Linux and Windows, verify native dependencies

## Phase Details

### Phase 1: Backend Extraction

**Goal**: Electron main process logic runs as standalone Node.js server with REST/WebSocket APIs

**Depends on**: Nothing (first phase)

**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04, BACK-05, BACK-06

**Success Criteria** (what must be TRUE):

1. Server starts without Electron and listens on configurable port
2. Database operations work using Node.js fs paths (no Electron app.getPath)
3. File operations use Node.js fs module (no Electron dialog API)
4. Config storage reads/writes JSON files (no electron-store)
5. API key encryption works using Node.js crypto (no Electron safeStorage)
6. All IPC handlers converted to HTTP POST/GET or WebSocket endpoints

**Plans**: 4 plans in 2 waves
Plans:
**Wave 1**

- [ ] 01-01-PLAN.md — Core infrastructure (Socket.IO, Multer, encryption service)
- [ ] 01-02-PLAN.md — Database & config migration (path resolution, env vars)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-03-PLAN.md — Convert IPC handlers to HTTP routes (notes, content, search, tags, export, config)
- [ ] 01-04-PLAN.md — WebSocket handlers for AI streaming and graph updates

### Phase 2: Frontend Adaptation

**Goal**: Frontend communicates with backend via HTTP/WebSocket instead of Electron IPC

**Depends on**: Phase 1 (needs backend APIs to exist)

**Requirements**: FRONT-01, FRONT-02, FRONT-03, FRONT-04, FRONT-05

**Success Criteria** (what must be TRUE):

1. All `window.api.*` calls replaced with fetch or WebSocket clients
2. File uploads use HTML `<input type="file">` instead of Electron dialog
3. Frontend builds as static assets (HTML/CSS/JS) served by backend
4. User can create, edit, delete, search notes in browser
5. User can chat with AI and see streaming responses in browser
6. User can view 3D graph visualization in browser
7. User can browse library and view documents in browser

**Plans**: TBD

**UI hint**: yes

### Phase 3: CLI & Server Launcher

**Goal**: User runs single command to start server and open browser

**Depends on**: Phase 1 (needs server), Phase 2 (needs working frontend)

**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06

**Success Criteria** (what must be TRUE):

1. User runs `librania start` and server launches on port 3000
2. Default browser opens automatically to `http://localhost:3000`
3. User can specify custom port with `--port` flag
4. User can run headless (no browser) with `--no-browser` flag
5. Server shuts down gracefully on Ctrl+C (closes connections, saves state)
6. CLI works in bash/zsh on Linux and cmd/PowerShell on Windows

**Plans**: TBD

### Phase 4: Packaging & Distribution

**Goal**: LibraNia distributed as npm package with global CLI binary

**Depends on**: Phase 3 (needs working CLI)

**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04, PKG-05

**Success Criteria** (what must be TRUE):

1. User runs `npm install -g librania` and CLI installs globally
2. Frontend assets bundled in npm package (no separate build step)
3. User runs `librania --version` and sees current version
4. User runs `librania --help` and sees usage instructions
5. Package size < 50MB (vs 120MB+ Electron bundle)

**Plans**: TBD

### Phase 5: Cross-Platform Validation

**Goal**: LibraNia works identically on Linux and Windows

**Depends on**: Phase 4 (needs packaged app to test)

**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05

**Success Criteria** (what must be TRUE):

1. CLI executable runs on Linux (Ubuntu/Arch tested)
2. CLI executable runs on Windows 10/11 (cmd and PowerShell tested)
3. Database paths resolve correctly on both platforms (no hardcoded separators)
4. File paths use platform-agnostic separators (path.join, not string concat)
5. better-sqlite3 builds and runs on both platforms
6. sharp builds and runs on both platforms (thumbnail generation works)

**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Extraction | 0/4 | Planning complete | - |
| 2. Frontend Adaptation | 0/0 | Not started | - |
| 3. CLI & Server Launcher | 0/0 | Not started | - |
| 4. Packaging & Distribution | 0/0 | Not started | - |
| 5. Cross-Platform Validation | 0/0 | Not started | - |

## Coverage

All 31 v2 requirements mapped:

| Requirement | Phase | Status |
|-------------|-------|--------|
| BACK-01 | Phase 1 | Pending |
| BACK-02 | Phase 1 | Pending |
| BACK-03 | Phase 1 | Pending |
| BACK-04 | Phase 1 | Pending |
| BACK-05 | Phase 1 | Pending |
| BACK-06 | Phase 1 | Pending |
| FRONT-01 | Phase 2 | Pending |
| FRONT-02 | Phase 2 | Pending |
| FRONT-03 | Phase 2 | Pending |
| FRONT-04 | Phase 2 | Pending |
| FRONT-05 | Phase 2 | Pending |
| CLI-01 | Phase 3 | Pending |
| CLI-02 | Phase 3 | Pending |
| CLI-03 | Phase 3 | Pending |
| CLI-04 | Phase 3 | Pending |
| CLI-05 | Phase 3 | Pending |
| CLI-06 | Phase 3 | Pending |
| PKG-01 | Phase 4 | Pending |
| PKG-02 | Phase 4 | Pending |
| PKG-03 | Phase 4 | Pending |
| PKG-04 | Phase 4 | Pending |
| PKG-05 | Phase 4 | Pending |
| PLAT-01 | Phase 5 | Pending |
| PLAT-02 | Phase 5 | Pending |
| PLAT-03 | Phase 5 | Pending |
| PLAT-04 | Phase 5 | Pending |
| PLAT-05 | Phase 5 | Pending |

**Coverage:** 31/31 requirements mapped ✓

---

*Roadmap created: 2026-05-29*
*Next: `/gsd-plan-phase 1`*
