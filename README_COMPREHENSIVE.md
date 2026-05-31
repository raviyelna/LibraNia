# LibraNia

**Library of Neuron Interface Atlas**

AI-powered personal knowledge management system that visualizes information as an interconnected neural network. Research topics with AI agents (Claude, GPT, DeepSeek), store verified answers with rich context, and explore knowledge as an interactive 3D graph.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

## 🎯 What is LibraNia?

LibraNia transforms how you manage knowledge by combining:

- **AI Research Agents** - Multi-provider AI (Claude, GPT, DeepSeek) with web search and tool use
- **Knowledge Graph** - 3D neural network visualization of interconnected notes
- **Smart Linking** - Automatic bidirectional backlinks using `[[Note Title]]` syntax
- **Semantic Search** - Vector embeddings for finding related content
- **Local-First** - All data stored on your machine (SQLite + filesystem)
- **MCP Integration** - Expose your knowledge base to Claude Desktop and other MCP clients

---

## ✨ Core Features

### 📚 Knowledge Library

- **Rich Markdown Editor** with live preview and syntax highlighting
- **Smart Linking** - `[[Note Title]]` creates bidirectional backlinks automatically
- **Tag Organization** - Categorize and filter notes with tags
- **Content Management** - Upload images, PDFs, DOCX with text extraction
- **Full-Text Search** - Fast fuzzy search across all notes
- **Semantic Search** - Vector-based similarity search using local embeddings
- **Version History** - Track note changes over time
- **Export** - Export notes as Markdown, JSON, or HTML

### 💬 AI Chat Interface

- **Multi-Provider Support**
  - **Claude** (Anthropic) - Opus, Sonnet, Haiku
  - **GPT** (OpenAI) - GPT-4, GPT-3.5
  - **DeepSeek** - DeepSeek-V3, DeepSeek-Chat
- **Research Mode** - AI agents with web search and knowledge base tools
- **Conversation Management** - Create, rename, organize multiple chats
- **Streaming Responses** - Real-time AI responses via WebSocket
- **Context-Aware** - AI references your knowledge library for better answers
- **Auto-Generated Titles** - Conversations auto-title based on content
- **Citation Tracking** - Track sources for AI-generated content

### 🕸️ 3D Knowledge Graph

- **Interactive Visualization** - Explore knowledge as a 3D neural network
- **Force-Directed Layout** - Physics-based graph with customizable forces
- **Node Highlighting** - Click nodes to highlight neighbors and connections
- **Search Integration** - Search and highlight nodes in the graph
- **Minimap Navigation** - 2D overview for quick navigation
- **Color-Coded Tags** - Nodes colored by primary tag
- **Performance Optimized** - Instanced rendering for large graphs

### 🔍 AI Research Workflow

1. **Ask Question** - Query AI in research mode
2. **Search Library** - AI checks existing knowledge base first
3. **Web Search** - If needed, AI searches web for additional info
4. **Create Notes** - AI saves findings with proper citations
5. **Link Knowledge** - Auto-links to related notes using `[[Title]]`
6. **Return Answer** - Consolidated response with sources

### 🔌 MCP Server Integration

Expose LibraNia to Claude Desktop, Codex, and other MCP clients:

- **search_notes** - Search knowledge base
- **get_note** - Retrieve full note content
- **create_note** - Save new knowledge with auto-linking
- **update_note** - Modify existing notes
- **add_tags** - Tag management
- **list_tags** - Browse all tags

### 🎨 Modern UI/UX

- **Dark/Light Theme** - Toggle between themes
- **Responsive Design** - Works on desktop, tablet, mobile
- **Collapsible Sidebar** - Maximize workspace
- **Keyboard Shortcuts** - Quick navigation (Cmd/Ctrl+K)
- **Offline Indicator** - Visual feedback for connectivity
- **Toast Notifications** - Non-intrusive feedback
- **Error Boundaries** - Graceful error handling

### 🔒 Privacy & Security

- **Local Storage** - All data on your machine (SQLite + filesystem)
- **No Cloud Lock-in** - Your data stays with you
- **Offline Capable** - Core features work without internet
- **Encrypted API Keys** - Provider keys stored securely
- **No Telemetry** - Zero tracking or analytics

---

## 🛠️ Technology Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js 18+** | JavaScript runtime |
| **Express 5** | HTTP server |
| **Socket.IO 4** | WebSocket server for streaming |
| **SQLite** | Local database |
| **better-sqlite3** | Fast synchronous SQLite bindings |
| **sqlite-vec** | Vector search extension |
| **Drizzle ORM** | Type-safe database queries |
| **TypeScript 5.7** | Type safety |

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework with concurrent rendering |
| **TypeScript 5.7** | Type-safe development |
| **Vite 6** | Fast build tool and dev server |
| **Tailwind CSS 4** | Utility-first CSS |
| **Three.js** | 3D graphics for graph |
| **react-force-graph-3d** | 3D force-directed graph |
| **TanStack Query** | Async state management |
| **Zustand** | Lightweight state management |
| **React Router 7** | Client-side routing |

### AI Integration

| Technology | Purpose |
|------------|---------|
| **@anthropic-ai/sdk** | Claude API client |
| **openai** | OpenAI/DeepSeek API client |
| **@xenova/transformers** | Local embeddings (all-MiniLM-L6-v2) |
| **duck-duck-scrape** | Web search for research mode |

### MCP Server

| Technology | Purpose |
|------------|---------|
| **@modelcontextprotocol/sdk** | MCP protocol implementation |
| **better-sqlite3** | Direct database access |

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 7+
- **Build Tools** (for native modules):
  - **Windows**: Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: build-essential (`sudo apt install build-essential`)

### Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/LibraNia.git
cd LibraNia

# Install dependencies
npm install

# Build application
npm run build

# Start server
npm start
```

Web interface available at `http://localhost:3001`

### Alternative: Unified Start Scripts

LibraNia provides platform-specific scripts that build and launch both the main server and MCP server together:

**Windows:**
```bash
start.bat
```

**macOS/Linux:**
```bash
./start.sh
```

These scripts:
1. Build frontend and backend (`npm run build:package`)
2. Fix ESM imports for Node.js compatibility
3. Build MCP server
4. Launch both servers concurrently
5. Handle graceful shutdown on Ctrl+C

**What runs:**
- **Main Server** (port 3001): Web UI + REST API + WebSocket
- **MCP Server** (stdio): Exposes knowledge base to Claude Desktop

### Development Mode

```bash
# Terminal 1: Backend dev server (hot reload)
npm run dev:backend

# Terminal 2: Frontend dev server
npm run dev:frontend
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:3001`

### CLI Installation (Global)

```bash
# Install globally
npm install -g .

# Start server
librania start --port 3000 --data-dir ./data

# Options
librania start --help
```

---

## 📖 Usage Guide

### 1. Initial Setup

#### Configure AI Providers

1. Navigate to **Settings** in sidebar
2. Add API keys:
   - **Claude**: [Anthropic Console](https://console.anthropic.com/)
   - **OpenAI**: [OpenAI Platform](https://platform.openai.com/)
   - **DeepSeek**: [DeepSeek Platform](https://platform.deepseek.com/)
3. Select default provider and model

#### Data Storage

Default locations:
- **Database**: `./data/librania.db`
- **Notes**: `./data/notes/`
- **Content**: `./content/`

Configure via environment variables:
```bash
LIBRANIA_DATA_DIR=./data
LIBRANIA_DB_PATH=./data/librania.db
```

### 2. Creating Notes

#### Manual Creation

1. Go to **Library** in sidebar
2. Click **New Note** or press `Cmd/Ctrl+N`
3. Write in Markdown with live preview
4. Link to other notes: `[[Note Title]]`
5. Add tags for organization
6. Save automatically on edit

#### AI-Generated Notes

1. Go to **Chat** → Enable **Research Mode**
2. Ask AI to research a topic
3. AI searches library → web → creates note
4. Note auto-links to related content

#### Markdown Features

```markdown
# Headers
**Bold** and *italic*
- Lists
- [ ] Task lists
[Links](https://example.com)
![Images](./image.png)
`code` and ```code blocks```
> Blockquotes
| Tables | Support |
```

#### Smart Linking

```markdown
See [[Docker Basics]] for introduction.
Related: [[Container Security]] and [[Kubernetes]].
```

Creates bidirectional backlinks automatically.

### 3. Using AI Chat

#### Basic Chat

1. Go to **Chat** in sidebar
2. Click **New Conversation**
3. Select provider (Claude, GPT, DeepSeek)
4. Start chatting

#### Research Mode

1. Enable **Research Mode** toggle
2. AI gets access to tools:
   - `search_notes` - Search your library
   - `create_note` - Save findings
   - `update_note` - Update existing notes
   - `add_tags` - Tag management
   - `web_search` - Search the web
3. Ask research questions
4. AI automatically:
   - Checks library first
   - Searches web if needed
   - Creates notes with citations
   - Links to related content

#### Example Research Workflow

```
User: "What are Docker security best practices?"

AI:
1. Searches library → finds 2 related notes
2. Searches web for additional info
3. Creates new note "Docker Security Best Practices"
4. Links to [[Docker Basics]] and [[Container Security]]
5. Returns answer with sources
```

### 4. Exploring the Knowledge Graph

#### Navigation

- **Rotate**: Left-click + drag
- **Zoom**: Scroll wheel
- **Pan**: Right-click + drag
- **Select Node**: Click node
- **Deselect**: Click empty space

#### Features

- **Node Colors** - Colored by primary tag
- **Neighbor Highlighting** - Click node to highlight connections
- **Search** - Find and highlight nodes
- **Minimap** - 2D overview for navigation
- **Side Panel** - View note details

#### Graph Controls

- **Search Box** - Find nodes by title
- **Reset Camera** - Return to default view
- **Toggle Minimap** - Show/hide 2D overview
- **Refresh Graph** - Reload data

### 5. Content Management

#### Upload Files

1. Go to **Library** → **Content** tab
2. Click **Upload** or drag-and-drop
3. Supported formats:
   - **Images**: PNG, JPG, GIF, WebP
   - **Documents**: PDF, DOCX, TXT, MD
4. Text auto-extracted from documents
5. Attach to notes or messages

#### Content Features

- **Thumbnails** - Auto-generated for images
- **Text Extraction** - OCR for PDFs, DOCX
- **Tag Management** - Organize with tags
- **Search** - Full-text search in extracted text
- **Linking** - Reference in notes with `![](content/file.png)`

### 6. Search & Discovery

#### Full-Text Search

```
Search: "docker security"
→ Matches in title and body
→ Fuzzy matching enabled
```

#### Semantic Search

```
Search: "container isolation"
→ Vector similarity search
→ Finds related concepts even without exact match
```

#### Tag Filtering

```
Filter by: #docker, #security
→ Shows only notes with those tags
```

### 7. Export & Backup

#### Export Notes

1. Go to **Library** → **Export**
2. Select format:
   - **Markdown** - `.md` files with frontmatter
   - **JSON** - Structured data
   - **HTML** - Rendered HTML
3. Choose notes to export
4. Download as ZIP

#### Backup Database

```bash
# Copy database file
cp ./data/librania.db ./backup/librania-$(date +%Y%m%d).db

# Copy notes directory
cp -r ./data/notes ./backup/notes-$(date +%Y%m%d)
```

### 8. MCP Server Setup

#### Configure Claude Desktop

1. Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
2. Add LibraNia MCP server:

```json
{
  "mcpServers": {
    "librania": {
      "command": "node",
      "args": ["/path/to/LibraNia/mcp-server/dist/index.js"],
      "env": {
        "LIBRANIA_DB_PATH": "/path/to/LibraNia/data/librania.db"
      }
    }
  }
}
```

3. Restart Claude Desktop
4. LibraNia tools now available in Claude

#### MCP Tools Available

- `search_notes(query, limit)` - Search knowledge base
- `get_note(noteId)` - Get full note content
- `create_note(title, body, tags)` - Create new note
- `update_note(noteId, title, body, appendBody)` - Update note
- `add_tags(noteId, tags)` - Add tags to note
- `list_tags()` - List all tags

#### Example MCP Usage in Claude

```
User: "Search my notes about Docker"
Claude: [Uses search_notes tool]
→ Found 5 notes about Docker

User: "Create a note summarizing Docker networking"
Claude: [Uses create_note tool]
→ Created note "Docker Networking Overview"
→ Linked to [[Docker Basics]]
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` in project root:

```env
# Server
PORT=3001
HOST=localhost

# Data Storage
LIBRANIA_DATA_DIR=./data
LIBRANIA_DB_PATH=./data/librania.db

# AI Providers (stored in data/.env for security)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...

# CORS
CORS_ORIGIN=*
```

### Provider Configuration

Stored in `data/.env`:

```env
# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# DeepSeek
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

### Database Schema

```sql
-- Core tables
notes              -- Knowledge notes
tags               -- Unique tags
note_tags          -- Note-tag relationships
links              -- Bidirectional note links
embeddings         -- Vector embeddings for semantic search

-- AI chat
conversations      -- Chat conversations
messages           -- Chat messages
citations          -- Source citations

-- Content
content            -- Uploaded files
content_tags       -- Content-tag relationships

-- History
note_versions      -- Note edit history
```

---

## 🏛️ Architecture

LibraNia follows a **local-first, client-server architecture** with real-time streaming and vector search capabilities.

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Web Browser (React 19)  │  Claude Desktop (MCP Client)     │
└────────────┬──────────────┴──────────────┬──────────────────┘
             │                              │
             │ HTTP/WebSocket               │ stdio (MCP)
             │                              │
┌────────────▼──────────────┐  ┌───────────▼──────────────────┐
│   Main Server (Express)   │  │   MCP Server (stdio)         │
│   - REST API              │  │   - search_notes             │
│   - WebSocket (Socket.IO) │  │   - create_note              │
│   - Static file serving   │  │   - update_note              │
└────────────┬──────────────┘  └───────────┬──────────────────┘
             │                              │
             │                              │
┌────────────▼──────────────────────────────▼──────────────────┐
│                    Service Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ AI Service   │  │ Graph Service│  │ Search Service│       │
│  │ - Claude     │  │ - Wiki-links │  │ - Full-text   │       │
│  │ - GPT        │  │ - Force graph│  │ - Semantic    │       │
│  │ - DeepSeek   │  │ - 3D layout  │  │ - Vector      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Notes Service│  │ Embeddings   │  │ Links Service│       │
│  │ - CRUD       │  │ - MiniLM-L6  │  │ - Backlinks  │       │
│  │ - Versions   │  │ - 384-dim    │  │ - Resolution │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│                    Data Layer                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  SQLite Database (better-sqlite3)                        │ │
│  │  - notes, tags, links, embeddings                        │ │
│  │  - conversations, messages, citations                    │ │
│  │  - content, note_versions                                │ │
│  │  - sqlite-vec extension for vector search                │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Filesystem                                               │ │
│  │  - data/notes/*.md (Markdown with frontmatter)           │ │
│  │  - content/* (uploaded images, PDFs, DOCX)               │ │
│  │  - data/models/* (cached transformer models)             │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Frontend (React 19 + Vite)

**Technology:**
- React 19 with concurrent rendering
- TypeScript for type safety
- Vite 6 for fast HMR and builds
- Tailwind CSS 4 for styling
- Three.js + react-force-graph-3d for 3D visualization

**Key Features:**
- **Concurrent Rendering**: React 19's automatic batching and transitions
- **Optimistic Updates**: TanStack Query for cache management
- **Real-time Streaming**: Socket.IO client for AI responses
- **3D Graph**: WebGL-based force-directed layout with instanced rendering
- **Offline Support**: Service worker + local state persistence

**Component Architecture:**
```
src/
├── routes/          # Page-level components (Library, Chat, Graph)
├── components/      # Reusable UI components
│   ├── Chat/        # AI chat interface with streaming
│   ├── Graph/       # 3D graph visualization
│   ├── Notes/       # Note editor with Markdown preview
│   └── ui/          # Base UI primitives (Button, Dialog)
├── hooks/           # Custom React hooks (useNotes, useGraph)
├── api/             # API client functions
└── contexts/        # React contexts (Theme, Socket)
```

#### 2. Backend (Node.js + Express)

**Technology:**
- Express 5 for HTTP server
- Socket.IO 4 for WebSocket streaming
- better-sqlite3 for synchronous SQLite access
- Drizzle ORM for type-safe queries

**API Architecture:**
```
backend/
├── api/
│   ├── routes.ts           # Main router
│   ├── notes.routes.ts     # CRUD for notes
│   ├── ai.routes.ts        # AI chat endpoints
│   ├── graph.routes.ts     # Graph data
│   ├── search.routes.ts    # Full-text + semantic search
│   └── content.routes.ts   # File uploads
├── services/
│   ├── ai/
│   │   ├── ai-chat.service.ts      # Multi-provider chat
│   │   ├── providers/              # Claude, GPT, DeepSeek
│   │   └── websearch.service.ts    # DuckDuckGo integration
│   ├── graph.service.ts            # Wiki-link parsing
│   ├── embeddings.service.ts       # Vector generation
│   ├── search.service.ts           # Hybrid search
│   └── links.service.ts            # Backlink resolution
├── websocket/
│   └── socket.handlers.ts          # WebSocket events
└── database/
    ├── connection.ts               # SQLite setup
    ├── schema.ts                   # Drizzle schema
    └── vec.ts                      # sqlite-vec extension
```

**Request Flow:**
1. **HTTP Request** → Express middleware → Route handler → Service layer → Database
2. **WebSocket** → Socket.IO event → Service layer → Stream response chunks
3. **MCP Request** → stdio transport → Direct database access → JSON response

#### 3. AI Integration Layer

**Multi-Provider Architecture:**

```typescript
// Provider abstraction
interface AIProvider {
  id: string;
  name: string;
  models: string[];
  chat(messages: Message[], options: ChatOptions): AsyncGenerator<string>;
}

// Implementations
- ClaudeProvider    → @anthropic-ai/sdk
- OpenAIProvider    → openai SDK (GPT + DeepSeek)
- DeepSeekProvider  → openai SDK with custom base URL
```

**Research Mode (Tool Use):**

```
User Query
    ↓
AI Agent (Claude/GPT/DeepSeek)
    ↓
Tool Selection:
    ├─ search_notes(query)      → Search knowledge base
    ├─ create_note(title, body) → Save findings
    ├─ update_note(id, body)    → Append to existing
    ├─ add_tags(id, tags)       → Tag management
    └─ web_search(query)        → DuckDuckGo search
    ↓
Tool Execution (max 10 iterations, max 3 web searches)
    ↓
Final Answer with Citations
```

**Streaming Architecture:**
```
AI Provider API
    ↓ (SSE/streaming)
Backend Service
    ↓ (chunk processing)
Socket.IO Server
    ↓ (WebSocket)
React Client
    ↓ (state updates)
UI Render
```

#### 4. Knowledge Graph Engine

**Graph Construction:**

```typescript
// 1. Parse wiki-links from note bodies
const wikiLinks = extractWikiLinks(note.body); // [[Note Title]]

// 2. Resolve titles to note IDs
const targetId = titleToId.get(linkTitle.toLowerCase());

// 3. Create bidirectional edges
graphLinks.push({
  source: note.id,
  target: targetId,
  type: 'manual' // or 'semantic' for auto-discovered
});

// 4. Build force-directed layout
d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(-40))
  .force('link', d3.forceLink(links).distance(40))
  .force('center', d3.forceCenter().strength(0.8))
  .force('collision', d3.forceCollide(10));
```

**3D Visualization:**
- **Renderer**: Three.js WebGL
- **Layout**: d3-force-3d physics simulation
- **Optimization**: Instanced geometry (shared mesh for all nodes)
- **Interaction**: Raycasting for node selection, orbit controls

#### 5. Search Architecture

**Hybrid Search Strategy:**

```
Query Input
    ↓
┌───────────────┬───────────────┐
│  Full-Text    │   Semantic    │
│  (SQLite FTS) │   (Vector)    │
└───────┬───────┴───────┬───────┘
        │               │
        │  Merge by     │
        │  relevance    │
        ↓               ↓
    Combined Results
```

**Full-Text Search:**
- SQLite `LIKE` queries on title + body
- Fuzzy matching with lowercase normalization
- Fast for exact keyword matches

**Semantic Search:**
- Generate query embedding (384-dim)
- Cosine similarity via sqlite-vec
- Finds conceptually related notes
- Example: "container isolation" → matches "Docker security"

**Vector Pipeline:**
```
Text Input
    ↓
all-MiniLM-L6-v2 (Xenova/transformers)
    ↓
384-dimensional Float32Array
    ↓
L2 Normalization
    ↓
SQLite BLOB storage
    ↓
sqlite-vec cosine similarity
```

#### 6. MCP Server

**Protocol:**
- **Transport**: stdio (stdin/stdout)
- **Format**: JSON-RPC 2.0
- **SDK**: @modelcontextprotocol/sdk

**Architecture:**
```
Claude Desktop
    ↓ (stdio)
MCP Server (Node.js)
    ↓ (better-sqlite3)
SQLite Database (direct access)
    ↓
Notes + Tags + Links
```

**Tool Execution:**
```typescript
// 1. Claude Desktop sends tool request
{
  "method": "tools/call",
  "params": {
    "name": "search_notes",
    "arguments": { "query": "Docker" }
  }
}

// 2. MCP server executes
const results = db.prepare(`
  SELECT * FROM notes 
  WHERE title LIKE ? OR body LIKE ?
`).all(`%${query}%`, `%${query}%`);

// 3. Return results
{
  "content": [{
    "type": "text",
    "text": JSON.stringify(results)
  }]
}
```

#### 7. Data Persistence

**Dual Storage Strategy:**

**SQLite (Structured Data):**
- Notes metadata (id, title, timestamps)
- Relationships (tags, links, embeddings)
- Conversations and messages
- Content metadata
- Fast queries with indexes

**Filesystem (Content):**
- `data/notes/*.md` - Markdown files with YAML frontmatter
- `content/*` - Uploaded images, PDFs, DOCX
- `data/models/*` - Cached transformer models
- Human-readable, git-friendly

**Sync Strategy:**
```
Write Operation:
1. Update SQLite (source of truth)
2. Write Markdown file (backup + portability)
3. Generate embedding (async)
4. Update graph links (async)

Read Operation:
1. Query SQLite (fast)
2. Fallback to filesystem if DB missing
```

#### 8. Real-time Communication

**WebSocket Events:**

```typescript
// Client → Server
socket.emit('ai:chat', {
  conversationId: string,
  messages: Message[],
  providerId: string,
  researchMode: boolean
});

// Server → Client (streaming)
socket.emit('ai:token', { token: string });
socket.emit('ai:tool', { tool: string, args: any });
socket.emit('ai:complete', { messageId: string });
socket.emit('ai:error', { error: string });
```

**Streaming Flow:**
```
1. User sends message
2. Backend calls AI provider API
3. Provider streams tokens via SSE
4. Backend forwards via WebSocket
5. React updates UI incrementally
6. Final message saved to DB
```

### Performance Optimizations

**Frontend:**
- React 19 concurrent rendering
- Instanced Three.js geometry (1 mesh for all nodes)
- Virtual scrolling for large note lists
- Debounced search (300ms)
- Optimistic updates with TanStack Query

**Backend:**
- Synchronous SQLite (better-sqlite3) - no async overhead
- Prepared statements with caching
- Lazy-loaded transformer models
- Streaming responses (no buffering)
- Connection pooling for concurrent requests

**Database:**
- Indexes on frequently queried columns
- sqlite-vec for fast vector similarity
- Soft deletes (no cascade overhead)
- Batch inserts for embeddings

### Security Model

**API Keys:**
- Stored in `data/.env` (gitignored)
- Never sent to frontend
- Loaded on-demand per request

**Data Isolation:**
- All data local (no cloud sync)
- No telemetry or analytics
- CORS restricted in production

**Input Validation:**
- Zod schemas for API requests
- SQL injection prevention (parameterized queries)
- File upload restrictions (type + size)

---

```
LibraNia/
├── backend/                 # Node.js backend
│   ├── api/                # HTTP API routes
│   │   ├── routes.ts       # Main router
│   │   ├── notes.routes.ts # Notes CRUD
│   │   ├── ai.routes.ts    # AI chat
│   │   ├── graph.routes.ts # Graph data
│   │   └── ...
│   ├── database/           # Database layer
│   │   ├── connection.ts   # SQLite connection
│   │   ├── schema.ts       # Drizzle schema
│   │   └── vec.ts          # Vector extension
│   ├── services/           # Business logic
│   │   ├── ai/             # AI providers
│   │   ├── search.service.ts
│   │   ├── graph.service.ts
│   │   └── ...
│   ├── websocket/          # WebSocket handlers
│   │   └── socket.handlers.ts
│   └── server.ts           # Express + Socket.IO server
│
├── src/                    # React frontend
│   ├── api/                # API client
│   ├── components/         # React components
│   │   ├── Chat/           # Chat interface
│   │   ├── Graph/          # 3D graph
│   │   ├── Notes/          # Note editor
│   │   └── ...
│   ├── hooks/              # Custom hooks
│   ├── routes/             # Page components
│   ├── contexts/           # React contexts
│   └── main.tsx            # App entry
│
├── mcp-server/             # MCP server
│   └── src/
│       └── index.ts        # MCP protocol implementation
│
├── bin/                    # CLI entry
│   └── librania.js         # CLI commands
│
├── data/                   # Data directory (gitignored)
│   ├── librania.db         # SQLite database
│   ├── notes/              # Markdown files
│   └── .env                # Provider API keys
│
├── content/                # Uploaded files (gitignored)
│
├── dist/                   # Build output
│   ├── backend/            # Compiled backend
│   └── index.html          # Frontend bundle
│
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
└── README.md               # This file
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Test specific API
npm run test:api
```

### Test Structure

```
backend/
├── api/*.test.ts           # API route tests
├── services/*.test.ts      # Service layer tests
└── database/*.test.ts      # Database tests

src/
├── components/**/*.test.tsx # Component tests
└── hooks/*.test.ts         # Hook tests
```

---

## 📦 Building for Production

```bash
# Build both frontend and backend
npm run build

# Build separately
npm run build:frontend      # Vite build → dist/
npm run build:backend       # TypeScript → dist/backend/

# Start production server
npm start
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Secure API keys in `data/.env`
- [ ] Set up database backups
- [ ] Configure reverse proxy (nginx, Caddy)
- [ ] Enable HTTPS
- [ ] Set up monitoring

---

## 🔧 Troubleshooting

### Native Module Build Errors

**Error**: `better-sqlite3` or `sharp` failed to build

**Solution**:

**Windows**:
```bash
# Install Visual Studio Build Tools
npm install --global windows-build-tools

# Rebuild native modules
npm rebuild better-sqlite3 sharp
```

**macOS**:
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Rebuild native modules
npm rebuild better-sqlite3 sharp
```

**Linux**:
```bash
# Ubuntu/Debian
sudo apt install build-essential python3

# Fedora/RHEL
sudo dnf install gcc-c++ make python3

# Rebuild native modules
npm rebuild better-sqlite3 sharp
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Use different port
PORT=3002 npm start

# Or kill process on port 3001
# macOS/Linux
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Database Locked

**Error**: `database is locked`

**Solution**:
```bash
# Close all connections
# Restart server
npm start
```

### MCP Server Not Connecting

**Error**: Claude Desktop can't find MCP server

**Solution**:
1. Check `claude_desktop_config.json` path
2. Verify `LIBRANIA_DB_PATH` is absolute
3. Ensure database file exists
4. Restart Claude Desktop
5. Check logs: `~/Library/Logs/Claude/mcp*.log`

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Follow existing code style
- Run linter before commit

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Anthropic** - Claude AI API
- **OpenAI** - GPT API
- **DeepSeek** - DeepSeek API
- **Three.js** - 3D graphics library
- **react-force-graph** - Graph visualization
- **sqlite-vec** - Vector search for SQLite
- **Xenova/transformers.js** - Local embeddings

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/LibraNia/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/LibraNia/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/LibraNia/wiki)

---

## 🗺️ Roadmap

### v0.2.0 (Next Release)
- [ ] Mobile app (React Native)
- [ ] Collaborative editing
- [ ] Plugin system
- [ ] Advanced graph filters
- [ ] Custom AI prompts

### v0.3.0 (Future)
- [ ] Self-hosted sync server
- [ ] End-to-end encryption
- [ ] Advanced analytics
- [ ] Integration with Obsidian, Notion
- [ ] Voice input/output

---

**Built with ❤️ for knowledge seekers**

*LibraNia: Library of Neuron Interface Atlas*
