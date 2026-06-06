# LibraNia

LibraNia is a local-first AI knowledge workspace. It stores notes, files, links, agent sessions, and exports on your machine, then lets browser UI, Codex, Claude Code, and Blackboard agents work against the same library.

![LibraNia workflow and infrastructure](docs/images/librania-workflow.png)

## What It Does

- **Library**: Markdown notes, tags, backlinks, uploaded content, and full-text search.
- **Graph**: Visual navigation through `[[wiki-links]]` and note relationships.
- **Blackboard**: A collaborative agent workspace where agents can research, review, plan, link, and export session knowledge.
- **Tool Builder**: Custom HTTP/static tools for agents, with a Playground for manual tool checks.
- **MCP Server**: Exposes the local LibraNia library to Codex, Claude Code, Claude Desktop, and other MCP clients.
- **Research Write-Back**: Research agents must search the library first. If they use web research, useful durable findings should be saved back to LibraNia before being used as final knowledge.

## Quick Start

Requirements:

- Node.js 18+
- npm 7+
- Native build tools for `better-sqlite3` and `sharp`

Install and run:

```bash
npm install
npm run build:package
npm start
```

Windows shortcut:

```bash
start.bat
```

The app starts the local web server and opens the browser. If port `3001` is unavailable, the backend retries nearby ports.

## Data Model

LibraNia is local-first by default:

- `data/librania.db`: SQLite database
- `data/notes/`: Markdown note files with frontmatter
- `content/`: uploaded files and imported images
- `data/blackboard-exports/`: exported Blackboard session summaries
- `.env` / `data/.env`: local provider configuration and API keys

These paths are ignored by git so personal notes, uploaded files, and API keys do not get committed.

## Research Policy

The repository includes both `AGENTS.md` and `CLAUDE.md` so Codex and Claude Code follow the same library workflow:

1. Search LibraNia first.
2. Read relevant notes.
3. Use web search only when the library is missing, shallow, outdated, or the task asks for current information.
4. If web search produces useful durable knowledge, create or update a LibraNia note before using that knowledge in the final answer.
5. Add tags and `[[Exact Note Title]]` links so the graph stays connected.

## MCP Setup

Build and register the MCP server:

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

MCP tools:

- `search_notes`
- `get_note`
- `create_note`
- `update_note`
- `add_tags`
- `list_tags`

## Blackboard

The Blackboard tab is a collaborative agent workspace, not a simple chatbot.

- A session has a task, active agents, inactive agents, visible agent turns, and detailed response/tool traces.
- Agents are selected by task fit and can mention inactive agents to bring them into the room.
- Built-in agents include Librarian, Research Agent, Reviewer, Link Curator, Architecture Planner, Ideal Agent, and Export Agent.
- Export Agent can summarize a complete Blackboard session to a library note, Markdown file, or both.

## Architecture

See [workflow.md](workflow.md) for the system workflow, infrastructure layout, MCP behavior, Blackboard behavior, and data flow.

## Build Commands

```bash
npm run build:frontend
npm run build:backend
npm run build:package
npm start
```

## Project Layout

```text
backend/       Express API, services, tools, Blackboard engine
src/           React UI, routes, API clients, components
mcp-server/    Stdio MCP server for Codex and Claude clients
scripts/       startup and build helper scripts
bin/           CLI entry point
docs/images/   documentation image assets
data/          local database and generated library data, gitignored
content/       uploaded/imported content, gitignored
```

## Notes

- API keys and personal data are intentionally local.
- MCP is registered as a stdio server; clients start it when needed.
- The app can use external AI providers, but the knowledge base remains local unless you explicitly export or sync it.
