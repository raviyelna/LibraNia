# Phase 1: Backend Extraction - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract Electron main process logic to standalone Node.js server. All IPC handlers converted to HTTP/WebSocket endpoints. Database operations, file operations, and config storage work without Electron APIs.

</domain>

<decisions>
## Implementation Decisions

### Server Architecture
- **D-01:** Reuse existing Express server at `electron/server.ts` as base — extend with new endpoints, refactor IPC logic into routes
- **D-02:** Keep existing API route structure from `electron/api/routes.ts` — add new routes alongside existing
- **D-03:** Keep server code in `electron/` directory — minimal file moves, clear migration path

### IPC → Endpoint Mapping
- **D-04:** 1:1 handler → route mapping — each IPC handler file becomes one route file (e.g., `ai.handlers.ts` → `/api/ai` routes)
- **D-05:** WebSocket for AI streaming (chat responses, research) and graph updates (real-time node additions)
- **D-06:** HTTP for all other operations (CRUD, queries, config)
- **D-07:** Use Socket.IO for WebSocket implementation — handles reconnection, fallback, room management

### Config Migration
- **D-08:** Keep JSON format — `loadConfig/saveConfig` already work, no migration needed
- **D-09:** Store config in project root (`./config.json`) — simple, not portable but acceptable for v2
- **D-10:** Environment variables override config file values (e.g., `LIBRANIA_PORT=4000`) — standard for server apps

### Claude's Discretion
- Database path resolution strategy (env var, CLI flag, config file, or relative path)
- API key encryption approach (Node.js crypto, keytar, OS keychain, or plaintext with warning)
- File upload handling on backend (multipart form data, base64 in JSON, or separate endpoint)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — BACK-01 through BACK-06 define Phase 1 scope

### Architecture
- `.planning/ROADMAP.md` §Phase 1 — success criteria and dependencies

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Express server** (`electron/server.ts`): Already serves static files + API routes, handles CORS, includes error handling
- **IPC handlers** (`electron/ipc/*.handlers.ts`): 11 handler files organized by domain (ai, content, graph, notes, search, tags, export, app, config, window, misc)
- **Services layer** (`electron/services/*.ts`): Database, file storage, embeddings, graph, links, conversation — business logic already separated from IPC
- **Config utilities** (`src/config/appConfig.js`): `loadConfig/saveConfig/updateConfig` functions already exist
- **Database init** (`electron/database/connection.js`): `initDatabase()` function ready to use

### Established Patterns
- **Service layer separation**: Business logic in `services/`, handlers call services — preserve this pattern for HTTP routes
- **Handler organization**: One file per domain (ai, content, graph) — map directly to route files
- **Config structure**: JSON with nested objects for different concerns (server, ai, storage) — keep this structure

### Integration Points
- **Frontend IPC calls**: All `window.api.*` calls in renderer need HTTP/WebSocket equivalents
- **Database paths**: Currently use `app.getPath('userData')` — need Node.js equivalent
- **File operations**: Currently use Electron dialog API — need multipart upload or file input handling

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Backend Extraction*
*Context gathered: 2026-05-29*
