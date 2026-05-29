# Phase 1: Backend Extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 1-Backend Extraction
**Areas discussed:** Server architecture, IPC → endpoint mapping, Config migration

---

## Server Architecture

### Question 1: Reuse or rebuild Express server?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing Express server | Keep electron/server.ts as base. Add missing endpoints, refactor IPC logic into routes. Faster, preserves working code. | ✓ |
| Rebuild from scratch | Start fresh server.ts. Clean architecture, no Electron remnants. More work, but cleaner separation. | |
| You decide | Pick what works best for each part. | |

**User's choice:** Reuse existing Express server (Recommended)

### Question 2: Keep or redesign API routes?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing API routes | Keep electron/api/routes.ts structure. Add new routes alongside existing. Minimal disruption. | ✓ |
| Redesign API structure | Redesign REST API (e.g., /api/v1/notes, /api/v1/content). Cleaner, versioned, RESTful conventions. | |
| You decide | Pick what works best. | |

**User's choice:** Keep existing API routes

### Question 3: Where should server code live?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in electron/ directory | Keep server in electron/ directory. Minimal file moves, clear migration path. | ✓ |
| Move to new directory | Move to src/server/ or backend/. Cleaner separation, but more file moves. | |
| You decide | Pick what works best. | |

**User's choice:** Keep in electron/ directory (Recommended)

---

## IPC → Endpoint Mapping

### Question 1: How to map IPC handlers to endpoints?

| Option | Description | Selected |
|--------|-------------|----------|
| 1:1 handler → route mapping | Each IPC handler becomes one route file (ai.handlers.ts → /api/ai routes). Preserves organization, clear 1:1 mapping. | ✓ |
| Group by REST resource | Group by REST resource (/api/notes, /api/content, /api/graph). More RESTful, but requires reorganizing handler logic. | |
| You decide | Pick what works best. | |

**User's choice:** 1:1 handler → route mapping (Recommended)

### Question 2: Which operations need WebSocket?

| Option | Description | Selected |
|--------|-------------|----------|
| AI streaming + graph updates | AI streaming (chat responses, research), graph updates (real-time node additions). Fast, bidirectional. | ✓ |
| HTTP only | All operations use HTTP. Simpler, but no real-time updates. Polling required. | |
| You decide | Pick what works best. | |

**User's choice:** AI streaming + graph updates (Recommended)

### Question 3: WebSocket library choice?

| Option | Description | Selected |
|--------|-------------|----------|
| Socket.IO | Use Socket.IO (already in package.json). Handles reconnection, fallback, room management. Mature, well-documented. | ✓ |
| Native WebSocket | Native WebSocket (ws package). Lighter, but manual reconnection logic needed. | |
| You decide | Pick what works best. | |

**User's choice:** Socket.IO (Recommended)

---

## Config Migration

### Question 1: Keep JSON format or change?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep JSON format | Keep JSON format. loadConfig/saveConfig already work. No migration needed. | ✓ |
| Change format | Switch to YAML, TOML, or .env. More human-readable, but requires rewriting config logic. | |
| You decide | Pick what works best. | |

**User's choice:** Keep JSON format (Recommended)

### Question 2: Where to store config file?

| Option | Description | Selected |
|--------|-------------|----------|
| User home directory | ~/.librania/config.json (Linux/Mac) or %APPDATA%/librania/config.json (Windows). Standard user config location. | |
| Project root | Project root (./config.json). Simple, but not portable across machines. | ✓ |
| You decide | Pick what works best. | |

**User's choice:** Project root

### Question 3: Support environment variable overrides?

| Option | Description | Selected |
|--------|-------------|----------|
| Env vars override config | Environment variables override config file (e.g., LIBRANIA_PORT=4000). Standard for server apps, supports Docker/deployment. | ✓ |
| Config file only | Config file only. Simpler, but less flexible for deployment. | |
| You decide | Pick what works best. | |

**User's choice:** Env vars override config (Recommended)

---

## Claude's Discretion

- Database path resolution strategy (env var, CLI flag, config file, or relative path)
- API key encryption approach (Node.js crypto, keytar, OS keychain, or plaintext with warning)
- File upload handling on backend (multipart form data, base64 in JSON, or separate endpoint)

## Deferred Ideas

None — discussion stayed within phase scope
