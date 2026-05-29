# Phase 5: Cross-Platform Validation - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify LibraNia works identically on Linux and Windows. Test CLI executable, native dependency compilation (better-sqlite3, sharp), database path resolution, file path handling, and sqlite-vec extension loading on both platforms.

</domain>

<decisions>
## Implementation Decisions

### Testing Approach
- **D-01:** Manual testing on physical/VM machines — test on real Ubuntu 22.04 LTS and Windows 10 to catch real-world issues (slower iteration but higher confidence)
- **D-02:** Test matrix — Ubuntu 22.04 LTS (most common, stable) + Windows 10 with cmd.exe (legacy shell, widest compatibility)
- **D-03:** Test scope — CLI execution, native dependency compilation, path resolution, file operations, sqlite-vec extension loading

### Native Dependency Handling
- **D-04:** Build tools required — fail with helpful error message if build tools missing (Linux: "apt install build-essential", Windows: link to Visual Studio Build Tools)
- **D-05:** Automatic rebuild on install — postinstall script runs `npm rebuild better-sqlite3 sharp`, fails installation if rebuild fails (current behavior, no graceful degradation)
- **D-06:** No pre-built binaries — rely on npm rebuild to compile for user's platform (simpler, smaller package, standard npm pattern)

### Path Edge Cases
- **D-07:** Test all path types — Windows drive letters (C:\, D:\), paths with spaces (C:\Program Files\), Unix home directory (~), Windows env vars (%USERPROFILE%)
- **D-08:** Enforce path.join() everywhere — always use path.join() and path.resolve(), never string concatenation with / or \\ (prevents separator issues)
- **D-09:** Audit existing code — grep for hardcoded separators, string concatenation with paths, ensure all path operations use Node.js path module

### Error Reporting
- **D-10:** Structured error messages — show platform (process.platform), Node version (process.version), missing dependency name, link to troubleshooting doc
- **D-11:** sqlite-vec extension handling — bundle vec0.dll (Windows) and vec0.so (Linux) in package, fail with clear error if platform unsupported (current behavior, no graceful degradation)
- **D-12:** Error message format — "Error: [dependency] failed to build on [platform]. Install build tools: [platform-specific instructions]. See: [troubleshooting URL]"

### Claude's Discretion
None — all areas had explicit decisions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — PLAT-01 through PLAT-05 requirements for this phase
- `.planning/PROJECT.md` — v2.0 goal (cross-platform CLI + web server), constraints (works on Linux and Windows)

### Prior Phase Context
- `.planning/phases/01-backend-extraction/01-CONTEXT.md` — Database path resolution via env vars (LIBRANIA_DATA_DIR, LIBRANIA_DB_PATH)
- `.planning/phases/03-cli-server-launcher/03-CONTEXT.md` — CLI entry point, data directory handling, path resolution patterns
- `.planning/phases/04-packaging-distribution/04-CONTEXT.md` — Package structure, postinstall rebuild, native dependency handling

### Existing Implementation
- `bin/librania.js` — CLI entry point with path.join(), path.resolve(), HOME/USERPROFILE handling
- `electron/database/vec.ts` — Platform detection for sqlite-vec extension (win32/linux/darwin)
- `electron/extensions/` — Contains vec0.dll (Windows) and vec0.so (Linux)
- `package.json` — postinstall script: `npm rebuild better-sqlite3 sharp`

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`bin/librania.js`** — Already uses path.join() for dist path, path.resolve() for data directory, handles HOME/USERPROFILE env vars
- **`electron/database/vec.ts`** — Platform detection switch statement (win32/linux/darwin), path.join() for extension path
- **`electron/extensions/`** — Has vec0.dll and vec0.so, missing vec0.dylib (macOS not in scope for v2)
- **`package.json` postinstall** — Already runs `npm rebuild better-sqlite3 sharp`

### Established Patterns
- **Path operations** — Consistent use of path.join() in bin/librania.js and electron/server.ts
- **Platform detection** — process.platform switch in vec.ts (win32/linux/darwin)
- **Environment variables** — HOME/USERPROFILE fallback pattern in bin/librania.js line 50
- **Native dependency rebuild** — postinstall script pattern already established

### Integration Points
- **Path audit** — Grep electron/ and bin/ for hardcoded separators, string concatenation with paths
- **Error messages** — Add platform/version context to existing error handling in vec.ts, bin/librania.js
- **Test execution** — Run `npm pack`, `npm install -g`, `librania start` on Ubuntu 22.04 and Windows 10
- **Path edge case tests** — Test with --data-dir flag using each path type (drive letters, spaces, ~, %VAR%)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard cross-platform Node.js patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-cross-platform-validation*
*Context gathered: 2026-05-29*
