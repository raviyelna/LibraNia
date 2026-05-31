# LibraNia MCP Server

MCP server exposing LibraNia knowledge base to Claude Desktop, Claude Code CLI, Codex, and other MCP clients.

## Features

**Tools:**
- `search_notes` - Search knowledge base
- `get_note` - Get full note content
- `create_note` - Create new note
- `update_note` - Update or append to note
- `add_tags` - Tag notes
- `list_tags` - List all tags

**Agent Integration:**
- MCP server provides instructions to Agent subagents
- Agents auto-search LibraNia before web search
- Save findings back to knowledge base
- Build knowledge over time

**Workflow:**
1. Agent searches LibraNia first
2. If insufficient → web search
3. Create note with findings + [[backlinks]]
4. Return answer with sources

## Installation

### Claude Desktop

```bash
cd mcp-server
npm install
npm run build
npm run setup
```

### Claude Code CLI

**Project-specific (recommended):**
```bash
cd mcp-server
npm install
npm run build
npm run setup-cli
```

**Global (all projects):**
```bash
cd mcp-server
npm install
npm run build
npm run setup-cli -- --global
```

**Difference:**
- **Project**: Registers locally for this LibraNia repository
- **Global**: Registers at Claude Code user scope for all projects

### Codex / Other MCP Clients

```bash
cd mcp-server
npm install
npm run build
npm run setup-codex
```

**Auto-setup scripts:**
- `npm run setup` - Claude Desktop
- `npm run setup-cli` - Claude Code CLI
- `npm run setup-codex` - Codex CLI

The setup scripts:
1. Build MCP server
2. Register the stdio server for the selected client
3. Pass `LIBRANIA_DATA_DIR` so every client uses the same database
4. Show next steps

Claude Code and Codex each launch their own stdio MCP process when they connect.
The MCP server implementation is shared; only the client registration command differs.

For manual Codex setup, register the stdio server and its data directory:

```bash
codex mcp add librania \
  --env LIBRANIA_DATA_DIR=D:\sourcecode\vibe\LibraNia_v2\LibraNia\data \
  -- node D:\sourcecode\vibe\LibraNia_v2\LibraNia\mcp-server\dist\index.js
```

Verify the registration with:

```bash
codex mcp get librania
```

For manual Claude Code CLI setup:

```bash
claude mcp add -e LIBRANIA_DATA_DIR=D:\sourcecode\vibe\LibraNia_v2\LibraNia\data \
  librania -- node D:\sourcecode\vibe\LibraNia_v2\LibraNia\mcp-server\dist\index.js
```

Verify the Claude Code registration with:

```bash
claude mcp get librania
```

**Manual setup** (if needed):

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "librania": {
      "command": "node",
      "args": [
        "D:\\sourcecode\\vibe\\LibraNia_v2\\LibraNia\\mcp-server\\dist\\index.js"
      ],
      "env": {
        "LIBRANIA_DATA_DIR": "D:\\sourcecode\\vibe\\LibraNia_v2\\LibraNia\\data"
      }
    }
  }
}
```

## Usage

### Direct Tool Calls

**In Claude Desktop:**

```
Search my LibraNia notes about Docker security
```

Claude will:
1. Call `search_notes` with query "Docker security"
2. If insufficient → suggest web search
3. Call `create_note` to save findings
4. Answer with sources from library

**Create/Update:**

```
Add this to my notes: [content]
```

```
Update note abc123 with new information about [topic]
```

### Agent Research (Automatic)

**In Claude Code CLI with librania-research skill:**

```
What are Docker security best practices?
```

Agent automatically:
1. Searches LibraNia for "Docker security"
2. Finds partial info
3. Searches web for gaps
4. Creates note with findings + [[backlinks]]
5. Returns consolidated answer

**Trigger phrases:**
- "What is X?"
- "Research Y"
- "Find info about Z"
- "Look up A"
- "Explain B"

## Database

Reads from: `LIBRANIA_DB_PATH`, then `LIBRANIA_DATA_DIR\librania.db`, then `.\data\librania.db`

Notes stored beside the selected database in: `notes\`

## Development

```bash
npm run dev    # Watch mode
npm run build  # Production build
npm start      # Run server
```

## Testing

```bash
# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Architecture

```
Claude Desktop / Claude Code CLI / Codex
    ↓ (MCP stdio)
LibraNia MCP Server
    ↓ (provides instructions to Agent subagents)
Agent (research)
    ↓ (uses MCP tools)
    1. search_notes (LibraNia)
    2. WebSearch (if needed)
    3. create_note (save findings)
    ↓ (SQLite)
librania.db
    ↓ (filesystem)
notes/*.md
```

## Tools Reference

### search_notes
```json
{
  "query": "docker security",
  "limit": 10
}
```

Returns: `{ count, results: [{ id, title, snippet, tags }] }`

### get_note
```json
{
  "noteId": "abc123"
}
```

Returns: `{ id, title, body, tags, created_at, updated_at }`

### create_note
```json
{
  "title": "Docker Security Best Practices",
  "body": "# Docker Security\n\n...",
  "tags": ["docker", "security", "devops"]
}
```

Returns: `{ success, noteId, title }`

### update_note
```json
{
  "noteId": "abc123",
  "appendBody": "\n\n## New Section\n..."
}
```

Returns: `{ success, noteId, title }`

### add_tags
```json
{
  "noteId": "abc123",
  "tags": ["kubernetes", "containers"]
}
```

Returns: `{ success, noteId, tags }`

### list_tags
```json
{}
```

Returns: `{ tags: [{ id, name, count }] }`

## MCP Instructions

Agent subagents receive these instructions automatically:

1. **Search LibraNia first** - check existing knowledge before web
2. **Evaluate sufficiency** - use LibraNia as primary source if sufficient
3. **Web search fallback** - only search web for gaps
4. **Save findings** - create notes with sources, tags, [[backlinks]]
5. **Return consolidated answer** - cite both LibraNia and web sources

This ensures knowledge accumulates in LibraNia over time.

## License

MIT
