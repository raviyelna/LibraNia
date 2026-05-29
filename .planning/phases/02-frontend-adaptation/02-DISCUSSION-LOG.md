# Phase 2: Frontend Adaptation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 2-frontend-adaptation
**Areas discussed:** API Client Architecture, Real-time Updates, File Upload Flow, Error Handling

---

## API Client Architecture

### How should frontend talk to backend?

| Option | Description | Selected |
|--------|-------------|----------|
| Centralized API client class | Single ApiClient class with methods for all endpoints. Hooks call client methods. Easier to add auth headers, retry logic, base URL config. | ✓ |
| Per-hook fetch calls | Each hook does its own fetch(). Simpler, no abstraction layer. Harder to add cross-cutting concerns later. | |
| You decide | Claude picks the approach that best fits the codebase patterns. | |

**User's choice:** Centralized API client class (Recommended)

### How should the API client be organized?

| Option | Description | Selected |
|--------|-------------|----------|
| Single file with all methods | Single file (e.g., src/api/client.ts) with all methods. Simple, easy to find. | |
| Split by domain | Split by domain (src/api/notes.ts, src/api/chat.ts, etc). Mirrors backend route structure. | ✓ |
| You decide | Claude picks the structure that best fits the codebase. | |

**User's choice:** Split by domain (Recommended)

### How should frontend know the backend URL?

| Option | Description | Selected |
|--------|-------------|----------|
| Environment variable | Base URL from env var (VITE_API_URL) with fallback to localhost:3000. Standard Vite pattern. | ✓ |
| Hardcoded localhost | Hardcoded localhost:3000 in code. Simple but not flexible. | |
| Runtime config endpoint | Runtime config endpoint (/api/config) that returns base URL. More complex. | |
| You decide | Claude picks the approach. | |

**User's choice:** Environment variable (Recommended)

### Should hooks be refactored or just updated?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing hooks, swap calls | Hooks stay as-is, just swap window.api.* calls for apiClient.* calls. Minimal refactor. | ✓ |
| Migrate to TanStack Query | Rewrite hooks to use TanStack Query (useQuery/useMutation). Better caching, but bigger refactor. | |
| You decide | Claude picks the approach. | |

**User's choice:** Keep existing hooks, swap calls (Recommended)

---

## Real-time Updates

### How should frontend connect for real-time updates?

| Option | Description | Selected |
|--------|-------------|----------|
| Socket.IO client | Reuse Socket.IO from Phase 1. Backend already has Socket.IO server. Just add socket.io-client to frontend. | ✓ |
| Native WebSocket | Native WebSocket. Lighter weight, but need to handle reconnection manually. | |
| You decide | Claude picks the approach. | |

**User's choice:** Socket.IO client (Recommended)

### How should socket connections be managed?

| Option | Description | Selected |
|--------|-------------|----------|
| Single global connection | Single global socket connection shared across all hooks. Connect once in App.tsx, pass via context. | ✓ |
| Per-hook connections | Each hook creates its own socket connection. Simpler but more connections. | |
| You decide | Claude picks the approach. | |

**User's choice:** Single global connection (Recommended)

### How should components listen for real-time events?

| Option | Description | Selected |
|--------|-------------|----------|
| Hooks register listeners | Hooks register listeners (socket.on) and clean up on unmount. Matches current pattern with window.api.notes.onUpdated. | ✓ |
| Event bus pattern | Central event bus that hooks subscribe to. More abstraction, decouples from Socket.IO. | |
| You decide | Claude picks the approach. | |

**User's choice:** Hooks register listeners (Recommended)

### What happens when socket connection drops?

| Option | Description | Selected |
|--------|-------------|----------|
| Show toast notification | Show toast notification. User knows connection dropped, can retry manually. | ✓ |
| Auto-retry silently | Auto-retry silently. Socket.IO handles this by default. User doesn't see anything unless retry fails. | |
| Reconnecting indicator | Show reconnecting indicator in UI. More visible feedback. | |
| You decide | Claude picks the approach. | |

**User's choice:** Show toast notification (Recommended)

---

## File Upload Flow

### How should users upload files?

| Option | Description | Selected |
|--------|-------------|----------|
| File input with browse button | HTML file input with click to browse. Simple, works everywhere. Matches standard web pattern. | |
| Drag-and-drop zone | Drag-and-drop zone. More modern UX, but needs fallback for mobile. | |
| Both drag-drop and browse | Both: drag-drop zone that also accepts clicks to browse. Best UX, slightly more code. | ✓ |
| You decide | Claude picks the approach. | |

**User's choice:** Both drag-drop and browse

### How should files be sent to backend?

| Option | Description | Selected |
|--------|-------------|----------|
| FormData POST | POST to /api/content/upload with FormData. Backend (Phase 1) already has Multer configured for this. | ✓ |
| Base64 in JSON | Base64 encode file and send in JSON body. Simpler client code, but larger payload (33% overhead). | |
| You decide | Claude picks the approach. | |

**User's choice:** FormData POST (Recommended)

### How should upload progress be shown?

| Option | Description | Selected |
|--------|-------------|----------|
| Progress bar | Progress bar showing upload percentage. Standard pattern, good feedback for large files. | ✓ |
| Spinner only | Spinner with no percentage. Simpler, but user doesn't know how long to wait. | |
| No indicator | No indicator, just disable button. Minimal UI, but confusing for slow uploads. | |
| You decide | Claude picks the approach. | |

**User's choice:** Progress bar (Recommended)

### What happens when upload fails?

| Option | Description | Selected |
|--------|-------------|----------|
| Error toast | Show error toast with message. User can retry manually. | ✓ |
| Auto-retry then error | Auto-retry 3 times, then show error. Better for transient network issues. | |
| Inline error message | Show error inline in upload component. More contextual. | |
| You decide | Claude picks the approach. | |

**User's choice:** Error toast (Recommended)

---

## Error Handling

### How should errors be displayed to users?

| Option | Description | Selected |
|--------|-------------|----------|
| Toast notifications | Toast notifications for all errors. Non-blocking, consistent pattern across app. | ✓ |
| Modal dialogs | Modal dialogs for errors. More prominent, but blocks user. | |
| Inline messages | Inline error messages in components. More contextual, but inconsistent. | |
| You decide | Claude picks the approach. | |

**User's choice:** Toast notifications (Recommended)

### Where should errors be caught?

| Option | Description | Selected |
|--------|-------------|----------|
| Global boundary + API client | Global error boundary catches React errors, API client catches fetch errors. Both show toasts. | ✓ |
| Per-component handling | Each component handles its own errors. More granular control, but repetitive. | |
| You decide | Claude picks the approach. | |

**User's choice:** Global boundary + API client (Recommended)

### What should error messages say?

| Option | Description | Selected |
|--------|-------------|----------|
| Different messages by error type | Network errors: 'Connection failed, check your network'. API errors: show backend message. Clear, actionable. | ✓ |
| Generic message for all | Generic 'Something went wrong' for all errors. Simpler, but less helpful. | |
| Full error details | Show full error details (stack trace, status code). Good for debugging, bad UX. | |
| You decide | Claude picks the approach. | |

**User's choice:** Different messages by error type (Recommended)

### Should errors be logged anywhere?

| Option | Description | Selected |
|--------|-------------|----------|
| Console.error | Log to console.error. Simple, works in dev and prod. User can check browser console. | ✓ |
| Backend logging endpoint | Send to backend logging endpoint. Centralized logs, but adds complexity. | |
| No logging | No logging, just show toast. Minimal, but harder to debug. | |
| You decide | Claude picks the approach. | |

**User's choice:** Console.error (Recommended)

---

## Claude's Discretion

- Toast notification library choice (react-hot-toast, sonner, or custom)
- Socket.IO reconnection configuration (retry interval, max attempts)
- Progress bar implementation (native progress element or library)
- Error boundary fallback UI design

## Deferred Ideas

None — discussion stayed within phase scope
