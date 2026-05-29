# Phase 2: Frontend Adaptation - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace Electron IPC (`window.api.*`) with HTTP/WebSocket clients. Frontend becomes static web app served by backend. All existing features (notes, chat, graph, library) work in browser.

</domain>

<decisions>
## Implementation Decisions

### API Client Architecture
- **D-01:** Centralized API client class — single class with methods for all endpoints, easier to add auth headers, retry logic, base URL config
- **D-02:** Split by domain — organize as `src/api/notes.ts`, `src/api/chat.ts`, etc. to mirror backend route structure
- **D-03:** Base URL from environment variable — `VITE_API_URL` with fallback to `localhost:3000`, standard Vite pattern
- **D-04:** Keep existing hooks, swap calls — minimal refactor, just replace `window.api.*` with `apiClient.*` calls

### Real-time Updates
- **D-05:** Socket.IO client — reuse Socket.IO from Phase 1, backend already has Socket.IO server configured
- **D-06:** Single global connection — connect once in `App.tsx`, pass via context to avoid multiple connections
- **D-07:** Hooks register listeners — hooks call `socket.on()` and clean up on unmount, matches current `window.api.notes.onUpdated` pattern
- **D-08:** Show toast notification on disconnect — user knows connection dropped, can retry manually

### File Upload Flow
- **D-09:** Both drag-drop and browse — drag-drop zone that also accepts clicks to browse, best UX
- **D-10:** FormData POST — POST to `/api/content/upload` with FormData, backend (Phase 1) already has Multer configured
- **D-11:** Progress bar — show upload percentage, standard pattern for large files
- **D-12:** Error toast on upload failure — show error toast with message, user can retry manually

### Error Handling
- **D-13:** Toast notifications — non-blocking, consistent pattern across app
- **D-14:** Global boundary + API client — error boundary catches React errors, API client catches fetch errors, both show toasts
- **D-15:** Different messages by error type — network errors get 'Connection failed', API errors show backend message
- **D-16:** Console.error logging — simple, works in dev and prod, user can check browser console

### Claude's Discretion
- Toast notification library choice (react-hot-toast, sonner, or custom)
- Socket.IO reconnection configuration (retry interval, max attempts)
- Progress bar implementation (native progress element or library)
- Error boundary fallback UI design

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — FRONT-01 through FRONT-05 define Phase 2 scope

### Architecture
- `.planning/ROADMAP.md` §Phase 2 — success criteria and dependencies
- `.planning/phases/01-backend-extraction/01-CONTEXT.md` — Phase 1 decisions about backend API structure

### Backend Implementation
- `.planning/phases/01-backend-extraction/01-01-SUMMARY.md` — Socket.IO setup, Multer config, encryption service
- `.planning/phases/01-backend-extraction/01-03-SUMMARY.md` — HTTP routes for notes, content, search, tags, export, config

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Hooks** (`src/hooks/`): `useNotes`, `useChat`, `useGraph`, `useContent`, `useSearch` — already structured for data fetching, just need to swap IPC calls for HTTP/WebSocket
- **Components** (`src/components/`): Chat, Notes, Graph, Settings, Export — UI components ready, no changes needed beyond hook updates
- **Types** (`src/types/`): Note, Content, Graph interfaces already defined
- **Error boundary** (`src/components/ErrorBoundary.tsx`): Already exists, can be extended for global error handling

### Established Patterns
- **Hook-based data fetching**: All data access goes through custom hooks, not direct API calls in components
- **Component organization**: One directory per feature (Chat, Notes, Graph), components stay focused
- **TypeScript interfaces**: Strong typing for all data structures

### Integration Points
- **App.tsx**: Root component where Socket.IO connection should be initialized
- **Hooks**: 6 hooks (`useNotes`, `useChat`, `useGraph`, `useContent`, `useSearch`, `useExport`) need `window.api.*` replaced
- **ContentUpload.tsx**: Currently calls `window.api.content.upload()` — needs HTML file input
- **Vite config**: Need to add `VITE_API_URL` env var support

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 2-Frontend Adaptation*
*Context gathered: 2026-05-29*
