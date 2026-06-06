# LibraNia Workflow and Infrastructure

This document explains how LibraNia works across UI, backend services, MCP clients, agents, tools, and local storage.

## Product Map

![LibraNia feature index](docs/images/librania-product-map.png)

LibraNia has six main surfaces:

- Home dashboard
- Library
- Chat
- Blackboard
- Graph
- Settings

All of them ultimately read from or write to the local library core.

## Runtime Architecture

![Runtime architecture](docs/images/librania-runtime-architecture.png)

Runtime flow:

1. Browser UI calls the Express API and listens to Socket.IO.
2. Backend routes call service-layer modules.
3. Services read/write SQLite, Markdown note files, content files, and export files.
4. Chat and Blackboard can call AI providers and web search.
5. MCP clients launch the MCP server over stdio and use local library tools.

## Library-First Research

![Library-first research workflow](docs/images/librania-research-workflow.png)

Detailed workflow:

1. User asks a question or assigns a research task.
2. Agent calls `search_notes`.
3. Agent reads relevant notes with `get_note`.
4. Agent checks whether local context is enough.
5. If not enough, agent uses web search or provider reasoning.
6. Useful durable findings are saved with `create_note` or `update_note`.
7. Tags are added with `add_tags`.
8. Related notes are linked with `[[Exact Note Title]]`.
9. Final answer references the library notes used, created, or updated.

## Blackboard Collaboration

![Blackboard collaboration workflow](docs/images/librania-blackboard-workflow.png)

Blackboard workflow:

1. User creates a session by assigning a task.
2. Blackboard records the task and selected active agents.
3. The service builds a compact observation with relevant note titles and active/inactive agent lists.
4. Agents respond in visible turns.
5. Agents can call built-in or custom tools.
6. Agents can mention another agent to bring that role into the session.
7. User can join the room with normal messages or `@agent` mentions.
8. Export Agent can summarize the whole session into a library note, Markdown file, or both.

## Tool Workflow

Tool Builder supports:

- Static template tools
- HTTP tools
- Built-in LibraNia tools

HTTP tool behavior:

- Relative URLs such as `/api/notes/{{noteId}}` call the local LibraNia server.
- `GET` and `DELETE` do not send a body.
- `POST`, `PUT`, and `PATCH` send the HTTP body template if provided.
- Headers support templated fields.
- Playground can test tools before agents use them.

Built-in tools:

- `search_notes`
- `get_note`
- `get_backlinks`
- `get_note_tags`
- `web_search`
- `create_note`
- `add_tags`
- `export_blackboard`

## Data Persistence

Local data paths:

```text
data/librania.db
data/notes/
data/blackboard-exports/
content/
data/.env
```

Database stores:

- notes
- tags
- note/tag relationships
- note links
- note versions
- conversations
- messages
- citations
- content metadata
- embeddings
- Blackboard sessions, agents, tools, and artifacts

Markdown note files provide portability and readable backups.

## MCP Workflow

1. Codex or Claude Code starts.
2. The client reads `AGENTS.md` or `CLAUDE.md`.
3. The client connects to the `librania` MCP server.
4. MCP server exposes local library tools over stdio.
5. Research begins with `search_notes`.
6. External findings are saved back with `create_note` or `update_note`.

## Operational Workflow

Build app:

```bash
npm run build:package
```

Build MCP:

```bash
cd mcp-server
npm run build
```

Register MCP:

```bash
npm run setup-codex
npm run setup-cli
```

Run app:

```bash
npm start
```

Windows:

```bash
start.bat
```
