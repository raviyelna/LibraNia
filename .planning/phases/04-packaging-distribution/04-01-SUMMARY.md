---
phase: 04-packaging-distribution
plan: 01
subsystem: packaging
tags: [npm, package-config, typescript-compilation, cli-distribution]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [npm-package-structure, backend-compilation-config]
  affects: [04-02, 04-03]
tech_stack:
  added: [tsconfig.backend.json]
  patterns: [npm-files-whitelist, optional-dependencies, in-place-compilation]
key_files:
  created:
    - tsconfig.backend.json
  modified:
    - package.json
    - bin/librania.js
decisions:
  - D-01: Full bundle approach with explicit files whitelist
  - D-03: Electron packages moved to optionalDependencies
  - D-04: Files whitelist includes bin/, electron/, dist/, README.md, LICENSE
  - D-05: In-place TypeScript compilation (electron/*.ts → electron/*.js)
  - D-08: CLI imports compiled .js files instead of .ts source
  - D-15: Build tools remain in devDependencies
metrics:
  duration_minutes: 8
  tasks_completed: 3
  files_created: 1
  files_modified: 2
  commits: 3
  completed_date: 2026-05-29
---

# Phase 04 Plan 01: Package Configuration & Build Setup Summary

**One-liner:** Configured package.json for npm CLI distribution with files whitelist, optionalDependencies for Electron, engines field for Node.js 18+, and created TypeScript backend compilation config for in-place JavaScript output.

## What Was Built

Established the foundation for npm package distribution by configuring package.json with explicit files whitelist, moving Electron packages to optionalDependencies, adding engines field, and creating tsconfig.backend.json for in-place TypeScript compilation. Updated CLI imports to reference compiled .js files instead of .ts source files.

### Task 1: Configure package.json for npm distribution
- Added files whitelist: `["bin/", "electron/", "dist/", "README.md", "LICENSE"]`
- Moved Electron packages to optionalDependencies: electron, electron-store, electron-log, electron-window-state
- Added engines field requiring Node.js >=18.0.0 and npm >=7.0.0
- Added keywords field: `["knowledge-management", "ai", "cli", "notes", "graph"]`
- Verified bin field unchanged, build tools already in devDependencies
- **Commit:** bd570c8

### Task 2: Create TypeScript backend compilation config
- Created tsconfig.backend.json extending base tsconfig.json
- Configured in-place compilation (outDir and rootDir both ./electron)
- Enabled JavaScript output (noEmit: false)
- Disabled declaration files and source maps to reduce package size
- Included electron/**/*.ts, excluded test files
- **Commit:** f1ef386

### Task 3: Update CLI imports to use compiled .js files
- Changed import from '../electron/server.ts' to '../electron/server.js'
- Updated dynamic import to use .js extension
- Verified shebang and all other functionality unchanged
- **Commit:** c18eb02

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

### Plan-Level Verification
All verification commands passed:

1. **package.json structure verified:**
   - files: `['bin/', 'electron/', 'dist/', 'README.md', 'LICENSE']`
   - optionalDeps: `['electron', 'electron-log', 'electron-store', 'electron-window-state']`
   - engines: `{ node: '>=18.0.0', npm: '>=7.0.0' }`

2. **TypeScript compilation config verified:**
   - outDir: "./electron"
   - rootDir: "./electron"
   - noEmit: false

3. **CLI imports verified:**
   - Static import: `import { startServer } from '../electron/server.js'`
   - Dynamic import: `await import('../electron/server.js')`
   - No .ts imports remain

4. **CLI functionality verified:**
   - `npm run start:cli -- --help` works (shows usage)
   - `npm run start:cli -- --version` works (shows 0.1.0)
   - tsx still resolves .ts files at runtime (no compilation needed yet)

## Known Stubs

None - this plan only configures package structure and build settings, no runtime code with stubs.

## Threat Flags

None - no new security-relevant surface introduced. All changes are configuration-only.

## Key Decisions Made

1. **Files whitelist approach:** Used explicit whitelist instead of .npmignore blacklist for safer secret exclusion (T-04-01 mitigation)
2. **Optional Electron dependencies:** Marked Electron packages as optional to prevent install failures on restricted networks (T-04-02 mitigation)
3. **In-place compilation:** Configured TypeScript to compile electron/*.ts → electron/*.js in same directory, keeping import paths unchanged
4. **ES module .js extensions:** Updated imports to use .js extensions even though files don't exist yet (required for Node.js ESM)

## Next Steps

1. **Plan 04-02:** Add build scripts (build:frontend, build:backend, build:package, prepublishOnly, postinstall)
2. **Plan 04-03:** Test local package installation with `npm pack` and `npm install -g`
3. **Future:** Compile backend TypeScript before testing npm package (currently works with tsx runtime resolution)

## Self-Check: PASSED

**Created files verified:**
- ✅ tsconfig.backend.json exists

**Modified files verified:**
- ✅ package.json contains files whitelist
- ✅ package.json contains optionalDependencies
- ✅ package.json contains engines field
- ✅ bin/librania.js imports from .js files

**Commits verified:**
- ✅ bd570c8 exists (Task 1: package.json configuration)
- ✅ f1ef386 exists (Task 2: tsconfig.backend.json creation)
- ✅ c18eb02 exists (Task 3: CLI import updates)

**Functionality verified:**
- ✅ CLI --help command works
- ✅ CLI --version command works
- ✅ No .ts imports remain in bin/librania.js
