# Milestone: v2 - Cross-Platform Web Architecture

**Created:** 2026-05-29
**Status:** Planning
**Previous Milestone:** v1.0 - AI-Powered Knowledge Management with Multi-Model Verification

## Goal

Transform LibraNia from Electron desktop app to cross-platform web application accessible via single CLI command on both Linux and Windows.

**User Vision:** "Run via only 1 commandline, has its own app and webserver so I can access via both"

## What Changes

### Architecture Shift

**From:** Electron desktop app (Windows-focused, 120MB+ bundle, 200MB+ memory)
**To:** Node.js backend + web frontend (cross-platform, CLI launcher, browser-based UI)

### User Experience

**Before:**
- Launch Electron .exe on Windows
- Desktop app with native window
- Mode switching requires restart

**After:**
- Single CLI command: `librania start`
- Backend server starts automatically
- Browser opens to `http://localhost:3000`
- Works on Linux and Windows identically
- No Electron wrapper, no native app

## Requirements

### CLI & Server
- [ ] **CLI-01**: Single command `librania start` launches backend server
- [ ] **CLI-02**: Server auto-opens default browser to web UI
- [ ] **CLI-03**: Server runs on configurable port (default 3000)
- [ ] **CLI-04**: CLI works on Linux and Windows
- [ ] **CLI-05**: Server can run headless (no browser open) with `--no-browser` flag
- [ ] **CLI-06**: Graceful shutdown on Ctrl+C

### Backend Migration
- [ ] **BACK-01**: Extract Electron main process logic to standalone Node.js server
- [ ] **BACK-02**: IPC handlers converted to HTTP/WebSocket endpoints
- [ ] **BACK-03**: Database operations work without Electron APIs
- [ ] **BACK-04**: File operations use Node.js fs instead of Electron dialog
- [ ] **BACK-05**: Config storage migrated from electron-store to file-based config
- [ ] **BACK-06**: API key encryption works without Electron safeStorage

### Frontend Migration
- [ ] **FRONT-01**: Remove Electron renderer IPC calls
- [ ] **FRONT-02**: Replace `window.api.*` with HTTP/WebSocket clients
- [ ] **FRONT-03**: File uploads use HTML file input instead of Electron dialog
- [ ] **FRONT-04**: Frontend builds as static assets served by backend
- [ ] **FRONT-05**: All existing features work in browser (notes, chat, graph, library)

### Cross-Platform
- [ ] **PLAT-01**: CLI executable works on Linux (bash/zsh)
- [ ] **PLAT-02**: CLI executable works on Windows (cmd/PowerShell)
- [ ] **PLAT-03**: Database paths resolve correctly on both platforms
- [ ] **PLAT-04**: File paths use platform-agnostic separators
- [ ] **PLAT-05**: Native dependencies (better-sqlite3, sharp) build on both platforms

### Packaging
- [ ] **PKG-01**: npm package with `librania` CLI binary
- [ ] **PKG-02**: Bundled frontend assets in package
- [ ] **PKG-03**: Installation via `npm install -g librania`
- [ ] **PKG-04**: Version command `librania --version`
- [ ] **PKG-05**: Help command `librania --help`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Electron desktop app | Replaced by web architecture |
| Native system tray | Web apps don't have system tray access |
| Native file dialogs | Use HTML file input instead |
| Offline mode toggle | Web app always requires server running |
| Auto-updates | npm handles package updates |
| Code signing | Not needed for npm packages |

## Technical Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| Remove Electron entirely | User wants CLI + web, not desktop app | Lose: native menus, system tray, file dialogs. Gain: cross-platform, smaller bundle, simpler deployment |
| Express.js for backend | Already used in Phase 1 web mode | Mature, well-documented, handles static + API routes |
| WebSocket for real-time updates | Replace Electron IPC for streaming (AI tokens, graph updates) | Requires connection management, but standard web tech |
| HTML file input for uploads | Replace Electron dialog API | Less native feel, but works in all browsers |
| File-based config | Replace electron-store | Simpler, no Electron dependency, easy to inspect/edit |
| Open browser automatically | User wants "single command" experience | Can disable with `--no-browser` flag |

## Success Criteria

1. User runs `librania start` on Linux → server starts, browser opens, app works
2. User runs `librania start` on Windows → server starts, browser opens, app works
3. All v1 features work in browser (notes, chat, graph, library, search)
4. No Electron dependencies remain in codebase
5. Package size < 50MB (vs 120MB+ Electron bundle)
6. Installation via `npm install -g librania` works on both platforms

## Migration Strategy

### Phase 1: Backend Extraction
- Extract main process to standalone Node.js server
- Convert IPC to REST/WebSocket APIs
- Remove Electron-specific APIs (dialog, safeStorage, etc.)

### Phase 2: Frontend Adaptation
- Replace `window.api.*` with fetch/WebSocket
- Update file upload to use HTML input
- Test all features in browser

### Phase 3: CLI & Packaging
- Create CLI entry point with server launcher
- Add browser auto-open logic
- Package as npm module with binary

### Phase 4: Cross-Platform Testing
- Test on Linux (Ubuntu, Arch)
- Test on Windows (10, 11)
- Verify native dependencies build correctly

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| better-sqlite3 build fails on Linux | High - database won't work | Test early, provide prebuilt binaries if needed |
| sharp build fails on Linux | Medium - thumbnails won't work | Test early, fallback to no thumbnails |
| WebSocket connection issues | Medium - real-time features break | Implement reconnection logic, fallback to polling |
| File upload size limits | Low - large files fail | Document limits, add chunked upload if needed |
| Browser compatibility | Low - features break in old browsers | Target modern browsers (Chrome 90+, Firefox 88+) |

## Dependencies

**Blocked by:** v1.0 completion (all 6 phases done)
**Blocks:** Future milestones (mobile, plugins, etc.)

---

*Milestone created: 2026-05-29*
*Status: Planning - awaiting roadmap creation*
