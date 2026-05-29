---
phase: 01-foundation-application-shell
plan: 03
subsystem: app-infrastructure
tags: [electron, express, config-management, system-tray, radix-ui, mode-switching]

# Dependency graph
requires:
  - phase: 01-02
    provides: Theme system and collapsible sidebar UI
provides:
  - Dual-mode operation (desktop and web-based modes)
  - Configuration file management with JSON persistence
  - Embedded HTTP server for web mode
  - Window state persistence across sessions
  - System tray integration with mode switching menu
  - Settings UI with Radix Dialog for mode configuration
affects: [02-knowledge-storage, 03-ai-integration]

# Tech tracking
tech-stack:
  added: [express, @radix-ui/react-dialog]
  patterns: [config-management, ipc-handlers, atomic-file-writes, tray-menus]

key-files:
  created:
    - src/config/appConfig.ts
    - src/types/config.ts
    - electron/server.ts
    - electron/windowState.ts
    - electron/tray.ts
    - src/components/ui/Dialog.tsx
    - src/components/Settings/ModeSettings.tsx
    - resources/icon.svg
  modified:
    - electron/main.ts
    - electron/preload.ts
    - src/routes/Settings.tsx
    - src/vite-env.d.ts

key-decisions:
  - "Use JSON config file in project root instead of AppData for easier debugging"
  - "Atomic file writes via temp file + rename for config persistence"
  - "Web mode uses Vite dev server in development, Express in production"
  - "System tray keeps app running when window closed"
  - "Mode switching requires restart (user informed via Radix Dialog)"
  - "SVG icon instead of PNG for better scaling"

patterns-established:
  - "Config management: loadConfig/saveConfig/updateConfig pattern"
  - "IPC handlers: config:get, config:update, mode:switch"
  - "Radix UI wrapper components with Tailwind styling"
  - "Settings page with card layout and section organization"

requirements-completed: [APP-02, APP-03]

# Metrics
duration: 7h 34min (split across two sessions)
completed: 2026-05-25
---

# Phase 1 Plan 3: Mode Switching & Configuration Summary

**Dual-mode Electron app with desktop/web operation, JSON config persistence, system tray integration, and Radix Dialog-based Settings UI**

## Performance

- **Duration:** 7h 34min (Tasks 1-3: 6min, Checkpoint verification, Tasks 4-5: 7h 28min)
- **Started:** 2026-05-25T00:13:54+07:00
- **Completed:** 2026-05-25T07:47:50+07:00
- **Tasks:** 5 (3 TDD tasks, 1 checkpoint, 1 UI task)
- **Files modified:** 21

## Accomplishments

- Configuration system with atomic JSON file writes and mode persistence
- Embedded Express server serving React app in web mode (production only)
- Window bounds persistence and system tray with mode switching menu
- Settings UI with Radix Dialog for restart confirmation
- Dev/prod mode clarity: Vite dev server in development, Express/file:// in production

## Task Commits

Each task was committed atomically:

1. **Task 1: Configuration file management with mode persistence** - `b32b447` (feat)
   - TDD: `src/config/appConfig.test.ts` → `src/config/appConfig.ts`
   - Config stored in project root as `config.json`
   - Atomic writes via temp file + rename

2. **Task 2: Embedded HTTP server for web mode with dev/prod clarity** - `6305340` (feat)
   - TDD: `electron/server.test.ts` → `electron/server.ts`
   - Express serves static files from dist/ in production
   - Vite dev server used in development (no Express)

3. **Task 3: Window state persistence and system tray** - `b835ffc` (feat)
   - TDD: `electron/windowState.test.ts`, `electron/tray.test.ts` → implementations
   - Window bounds save/restore across sessions
   - System tray with Show/Hide, Mode submenu, Quit

4. **Task 4: Checkpoint - Human verification** - Verified and approved
   - Desktop mode, web mode, tray functionality, config persistence all verified

5. **Task 5: Settings UI for mode switching with Radix Dialog** - `6fa4626` (feat)
   - Radix Dialog wrapper component with Tailwind styling
   - ModeSettings component with desktop/web radio selection
   - Restart confirmation dialog on mode change

**Auto-fixes:**
- `21dfb37` (fix) - Externalize Node built-ins and move config to project root
- `f80c7bd` (fix) - Prevent duplicate Electron instances

## Files Created/Modified

**Configuration:**
- `src/config/appConfig.ts` - Config file management (load/save/update)
- `src/types/config.ts` - AppConfig interface and defaults
- `config.json` - User configuration file (gitignored)

**Electron Main Process:**
- `electron/main.ts` - Mode switching logic, IPC handlers, server startup
- `electron/server.ts` - Express HTTP server for web mode
- `electron/windowState.ts` - Window bounds persistence
- `electron/tray.ts` - System tray integration
- `electron/preload.ts` - IPC API exposure (getConfig, updateConfig, switchMode)

**UI Components:**
- `src/components/ui/Dialog.tsx` - Radix Dialog wrapper with Tailwind
- `src/components/Settings/ModeSettings.tsx` - Mode selection UI
- `src/routes/Settings.tsx` - Settings page layout

**Assets:**
- `resources/icon.svg` - Placeholder app icon (indigo circle with "L")

**Tests:**
- `src/config/appConfig.test.ts` - Config management tests
- `electron/server.test.ts` - HTTP server tests
- `electron/windowState.test.ts` - Window state tests
- `electron/tray.test.ts` - System tray tests

## Decisions Made

1. **Config location:** Store config.json in project root instead of AppData
   - Rationale: Easier debugging during development, simpler path resolution

2. **Atomic file writes:** Write to temp file then rename
   - Rationale: Prevents corruption if write interrupted

3. **Web mode dev/prod split:** Vite dev server in dev, Express in prod
   - Rationale: Preserve HMR in development, serve static files in production

4. **System tray persistence:** App stays running when window closed
   - Rationale: Quick access via tray icon, common desktop app pattern

5. **Mode switching requires restart:** Show Radix Dialog confirmation
   - Rationale: Electron architecture requires restart to switch between native window and web server modes

6. **SVG icon instead of PNG:** Use vector format for app icon
   - Rationale: Better scaling, smaller file size, easier to edit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Externalized Node built-ins for Vite bundling**
- **Found during:** Task 2 (HTTP server implementation)
- **Issue:** Vite attempting to bundle Node.js built-ins (fs, path, http) causing build errors
- **Fix:** Added `external: ['electron', 'express', 'fs', 'path', 'http']` to vite.config.ts
- **Files modified:** vite.config.ts
- **Verification:** Build succeeds, server starts correctly
- **Committed in:** 21dfb37 (fix commit)

**2. [Rule 3 - Blocking] Moved config to project root to avoid AppData path issues**
- **Found during:** Task 1 (Config file management)
- **Issue:** app.getPath('userData') not available in renderer process, path resolution complex
- **Fix:** Changed getConfigPath() to use process.cwd() instead of app.getPath('userData')
- **Files modified:** src/config/appConfig.ts
- **Verification:** Config reads/writes successfully, tests pass
- **Committed in:** 21dfb37 (fix commit)

**3. [Rule 3 - Blocking] Prevented duplicate Electron instances**
- **Found during:** Task 2 verification (app launching multiple times)
- **Issue:** app.requestSingleInstanceLock() not implemented, multiple instances could run
- **Fix:** Added single instance lock in electron/main.ts, second instance focuses first
- **Files modified:** electron/main.ts
- **Verification:** Second launch focuses existing window instead of creating new instance
- **Committed in:** f80c7bd (fix commit)

**4. [Rule 1 - Bug] Fixed unused import in appConfig.ts**
- **Found during:** Task 5 (TypeScript compilation)
- **Issue:** `import { app } from 'electron'` declared but never used
- **Fix:** Removed unused import
- **Files modified:** src/config/appConfig.ts
- **Verification:** TypeScript compilation succeeds
- **Committed in:** 6fa4626 (Task 5 commit)

---

**Total deviations:** 4 auto-fixed (3 blocking issues, 1 bug)
**Impact on plan:** All auto-fixes necessary for correct operation. Config location change simplifies development workflow. No scope creep.

## Issues Encountered

None - all planned functionality implemented successfully after auto-fixes.

## User Setup Required

None - no external service configuration required.

## Threat Surface

No new security-relevant surface introduced beyond plan's threat model:
- HTTP server binds to localhost only (T-01-06 mitigated)
- Config file tampering accepted (user's own preferences, T-01-07)
- Port conflict handling implemented (T-01-08 mitigated)
- Mode value validation with allowed values only (T-01-09 mitigated)

## Known Stubs

None - all functionality fully wired. Mode switching, config persistence, tray integration, and Settings UI are production-ready.

## Next Phase Readiness

**Ready for Phase 2 (Knowledge Storage):**
- Configuration system available for database path and settings
- Window state management ready for editor/viewer layouts
- Mode switching infrastructure supports future web-based deployment

**Blockers:** None

**Notes:**
- better-sqlite3 will be added in Phase 2 for note storage
- Theme persistence already working via localStorage (Plan 02)
- Radix UI Dialog pattern established for future confirmation dialogs

---

## Self-Check: PASSED

**Files verified:**
- ✓ src/config/appConfig.ts exists
- ✓ src/types/config.ts exists
- ✓ electron/server.ts exists
- ✓ electron/windowState.ts exists
- ✓ electron/tray.ts exists
- ✓ src/components/ui/Dialog.tsx exists
- ✓ src/components/Settings/ModeSettings.tsx exists
- ✓ resources/icon.svg exists

**Commits verified:**
- ✓ b32b447 exists (Task 1)
- ✓ 6305340 exists (Task 2)
- ✓ b835ffc exists (Task 3)
- ✓ 6fa4626 exists (Task 5)
- ✓ 21dfb37 exists (auto-fix)
- ✓ f80c7bd exists (auto-fix)

---
*Phase: 01-foundation-application-shell*
*Completed: 2026-05-25*
