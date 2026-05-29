---
phase: 02-frontend-adaptation
plan: 03
subsystem: frontend-hooks-migration
tags: [http-api, socket.io, hooks, file-upload, ipc-removal]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [migrated-hooks, file-upload-with-progress, zero-ipc-in-hooks]
  affects: [src/hooks/*, src/components/ContentUpload.tsx, src/api/graph.ts]
tech_stack:
  added: [graph API module]
  patterns: [HTTP API for CRUD, Socket.IO for real-time, XMLHttpRequest for upload progress]
key_files:
  created:
    - src/api/graph.ts
  modified:
    - src/hooks/useNotes.ts
    - src/hooks/useContent.ts
    - src/hooks/useChat.ts
    - src/hooks/useSearch.ts
    - src/hooks/useTags.ts
    - src/hooks/useAIProviders.ts
    - src/hooks/useConversations.ts
    - src/hooks/useGraph.ts
    - src/components/ContentUpload.tsx
    - src/api/content.ts
    - src/api/index.ts
    - src/types/graph.ts
decisions:
  - id: D-02-03-01
    title: Migrate 8 hooks completely, defer remaining components
    rationale: Plan scoped to 7 hooks + discovered useGraph. Remaining 23 window.api calls in components require backend routes that don't exist yet (links, export, app config)
  - id: D-02-03-02
    title: Add graph API module as critical functionality
    rationale: useGraph hook required graph API to function. Backend routes exist, API module was missing (Rule 2 - auto-add missing critical functionality)
  - id: D-02-03-03
    title: Align graph types to use 'links' not 'edges'
    rationale: Frontend GraphData interface uses 'links', backend returns 'edges'. API layer transforms to match frontend expectations
metrics:
  duration: 540s
  completed: 2026-05-29T04:33:19Z
  tasks_completed: 6
  hooks_migrated: 8
  window_api_eliminated: 32
  window_api_remaining: 23
---

# Phase 02 Plan 03: Migrate Hooks to HTTP/WebSocket Summary

**One-liner:** Migrated 8 core hooks from Electron IPC to HTTP API and Socket.IO, added file upload with XMLHttpRequest progress tracking, eliminated 32 of 55 window.api call sites

## What Was Built

Replaced all window.api.* calls in 8 hooks with HTTP API client or Socket.IO. Added uploadContent function with XMLHttpRequest for progress tracking. Enhanced ContentUpload component with drag-drop. Created graph API module for useGraph hook. All migrated hooks now use handleAPIError for consistent error handling with toast notifications.

**Key capabilities:**
- Notes CRUD via HTTP API (useNotes)
- Content management via HTTP API (useContent)
- File upload with progress tracking via XMLHttpRequest
- AI chat streaming via Socket.IO (useChat)
- Real-time note updates via Socket.IO events
- Search, tags, AI providers, conversations via HTTP API
- Graph data fetching via HTTP API (useGraph)
- Drag-drop file upload with visual feedback

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate useNotes hook to HTTP API | a592ab6 | src/hooks/useNotes.ts |
| 2 | Add uploadContent and migrate useContent | 51b4929 | src/api/content.ts, src/hooks/useContent.ts |
| 3 | Migrate useChat to Socket.IO | ecbaaa1 | src/hooks/useChat.ts |
| 4 | Migrate useSearch, useTags, useAIProviders, useConversations | 4846a7a | src/hooks/useSearch.ts, src/hooks/useTags.ts, src/hooks/useAIProviders.ts, src/hooks/useConversations.ts |
| 5 | Enhance ContentUpload with drag-drop | db686e5 | src/components/ContentUpload.tsx |
| 6 | Add graph API and migrate useGraph | 42cb3b0, 4270f20 | src/api/graph.ts, src/hooks/useGraph.ts, src/types/graph.ts |

## Deviations from Plan

### Auto-added Missing Critical Functionality

**1. [Rule 2 - Missing API Module] Created graph API module**
- **Found during:** Task 6 verification
- **Issue:** useGraph hook had window.api.graph.getData() call but no graph API module existed
- **Fix:** Created src/api/graph.ts with getData, createNode, updateNode, deleteNode, createEdge, deleteEdge methods
- **Files created:** src/api/graph.ts
- **Commit:** 42cb3b0

**2. [Rule 2 - Type Alignment] Fixed graph API type mismatch**
- **Found during:** TypeScript compilation after graph API creation
- **Issue:** Backend returns 'edges', frontend GraphData expects 'links'. GraphLink type missing 'citation' option
- **Fix:** API layer transforms edges→links. Added 'citation' to GraphLink type union
- **Files modified:** src/api/graph.ts, src/types/graph.ts, src/hooks/useGraph.ts
- **Commit:** 4270f20

### Scope Boundary - Remaining window.api Calls

**Task 6 verification found 23 remaining window.api calls in 10 files:**

| File | Count | Reason Not Migrated |
|------|-------|---------------------|
| src/components/Export/ExportDialog.tsx | 8 | Requires backend export routes (selectDirectory, markdown, json, selectFile) |
| src/routes/Chat.tsx | 3 | Requires backend conversation routes (create, rename, delete) - partially covered by conversationsAPI |
| src/components/Chat/ChatInterface.tsx | 3 | Requires backend AI routes (getMessages, chat) |
| src/components/Settings/ModeSettings.tsx | 2 | Requires backend app config routes (getConfig, switchMode) |
| src/components/Chat/CitationList.tsx | 2 | Requires backend shell integration (openExternal) |
| src/routes/Library.tsx | 1 | Requires backend sync route (syncFilesystemToDb) |
| src/hooks/useSemanticLinks.ts | 1 | Requires backend links route (getSemanticLinks) - route doesn't exist |
| src/components/Settings/AIProviderSettings.tsx | 1 | Requires backend config route (updateConfig with tavilyApiKey) |
| src/components/Notes/NoteEditor.tsx | 1 | Requires backend content route (saveImage) |
| src/components/Notes/BacklinksPanel.tsx | 1 | Requires backend links route (getBacklinks) - route doesn't exist |

**Total:** 23 window.api calls remain (out of original 55 documented in RESEARCH.md)

**Why not migrated:** These require backend HTTP routes that either don't exist (links, export, app config) or are in components outside the plan's scope (plan specified 7 hooks + ContentUpload component). Migrating these would require:
1. Creating new backend HTTP routes for links, export, app config
2. Migrating 9 additional components not in plan scope
3. Handling shell integration (openExternal) which has no HTTP equivalent

**Recommendation:** Create follow-up plan (02-05) to add missing backend routes and migrate remaining components.

## Technical Implementation

### Hook Migrations

**useNotes (Task 1):**
- Replaced window.api.notes.* with notesAPI.* (getAll, getById, create, update, delete)
- Replaced window.api.notes.onUpdated with socket.on('note:updated')
- Added handleAPIError for all operations
- Real-time updates via Socket.IO with proper cleanup

**useContent (Task 2):**
- Replaced window.api.content.* with contentAPI.* (getAll, getById, delete)
- Created uploadContent function using XMLHttpRequest for progress tracking
- Updated useUploadContent to accept File parameter and track progress
- Progress callback: `(percent) => setProgress(percent)`

**useChat (Task 3):**
- Replaced window.api.chat.onToken with socket.on('ai:token') in useEffect
- Replaced window.api.chat.send with socket.emit('ai:chat')
- Replaced window.api.chat.summarizeNote with chatAPI.summarizeNote
- Token listener cleanup via socket.off in useEffect return

**useSearch (Task 4):**
- Replaced window.api.search.* with searchAPI.search(query, type) and searchAPI.semantic(query)
- Consolidated quickNav, fullText, fuzzy into single search() method

**useTags (Task 4):**
- Replaced window.api.tags.* with tagsAPI.* (getAll, getByNote, addToNote, removeFromNote)
- Fixed method name: getForNote → getByNote to match API

**useAIProviders (Task 4):**
- Replaced window.api.providers.* with aiAPI.* (getProviders, setConfig, deleteConfig, validateKey)
- Method mapping: getAllConfigs → getProviders, validate → validateKey

**useConversations (Task 4):**
- Replaced window.api.conversation.* with conversationsAPI.* (getAll, getById, delete)
- Method mapping: get → getById

**useGraph (Task 6 deviation):**
- Created graph API module with getData, node CRUD, edge CRUD
- Replaced window.api.graph.getData with graphAPI.getData()
- Replaced window.api.notes.onCreated with socket.on('note:created')
- API transforms backend 'edges' to frontend 'links'

### File Upload Implementation

**uploadContent function (src/api/content.ts):**
```typescript
- Uses XMLHttpRequest instead of fetch for upload progress
- Registers xhr.upload.addEventListener('progress') for progress tracking
- Calculates percent: (e.loaded / e.total) * 100
- Handles load, error, abort events
- Returns Promise<Content>
```

**ContentUpload component (Task 5):**
```typescript
- Added drag-drop zone with onDragOver, onDragLeave, onDrop handlers
- dragActive state for visual feedback
- Dashed border styling with hover states
- Progress bar element showing upload percentage
- Toast notification on successful upload
- Disabled interactions during upload
```

## Verification Results

```bash
# Hooks migrated successfully
✓ 8/8 hooks migrated (useNotes, useContent, useChat, useSearch, useTags, useAIProviders, useConversations, useGraph)

# window.api calls eliminated in migrated files
✓ 0 window.api calls in src/hooks/useNotes.ts
✓ 0 window.api calls in src/hooks/useContent.ts
✓ 0 window.api calls in src/hooks/useChat.ts
✓ 0 window.api calls in src/hooks/useSearch.ts
✓ 0 window.api calls in src/hooks/useTags.ts
✓ 0 window.api calls in src/hooks/useAIProviders.ts
✓ 0 window.api calls in src/hooks/useConversations.ts
✓ 0 window.api calls in src/hooks/useGraph.ts

# Remaining window.api calls (out of scope)
⚠ 23 window.api calls remain in 10 files (components + 1 hook)
⚠ useSemanticLinks.ts requires backend links route (doesn't exist)
⚠ 9 components require backend routes for export, app config, links

# TypeScript compiles
✓ No compilation errors (npx tsc --noEmit exits 0)

# File upload implementation
✓ uploadContent uses XMLHttpRequest for progress
✓ ContentUpload has type="file" input
✓ ContentUpload has drag-drop handlers
```

## Known Stubs

None - all implemented functionality is fully wired.

## Threat Flags

None - all migrations follow threat model:
- T-02-07 (File uploads): Backend validates file types and size (Phase 1)
- T-02-08 (API calls): Error messages sanitized via handleAPIError
- T-02-09 (Socket listeners): Cleanup functions remove listeners on unmount
- T-02-10 (Real-time updates): Backend validates all Socket.IO messages (Phase 1)

## Integration Points

**For downstream plans:**
- All 8 migrated hooks ready for use in components
- File upload with progress tracking available via useUploadContent
- Real-time note updates work via Socket.IO (note:updated, note:created events)
- Graph data fetching works via graphAPI

**Remaining work (recommend Plan 02-05):**
- Create backend HTTP routes for links (getBacklinks, getSemanticLinks)
- Create backend HTTP routes for export (selectDirectory, markdown, json, selectFile)
- Create backend HTTP routes for app config (getConfig, switchMode, updateConfig)
- Migrate 9 components to use new routes
- Migrate useSemanticLinks hook once links routes exist

## Self-Check: PASSED

**Created files exist:**
- ✓ src/api/graph.ts

**Modified files updated:**
- ✓ src/hooks/useNotes.ts (notesAPI, useSocket, handleAPIError)
- ✓ src/hooks/useContent.ts (contentAPI, uploadContent, handleAPIError)
- ✓ src/hooks/useChat.ts (socket.emit, chatAPI, handleAPIError)
- ✓ src/hooks/useSearch.ts (searchAPI, handleAPIError)
- ✓ src/hooks/useTags.ts (tagsAPI, handleAPIError)
- ✓ src/hooks/useAIProviders.ts (aiAPI, handleAPIError)
- ✓ src/hooks/useConversations.ts (conversationsAPI, handleAPIError)
- ✓ src/hooks/useGraph.ts (graphAPI, useSocket, handleAPIError)
- ✓ src/components/ContentUpload.tsx (drag-drop, progress, toast)
- ✓ src/api/content.ts (uploadContent function)
- ✓ src/api/index.ts (export graph API)
- ✓ src/types/graph.ts (added 'citation' type)

**Commits exist:**
- ✓ a592ab6 (Task 1: useNotes)
- ✓ 51b4929 (Task 2: uploadContent + useContent)
- ✓ ecbaaa1 (Task 3: useChat)
- ✓ 4846a7a (Task 4: useSearch, useTags, useAIProviders, useConversations)
- ✓ db686e5 (Task 5: ContentUpload drag-drop)
- ✓ 42cb3b0 (Task 6: graph API + useGraph)
- ✓ 4270f20 (Task 6: graph type alignment)

**TypeScript compiles:**
- ✓ npx tsc --noEmit exits 0

**window.api elimination in scope:**
- ✓ 0 window.api calls in 8 migrated hooks
- ⚠ 23 window.api calls remain in out-of-scope files (documented above)

All verification checks passed for in-scope work. Out-of-scope window.api calls documented for follow-up plan.
