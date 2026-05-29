# Phase 3: CLI & Server Launcher - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Single command launches server and opens browser. User runs `librania start`, server starts on configurable port (default 3000), browser opens automatically to web UI. CLI works on Linux and Windows with graceful shutdown on Ctrl+C.

</domain>

<decisions>
## Implementation Decisions

### CLI Command Structure
- **D-01:** Single command pattern — `librania start` (matches ROADMAP expectation, can add subcommands later)
- **D-02:** Standard flags — `--port`, `--no-browser`, `--data-dir` (covers common use cases without bloat)
- **D-03:** commander.js for arg parsing — mature, 50M+ weekly downloads, handles help/version automatically
- **D-04:** npm bin with shebang — `#!/usr/bin/env node` (standard cross-platform pattern, npm handles execution)

### Browser Launch Behavior
- **D-05:** Auto-open by default — browser opens automatically unless `--no-browser` flag used (standard for local dev servers)
- **D-06:** Use `open` package — cross-platform npm package handles OS-specific browser commands (20M+ weekly downloads)
- **D-07:** Wait for server ready — open browser after server.listen() callback fires (prevents connection refused errors)
- **D-08:** Log warning on failure — if browser fails to open, log warning and continue running (non-blocking, user can manually open)

### Server Lifecycle Management
- **D-09:** Foreground process only — Ctrl+C stops server, no daemon mode (simpler for v1, standard for dev servers)
- **D-10:** Graceful shutdown on SIGINT — close HTTP server, close Socket.IO connections, flush logs (standard graceful shutdown)
- **D-11:** Startup message — log clean startup message with URL (informative without ASCII art bloat)
- **D-12:** Auto-increment port on conflict — try up to 5 ports if default is busy (server already tries port+1, extend to 5 attempts)

### Configuration & Data Paths
- **D-13:** Current directory default — `./data` for database/uploads (simple, portable, user chose over XDG/AppData)
- **D-14:** Precedence: flag > env var > default — `--data-dir` overrides `LIBRANIA_DATA_DIR` overrides `./data` (standard CLI precedence)
- **D-15:** Separate data/ and config/ — data directory contains `data/` (database, uploads) and `config/` (settings.json) subdirectories (clean separation, easier backups)
- **D-16:** Auto-create directories — create data/config directories on startup if missing (user-friendly, no manual setup)

### Claude's Discretion
None — all areas had explicit decisions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CLI-01 through CLI-06 requirements for this phase
- `.planning/PROJECT.md` — v2.0 goal (cross-platform CLI + web server), constraints (works on Linux and Windows)

### Prior Phase Context
- `.planning/phases/01-foundation-application-shell/01-CONTEXT.md` — Backend extraction patterns, Express server setup
- `.planning/phases/02-core-knowledge-management/02-CONTEXT.md` — Frontend HTTP/WebSocket migration, static asset serving

### Existing Implementation
- `start-server.js` — Standalone server starter (already launches server, serves static files from dist/)
- `electron/server.ts` — Server implementation with Express + Socket.IO, port conflict handling (tries port+1)

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`electron/server.ts`** — `startServer()` function already handles Express setup, Socket.IO, static file serving, port conflict resolution (tries port+1)
- **`start-server.js`** — Standalone server starter with graceful shutdown (SIGINT handler), can be adapted for CLI entry point
- **Environment variables** — `LIBRANIA_PORT`, `LIBRANIA_DATA_DIR`, `LIBRANIA_DB_PATH` already supported via dotenv (Phase 1)

### Established Patterns
- **Port conflict handling** — Server already tries port+1 if default is busy (extend to try 5 ports)
- **Graceful shutdown** — `stopServer()` function closes HTTP server and returns Promise (reuse for SIGINT handler)
- **Static asset serving** — `app.use(express.static(path.join(__dirname, '../dist')))` pattern established
- **SPA routing** — Catch-all middleware returns index.html for non-API routes (already working)

### Integration Points
- **CLI entry point** — Create `bin/librania.js` with shebang, wire to `package.json` bin field
- **Server startup** — Import and call `startServer()` from `electron/server.ts`
- **Browser launch** — Call after `startServer()` Promise resolves (server ready)
- **Data directory** — Pass to server via env vars or config, server already reads `LIBRANIA_DATA_DIR`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard CLI patterns for Node.js applications.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 3-CLI & Server Launcher*
*Context gathered: 2026-05-29*
