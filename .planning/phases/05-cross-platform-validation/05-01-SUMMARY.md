---
phase: 05-cross-platform-validation
plan: 01
subsystem: backend
tags: [cross-platform, path-resolution, windows, linux]
completed: 2026-05-29T12:09:26Z
duration: 78s

dependency_graph:
  requires: [04-03]
  provides: [cross-platform-path-resolution]
  affects: [file-storage, content-handlers]

tech_stack:
  added: []
  patterns: [environment-variables, cross-platform-paths]

key_files:
  created: []
  modified:
    - electron/ipc/content.handlers.ts
    - electron/services/file-storage.service.ts

decisions:
  - Use LIBRANIA_DATA_DIR env var as primary path source (set by CLI)
  - Fallback to ~/.librania for cross-platform compatibility
  - Match bin/librania.js directory structure (data/ subdirectory for database)

metrics:
  tasks_completed: 3
  files_modified: 2
  commits: 2
  lines_changed: 9
---

# Phase 05 Plan 01: Cross-Platform Path Resolution Summary

**One-liner:** Eliminated hardcoded Windows paths (AppData/Roaming) in favor of LIBRANIA_DATA_DIR env var with ~/.librania fallback

## What Was Built

Removed all hardcoded Windows-specific paths from the codebase and replaced them with cross-platform path resolution using environment variables and platform-agnostic directory structures.

### Files Modified

1. **electron/ipc/content.handlers.ts** (line 41)
   - Replaced `path.join(os.homedir(), 'AppData', 'Roaming', 'LibraNia', 'attachments', data.noteId)`
   - With `path.join(dataDir, 'attachments', data.noteId)` where `dataDir = process.env.LIBRANIA_DATA_DIR || path.join(os.homedir(), '.librania')`
   - Added documentation comment explaining cross-platform approach

2. **electron/services/file-storage.service.ts** (line 262)
   - Replaced `path.join(os.homedir(), 'AppData', 'Roaming', 'LibraNia', 'librania.db')`
   - With `path.join(dataDir, 'data', 'librania.db')` where `dataDir = process.env.LIBRANIA_DATA_DIR || path.join(os.homedir(), '.librania')`
   - Matches bin/librania.js directory structure (data/ subdirectory)
   - Added documentation comment explaining path structure

### Verification Results

- **Path audit:** 0 occurrences of `AppData`, `Roaming`, or `Program Files` in TypeScript source files
- **Environment variable usage:** Both files use `process.env.LIBRANIA_DATA_DIR` as primary path source
- **Fallback pattern:** Both files have safe fallback to `os.homedir() + .librania` if env var not set
- **Path module usage:** All path operations use `path.join()` or `path.resolve()`, no string concatenation

## Deviations from Plan

None - plan executed exactly as written.

## Requirements Fulfilled

- **PLAT-03:** Cross-platform path resolution implemented
- **PLAT-04:** No hardcoded Windows paths remain in codebase

## Technical Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Use LIBRANIA_DATA_DIR env var | CLI already sets this (bin/librania.js line 83), ensures consistency | Primary path source for all file operations |
| Fallback to ~/.librania | Standard Unix hidden directory pattern, works on Windows too | Safe default when env var not set |
| Match bin/librania.js structure | Database in data/ subdirectory per CLI setup (lines 67-68) | Consistent directory layout across platforms |

## Known Stubs

None - no stubs introduced in this plan.

## Threat Flags

None - all path operations use validated environment variables or safe fallbacks.

## Self-Check: PASSED

**Files exist:**
- ✓ electron/ipc/content.handlers.ts modified
- ✓ electron/services/file-storage.service.ts modified

**Commits exist:**
- ✓ bd0510c: fix(05-01): remove hardcoded Windows path in content.handlers.ts
- ✓ 1923c25: fix(05-01): remove hardcoded Windows path in file-storage.service.ts

**Verification passed:**
- ✓ 0 hardcoded Windows paths in TypeScript sources
- ✓ All path operations use Node.js path module
- ✓ LIBRANIA_DATA_DIR env var used in both files
- ✓ Safe fallback pattern implemented

## Next Steps

Phase 05 Plan 02: Test LibraNia on Linux system to verify cross-platform compatibility.
