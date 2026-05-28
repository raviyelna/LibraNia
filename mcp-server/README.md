# LibraNia MCP Server

MCP server exposing LibraNia knowledge base to Claude Desktop, Codex, and other MCP clients.

## Features

**Tools:**
- `search_notes` - Search knowledge base
- `get_note` - Get full note content
- `create_note` - Create new note
- `update_note` - Update or append to note
- `add_tags` - Tag notes
- `list_tags` - List all tags

**Workflow:**
1. Check library (search_notes)
2. Not enough info → web_search (external)
3. Create note with findings
4. Return answer with sources

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

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

### Codex / Other Clients

Use stdio transport:

```bash
node dist/index.js
```

## Usage

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

## Database

Reads from: `%APPDATA%\Roaming\LibraNia\librania.db`

Notes stored: `%APPDATA%\Roaming\LibraNia\notes\`

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
Claude Desktop
    ↓ (MCP stdio)
LibraNia MCP Server
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

## License

MIT
