# LibraNia

**AI-Powered Knowledge Management with Multi-Model Verification**

LibraNia is a personal knowledge management system that visualizes information as an interconnected neural network. Ask questions, get AI-researched answers verified by multiple models, and explore your knowledge as an interactive 3D graph.

## Features

- 🤖 **Multi-AI Research** — Claude, GPT, and DeepSeek research topics using web search and model knowledge
- ✅ **Cross-Model Verification** — Answers verified by multiple AI models before storage
- 🧠 **Neural Visualization** — Interactive 3D graph showing semantic relationships between knowledge nodes
- 💾 **Local-First Storage** — All data stored on your machine (SQLite + filesystem)
- 🔗 **Auto-Linking** — Knowledge nodes connect automatically based on semantic relationships
- 📚 **Rich Context** — Store text, citations, diagrams, and images with each answer

## Tech Stack

### Backend
- **Runtime:** Node.js 18+ (pure Node, no Electron)
- **HTTP API:** Express 5.x
- **WebSocket:** Socket.IO for real-time streaming
- **Database:** SQLite (better-sqlite3) + sqlite-vec for vector search
- **ORM:** Drizzle ORM for type-safe queries
- **AI Integration:** @anthropic-ai/sdk, openai, @xenova/transformers

### Frontend
- **Framework:** React 19 + TypeScript 5.7+
- **State:** Zustand + TanStack Query
- **3D Visualization:** Three.js + react-force-graph-3d
- **Build Tool:** Vite 6
- **UI:** Tailwind CSS 4 + Radix UI + shadcn/ui

## Installation

### Global Installation (Recommended)

```bash
npm install -g librania
```

After installation, run:

```bash
librania start
```

### One-Time Usage (No Installation)

```bash
npx librania start
```

### Requirements

LibraNia requires the following to compile native dependencies during installation:

- **Node.js:** 18.0 or higher
- **npm:** 7.0 or higher
- **Build Tools:**
  - **Linux:** `build-essential` and `python3`
    ```bash
    sudo apt-get install build-essential python3
    ```
  - **Windows:** Visual Studio Build Tools (install via [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/))
  - **macOS:** Xcode Command Line Tools
    ```bash
    xcode-select --install
    ```

Native dependencies (`better-sqlite3`, `sharp`) will compile automatically during installation.

## Configuration

Configure AI providers in the app settings:

- **Claude:** Requires Claude CLI or Anthropic API key
- **OpenAI:** Requires OpenAI API key
- **DeepSeek:** Requires DeepSeek API key and base URL

## Usage

### CLI Commands

```bash
# Show version
librania --version

# Show help
librania --help

# Start server (default port 3000)
librania start

# Start server on custom port
librania start --port 3001

# Start server without opening browser
librania start --no-browser
```

### Using the Application

1. **Ask a Question** — Type your question in the search bar
2. **AI Research** — Selected AI models research the topic
3. **Verification** — Multiple models cross-validate the answer
4. **Storage** — Verified answer stored in your local library
5. **Explore** — View knowledge graph and discover connections

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

- **Backend:** Node.js server with Express (HTTP API) and Socket.IO (WebSocket streaming)
- **Frontend:** React SPA served as static files, accessed via browser
- **Database:** SQLite for metadata, filesystem for documents/images
- **Vector Search:** sqlite-vec extension for semantic search
- **Deployment:** CLI server, web UI accessed at http://localhost:3000

## Requirements

- Node.js 18+
- SQLite 3.x
- WebGL-capable GPU for 3D visualization

## License

MIT

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## Support

- Issues: [GitHub Issues](https://github.com/yourusername/LibraNia/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/LibraNia/discussions)
