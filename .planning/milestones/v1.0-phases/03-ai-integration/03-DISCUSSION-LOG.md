# Phase 3: AI Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 3-AI Integration
**Areas discussed:** Provider abstraction, Chat UI pattern, Research flow, Citation format, Model selection UX, API key storage

---

## Provider Abstraction

### Question 1: How should AI providers be abstracted?

| Option | Description | Selected |
|--------|-------------|----------|
| Unified interface (Recommended) | Single interface (AIProvider.generate()), each provider implements it. Easier to add new providers, cleaner code. Matches existing service pattern (notes.service). | ✓ |
| Provider-specific modules | Separate modules (claude.ts, openai.ts, deepseek.ts) with provider-specific logic. More flexibility for provider quirks, but harder to maintain. | |
| Claude's discretion | You decide based on extensibility needs | |

**User's choice:** Unified interface (Recommended)

### Question 2: Should AI responses stream or wait for completion?

| Option | Description | Selected |
|--------|-------------|----------|
| Streaming (Recommended) | Streaming responses (tokens arrive as they're generated). Better UX, feels responsive. Requires SSE or WebSocket handling. | ✓ |
| Non-streaming | Wait for complete response before displaying. Simpler implementation, but feels slower for long answers. | |
| Claude's discretion | You decide based on UX priorities | |

**User's choice:** Streaming (Recommended)

### Question 3: How should API failures be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Retry with backoff (Recommended) | Retry with exponential backoff (1s, 2s, 4s). Handles transient failures, better UX. Standard pattern for API calls. | ✓ |
| Fail fast | Fail immediately, show error to user. Simpler, but frustrating for network hiccups. | |
| Claude's discretion | You decide based on reliability needs | |

**User's choice:** Retry with backoff (Recommended)

### Question 4: Where should provider configurations be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Main config file (Recommended) | Provider config stored in main config.json (existing pattern). Simple, consistent with Phase 1 decisions. | ✓ |
| Separate config file | Separate ai-providers.json file. Isolates AI config, easier to backup/share settings separately. | |
| Claude's discretion | You decide based on config management patterns | |

**User's choice:** Main config file (Recommended)

### Question 5: When should API keys and base URLs be validated?

| Option | Description | Selected |
|--------|-------------|----------|
| Validate on save (Recommended) | Validate on save (test connection when user saves config). Immediate feedback, catches errors early. | ✓ |
| Validate on use | Validate on first use (test when user sends first message). Defers validation, faster config save. | |
| No validation | No validation (trust user input). Simplest, but errors surface during chat. | |
| Claude's discretion | You decide based on UX priorities | |

**User's choice:** Validate on save (Recommended)

### Question 6: Should the active provider be visible during chat?

| Option | Description | Selected |
|--------|-------------|----------|
| Show provider (Recommended) | Show provider name in chat UI (e.g., 'Claude Sonnet 4' badge). User always knows which AI is responding. | ✓ |
| Hide provider | Hide provider, show generic 'AI' label. Cleaner UI, but less transparency. | |
| Claude's discretion | You decide based on transparency needs | |

**User's choice:** Show provider (Recommended)

### Question 7: Can users switch providers mid-conversation?

| Option | Description | Selected |
|--------|-------------|----------|
| Switch mid-conversation (Recommended) | Allow switching mid-conversation (dropdown in chat UI). Flexible, user can compare providers on same question. | ✓ |
| Lock per conversation | Lock provider per conversation (set at start, can't change). Simpler, avoids context confusion. | |
| Claude's discretion | You decide based on flexibility needs | |

**User's choice:** Switch mid-conversation (Recommended)

---

## Chat UI Pattern

### Question 1: Where should the chat interface live?

| Option | Description | Selected |
|--------|-------------|----------|
| Main content area (Recommended) | Main content area (replaces note editor when active). Integrated with existing layout, easy navigation. Matches existing pattern (notes in main area). | ✓ |
| Sidebar panel | Sidebar panel (like Backlinks). Always visible, but limited width. Good for quick questions while editing notes. | |
| Separate window | Separate window (like Settings). Independent, can position anywhere. More complex window management. | |
| Claude's discretion | You decide based on UX priorities | |

**User's choice:** Main content area (Recommended)

### Question 2: Should chat conversations be saved or ephemeral?

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent (Recommended) | Persistent conversations (saved to database, can resume later). Better for research sessions, matches note persistence pattern. | ✓ |
| Ephemeral | Ephemeral (cleared on close). Simpler, no storage needed. Good for quick questions. | |
| Claude's discretion | You decide based on use case | |

**User's choice:** Persistent (Recommended)

### Question 3: How should users access past conversations?

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar list (Recommended) | Conversation list in sidebar (like note list). Easy to browse history, switch between conversations. Matches existing navigation pattern. | ✓ |
| Dropdown menu | Dropdown menu in chat header. More compact, but harder to browse many conversations. | |
| Separate view | Separate conversations view (new route). Dedicated space, but adds navigation step. | |
| Claude's discretion | You decide based on navigation patterns | |

**User's choice:** Sidebar list (Recommended)

### Question 4: How should conversations be titled?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-generate (Recommended) | Auto-generate from first message (e.g., first 50 chars). Simple, no user input needed. Matches note title pattern. | ✓ |
| User-provided title | Prompt user for title when creating conversation. More control, but adds friction. | |
| Timestamp-based | Timestamp-based (e.g., 'Chat - May 25, 2026 10:30 AM'). No ambiguity, but less descriptive. | |
| Claude's discretion | You decide based on UX priorities | |

**User's choice:** Auto-generate (Recommended)

---

## Research Flow

### Question 1: Should web search and model knowledge run in parallel or sequentially?

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel (Recommended) | Parallel (web search + model knowledge at same time, merge results). Faster, better UX. More complex implementation. | ✓ |
| Sequential | Sequential (web search first, then model uses those results). Simpler, model can reference web findings. Slower overall. | |
| Claude's discretion | You decide based on speed vs complexity tradeoff | |

**User's choice:** Parallel (Recommended)

### Question 2: How should web search be implemented?

| Option | Description | Selected |
|--------|-------------|----------|
| Built-in search (Recommended) | Built-in web search (Brave Search API, DuckDuckGo, or similar). Integrated, no external dependencies. Requires API key. | ✓ |
| Provider-native search | Delegate to AI provider (Claude/GPT can search web via their APIs). Simpler, but depends on provider support. | |
| Defer web search | No web search in Phase 3 (defer to Phase 4). Simplifies scope, model knowledge only. | |
| Claude's discretion | You decide based on implementation complexity | |

**User's choice:** Built-in search (Recommended)

### Question 3: How many web search results should be fetched per query?

| Option | Description | Selected |
|--------|-------------|----------|
| Top 5 (Recommended) | Top 5 results. Balances coverage with noise. Standard for search APIs. | ✓ |
| Top 3 | Top 3 results. Faster, less noise. May miss relevant sources. | |
| Top 10 | Top 10 results. More comprehensive, but slower and more noise. | |
| Claude's discretion | You decide based on quality vs speed tradeoff | |

**User's choice:** Top 5 (Recommended)

### Question 4: Should research progress be visible to the user?

| Option | Description | Selected |
|--------|-------------|----------|
| Show progress (Recommended) | Show progress indicator (e.g., 'Searching web...', 'Generating answer...'). Better UX, user knows what's happening. | ✓ |
| Silent loading | Silent (just show loading spinner). Simpler, but less informative. | |
| Claude's discretion | You decide based on UX priorities | |

**User's choice:** Show progress (Recommended)

---

## Citation Format

### Question 1: How should citations be displayed in AI answers?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline footnotes (Recommended) | Inline footnotes [1], [2] with sources list at bottom. Standard academic format, doesn't break reading flow. | ✓ |
| Sidebar panel | Sidebar panel (like Backlinks). Sources always visible, but takes screen space. | |
| Hover tooltips | Hover tooltips (show source on hover). Clean UI, but less discoverable. | |
| Claude's discretion | You decide based on readability priorities | |

**User's choice:** Inline footnotes (Recommended)

### Question 2: Should citation URLs be clickable or plain text?

| Option | Description | Selected |
|--------|-------------|----------|
| Clickable links (Recommended) | Clickable links (open in external browser). Standard web behavior, easy to verify sources. | ✓ |
| Copy button | Copy-to-clipboard button. User can paste URL elsewhere. Less direct. | |
| Plain text | Plain text URLs (not clickable). Simplest, but requires manual copy/paste. | |
| Claude's discretion | You decide based on UX priorities | |

**User's choice:** Clickable links (Recommended)

### Question 3: What information should be shown for each citation?

| Option | Description | Selected |
|--------|-------------|----------|
| Title + domain (Recommended) | Title + domain (e.g., 'React Docs - react.dev'). Descriptive, user knows what they're clicking. | ✓ |
| Domain only | Just domain (e.g., 'react.dev'). Compact, but less context. | |
| Full URL | Full URL (e.g., 'https://react.dev/learn/...'). Complete info, but cluttered. | |
| Claude's discretion | You decide based on clarity vs space tradeoff | |

**User's choice:** Title + domain (Recommended)

### Question 4: Should citations be stored with AI-generated answers?

| Option | Description | Selected |
|--------|-------------|----------|
| Store with answer (Recommended) | Store citations with answer (in database). Preserved when answer saved to library. Better for long-term reference. | ✓ |
| Ephemeral | Ephemeral (only shown during chat). Simpler, but lost when conversation closed. | |
| Claude's discretion | You decide based on persistence needs | |

**User's choice:** Store with answer (Recommended)

---

## Model Selection UX

### Question 1: Should model selection be per-provider or global?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-provider (Recommended) | Per-provider dropdown (Claude: sonnet/opus, GPT: 4/4o, DeepSeek: chat/coder). Flexible, user can pick best model per provider. | ✓ |
| Global default | Single global default (one model across all providers). Simpler, but less flexible. | |
| Claude's discretion | You decide based on flexibility needs | |

**User's choice:** Per-provider (Recommended)

### Question 2: Where should users configure model selection?

| Option | Description | Selected |
|--------|-------------|----------|
| Settings panel (Recommended) | Settings panel (like Mode Settings). Centralized config, clear separation from chat. Matches existing pattern. | ✓ |
| Chat UI dropdown | Chat UI dropdown (switch model mid-conversation). More convenient, but clutters chat interface. | |
| Both settings + chat | Both (settings for default, chat dropdown to override). Most flexible, but more complex. | |
| Claude's discretion | You decide based on UX priorities | |

**User's choice:** Settings panel (Recommended)

### Question 3: How should available models be populated in the dropdown?

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded list (Recommended) | Hardcoded list (sonnet/opus for Claude, 4/4o for GPT, etc.). Simple, works for known models. Needs code update for new models. | ✓ |
| Fetch from API | Fetch from provider API (dynamic model list). Always up-to-date, but requires API call and error handling. | |
| Free-form input | Free-form text input (user types model name). Most flexible, but error-prone. | |
| Claude's discretion | You decide based on maintainability | |

**User's choice:** Hardcoded list (Recommended)

### Question 4: Should the active model be visible during chat?

| Option | Description | Selected |
|--------|-------------|----------|
| Show model name (Recommended) | Show model name in chat UI (e.g., 'Claude Sonnet 4' badge next to provider). Full transparency, user knows exact model. | ✓ |
| Show provider only | Show provider only (e.g., 'Claude' badge). Simpler, but less specific. | |
| Hide both | Hide both (no badge). Cleanest UI, but no transparency. | |
| Claude's discretion | You decide based on transparency needs | |

**User's choice:** Show model name (Recommended)

---

## API Key Storage

### Question 1: How should API keys be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Encrypted (Recommended) | Encrypted storage (electron-store with encryption). More secure, protects keys at rest. Requires encryption key management. | ✓ |
| Plain JSON | Plain JSON (current config pattern). Simpler, consistent with Phase 1. Keys visible in config file. | |
| System keychain | System keychain (macOS Keychain, Windows Credential Manager). Most secure, OS-managed. Platform-specific implementation. | |
| Claude's discretion | You decide based on security priorities | |

**User's choice:** Encrypted (Recommended)

### Question 2: Should API keys be masked in the settings UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Masked input (Recommended) | Masked input (show dots, reveal button). Standard password field behavior. Prevents shoulder-surfing. | ✓ |
| Plain text | Plain text input (always visible). Easier to verify, but less secure. | |
| Claude's discretion | You decide based on security vs usability tradeoff | |

**User's choice:** Masked input (Recommended)

### Question 3: How should the encryption key be managed?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate key (Recommended) | Separate encryption key (generated on first launch, stored in OS keychain). Most secure, keys encrypted with separate key. | ✓ |
| Machine-specific | Machine-specific key (derived from hardware ID). Simpler, but keys tied to machine. | |
| User passphrase | User-provided passphrase (user enters passphrase to unlock). Most secure, but adds friction. | |
| Claude's discretion | You decide based on security vs UX tradeoff | |

**User's choice:** Separate key (Recommended)

### Question 4: Should users be warned about API key storage security?

| Option | Description | Selected |
|--------|-------------|----------|
| Show warning (Recommended) | Show warning (e.g., 'API keys are encrypted but stored locally. Keep your machine secure.'). Transparent, sets expectations. | ✓ |
| No warning | No warning (assume user understands). Cleaner UI, but less transparent. | |
| Claude's discretion | You decide based on transparency priorities | |

**User's choice:** Show warning (Recommended)

---

## Claude's Discretion

None — all areas had explicit decisions.

## Deferred Ideas

None — discussion stayed within phase scope
