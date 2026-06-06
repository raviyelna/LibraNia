# LibraNia Comprehensive Guide

LibraNia is a local-first AI knowledge system built around three ideas:

1. The library is the source of truth.
2. Agents collaborate through a visible Blackboard workspace.
3. External research should be written back into the library before it becomes durable knowledge.

![LibraNia workflow and infrastructure](docs/images/librania-workflow.png)

## Product Surfaces

### Library

The Library is where persistent knowledge lives.

- Markdown notes with frontmatter
- Tags
- `[[Note Title]]` wiki-links
- Backlinks and graph neighborhoods
- Uploaded content and imported images
- Full-text search

### Graph

The Graph renders note relationships so the user can inspect neighborhoods instead of reading notes in isolation.

Connections come from:

- Explicit wiki-links
- Backlinks generated from note content
- Semantic or agent-suggested relationships where supported by the app

### Blackboard

Blackboard is the multi-agent workspace.

A Blackboard session contains:

- A user-assigned task
- Active agents
- Inactive agents that can be activated by `@mention`
- Agent messages shown like a collaborative room
- Agent response details for debugging prompts, tools, and intermediate reasoning
- Shared artifacts such as relevant note lists, reviews, ideas, plans, and exports

The goal is team collaboration. Agents should build on each other rather than dumping isolated transcripts.

### Agent Management

Agent Management lets the user define the agent team:

- Name
- Description
- System prompt
- Tool access
- Response budget
- Enabled/disabled state

Agents should be selected by task fit. For example, Architecture Planner should focus on architecture, workflows, implementation plans, diagrams, and risks. Research Agent should focus on library-first research and note creation. Export Agent should summarize and export the whole session.

### Tool Builder and Playground

Tool Builder lets the user create custom tools for agents.

Supported tool styles include:

- Built-in LibraNia tools
- HTTP tools
- Static/template tools

The Playground is used to test both built-in tools and custom tools before assigning them to agents.

## Research Protocol

LibraNia is designed to accumulate knowledge instead of treating research as throwaway chat.

Required flow:

1. Search local notes first.
2. Read relevant notes.
3. Decide whether the local library is enough.
4. If needed, search the web or external sources.
5. Save useful durable findings back into LibraNia.
6. Add tags.
7. Link related notes using `[[Exact Note Title]]`.
8. Answer the user with references to notes used, created, or updated.

This policy is encoded in:

- `AGENTS.md` for Codex
- `CLAUDE.md` for Claude Code
- `mcp-server/src/index.ts` MCP server instructions and tool descriptions

## MCP Integration

The MCP server exposes the local library to agent clients over stdio.

Available tools:

| Tool | Purpose |
| --- | --- |
| `search_notes` | Search note titles and bodies |
| `get_note` | Read a full note |
| `create_note` | Create a Markdown note |
| `update_note` | Replace or append note content |
| `add_tags` | Add tags to a note |
| `list_tags` | List tags with counts |

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

Runtime behavior:

- Codex and Claude Code launch the MCP process when needed.
- `LIBRANIA_DATA_DIR` points the MCP server at the local `data/` directory.
- The MCP server reads and writes `data/librania.db` and `data/notes/`.

## Infrastructure

LibraNia has four main layers.

### 1. Browser UI

Implemented in `src/` with React and Vite.

Main routes include:

- Home
- Library
- Graph
- Blackboard
- Settings

The UI calls the backend through REST APIs and receives streaming updates through Socket.IO.

### 2. Backend Runtime

Implemented in `backend/`.

Responsibilities:

- Express HTTP API
- Socket.IO streaming
- Note CRUD
- Content import
- Graph/link parsing
- Search
- AI provider calls
- Blackboard session orchestration
- Built-in and custom tool execution
- Export generation

### 3. MCP Server

Implemented in `mcp-server/`.

Responsibilities:

- Provide external agent clients with controlled access to the local library
- Enforce the research-first instructions through server instructions and tool descriptions
- Read/write the same SQLite database as the app

### 4. Local Storage

Default storage:

```text
data/librania.db
data/notes/
data/blackboard-exports/
content/
```

These directories are gitignored because they contain personal library data.

## Blackboard Workflow

1. User creates or opens a Blackboard session.
2. User assigns a task.
3. The Blackboard service builds a compact observation:
   - task
   - active agents
   - inactive agents available by mention
   - relevant note titles
   - current shared state
4. Agents respond in the session room.
5. Agents may call tools.
6. Agents may mention another agent when that role is needed.
7. The session accumulates visible outputs and hidden debug details.
8. Export Agent can summarize the whole session to a library note, Markdown file, or both.

## Export Workflow

Export Agent should not copy only the last message. It should summarize the whole session:

- Original task
- User clarifications
- Relevant notes
- Agent contributions
- Decisions
- Plans
- Open questions
- Links and sources

Export targets:

- Library note
- Markdown file
- Both

## Startup

Install:

```bash
npm install
cd mcp-server
npm install
cd ..
```

Build:

```bash
npm run build:package
cd mcp-server
npm run build
cd ..
```

Start:

```bash
npm start
```

Windows:

```bash
start.bat
```

## Configuration

Common environment variables:

```env
PORT=3001
HOST=localhost
LIBRANIA_DATA_DIR=./data
LIBRANIA_DB_PATH=./data/librania.db
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
```

Provider keys can also be managed from the Settings UI.

## Build Verification

This repository no longer includes the old tracked test suite. Use build verification for this trimmed repo:

```bash
npm run build:package
cd mcp-server
npm run build
```

## Security and Privacy

- Library data is local by default.
- API keys are gitignored.
- Uploaded content is gitignored.
- MCP uses stdio and local filesystem/database access.
- External AI providers only receive the content included in prompts or tool calls.

## Troubleshooting

### MCP Not Connected

Run:

```bash
cd mcp-server
npm run build
npm run setup-codex
npm run setup-cli
codex mcp get librania
claude mcp get librania
```

### Database Not Found

Make sure the app has been started once and that `data/librania.db` exists.

### Port Already Used

Set another port:

```bash
set PORT=3002
npm start
```

### Native Module Build Issues

Rebuild native modules:

```bash
npm rebuild better-sqlite3 sharp
```

On Windows, install Visual Studio Build Tools if native rebuilds fail.
