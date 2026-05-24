<!-- GSD:project-start source:PROJECT.md -->
## Project

**LibraNia**

LibraNia is a personal knowledge management system that visualizes information as an interconnected neural network. Users can ask questions, and the AI (Claude, GPT, or DeepSeek) researches topics using both web search and model knowledge, then stores verified answers with rich context (text, diagrams, images, graph views) in a local library. Knowledge nodes auto-link based on semantic relationships and display as an interactive 3D neural visualization.

**Core Value:** Answers must be verified by multiple AI models before storage — ensuring knowledge in the library is cross-validated and trustworthy.

### Constraints

- **Storage**: Local-first — all data stored on user's machine (SQLite for metadata, filesystem for documents/images)
- **AI providers**: Must support Claude CLI, OpenAI API, and DeepSeek API with configurable endpoints
- **Visualization**: 3D graph rendering requires WebGL-capable framework (Three.js or similar)
- **Performance**: Graph visualization must handle 1000+ nodes without lag
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Desktop Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Electron** | 42.x | Desktop application framework | **User decision (Phase 1):** Mature ecosystem, larger community, more plugins. Trade-off: larger bundles (120MB+ vs 3-10MB for Tauri) and higher memory (200MB+ vs 50MB) accepted for ecosystem maturity. |
| TypeScript | 5.7+ | Type-safe development | Industry standard for large applications, catches errors at compile time, excellent IDE support, required for type-safe AI SDK integration |
| Vite | 6.0+ | Build tool and dev server | Fast HMR, native ESM, excellent Electron integration via vite-plugin-electron, optimized production builds, 10x faster than webpack-based tools |
### Frontend Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.x | UI framework | Concurrent rendering for smooth 3D graph updates, largest ecosystem for component libraries, excellent TypeScript support, stable API |
| Zustand | 5.x | State management | Lightweight (~1KB), no provider boilerplate, works outside React components (needed for AI background tasks), simpler than Redux for this use case |
| TanStack Query | 5.x | Async state management | Handles AI API calls with retry logic, caching, and background refetching, perfect for multi-provider AI integration |
### 3D Graph Visualization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Three.js | r172+ | WebGL 3D rendering | Industry standard for 3D web graphics, excellent performance, WebGPU support for future-proofing, active development |
| react-force-graph-3d | 1.24+ | 3D force-directed graph component | Built on Three.js and d3-force-3d, handles physics simulation, customizable node/link rendering, 50K+ weekly downloads, proven for knowledge graphs |
| d3-force-3d | Latest | 3D force simulation | Physics-based layout algorithm, configurable forces (charge, link, collision), maintains D3 API patterns |
### Database & Storage
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| better-sqlite3 | 12.6+ | SQLite driver | Fastest Node.js SQLite driver, synchronous API (simpler than async), full transaction support, works in Electron/Tauri, native performance |
| sqlite-vec | Latest | Vector search extension | Native SQLite extension for semantic search, supports float32/int8/bit vectors, SIMD optimizations, no separate vector DB needed, keeps everything in SQLite |
| Drizzle ORM | 0.36+ | Type-safe database queries | Lightweight TypeScript ORM, excellent SQLite support, type-safe schema and queries, better DX than raw SQL, smaller than Prisma |
### AI Integration
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | Latest | Claude API client | Official Anthropic SDK, TypeScript support, streaming responses, tool use support |
| openai | Latest | OpenAI/DeepSeek API client | Official OpenAI SDK, works with OpenAI-compatible APIs (DeepSeek), streaming support, function calling |
| @xenova/transformers | Latest | Local embeddings generation | Run transformer models in-browser/Node.js via ONNX, no API calls needed for embeddings, privacy-preserving, works offline |
| Zod | 3.x | Schema validation | Validate AI responses and API configurations, type-safe parsing, excellent TypeScript integration, prevents runtime errors from malformed AI outputs |
### UI Components
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Utility-first CSS | Zero-config with Vite, CSS-first configuration, 10x faster builds than v3, excellent for rapid UI development |
| Radix UI | Latest | Accessible primitives | Unstyled accessible components (Dialog, Dropdown, Tooltip), WAI-ARIA compliant, composable, works with any styling |
| shadcn/ui | Latest | Pre-built components | Copy-paste components built on Radix + Tailwind, customizable, not a dependency (you own the code), accelerates UI development |
### Development Tools
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | 2.1+ | Unit testing | Vite-native, fastest test runner, compatible with Jest API, excellent TypeScript support |
| Playwright | Latest | E2E testing | Supports Electron testing, reliable for desktop app automation, cross-browser testing capabilities |
| ESLint | 9.x | Linting | Flat config system (simpler), TypeScript support via typescript-eslint, catches bugs early |
| Prettier | 3.4+ | Code formatting | Opinionated formatter, integrates with ESLint, maintains consistent code style |
### Build & Packaging
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vite-plugin-electron | Latest | Electron + Vite integration | Unified build pipeline, hot reload for main process, automatic preload bundling |
| electron-builder | Latest | App packaging and distribution | Cross-platform builds, code signing, auto-updates, installer generation |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Desktop Framework | Electron 42 | Tauri 2.0 | **User chose Electron** for mature ecosystem and larger community. Tauri offers smaller bundles (3-10MB vs 120MB+) and lower memory (50MB vs 200MB+), but Electron's maturity was prioritized. |
| Database | SQLite + better-sqlite3 | PostgreSQL | Overkill for local-first, requires separate server process, more complex setup |
| Vector Search | sqlite-vec | ChromaDB | ChromaDB requires separate server, sync complexity, heavier weight for desktop app |
| Vector Search | sqlite-vec | Vectra | Less mature, fewer optimizations, smaller community |
| ORM | Drizzle | Prisma | Prisma heavier, slower, migration system adds complexity for local app |
| State Management | Zustand | Redux Toolkit | Redux more boilerplate, Zustand simpler for this use case, both are production-ready |
| 3D Visualization | react-force-graph-3d | react-three-fiber + custom | R3F requires building force simulation from scratch, react-force-graph-3d provides this out-of-box |
| UI Components | Radix + shadcn/ui | Material-UI | MUI opinionated, heavier bundles, less customization freedom |
| UI Components | Radix + shadcn/ui | Ant Design | Ant Design heavier, less modern styling approach |
| Build Tool | Vite 6 | Webpack | Vite 10x faster, better DX, native ESM, excellent Electron integration via vite-plugin-electron |
## Installation
### Core Dependencies
# Desktop framework
# Frontend
# 3D Visualization
# Database
# AI Integration
# UI
### Dev Dependencies
### SQLite Extensions
# sqlite-vec installation (platform-specific)
# Download from: https://github.com/asg017/sqlite-vec/releases
# Load as SQLite extension in better-sqlite3
## Architecture Notes
### Electron Architecture
- **Main Process:** Node.js (handles file system, SQLite, window management, system integration)
- **Renderer Process:** React + Vite (runs in Chromium, isolated via contextBridge)
- **IPC:** contextBridge + ipcMain/ipcRenderer for secure communication
- **IPC:** Type-safe commands via @tauri-apps/api
- **Security:** CSP enabled, no Node.js in renderer, Rust backend sandboxed
### Data Flow
### Performance Considerations
- **Graph rendering:** react-force-graph-3d handles 1000+ nodes efficiently with WebGL
- **Vector search:** sqlite-vec SIMD optimizations provide fast semantic search
- **AI streaming:** TanStack Query manages streaming responses with proper cancellation
- **State management:** Zustand minimal re-renders, works outside React for background tasks
## Version Pinning Strategy
- Tauri: `^2.0.0` (major version, stable API)
- React: `^19.0.0` (stable, concurrent features needed)
- Three.js: `^0.172.0` (follows r-prefix versioning)
- All other dependencies: `^x.y.0` (caret range)
## Migration Path
### Phase 1: Core Setup
### Phase 2: AI Integration
### Phase 3: Graph Visualization
### Phase 4: Vector Search
## Known Issues & Workarounds
### better-sqlite3 with Tauri
- **Issue:** Native module compilation for Tauri target
- **Solution:** Use `@tauri-apps/plugin-sql` OR compile better-sqlite3 for correct target architecture
- **Alternative:** Move SQLite operations to Rust backend (recommended for Tauri)
### sqlite-vec Loading
- **Issue:** Extension must be loaded at runtime
- **Solution:** Use `db.loadExtension()` in better-sqlite3 OR compile into Rust backend
### @xenova/transformers Bundle Size
- **Issue:** ONNX runtime adds ~10MB to bundle
- **Solution:** Lazy-load transformers.js, download models on first use, cache in user data directory
### Three.js Tree Shaking
- **Issue:** Three.js doesn't tree-shake well
- **Solution:** Import specific modules: `import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer'`
## Sources
- Tauri 2.0 documentation: Context7 `/websites/v2_tauri_app`
- Electron documentation: Context7 `/websites/electronjs`
- Three.js documentation: Context7 `/mrdoob/three.js`
- better-sqlite3: Context7 `/wiselibs/better-sqlite3`
- Vite 6 release information: Web search (verified January 2025)
- TypeScript 5.7 release: Web search (verified November 2024)
- React 19 stable release: Web search (verified 2024)
- sqlite-vec: Web search (verified as current SQLite vector extension)
- @anthropic-ai/sdk: Web search (verified official SDK)
- react-force-graph-3d: Web search (verified 1.24+ on npm)
- Tailwind CSS v4: Web search (verified stable release early 2025)
- Vitest 2.1.8: Web search (verified January 2025)
- Prettier 3.4.2: Web search (verified January 2025)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
