# Phase 4: Packaging & Distribution - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Distribute LibraNia as npm package with global CLI binary. User installs via `npm install -g librania` and gets `librania` command globally. Package includes frontend assets, backend code, and all runtime dependencies. Native dependencies compile during install.

</domain>

<decisions>
## Implementation Decisions

### Package Structure & Files
- **D-01:** Full bundle approach — include dist/, electron/ (backend), bin/, all node_modules (simple, works out-of-box, ~40-50MB)
- **D-02:** Compile native deps on install — better-sqlite3 and sharp compile on user's machine during npm install (smaller package, requires build tools)
- **D-03:** Mark Electron optional — keep Electron deps in package.json as optional dependencies (allows gradual cleanup without breaking code)
- **D-04:** Explicit files list — specify exact files in package.json: bin/, dist/, electron/, package.json, README (excludes test files, source TypeScript, config files)

### Build & Distribution Process
- **D-05:** Separate builds — frontend: `vite build` → dist/; backend: `tsc` → compiled JS (clear separation, matches current setup)
- **D-06:** Dedicated package script — add `npm run build:package` that runs frontend build, backend compile, prepares files (run before npm publish)
- **D-07:** Version from package.json — `--version` reads from package.json at runtime (simple, standard npm pattern)
- **D-08:** Precompiled backend JS — compile TypeScript to JavaScript before publish, ship compiled JS only (faster install, standard for npm CLIs)

### Installation Experience
- **D-09:** postinstall rebuild — add postinstall script that runs `npm rebuild` for better-sqlite3 and sharp (automatic compilation, requires build tools on user system)
- **D-10:** Support both global and npx — global install (`npm i -g`) for persistent CLI, npx for one-off usage (standard npm pattern)
- **D-11:** Create directories on first run — CLI creates ./data directory on first run if missing, already implemented in bin/librania.js (works for both global and npx)
- **D-12:** Brief success message — show success message after install with next steps: "Run: librania start" (simple, standard npm pattern)

### Bundle Size Optimization
- **D-13:** Keep all dependencies — include all runtime dependencies without aggressive pruning (simpler, ~40-50MB, still < 50MB target vs 120MB Electron)
- **D-14:** Use Vite output as-is — frontend already optimized by Vite build (minified, tree-shaken), include dist/ without additional compression
- **D-15:** Move build tools to devDependencies — typescript, vite, electron-builder stay as devDependencies, not installed by users (standard npm pattern)

### Claude's Discretion
None — all areas had explicit decisions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — PKG-01 through PKG-05 requirements for this phase
- `.planning/PROJECT.md` — v2.0 goal (cross-platform CLI + web server), target bundle size < 50MB

### Prior Phase Context
- `.planning/phases/01-backend-extraction/01-CONTEXT.md` — Backend extraction patterns, Node.js server setup
- `.planning/phases/02-frontend-adaptation/02-CONTEXT.md` — Frontend build configuration, static asset serving
- `.planning/phases/03-cli-server-launcher/03-CONTEXT.md` — CLI entry point, bin/librania.js implementation, data directory handling

### Existing Implementation
- `package.json` — Current package configuration with bin field, dependencies, build scripts
- `bin/librania.js` — CLI entry point with commander.js, already implements data directory creation on first run
- `electron/server.ts` — Backend server implementation that CLI imports and starts

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`package.json`** — Already has bin field pointing to `./bin/librania.js`, dependencies list, build scripts
- **`bin/librania.js`** — CLI entry point with commander.js, version reading from package.json, data directory creation
- **Vite build config** — Frontend build already configured, outputs to dist/ with optimization
- **TypeScript config** — Backend TypeScript compilation already configured

### Established Patterns
- **npm bin with shebang** — `#!/usr/bin/env node` pattern already used in bin/librania.js
- **Version from package.json** — CLI already reads version from package.json at runtime
- **Data directory creation** — CLI already creates ./data directory on first run if missing
- **Separate build outputs** — Frontend → dist/, backend would compile to separate output directory

### Integration Points
- **package.json files field** — Controls what npm publishes, needs explicit list
- **package.json scripts** — Add build:package script for pre-publish preparation
- **package.json dependencies** — Audit and move build tools to devDependencies
- **postinstall script** — Add to package.json scripts for native dependency compilation

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard npm packaging patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-packaging-distribution*
*Context gathered: 2026-05-29*
