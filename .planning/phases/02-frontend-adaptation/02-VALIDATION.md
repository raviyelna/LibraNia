# Phase 2: Frontend Adaptation - Validation Architecture

**Phase:** 02-frontend-adaptation
**Created:** 2026-05-29
**Framework:** Vitest 4.1.7 + @testing-library/react 16.3.2

## Nyquist Validation Strategy

Phase 2 migrates frontend from Electron IPC to HTTP/WebSocket. Validation ensures zero `window.api.*` calls remain and all features work in browser.

### Validation Layers

| Layer | What | How | When |
|-------|------|-----|------|
| **Unit** | API client methods, hooks, components | Vitest + @testing-library/react | Per task commit |
| **Integration** | HTTP/WebSocket communication | Vitest with mock server | Per wave |
| **Build** | Frontend compiles as static assets | `npm run build` | Per wave |
| **Browser** | Features work in browser | Manual testing | End of phase |

### Automated Validation Commands

#### Per-Task Validation

```bash
# API client tests (Plan 02-01)
npm test -- src/api/client.test.ts --run

# Socket context tests (Plan 02-02)
npm test -- src/contexts/SocketContext.test.tsx --run

# Hook tests (Plan 02-03)
npm test -- src/hooks --run

# Build validation (Plan 02-04)
npm run build && test -f dist/index.html && test -d dist/assets
```

#### Wave-Level Validation

```bash
# Wave 1: API client + Socket.IO infrastructure
npm test -- src/api src/contexts --run
npm run build

# Wave 2: Hook migration + build configuration
npm test -- src/hooks --run
npm run build
grep -r "window\.api" src --include="*.ts" --include="*.tsx" | wc -l | grep -q "^0$"
```

#### Phase-Level Validation

```bash
# Full test suite
npm test

# TypeScript compilation
npm run build

# Zero window.api calls
grep -r "window\.api" src --include="*.ts" --include="*.tsx" | wc -l | grep -q "^0$"

# Static assets exist
test -f dist/index.html && test -d dist/assets

# Backend serves frontend
grep -q "express.static.*dist" electron/server.ts
```

### Requirement Coverage Map

| Requirement | Validation Method | Automated Command | Success Criteria |
|-------------|-------------------|-------------------|------------------|
| **FRONT-01** | Grep for window.api calls | `grep -r "window\.api" src --include="*.ts" --include="*.tsx" \| wc -l \| grep -q "^0$"` | Zero matches found |
| **FRONT-02** | API client tests + hook tests | `npm test -- src/api src/hooks --run` | All tests pass |
| **FRONT-03** | ContentUpload component test | `npm test -- src/components/ContentUpload.test.tsx --run` | Upload with progress works |
| **FRONT-04** | Build validation | `npm run build && test -f dist/index.html` | Static assets in dist/ |
| **FRONT-05** | Manual browser testing | See Browser Validation Checklist below | All features work |

### Browser Validation Checklist

**Setup:**
1. Build frontend: `npm run build`
2. Start backend: `node dist-electron/server.js` or `npx tsx electron/server.ts`
3. Open browser: http://localhost:3000
4. Open DevTools (Console + Network tabs)

**Feature Tests:**

- [ ] **Notes CRUD**
  - Create note → POST /api/notes returns 200
  - Edit note → PUT /api/notes/:id returns 200
  - Delete note → DELETE /api/notes/:id returns 200
  - List notes → GET /api/notes returns 200
  - Expected: All operations work, notes persist

- [ ] **Search**
  - Text search → POST /api/search returns 200
  - Semantic search → POST /api/search/semantic returns 200
  - Expected: Search results appear

- [ ] **Tags**
  - Create tag → POST /api/tags returns 200
  - Add tag to note → POST /api/tags/note/:noteId returns 200
  - Remove tag → DELETE /api/tags/note/:noteId/:tagId returns 200
  - Expected: Tag operations work

- [ ] **Content Upload**
  - Click upload zone → file picker opens
  - Select file → progress bar shows 0-100%
  - Upload completes → POST /api/content/upload returns 200
  - Drag-drop file → same behavior
  - Expected: Upload with progress tracking works

- [ ] **AI Chat**
  - Send message → socket.emit('ai:chat')
  - Streaming response → socket.on('ai:token') fires multiple times
  - Response appears token-by-token in UI
  - Expected: Streaming chat works

- [ ] **Real-time Updates**
  - Open two browser tabs
  - Edit note in tab 1 → socket.emit('note:updated')
  - Tab 2 receives socket.on('note:updated') and updates UI
  - Expected: Real-time sync works

- [ ] **Socket.IO Connection**
  - Console shows "Socket.IO connected" on load
  - Network tab shows WebSocket connection to /
  - Stop backend → toast shows "Connection lost - reconnecting..."
  - Restart backend → toast shows reconnection, features work again
  - Expected: Connection management works

- [ ] **Error Handling**
  - Stop backend, try to create note → toast shows "Connection failed - check your network"
  - Invalid input → toast shows validation error
  - Expected: User-friendly error messages

**Failure Indicators:**

- ❌ Console error: "window.api is not defined" → window.api calls not fully removed
- ❌ Console error: "useSocket must be used within SocketProvider" → SocketProvider not wrapping component
- ❌ Network error: "Failed to fetch" with no toast → handleAPIError not called
- ❌ Upload shows no progress → XMLHttpRequest not used (fetch doesn't support upload progress)
- ❌ Multiple "Socket.IO connected" messages → multiple socket instances (reconnection storm)

### Test Coverage Targets

| Component | Coverage Target | Rationale |
|-----------|----------------|-----------|
| API client (src/api/client.ts) | 90%+ | Critical path, error handling must be tested |
| Domain APIs (src/api/*.ts) | 70%+ | Straightforward wrappers, integration tests cover most |
| Socket context (src/contexts/SocketContext.tsx) | 80%+ | Connection management is critical |
| Hooks (src/hooks/*.ts) | 60%+ | Complex logic tested, simple wrappers can be lower |
| Components (src/components/*.tsx) | 50%+ | Visual components, manual testing supplements |

### Known Test Gaps

**Wave 0 (to be created during execution):**
- `src/api/client.test.ts` — Base fetch wrapper with error handling
- `src/contexts/SocketContext.test.tsx` — Socket.IO connection provider
- `src/components/ContentUpload.test.tsx` — File upload with progress

**Existing tests to update:**
- Hook tests in `src/hooks/*.test.ts` — Update to use API client mocks instead of window.api mocks

### Verification Gates

**Per-Task Gate:**
```bash
# Must pass before task marked done
npm test -- <test-file> --run
npm run build  # TypeScript must compile
```

**Per-Wave Gate:**
```bash
# Must pass before wave marked complete
npm test  # Full suite
npm run build
grep -r "window\.api" src --include="*.ts" --include="*.tsx" | wc -l | grep -q "^0$"
```

**Phase Gate (before /gsd-verify-work):**
```bash
# All automated checks pass
npm test
npm run build
grep -r "window\.api" src --include="*.ts" --include="*.tsx" | wc -l | grep -q "^0$"

# Manual browser testing complete
# See Browser Validation Checklist above
```

### Regression Prevention

**After Phase 2, these should NEVER return:**
- `window.api.*` calls in src/ directory
- Electron IPC imports (ipcRenderer, contextBridge)
- vite-plugin-electron in vite.config.ts
- Electron dialog API usage

**Automated regression check:**
```bash
# Add to CI/CD pipeline
grep -r "window\.api" src --include="*.ts" --include="*.tsx" && exit 1
grep -r "ipcRenderer\|contextBridge" src --include="*.ts" --include="*.tsx" && exit 1
grep "vite-plugin-electron" vite.config.ts && exit 1
```

## Summary

Phase 2 validation uses three layers:
1. **Automated tests** (unit + integration) run per task/wave
2. **Build validation** ensures TypeScript compiles and static assets generated
3. **Manual browser testing** verifies features work end-to-end

The critical gate is **FRONT-01 coverage** — zero `window.api.*` calls must remain. This is verified via grep at wave-level and phase-level gates.
