# Phase 4: Packaging & Distribution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 04-packaging-distribution
**Areas discussed:** Package structure & files, Build & distribution process, Installation experience, Bundle size optimization

---

## Package Structure & Files

### What files should be bundled?

| Option | Description | Selected |
|--------|-------------|----------|
| Full bundle (Recommended) | Include everything needed to run. Frontend dist/, backend electron/, bin/, all node_modules. Simple but large (~40-50MB with deps). | ✓ |
| Production deps only | Only production dependencies, exclude devDeps and Electron artifacts. Smaller but needs careful dependency audit. | |

**User's choice:** Full bundle (Recommended)
**Notes:** None

### How should native dependencies be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Prebuilt binaries (Recommended) | Include prebuilt binaries for common platforms (linux-x64, win32-x64). User's platform auto-selected at runtime. Larger package but works out-of-box. | |
| Compile on install | Compile on user's machine during npm install. Smaller package but requires build tools (python, C++ compiler) on user system. | ✓ |

**User's choice:** Compile on install
**Notes:** None

### How should Electron dependencies be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Mark Electron optional (Recommended) | Keep Electron deps in package.json but mark as optional. Allows gradual cleanup without breaking existing code. Can remove in future version. | ✓ |
| Remove Electron completely | Remove all Electron dependencies now. Cleaner but need to verify no imports remain (electron-log, electron-store already replaced). | |

**User's choice:** Mark Electron optional (Recommended)
**Notes:** None

### Package.json 'files' field controls what npm publishes. Which approach?

| Option | Description | Selected |
|--------|-------------|----------|
| Use existing files config | Keep current package.json files list (dist/, dist-electron/, node_modules/, bin/). Update later if needed. | |
| Explicit files list (Recommended) | Specify exact files: bin/, dist/, electron/ (backend), package.json, README. Excludes test files, source TypeScript, config files. | ✓ |

**User's choice:** Explicit files list (Recommended)
**Notes:** None

---

## Build & Distribution Process

### How should frontend and backend builds be orchestrated?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate builds (Recommended) | Frontend: vite build → dist/. Backend: tsc → compiled JS. Separate commands, run sequentially. Clear separation, matches current setup. | ✓ |
| Unified build script | Single npm run build command that runs both frontend and backend builds. Simpler for users but hides what's happening. | |

**User's choice:** Separate builds (Recommended)
**Notes:** None

### How should the package be prepared for npm publish?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated package script (Recommended) | Add npm run build:package that runs frontend build, backend compile, and prepares files field. Run before npm publish. | ✓ |
| prepublishOnly hook | Use npm prepublishOnly hook to auto-build before publish. Automatic but can surprise developers. | |

**User's choice:** Dedicated package script (Recommended)
**Notes:** None

### How should version be synced between package.json and 'librania --version' command?

| Option | Description | Selected |
|--------|-------------|----------|
| package.json only (Recommended) | Single source in package.json version field. --version reads from package.json at runtime. Simple, standard npm pattern. | ✓ |
| Generated version file | Generate version file during build from package.json. Faster runtime lookup but adds build step. | |

**User's choice:** package.json only (Recommended)
**Notes:** None

### Should backend TypeScript be precompiled or compiled during install?

| Option | Description | Selected |
|--------|-------------|----------|
| Compile at install | TypeScript source (electron/*.ts) published, compiled at install via postinstall script. Smaller package, flexible but slower install. | |
| Precompiled JS (Recommended) | Precompile TypeScript to JavaScript, publish compiled JS only. Faster install, larger package, standard for npm CLIs. | ✓ |

**User's choice:** Precompiled JS (Recommended)
**Notes:** None

---

## Installation Experience

### Native dependencies (better-sqlite3, sharp) need compilation. How should this work?

| Option | Description | Selected |
|--------|-------------|----------|
| postinstall rebuild (Recommended) | Add postinstall script that runs npm rebuild for better-sqlite3 and sharp. Automatic compilation, requires build tools on user system. | ✓ |
| Manual rebuild | No postinstall script. User manually runs npm rebuild if needed. Cleaner but less user-friendly. | |

**User's choice:** postinstall rebuild (Recommended)
**Notes:** None

### Should librania support global install, npx usage, or both?

| Option | Description | Selected |
|--------|-------------|----------|
| Both global and npx (Recommended) | Support both. Global install (npm i -g) for persistent CLI. npx for one-off usage. Standard npm pattern, works everywhere. | ✓ |
| Global install only | Global install only. Simpler docs, single installation method. Users must install globally. | |

**User's choice:** Both global and npx (Recommended)
**Notes:** None

### Should postinstall create default config/data directories?

| Option | Description | Selected |
|--------|-------------|----------|
| Create on first run (Recommended) | CLI creates ./data directory on first run if missing (already implemented in bin/librania.js). No postinstall needed, works for both global and npx. | ✓ |
| postinstall in home dir | postinstall script creates default config in user home (~/.librania/). Persistent across runs but assumes global install. | |

**User's choice:** Create on first run (Recommended)
**Notes:** None

### What should users see after npm install completes?

| Option | Description | Selected |
|--------|-------------|----------|
| Brief success message (Recommended) | Show brief success message with next steps: 'Run: librania start'. Simple, standard npm pattern. | ✓ |
| Silent install | Silent install, no postinstall output. Cleanest but user doesn't know what to do next. | |

**User's choice:** Brief success message (Recommended)
**Notes:** None

---

## Bundle Size Optimization

### How aggressive should dependency optimization be?

| Option | Description | Selected |
|--------|-------------|----------|
| All dependencies (Recommended) | Keep all dependencies. Simpler, works out-of-box. Likely 40-50MB with node_modules (still < 50MB target, much smaller than 120MB Electron). | ✓ |
| Audit and prune deps | Audit and remove unused deps. Smaller bundle but requires careful dependency analysis and testing. | |

**User's choice:** All dependencies (Recommended)
**Notes:** None

### Frontend is already built and optimized in dist/. Further optimization needed?

| Option | Description | Selected |
|--------|-------------|----------|
| Use Vite output as-is (Recommended) | Frontend already optimized by Vite build (minified, tree-shaken). Include dist/ as-is. No additional optimization needed. | ✓ |
| Compress frontend assets | Add additional compression (gzip/brotli) for frontend assets. Smaller but adds complexity. | |

**User's choice:** Use Vite output as-is (Recommended)
**Notes:** None

### DevDependencies (typescript, vite, electron-builder) shouldn't be in user installs. How to exclude?

| Option | Description | Selected |
|--------|-------------|----------|
| Move to dependencies (Recommended) | Move to dependencies (not devDependencies). Standard npm pattern, only prod deps installed by users. | ✓ |
| Exclude via files field | Keep as devDependencies, exclude via files field. Works but non-standard. | |

**User's choice:** Move to dependencies (Recommended)
**Notes:** None

---

## Claude's Discretion

None — all areas had explicit decisions.

## Deferred Ideas

None — discussion stayed within phase scope.
