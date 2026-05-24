# Technology Stack

**Project:** LibraNia
**Researched:** 2026-05-24

## Recommended Stack

### Desktop Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Tauri** | 2.0+ | Desktop application framework | Smaller bundle size (3-10MB vs 120MB+ for Electron), lower memory footprint (~50MB vs 200MB+), Rust backend provides better security and performance, native system integration, supports web mode via browser target. Better for local-first apps with file system access. |
| TypeScript | 5.7+ | Type-safe development | Industry standard for large applications, catches errors at compile time, excellent IDE support, required for type-safe AI SDK integration |
| Vite | 6.0+ | Build tool and dev server | Fast HMR, native ESM, excellent Tauri integration, optimized production builds, 10x faster than webpack-based tools |

**Alternative considered:** Electron 33+ — More mature ecosystem and easier Node.js integration, but 10-40x larger bundle sizes and significantly higher memory usage make it unsuitable for a local-first knowledge management tool that needs to run efficiently alongside AI models.

**Confidence:** HIGH (Tauri 2.0 stable release verified, Vite 6 compatibility confirmed)

### Frontend Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.x | UI framework | Concurrent rendering for smooth 3D graph updates, largest ecosystem for component libraries, excellent TypeScript support, stable API |
| Zustand | 5.x | State management | Lightweight (~1KB), no provider boilerplate, works outside React components (needed for AI background tasks), simpler than Redux for this use case |
| TanStack Query | 5.x | Async state management | Handles AI API calls with retry logic, caching, and background refetching, perfect for multi-provider AI integration |

**Confidence:** HIGH (React 19 stable, Zustand 5.x and TanStack Query v5 current versions verified)

### 3D Graph Visualization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Three.js | r172+ | WebGL 3D rendering | Industry standard for 3D web graphics, excellent performance, WebGPU support for future-proofing, active development |
| react-force-graph-3d | 1.24+ | 3D force-directed graph component | Built on Three.js and d3-force-3d, handles physics simulation, customizable node/link rendering, 50K+ weekly downloads, proven for knowledge graphs |
| d3-force-3d | Latest | 3D force simulation | Physics-based layout algorithm, configurable forces (charge, link, collision), maintains D3 API patterns |

**Why not react-three-fiber:** While R3F is excellent for custom 3D scenes, react-force-graph-3d provides out-of-the-box force-directed graph layout with physics simulation, which is exactly what's needed for neural network visualization. Building this from scratch with R3F would require implementing the entire force simulation system.

**Confidence:** HIGH (Three.js r172 verified as January 2025 release, react-force-graph-3d actively maintained)

### Database & Storage
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| better-sqlite3 | 12.6+ | SQLite driver | Fastest Node.js SQLite driver, synchronous API (simpler than async), full transaction support, works in Electron/Tauri, native performance |
| sqlite-vec | Latest | Vector search extension | Native SQLite extension for semantic search, supports float32/int8/bit vectors, SIMD optimizations, no separate vector DB needed, keeps everything in SQLite |
| Drizzle ORM | 0.36+ | Type-safe database queries | Lightweight TypeScript ORM, excellent SQLite support, type-safe schema and queries, better DX than raw SQL, smaller than Prisma |

**Why not Prisma:** Drizzle is lighter weight and has better SQLite support. Prisma's migration system and client generation add complexity that's unnecessary for a local-first app.

**Why sqlite-vec over ChromaDB/Vectra:** sqlite-vec keeps vector search in the same database as metadata, eliminating sync issues. ChromaDB requires a separate server process (overkill for desktop app), and Vectra is less mature with fewer optimizations.

**Confidence:** HIGH (better-sqlite3 v12.6.2 verified, sqlite-vec confirmed as current solution for SQLite vector search)

### AI Integration
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | Latest | Claude API client | Official Anthropic SDK, TypeScript support, streaming responses, tool use support |
| openai | Latest | OpenAI/DeepSeek API client | Official OpenAI SDK, works with OpenAI-compatible APIs (DeepSeek), streaming support, function calling |
| @xenova/transformers | Latest | Local embeddings generation | Run transformer models in-browser/Node.js via ONNX, no API calls needed for embeddings, privacy-preserving, works offline |
| Zod | 3.x | Schema validation | Validate AI responses and API configurations, type-safe parsing, excellent TypeScript integration, prevents runtime errors from malformed AI outputs |

**Why @xenova/transformers:** Generating embeddings locally avoids API costs and latency for semantic search. Models like `all-MiniLM-L6-v2` run efficiently on CPU and produce quality embeddings for knowledge graph linking.

**Confidence:** MEDIUM (@anthropic-ai/sdk and openai verified as official SDKs, @xenova/transformers confirmed but version not verified via official docs)

### UI Components
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Utility-first CSS | Zero-config with Vite, CSS-first configuration, 10x faster builds than v3, excellent for rapid UI development |
| Radix UI | Latest | Accessible primitives | Unstyled accessible components (Dialog, Dropdown, Tooltip), WAI-ARIA compliant, composable, works with any styling |
| shadcn/ui | Latest | Pre-built components | Copy-paste components built on Radix + Tailwind, customizable, not a dependency (you own the code), accelerates UI development |

**Why not Material-UI or Ant Design:** These are opinionated component libraries with heavy bundle sizes. Radix + shadcn/ui gives full control over styling while maintaining accessibility, and components are copied into your codebase (no version lock-in).

**Confidence:** HIGH (Tailwind v4 stable release confirmed early 2025, Radix UI and shadcn/ui actively maintained)

### Development Tools
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | 2.1+ | Unit testing | Vite-native, fastest test runner, compatible with Jest API, excellent TypeScript support |
| Playwright | Latest | E2E testing | Supports Electron testing, reliable for desktop app automation, cross-browser testing capabilities |
| ESLint | 9.x | Linting | Flat config system (simpler), TypeScript support via typescript-eslint, catches bugs early |
| Prettier | 3.4+ | Code formatting | Opinionated formatter, integrates with ESLint, maintains consistent code style |

**Confidence:** HIGH (Vitest 2.1.8 and Prettier 3.4.2 verified as January 2025 releases)

### Build & Packaging
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @tauri-apps/cli | 2.x | Tauri build tooling | Official Tauri CLI, handles Rust compilation, app bundling, code signing |
| @tauri-apps/api | 2.x | Tauri frontend API | Type-safe access to Tauri backend (file system, shell, notifications), IPC communication |

**Confidence:** HIGH (Tauri 2.x stable and actively maintained)

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Desktop Framework | Tauri 2.0 | Electron 33 | 10-40x larger bundles (120MB+ vs 3-10MB), 4x higher memory usage (200MB+ vs 50MB), slower startup, less secure (Node.js in renderer) |
| Database | SQLite + better-sqlite3 | PostgreSQL | Overkill for local-first, requires separate server process, more complex setup |
| Vector Search | sqlite-vec | ChromaDB | ChromaDB requires separate server, sync complexity, heavier weight for desktop app |
| Vector Search | sqlite-vec | Vectra | Less mature, fewer optimizations, smaller community |
| ORM | Drizzle | Prisma | Prisma heavier, slower, migration system adds complexity for local app |
| State Management | Zustand | Redux Toolkit | Redux more boilerplate, Zustand simpler for this use case, both are production-ready |
| 3D Visualization | react-force-graph-3d | react-three-fiber + custom | R3F requires building force simulation from scratch, react-force-graph-3d provides this out-of-box |
| UI Components | Radix + shadcn/ui | Material-UI | MUI opinionated, heavier bundles, less customization freedom |
| UI Components | Radix + shadcn/ui | Ant Design | Ant Design heavier, less modern styling approach |
| Build Tool | Vite 6 | Webpack | Vite 10x faster, better DX, native ESM, excellent Tauri integration |

## Installation

### Core Dependencies
```bash
# Desktop framework
npm install @tauri-apps/api @tauri-apps/cli

# Frontend
npm install react react-dom
npm install zustand @tanstack/react-query

# 3D Visualization
npm install three react-force-graph-3d d3-force-3d

# Database
npm install better-sqlite3 drizzle-orm
npm install -D drizzle-kit

# AI Integration
npm install @anthropic-ai/sdk openai @xenova/transformers zod

# UI
npm install tailwindcss @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip
```

### Dev Dependencies
```bash
npm install -D typescript @types/react @types/react-dom @types/three
npm install -D vite @vitejs/plugin-react
npm install -D vitest @vitest/ui
npm install -D playwright @playwright/test
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier
npm install -D @tauri-apps/cli
```

### SQLite Extensions
```bash
# sqlite-vec installation (platform-specific)
# Download from: https://github.com/asg017/sqlite-vec/releases
# Load as SQLite extension in better-sqlite3
```

## Architecture Notes

### Tauri Architecture
- **Frontend:** React + Vite (runs in WebView)
- **Backend:** Rust (handles file system, SQLite, system integration)
- **IPC:** Type-safe commands via @tauri-apps/api
- **Security:** CSP enabled, no Node.js in renderer, Rust backend sandboxed

### Data Flow
1. **User Query** → React UI → Tauri IPC → Rust backend
2. **AI Research** → Rust calls AI APIs (Claude/GPT/DeepSeek) → Streams response to frontend
3. **Storage** → Rust writes to SQLite (better-sqlite3) + file system
4. **Embeddings** → @xenova/transformers generates locally → Stored in sqlite-vec
5. **Graph Visualization** → Drizzle queries SQLite → react-force-graph-3d renders 3D graph

### Performance Considerations
- **Graph rendering:** react-force-graph-3d handles 1000+ nodes efficiently with WebGL
- **Vector search:** sqlite-vec SIMD optimizations provide fast semantic search
- **AI streaming:** TanStack Query manages streaming responses with proper cancellation
- **State management:** Zustand minimal re-renders, works outside React for background tasks

## Version Pinning Strategy

**Pin major versions** for stability:
- Tauri: `^2.0.0` (major version, stable API)
- React: `^19.0.0` (stable, concurrent features needed)
- Three.js: `^0.172.0` (follows r-prefix versioning)

**Allow minor updates** for bug fixes:
- All other dependencies: `^x.y.0` (caret range)

**Lock file:** Commit `package-lock.json` to ensure reproducible builds

## Migration Path

### Phase 1: Core Setup
1. Initialize Tauri project with Vite + React + TypeScript
2. Set up SQLite with better-sqlite3 + Drizzle
3. Configure Tailwind CSS v4

### Phase 2: AI Integration
1. Add @anthropic-ai/sdk and openai
2. Implement multi-provider configuration
3. Add @xenova/transformers for local embeddings

### Phase 3: Graph Visualization
1. Add Three.js + react-force-graph-3d
2. Implement force-directed layout
3. Connect to SQLite data via Drizzle

### Phase 4: Vector Search
1. Integrate sqlite-vec extension
2. Generate embeddings with @xenova/transformers
3. Implement semantic search queries

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
