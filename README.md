# LibraNia

LibraNia is a local-first AI knowledge workspace for Markdown notes, library search, graph navigation, AI chat, collaborative Blackboard agents, custom tools, and MCP access from external agent clients.

The core rule is simple: the local library is the source of truth. AI chat and agents can research or reason, but durable knowledge should become Markdown notes, tags, and `[[Exact Note Title]]` wiki-links so future work can reuse it.

![LibraNia feature index](docs/images/librania-product-map.png)

## Current App Surface

LibraNia runs as a React/Vite UI backed by an Express API and Socket.IO. The app routes are:

- Home dashboard: `/`
- Library: `/library`
- Chat: `/chat`
- Blackboard: `/blackboard`
- Graph: `/graph`
- Settings: `/settings`

## Features

### Home Dashboard

- Customizable dashboard widgets stored in `localStorage`
- Quick actions for Chat, Blackboard, Library, and Graph
- Workspace metrics for notes, graph links, tags, and conversations
- Recent notes, graph health, recent research threads, and tag vocabulary
- Comfortable or compact dashboard density

### Library

- Markdown note editing
- Notes list with quick navigation
- Note create, edit, soft-delete, restore, and trash support through the notes API
- Tags on notes and a tag management view
- `[[wiki-links]]`, backlinks, and related-note panels
- AI auto-linking that appends new links instead of deleting existing links
- Librarian Ask panel for note-scoped questions
- Content upload/list/delete for selected notes
- Import readable content as notes
- Export notes through the export dialog

### Chat

- Conversation list and message history
- Provider and model selection
- AI chat endpoint with research mode support
- Socket.IO connection for real-time app behavior
- Library-aware research tooling on the backend

### Graph

- 2D/3D force-directed graph views
- Graph nodes from notes
- Edges from wiki-links and related-note relationships
- Search, selection, neighbor highlighting, minimap, and side-panel navigation

### Blackboard

- Collaborative multi-agent task sessions
- Session list with rename and delete
- Collapsible and resizable session rail
- Chatroom-style agent/user conversation view
- Collapsible and resizable Blackboard workspace inspector
- User messages inside an existing Blackboard session
- `@agent` mention flow handled by the Blackboard service
- Agent response details for debugging prompts, tool calls, and intermediate output
- Agent Management for agent name, description, system prompt, tool access, custom tool instructions, and response budget
- Tool Builder for static tools and HTTP tools
- Built-in tool reference in Tool Builder
- Tool Playground for built-in and custom tool testing
- Export Agent support through the `export_blackboard` built-in tool

### Settings

- AI provider configuration for Claude, OpenAI, DeepSeek, and Custom Provider
- Delete stored provider keys
- Custom Provider with multiple API keys
- Custom base URL and custom headers
- Tavily API key configuration for web search support

Settings no longer exposes an Application Mode selector in the UI.

## Provider and Environment Configuration

Provider keys are stored in `data/.env`, not in the project root `.env`.

The backend loads provider configuration from:

```text
data/.env
```

The implementation is in:

- `backend/server.ts`: loads `data/.env` at startup
- `backend/store/env.store.ts`: reads and writes provider keys, custom headers, models, and Tavily key

Common keys saved there include:

```text
CLAUDE_API_KEY="..."
CLAUDE_MODEL="..."
OPENAI_API_KEY="..."
OPENAI_MODEL="..."
DEEPSEEK_API_KEY="..."
DEEPSEEK_MODEL="..."
CUSTOM_API_KEY="..."
CUSTOM_API_KEYS="[\"key1\",\"key2\"]"
CUSTOM_MODEL="..."
CUSTOM_BASE_URL="..."
CUSTOM_CUSTOM_HEADERS="[{\"name\":\"Header\",\"value\":\"value\"}]"
TAVILY_API_KEY="..."
```

Runtime path overrides can still be passed as process environment variables:

- `LIBRANIA_DATA_DIR`: data directory, defaults to `./data`
- `LIBRANIA_DB_PATH`: explicit SQLite database path
- `LIBRANIA_MODELS_DIR`: embedding/model cache directory
- `LIBRANIA_UPLOAD_DIR`: upload directory
- `PORT`: server port used by `start.js`, defaults to `3001`
- `LIBRANIA_PORT`: default port accepted by `backend/server.ts`
- `LIBRANIA_API_BASE_URL`: base URL used by Blackboard HTTP tools for relative `/api` calls

## Architecture

![LibraNia runtime architecture](docs/images/librania-runtime-architecture.png)

Main layers:

- React 19 UI with Vite
- HashRouter routes under the shared Layout shell
- Express REST API under `/api`
- Socket.IO server and frontend socket context
- SQLite database through Drizzle and `better-sqlite3`
- Markdown notes and local content storage
- AI provider adapters for Claude, OpenAI, DeepSeek, and Custom Provider
- Research tools and web search services
- Blackboard service, agent management, tool execution, and session export
- MCP stdio server in `mcp-server/`

## REST API Areas

The backend registers these API areas:

- `/api/notes`
- `/api/content`
- `/api/search`
- `/api/tags`
- `/api/export`
- `/api/config`
- `/api/app`
- `/api/ai`
- `/api/graph`
- `/api/providers`
- `/api/conversations`
- `/api/chat`
- `/api/library/ask`
- `/api/blackboard/*`

Blackboard-specific endpoints include:

- `GET /api/blackboard/agents`
- `POST /api/blackboard/agents`
- `PUT /api/blackboard/agents/:id`
- `DELETE /api/blackboard/agents/:id`
- `GET /api/blackboard/tools`
- `POST /api/blackboard/tools`
- `PUT /api/blackboard/tools/:id`
- `DELETE /api/blackboard/tools/:id`
- `POST /api/blackboard/tools/:id/execute`
- `GET /api/blackboard/sessions`
- `GET /api/blackboard/sessions/:id`
- `PATCH /api/blackboard/sessions/:id`
- `DELETE /api/blackboard/sessions/:id`
- `POST /api/blackboard/sessions/:id/messages`
- `POST /api/blackboard/assign`

## MCP Integration

The MCP server lives in `mcp-server/` and exposes LibraNia over stdio for external agent clients.

Available MCP tools:

- `search_notes`
- `get_note`
- `create_note`
- `update_note`
- `add_tags`
- `list_tags`

Setup:

```bash
cd mcp-server
npm install
npm run build
npm run setup-codex
npm run setup-cli
```

Verify:

```bash
codex mcp get librania
claude mcp get librania
```

The MCP setup scripts pass `LIBRANIA_DATA_DIR` so external clients read the same local database under `data/`.

## Research Protocol

For Codex, Claude Code, and other agent clients:

1. Search LibraNia first.
2. Read relevant notes before external research.
3. Use web search only when the library is missing, incomplete, stale, or the user asks for current information.
4. Write useful durable web findings back to LibraNia before using them as final knowledge.
5. Add tags and use `[[Exact Note Title]]` links to connect notes.

Supporting policy files:

- `AGENTS.md`
- `CLAUDE.md`
- `mcp-server/README.md`

## Install

Requirements:

- Node.js 18+
- npm 7+
- Native build support for `better-sqlite3` and `sharp`

Install the main app:

```bash
npm install
```

Install MCP dependencies:

```bash
cd mcp-server
npm install
cd ..
```

## Build

```bash
npm run build:frontend
npm run build:backend
npm run build:package
```

Build MCP server:

```bash
cd mcp-server
npm run build
cd ..
```

## Run

Build and start the production server:

```bash
npm run build:package
npm start
```

`npm start` runs `start.js`, which serves the built app and API on `http://localhost:3001` unless `PORT` is set.

Windows helper:

```bat
start.bat
```

`start.bat` builds the package, fixes ESM imports, builds the MCP server, then starts `scripts/start-supervisor.js`.

Frontend dev server:

```bash
npm run dev
```

## Local Data

Local runtime data is intentionally not committed.

Important paths:

```text
data/librania.db              SQLite database
data/.env                     provider keys, models, custom headers, Tavily key
data/notes/                   local note files when file-backed storage is used
data/uploads/                 uploaded files
data/blackboard-exports/      Blackboard Markdown exports
data/models/                  local model/cache directory when used
content/                      imported or attached content files
```

## Project Layout

```text
backend/        Express API routes, services, database, AI, Blackboard, tools
src/            React UI, routes, hooks, API clients, components, styles
mcp-server/     Stdio MCP server and setup scripts
scripts/        Startup, build, native-module, and sync helpers
bin/            CLI launcher
docs/images/    Documentation diagrams
data/           Local runtime data, gitignored
content/        Local uploaded/imported files, gitignored
```

## Useful Files

- `src/routes/Home.tsx`: dashboard
- `src/routes/Library.tsx`: library workspace
- `src/routes/Chat.tsx`: chat route
- `src/routes/Blackboard.tsx`: Blackboard UI, agents, tools, playground
- `src/routes/Settings.tsx`: settings page
- `src/components/Settings/AIProviderSettings.tsx`: provider and Tavily settings
- `backend/api/routes.ts`: main API router
- `backend/api/blackboard.routes.ts`: Blackboard API
- `backend/services/blackboard.service.ts`: Blackboard agents, sessions, tools, export
- `backend/store/env.store.ts`: `data/.env` provider storage
- `backend/server.ts`: server startup and `data/.env` loading
- `mcp-server/src/index.ts`: MCP tool server

See [workflow.md](workflow.md) for system workflow and infrastructure diagrams.
