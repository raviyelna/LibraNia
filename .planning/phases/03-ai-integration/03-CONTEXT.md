# Phase 3: AI Integration - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-provider AI integration with chat interface and research capabilities. Users can configure AI providers (Claude CLI, OpenAI, DeepSeek), interact through a chat interface, and receive AI-generated answers with citations from both web search and model knowledge.

</domain>

<decisions>
## Implementation Decisions

### Provider Abstraction
- **D-01:** Unified interface pattern — single AIProvider interface, each provider implements it (matches existing service pattern from Phase 2)
- **D-02:** Streaming responses — tokens arrive as generated, better UX
- **D-03:** Retry with exponential backoff — handles transient failures (1s, 2s, 4s)
- **D-04:** Provider config in main config.json — consistent with Phase 1 config pattern
- **D-05:** Validate API keys on save — immediate feedback, catches errors early
- **D-06:** Show provider name in chat UI — full transparency (e.g., "Claude Sonnet 4" badge)
- **D-07:** Allow switching providers mid-conversation — flexible, user can compare providers

### Chat UI Pattern
- **D-08:** Chat in main content area — replaces note editor when active, matches existing layout pattern
- **D-09:** Persistent conversations — saved to database, can resume later (matches note persistence)
- **D-10:** Conversation list in sidebar — easy to browse history, matches note list pattern
- **D-11:** Auto-generate conversation titles — from first message (first 50 chars), no user input needed

### Research Flow
- **D-12:** Parallel execution — web search + model knowledge run simultaneously, merge results (faster UX)
- **D-13:** Built-in web search — Brave Search API or similar, integrated (not provider-native)
- **D-14:** Fetch top 5 web results — balances coverage with noise
- **D-15:** Show progress indicator — "Searching web...", "Generating answer..." (better UX)

### Citation Format
- **D-16:** Inline footnotes [1], [2] with sources list at bottom — standard academic format
- **D-17:** Clickable citation links — open in external browser
- **D-18:** Show title + domain for each citation — e.g., "React Docs - react.dev"
- **D-19:** Store citations with answer — preserved in database for long-term reference

### Model Selection UX
- **D-20:** Per-provider model selection — Claude: sonnet/opus, GPT: 4/4o, DeepSeek: chat/coder
- **D-21:** Configure in Settings panel — centralized config, matches Mode Settings pattern
- **D-22:** Hardcoded model list — simple, works for known models (update code for new models)
- **D-23:** Show model name in chat UI — full transparency (e.g., "Claude Sonnet 4" badge)

### API Key Storage
- **D-24:** Encrypted storage — electron-store with encryption, protects keys at rest
- **D-25:** Masked input in settings UI — show dots, reveal button (prevents shoulder-surfing)
- **D-26:** Separate encryption key — generated on first launch, stored in OS keychain
- **D-27:** Show security warning — "API keys are encrypted but stored locally. Keep your machine secure."

### Claude's Discretion
None — all areas had explicit decisions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — AI-01 through AI-10 requirements for this phase
- `.planning/PROJECT.md` — Core value (multi-model verification), constraints (local-first)

### Prior Phase Context
- `.planning/phases/01-foundation-application-shell/01-CONTEXT.md` — IPC pattern, config management, Settings UI pattern
- `.planning/phases/02-core-knowledge-management/02-CONTEXT.md` — Database schema, service layer pattern, React hooks pattern

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Dialog/Button components** (`src/components/ui/`) — reuse for AI provider settings UI
- **IPC handler pattern** (`electron/ipc/*.handlers.ts`) — create `ai.handlers.ts` for chat/research
- **React hooks pattern** (`src/hooks/useNotes.ts`) — create `useChat.ts`, `useAI.ts` following same pattern
- **Settings UI pattern** (`src/components/Settings/ModeSettings.tsx`) — create `AIProviderSettings.tsx` following same structure

### Established Patterns
- **Config management** — `window.api.getConfig()` / `setConfig()` pattern from Phase 1
- **Service layer** — `electron/services/notes.service.ts` → create `ai.service.ts` for provider abstraction
- **Database schema** — Drizzle ORM with better-sqlite3, add `conversations` and `messages` tables
- **IPC communication** — renderer calls `window.api.*`, main process handles via `ipcMain.handle()`

### Integration Points
- **Settings panel** — add AI provider configuration alongside Mode Settings
- **Sidebar navigation** — add "Chat" route alongside "Notes"
- **Main content area** — chat UI replaces note editor when active (route-based switching)
- **Database** — extend schema with `conversations`, `messages`, `citations` tables

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for AI integration patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 3-AI Integration*
*Context gathered: 2026-05-25*
