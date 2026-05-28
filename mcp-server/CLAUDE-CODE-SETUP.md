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
2. Finds Claude Code config at `~/.claude/settings.json`
3. Adds LibraNia MCP server
4. Restarts Claude Code (if running)

## Manual Setup

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "librania": {
      "command": "node",
      "args": [
        "D:\\sourcecode\\vibe\\LibraNia_v2\\LibraNia\\mcp-server\\dist\\index.js"
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
2. Return results from knowledge base
3. If insufficient → suggest web search
4. Create note with findings

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
