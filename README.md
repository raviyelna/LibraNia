# LibraNia

LibraNia is a local-first AI knowledge workspace with notes, graph navigation, AI chat, collaborative Blackboard agents, custom agent tools, and MCP access for Codex and Claude Code.

![LibraNia feature index](docs/images/librania-product-map.png)

## Core Idea

LibraNia treats the local library as the source of truth. Agents and chat can research, but durable knowledge should be written back into notes, tagged, and linked with `[[Exact Note Title]]` wiki-links so future work can reuse it.

## Features

### Home Dashboard

- Workspace metrics for notes, links, tags, and research threads
- Recent notes and recent AI conversations
- Graph health widget
- Tag vocabulary widget
- Customizable dashboard widgets

### Library

- Markdown note editor
- Note list and quick navigation
- Note create, edit, soft-delete, restore, and trash view
- Tags on notes
- Tag management: create, rename, delete, assign, remove, browse notes by tag
- `[[wiki-links]]` with backlinks and related-note panels
- AI auto-link button that appends suggested links without deleting existing links
- Librarian Ask panel for note-scoped AI questions
- Content upload and attachment to notes
- Import readable documents as notes
- Export notes as Markdown or JSON

### Chat

- Conversation list, rename, and delete
- Message history per conversation
- Provider and model selection
- Streaming AI responses through Socket.IO
- Research mode with tools
- Conversation context support
- Citation-aware responses where available

### Graph

- 2D/3D force-directed knowledge graph
- Graph nodes from notes
- Graph links from wiki-links and related-note relationships
- Node search and highlight
- Neighbor highlighting
- Minimap
- Side panel navigation back into notes

### Blackboard

- Collaborative multi-agent sessions
- Task assignment into a visible agent room
- Session rename/delete
- Collapsible session/task context
- User can join the conversation
- `@agent` mentions can activate available agents
- Agent response details for debugging prompts, tool calls, and intermediate output
- Built-in agents: Librarian, Research Agent, Reviewer, Link Curator, Architecture Planner, Ideal Agent, Export Agent
- Agent Management: create/edit agents, system prompts, tool permissions, custom tool text, max response budget
- Tool Builder: static tools and HTTP tools
- Built-in tool reference shown in the Tool Builder
- Playground for testing built-in and custom tools
- Export Agent can summarize the whole Blackboard session to a library note, Markdown file, or both

### Settings

- Built-in provider configuration
- Delete stored API keys per provider
- Custom Provider section
- Multiple API keys
- Custom base URL
- Multiple custom headers
- App mode/server settings

### MCP Integration

The `mcp-server/` package exposes LibraNia to MCP clients over stdio.

Available MCP tools:

- `search_notes`
- `get_note`
- `create_note`
- `update_note`
- `add_tags`
- `list_tags`

Codex and Claude Code setup:

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

Research protocol lives in `AGENTS.md`, `CLAUDE.md`, and the MCP server instructions:

1. Search LibraNia first.
2. Read relevant notes.
3. Use web search only when the library is missing, shallow, outdated, or the task asks for current information.
4. Save useful durable web findings back to LibraNia before using them as final knowledge.
5. Add tags and wiki-links.

## Architecture

![LibraNia runtime architecture](docs/images/librania-runtime-architecture.png)

Main layers:

- React/Vite browser UI
- Express REST API
- Socket.IO streaming
- Blackboard service and tool executor
- AI provider adapters
- MCP stdio server
- SQLite database and Markdown note files
- Local content and export folders

See [workflow.md](workflow.md) for the full workflow and infrastructure diagrams.

## Install

Requirements:

- Node.js 18+
- npm 7+
- Native build tools for `better-sqlite3` and `sharp`

```bash
npm install
cd mcp-server
npm install
cd ..
npm run build:package
npm start
```

Windows shortcut:

```bash
start.bat
```

## Build

```bash
npm run build:frontend
npm run build:backend
npm run build:package
cd mcp-server
npm run build
```

## Local Data

Gitignored runtime data:

- `data/librania.db`
- `data/notes/`
- `data/blackboard-exports/`
- `content/`
- `.env`
- `data/.env`

## Project Layout

```text
backend/       Express routes, services, AI, Blackboard, tools
src/           React UI, routes, hooks, API clients, components
mcp-server/    Stdio MCP server for external agent clients
scripts/       startup, build, sync helpers
bin/           CLI launcher
docs/images/   documentation diagrams
data/          local runtime data, gitignored
content/       local uploaded/imported files, gitignored
```
