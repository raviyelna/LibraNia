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

- **Desktop:** Electron 42.x + TypeScript 5.7+
- **Frontend:** React 19 + Zustand + TanStack Query
- **3D Visualization:** Three.js + react-force-graph-3d
- **Database:** SQLite (better-sqlite3) + sqlite-vec for vector search
- **AI Integration:** @anthropic-ai/sdk, openai, @xenova/transformers
- **UI:** Tailwind CSS 4 + Radix UI + shadcn/ui

## Installation

```bash
# Clone repository
git clone https://github.com/yourusername/LibraNia.git
cd LibraNia

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Configuration

Configure AI providers in the app settings:

- **Claude:** Requires Claude CLI or Anthropic API key
- **OpenAI:** Requires OpenAI API key
- **DeepSeek:** Requires DeepSeek API key and base URL

## Usage

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

- **Main Process:** Node.js (file system, SQLite, window management)
- **Renderer Process:** React + Vite (UI, 3D visualization)
- **IPC:** contextBridge for secure main-renderer communication
- **Storage:** SQLite for metadata, filesystem for documents/images
- **Vector Search:** sqlite-vec extension for semantic search

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
