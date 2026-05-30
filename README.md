# LibraNia

**AI-Powered Personal Knowledge Management System**

LibraNia is a local-first knowledge management system that visualizes information as an interconnected neural network. Ask questions, research topics with AI (Claude, GPT, DeepSeek), and store verified answers with rich context in your personal library. Knowledge nodes auto-link based on semantic relationships and display as an interactive 3D graph.

## ✨ Features

### 📚 Knowledge Library
- **Rich Note Editor**: Markdown editor with live preview, syntax highlighting, and image support
- **Smart Linking**: Auto-link notes using `[[Note Title]]` syntax with bidirectional backlinks
- **Tag Organization**: Categorize notes with tags for easy filtering and discovery
- **Content Management**: Upload and manage images, documents, and other content files
- **Full-Text Search**: Fast search across all notes with fuzzy matching and semantic search

### 💬 AI Chat Interface
- **Multi-Provider Support**: Claude (Anthropic), GPT (OpenAI), DeepSeek
- **Conversation Management**: Create, rename, and organize multiple chat conversations
- **Streaming Responses**: Real-time AI responses with WebSocket streaming
- **Context-Aware**: AI can reference your knowledge library for better answers

### 🕸️ 3D Knowledge Graph
- **Interactive Visualization**: Explore your knowledge as a 3D neural network
- **Force-Directed Layout**: Physics-based graph layout with customizable forces
- **Node Highlighting**: Click nodes to highlight neighbors and connections
- **Search Integration**: Search and highlight nodes in the graph
- **Minimap Navigation**: Quick navigation with 2D minimap overview

### 🎨 Modern UI
- **Dark/Light Theme**: Toggle between dark and light modes
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Collapsible Sidebar**: Maximize workspace with collapsible navigation
- **Keyboard Shortcuts**: Quick navigation with Cmd/Ctrl+K

### 🔒 Privacy-First
- **Local Storage**: All data stored on your machine (SQLite + filesystem)
- **No Cloud Lock-in**: Your data stays with you
- **Offline Capable**: Core features work without internet connection

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** 7+
- **Build Tools** (for native modules):
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: build-essential

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/LibraNia.git
cd LibraNia

# Install dependencies
npm install

# Build the application
npm run build

# Start the server
npm start
```

The web interface will be available at `http://localhost:3001`

### Development Mode

```bash
# Start backend dev server (with hot reload)
npm run dev:backend

# In another terminal, start frontend dev server
npm run dev:frontend
```

## 📖 Usage

### Setting Up AI Providers

1. Navigate to **Settings** in the sidebar
2. Configure your AI provider API keys:
   - **Claude**: Get API key from [Anthropic Console](https://console.anthropic.com/)
   - **OpenAI**: Get API key from [OpenAI Platform](https://platform.openai.com/)
   - **DeepSeek**: Get API key from [DeepSeek Platform](https://platform.deepseek.com/)

### Creating Notes

1. Go to **Library** in the sidebar
2. Click **New Note** or press `Cmd/Ctrl+N`
3. Write in Markdown with live preview
4. Link to other notes using `[[Note Title]]` syntax
5. Add tags for organization

### Using AI Chat

1. Go to **Chat** in the sidebar
2. Click **New Conversation**
3. Select your AI provider (Claude, GPT, or DeepSeek)
4. Start chatting! AI responses stream in real-time

### Exploring the Knowledge Graph

1. Go to **Graph** in the sidebar
2. Use mouse to rotate, zoom, and pan the 3D graph
3. Click nodes to view details and highlight connections
4. Search for specific notes using the search box
5. Use the minimap for quick navigation

## 🛠️ Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - HTTP server
- **Socket.IO** - WebSocket server for real-time streaming
- **SQLite** - Local database (via better-sqlite3)
- **sqlite-vec** - Vector search extension for semantic search
- **Drizzle ORM** - Type-safe database queries

### Frontend
- **React 19** - UI framework with concurrent rendering
- **TypeScript** - Type-safe development
- **Vite 6** - Fast build tool and dev server
- **Tailwind CSS 4** - Utility-first CSS framework
- **Three.js** - 3D graphics for graph visualization
- **react-force-graph-3d** - 3D force-directed graph component
- **TanStack Query** - Async state management
- **Zustand** - Lightweight state management

### AI Integration
- **@anthropic-ai/sdk** - Claude API client
- **openai** - OpenAI/DeepSeek API client
- **@xenova/transformers** - Local embeddings generation

## 📁 Project Structure

```
LibraNia/
├── backend/           # Node.js backend server
│   ├── api/          # HTTP API routes
│   ├── database/     # SQLite database and schema
│   ├── services/     # Business logic (AI, search, etc.)
│   └── server.ts     # Express + Socket.IO server
├── src/              # React frontend
│   ├── api/          # API client functions
│   ├── components/   # React components
│   ├── hooks/        # Custom React hooks
│   ├── routes/       # Page components
│   └── main.tsx      # App entry point
├── mcp-server/       # MCP server for Claude integration
├── bin/              # CLI entry point
└── package.json      # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3001
HOST=localhost

# AI Provider API Keys
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# Database
DATABASE_PATH=./data/librania.db
```

### Database Location

By default, LibraNia stores data in:
- **Database**: `./data/librania.db`
- **Content Files**: `./content/`

You can change these paths in the `.env` file.

## 📦 Building for Production

```bash
# Build both backend and frontend
npm run build

# Start production server
npm start
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** - Claude AI API
- **OpenAI** - GPT API
- **Three.js** - 3D graphics library
- **react-force-graph** - Graph visualization components
- **sqlite-vec** - Vector search for SQLite

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/LibraNia/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/LibraNia/discussions)

---

**Built with ❤️ for knowledge seekers**
