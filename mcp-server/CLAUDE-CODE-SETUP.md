# LibraNia MCP Server - Claude Code CLI Setup

Auto-configure LibraNia MCP for Claude Code CLI.

## Usage

```bash
cd mcp-server
npm install
npm run setup-cli
```

## What It Does

1. Builds MCP server
2. Adds the LibraNia MCP server to Claude Code
3. Passes `LIBRANIA_DATA_DIR` so Claude Code uses the local LibraNia database
4. Launches through `bin/librania-mcp.cjs`, which checks and repairs native MCP dependencies for the current OS before starting `dist/index.js`
5. Uses this repository's `CLAUDE.md` research protocol:
   - search LibraNia first
   - use web only when needed
   - write useful web findings back to LibraNia before answering

## Manual Setup

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "librania": {
      "command": "node",
      "args": [
        "D:\\sourcecode\\vibe\\LibraNia_v2\\LibraNia\\mcp-server\\bin\\librania-mcp.cjs"
      ]
    }
  }
}
```

## Test

```bash
claude
```

Then:
```
Search my LibraNia notes about Docker
```

Claude Code will:
1. Call `search_notes` tool
2. Call `get_note` for relevant matches
3. If insufficient, use web search
4. Create or update a note with useful web findings before answering
5. Return results from the knowledge base and saved sources

## Tools Available

- `search_notes` - search library
- `get_note` - full content
- `create_note` - save findings
- `update_note` - append info
- `add_tags` - categorize
- `list_tags` - browse tags

## Workflow

```
You: "What's in my notes about Kubernetes?"
  ↓
Claude Code: search_notes("Kubernetes")
  ↓
Found → Answer with sources
Not found → "No notes found. Want me to search web?"
  ↓
You: "Yes"
  ↓
Claude Code: web_search + create_note
  ↓
Answer with new note
```
