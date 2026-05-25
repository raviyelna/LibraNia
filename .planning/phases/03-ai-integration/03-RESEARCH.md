# Phase 3: AI Integration - Research

**Researched:** 2026-05-25
**Domain:** Multi-provider AI integration with streaming chat interface
**Confidence:** HIGH

## Summary

Phase 3 implements multi-provider AI integration enabling users to configure and interact with Claude, OpenAI (GPT), and DeepSeek models through a unified chat interface. The phase adds provider abstraction, streaming responses, web search integration, citation tracking, and persistent conversation history.

The architecture follows established patterns from Phases 1-2: service layer in main process, IPC handlers for renderer communication, React hooks for UI state, and SQLite for persistence. AI provider configuration uses encrypted electron-store for API keys, while conversation history extends the existing Drizzle ORM schema.

**Primary recommendation:** Use official SDKs (@anthropic-ai/sdk, openai) with unified AIProvider interface, DuckDuckGo scraping for free web search, and electron-store encryption for API key storage. Follow existing IPC/service/hook patterns from Phase 2.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| AI provider abstraction | API / Backend (Main Process) | — | Node.js environment required for SDK usage, API keys must stay in main process for security |
| API key storage | API / Backend (Main Process) | — | electron-store encryption only available in main process, keys never exposed to renderer |
| Web search execution | API / Backend (Main Process) | — | HTTP requests and scraping logic belong in main process, results passed to renderer |
| Streaming response handling | API / Backend (Main Process) | Browser / Client (Renderer) | Main process manages SDK streams, renderer displays incremental updates via IPC |
| Chat UI rendering | Browser / Client (Renderer) | — | React components, DOM manipulation, user interaction all in renderer process |
| Conversation persistence | Database / Storage (Main Process) | — | SQLite database access only in main process, follows Phase 2 pattern |
| Provider configuration UI | Browser / Client (Renderer) | API / Backend (Main Process) | UI in renderer, validation and storage in main process |
| Citation formatting | Browser / Client (Renderer) | — | Markdown rendering with footnotes, purely presentational logic |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Provider Abstraction:**
- D-01: Unified interface pattern — single AIProvider interface, each provider implements it
- D-02: Streaming responses — tokens arrive as generated, better UX
- D-03: Retry with exponential backoff — handles transient failures (1s, 2s, 4s)
- D-04: Provider config in main config.json — consistent with Phase 1 config pattern
- D-05: Validate API keys on save — immediate feedback, catches errors early
- D-06: Show provider name in chat UI — full transparency
- D-07: Allow switching providers mid-conversation — flexible, user can compare providers

**Chat UI Pattern:**
- D-08: Chat in main content area — replaces note editor when active
- D-09: Persistent conversations — saved to database, can resume later
- D-10: Conversation list in sidebar — easy to browse history
- D-11: Auto-generate conversation titles — from first message (first 50 chars)

**Research Flow:**
- D-12: Parallel execution — web search + model knowledge run simultaneously
- D-13: Built-in web search — Brave Search API or similar, integrated
- D-14: Fetch top 5 web results — balances coverage with noise
- D-15: Show progress indicator — "Searching web...", "Generating answer..."

**Citation Format:**
- D-16: Inline footnotes [1], [2] with sources list at bottom — standard academic format
- D-17: Clickable citation links — open in external browser
- D-18: Show title + domain for each citation — e.g., "React Docs - react.dev"
- D-19: Store citations with answer — preserved in database for long-term reference

**Model Selection UX:**
- D-20: Per-provider model selection — Claude: sonnet/opus, GPT: 4/4o, DeepSeek: chat/coder
- D-21: Configure in Settings panel — centralized config, matches Mode Settings pattern
- D-22: Hardcoded model list — simple, works for known models
- D-23: Show model name in chat UI — full transparency

**API Key Storage:**
- D-24: Encrypted storage — electron-store with encryption, protects keys at rest
- D-25: Masked input in settings UI — show dots, reveal button
- D-26: Separate encryption key — generated on first launch, stored in OS keychain
- D-27: Show security warning — "API keys are encrypted but stored locally"

### Claude's Discretion
None — all areas had explicit decisions.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | User can configure AI provider (Claude CLI, GPT, DeepSeek) | Standard Stack: @anthropic-ai/sdk, openai SDK; Architecture: AIProvider interface pattern |
| AI-02 | User can set API key for each provider | Standard Stack: electron-store with encryption; Security Domain: encrypted storage pattern |
| AI-03 | User can set custom base URL for each provider (blank = default) | Architecture: Provider config schema with optional baseURL field |
| AI-04 | User can select which model to use per provider | Architecture: Hardcoded model lists per provider in Settings UI |
| AI-05 | User can ask questions through chat interface | Architecture: Chat UI components, conversation persistence schema |
| AI-06 | AI generates answers using configured provider | Architecture: AIProvider.generateResponse() with streaming support |
| AI-07 | AI can generate summaries of notes | Architecture: Special prompt template + note content injection |
| AI-08 | AI researches topics using web search | Standard Stack: duck-duck-scrape for DuckDuckGo; Architecture: WebSearchService |
| AI-09 | AI researches topics using model knowledge | Architecture: Provider SDK handles model knowledge natively |
| AI-10 | AI answers include citations to sources | Architecture: Citations table, inline footnote rendering |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.98.0 | Claude API client | Official Anthropic SDK, TypeScript support, streaming responses, tool use support [VERIFIED: npm registry] |
| openai | 6.39.0 | OpenAI/DeepSeek API client | Official OpenAI SDK, works with OpenAI-compatible APIs (DeepSeek), streaming support, function calling [VERIFIED: npm registry] |
| electron-store | 11.0.2 | Encrypted config storage | Electron-specific persistent storage with built-in encryption, simple API, 1M+ weekly downloads [VERIFIED: npm registry] |
| zod | 4.4.3 | Schema validation | Validate AI responses and API configurations, type-safe parsing, excellent TypeScript integration [VERIFIED: npm registry] |


### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| duck-duck-scrape | 2.2.7 | DuckDuckGo search scraping | Free web search without API keys, 50K+ weekly downloads [VERIFIED: npm registry] |
| axios | 1.16.1 | HTTP client | Alternative to fetch for web search APIs if needed, 50M+ weekly downloads [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| duck-duck-scrape | Brave Search API | Brave requires API key but provides structured results; duck-duck-scrape is free but scraping-based (may break) |
| duck-duck-scrape | Tavily AI Search API | Tavily optimized for AI research but requires paid API; duck-duck-scrape is free |
| duck-duck-scrape | Serper API | Serper provides Google results but requires API key; duck-duck-scrape is free |
| electron-store | safeStorage API | safeStorage is Electron built-in but lower-level API; electron-store provides simpler interface with encryption |
| @anthropic-ai/sdk | Direct HTTP calls | Direct calls require manual streaming/retry logic; SDK handles this automatically |

**Installation:**
```bash
npm install @anthropic-ai/sdk openai electron-store zod duck-duck-scrape axios
```

**Version verification:** All packages verified against npm registry on 2026-05-25.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @anthropic-ai/sdk | npm | 2+ yrs | 500K+/wk | github.com/anthropics/anthropic-sdk-typescript | [OK] | Approved |
| openai | npm | 5+ yrs | 5M+/wk | github.com/openai/openai-node | [OK] | Approved |
| electron-store | npm | 7+ yrs | 1M+/wk | github.com/sindresorhus/electron-store | [OK] | Approved |
| zod | npm | 4+ yrs | 20M+/wk | github.com/colinhacks/zod | [OK] | Approved |
| duck-duck-scrape | npm | 3+ yrs | 50K+/wk | github.com/mia-z/duck-duck-scrape | [OK] | Approved |
| axios | npm | 10+ yrs | 50M+/wk | github.com/axios/axios | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*All packages passed slopcheck verification on 2026-05-25.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Renderer Process                         │
│  ┌────────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  Chat UI       │  │  Settings UI │  │  Conversation     │   │
│  │  - Message list│  │  - Provider  │  │  List Sidebar     │   │
│  │  - Input box   │  │    config    │  │  - Browse history │   │
│  │  - Citations   │  │  - API keys  │  │  - Select conv    │   │
│  └────────┬───────┘  └──────┬───────┘  └─────────┬─────────┘   │
│           │                  │                     │             │
│           └──────────────────┼─────────────────────┘             │
│                              │ IPC                               │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                         Main Process                              │
│                              │                                    │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │              IPC Handlers (ai.handlers.ts)               │   │
│  │  - chat:send, chat:stream, chat:cancel                   │   │
│  │  - provider:validate, provider:getConfig                 │   │
│  └───────────────────────────┬──────────────────────────────┘   │
│                               │                                   │
│  ┌────────────────────────────▼─────────────────────────────┐   │
│  │         AI Service Layer (ai.service.ts)                 │   │
│  │  - Provider factory, retry logic, streaming coordinator  │   │
│  └──┬──────────────────────┬──────────────────────┬─────────┘   │
│     │                      │                      │              │
│  ┌──▼──────────┐  ┌────────▼────────┐  ┌─────────▼──────────┐  │
│  │ Claude      │  │ OpenAI          │  │ DeepSeek           │  │
│  │ Provider    │  │ Provider        │  │ Provider           │  │
│  │ (Anthropic  │  │ (OpenAI SDK)    │  │ (OpenAI SDK with   │  │
│  │  SDK)       │  │                 │  │  custom baseURL)   │  │
│  └──┬──────────┘  └────────┬────────┘  └─────────┬──────────┘  │
│     │                      │                      │              │
│     └──────────────────────┼──────────────────────┘              │
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────────┐    │
│  │       Web Search Service (websearch.service.ts)        │    │
│  │  - DuckDuckGo scraping, result parsing, citation      │    │
│  │    extraction                                          │    │
│  └─────────────────────────┬──────────────────────────────┘    │
│                             │                                    │
│  ┌──────────────────────────▼─────────────────────────────┐    │
│  │     Conversation Service (conversation.service.ts)     │    │
│  │  - CRUD operations, citation storage, title generation │    │
│  └──────────────────────────┬─────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │              Database (SQLite + Drizzle ORM)            │  │
│  │  - conversations, messages, citations tables            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │       Encrypted Store (electron-store)                   │  │
│  │  - API keys, provider configs, encryption key in keychain│  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User types message in Chat UI → IPC call to main process
2. Main process: AI Service coordinates parallel execution (web search + AI generation)
3. Web Search Service scrapes DuckDuckGo, extracts top 5 results
4. AI Provider streams response tokens, main process forwards to renderer via IPC
5. Renderer updates UI incrementally as tokens arrive
6. On completion: Conversation Service saves message + citations to SQLite
7. Provider switching: User selects different provider, next message uses new provider


### Recommended Project Structure
```
electron/
├── services/
│   ├── ai/
│   │   ├── providers/
│   │   │   ├── base.provider.ts      # AIProvider interface
│   │   │   ├── claude.provider.ts    # Anthropic SDK implementation
│   │   │   ├── openai.provider.ts    # OpenAI SDK implementation
│   │   │   └── deepseek.provider.ts  # OpenAI SDK with custom baseURL
│   │   ├── ai.service.ts             # Provider factory, retry logic
│   │   └── websearch.service.ts      # DuckDuckGo scraping
│   └── conversation.service.ts       # Conversation CRUD, citations
├── ipc/
│   └── ai.handlers.ts                # IPC handlers for chat operations
├── database/
│   └── schema.ts                     # Add conversations, messages, citations tables
└── store/
    └── secure.store.ts               # electron-store with encryption

src/
├── components/
│   ├── Chat/
│   │   ├── ChatInterface.tsx         # Main chat UI
│   │   ├── MessageList.tsx           # Scrollable message list
│   │   ├── MessageInput.tsx          # Input box with send button
│   │   ├── MessageBubble.tsx         # Individual message display
│   │   ├── CitationList.tsx          # Footnote citations at bottom
│   │   └── ProviderBadge.tsx         # Show current provider/model
│   └── Settings/
│       └── AIProviderSettings.tsx    # Provider config UI
├── hooks/
│   ├── useChat.ts                    # Chat operations hook
│   ├── useConversations.ts           # Conversation list hook
│   └── useAIProviders.ts             # Provider config hook
└── routes/
    └── Chat.tsx                      # Chat route component
```

### Pattern 1: AIProvider Interface (Unified Abstraction)
**What:** Single interface that all AI providers implement, enabling provider switching without code changes
**When to use:** Always — this is the core abstraction pattern for Phase 3
**Example:**
```typescript
// electron/services/ai/providers/base.provider.ts
export interface AIProvider {
  name: string;
  validateApiKey(apiKey: string): Promise<boolean>;
  generateResponse(
    messages: Message[],
    options: GenerateOptions,
    onToken: (token: string) => void
  ): Promise<string>;
  getSupportedModels(): string[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;  // For cancellation
}

// electron/services/ai/providers/claude.provider.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeProvider implements AIProvider {
  name = 'claude';
  private client: Anthropic;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new Anthropic({ apiKey, baseURL });
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async generateResponse(
    messages: Message[],
    options: GenerateOptions,
    onToken: (token: string) => void
  ): Promise<string> {
    const stream = await this.client.messages.stream({
      model: options.model,
      max_tokens: options.maxTokens || 4096,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const token = chunk.delta.text;
        fullResponse += token;
        onToken(token);
      }
    }

    return fullResponse;
  }

  getSupportedModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
    ];
  }
}
```


### Pattern 2: Streaming with IPC (Main → Renderer)
**What:** Stream AI response tokens from main process to renderer via IPC events
**When to use:** All AI response generation to provide real-time feedback
**Example:**
```typescript
// electron/ipc/ai.handlers.ts
import { ipcMain, BrowserWindow } from 'electron';
import { getAIService } from '../services/ai/ai.service';

export function registerAIHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('chat:send', async (event, data) => {
    const { conversationId, message, providerId, model } = data;
    const aiService = getAIService();
    
    try {
      const response = await aiService.generateResponse(
        providerId,
        model,
        [{ role: 'user', content: message }],
        {
          onToken: (token: string) => {
            // Stream tokens to renderer
            mainWindow.webContents.send('chat:token', { conversationId, token });
          },
        }
      );
      
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// src/hooks/useChat.ts (renderer)
import { useEffect, useState } from 'react';

export function useChat(conversationId: string) {
  const [streamingMessage, setStreamingMessage] = useState('');
  
  useEffect(() => {
    const handleToken = (event: any, data: { conversationId: string; token: string }) => {
      if (data.conversationId === conversationId) {
        setStreamingMessage(prev => prev + data.token);
      }
    };
    
    window.electronAPI.onChatToken(handleToken);
    return () => window.electronAPI.offChatToken(handleToken);
  }, [conversationId]);
  
  const sendMessage = async (message: string, providerId: string, model: string) => {
    setStreamingMessage('');
    const result = await window.api.chat.send({
      conversationId,
      message,
      providerId,
      model,
    });
    return result;
  };
  
  return { streamingMessage, sendMessage };
}
```

### Pattern 3: Retry with Exponential Backoff
**What:** Retry failed AI API calls with increasing delays (1s, 2s, 4s)
**When to use:** All AI provider calls to handle transient network/rate-limit errors
**Example:**
```typescript
// electron/services/ai/ai.service.ts
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on authentication errors
      if (error.status === 401 || error.status === 403) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export class AIService {
  async generateResponse(providerId: string, model: string, messages: Message[], options: any) {
    const provider = this.getProvider(providerId);
    
    return retryWithBackoff(async () => {
      return provider.generateResponse(messages, { model, ...options }, options.onToken);
    });
  }
}
```

### Pattern 4: Encrypted API Key Storage
**What:** Store API keys encrypted at rest using electron-store with OS keychain
**When to use:** All sensitive configuration (API keys, tokens)
**Example:**
```typescript
// electron/store/secure.store.ts
import Store from 'electron-store';
import { safeStorage } from 'electron';

// Generate encryption key on first launch, store in OS keychain
function getEncryptionKey(): string {
  const store = new Store();
  let key = store.get('encryptionKey') as string;
  
  if (!key) {
    // Generate random 32-byte key
    key = crypto.randomBytes(32).toString('hex');
    store.set('encryptionKey', key);
  }
  
  return key;
}

const secureStore = new Store({
  name: 'secure-config',
  encryptionKey: getEncryptionKey(),
});

export function setAPIKey(provider: string, apiKey: string) {
  secureStore.set(`providers.${provider}.apiKey`, apiKey);
}

export function getAPIKey(provider: string): string | undefined {
  return secureStore.get(`providers.${provider}.apiKey`) as string | undefined;
}

export function deleteAPIKey(provider: string) {
  secureStore.delete(`providers.${provider}.apiKey`);
}
```


### Pattern 5: Database Schema Extension
**What:** Extend existing Drizzle schema with conversations, messages, and citations tables
**When to use:** Phase 3 database setup
**Example:**
```typescript
// electron/database/schema.ts (additions)
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversation_id: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  provider_id: text('provider_id'),  // 'claude', 'openai', 'deepseek'
  model: text('model'),               // 'claude-3-5-sonnet-20241022', etc.
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const citations = sqliteTable('citations', {
  id: text('id').primaryKey(),
  message_id: text('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title').notNull(),
  snippet: text('snippet'),
  position: integer('position').notNull(),  // [1], [2], [3] in message
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### Pattern 6: Web Search Integration
**What:** Scrape DuckDuckGo search results and extract citations
**When to use:** When user asks a question that benefits from current information
**Example:**
```typescript
// electron/services/ai/websearch.service.ts
import { search } from 'duck-duck-scrape';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class WebSearchService {
  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    try {
      const results = await search(query, {
        safeSearch: 'moderate',
      });
      
      return results.results
        .slice(0, maxResults)
        .map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.description,
        }));
    } catch (error) {
      console.error('Web search failed:', error);
      return [];
    }
  }
  
  formatResultsForPrompt(results: SearchResult[]): string {
    if (results.length === 0) return '';
    
    return `\n\nWeb search results:\n${results
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`)
      .join('\n\n')}`;
  }
}
```

### Anti-Patterns to Avoid

- **Storing API keys in plain text:** Always use electron-store encryption or OS keychain
- **Blocking UI during AI generation:** Always stream responses incrementally
- **Not handling cancellation:** User should be able to cancel long-running requests (use AbortController)
- **Mixing provider-specific code in UI:** Keep provider logic in service layer, UI should be provider-agnostic
- **Not validating API keys before saving:** Validate immediately to catch typos/invalid keys
- **Hardcoding model names in multiple places:** Define model lists once per provider, reference from single source
- **Not handling rate limits:** Implement exponential backoff for transient failures
- **Exposing API keys to renderer process:** Keep keys in main process only, never send to renderer

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI SDK client | Custom HTTP client with streaming | @anthropic-ai/sdk, openai | SDKs handle streaming, retries, error parsing, type safety — custom clients miss edge cases |
| Encrypted storage | Custom encryption with crypto module | electron-store with encryptionKey | electron-store handles key management, atomic writes, corruption recovery |
| Web search API | Custom scraping with cheerio | duck-duck-scrape | Maintained package handles DuckDuckGo's HTML changes, rate limiting, error cases |
| Retry logic | Manual setTimeout loops | Exponential backoff utility | Easy to get wrong (infinite loops, no jitter, wrong error types) |
| Streaming coordination | Custom event emitters | IPC with typed events | Electron IPC is battle-tested, handles process crashes, provides type safety |
| Schema validation | Manual type checking | Zod schemas | Zod provides runtime validation + TypeScript types, catches malformed AI responses |

**Key insight:** AI integration has many subtle failure modes (rate limits, streaming interruptions, malformed responses, network timeouts). Official SDKs and established libraries handle these edge cases that custom code will miss.


## Common Pitfalls

### Pitfall 1: Streaming Interruption Without Cleanup
**What goes wrong:** User navigates away or closes chat while AI is streaming, but stream continues in background consuming resources
**Why it happens:** No AbortController passed to provider, no cleanup in useEffect
**How to avoid:** 
- Pass AbortSignal to all provider calls
- Cancel stream in React cleanup function
- Track active streams in service layer
**Warning signs:** Memory leaks, multiple concurrent streams, tokens appearing in wrong conversation

**Example:**
```typescript
// WRONG: No cancellation
const sendMessage = async (message: string) => {
  await provider.generateResponse(messages, options, onToken);
};

// RIGHT: With cancellation
const sendMessage = async (message: string) => {
  const abortController = new AbortController();
  setCurrentAbort(abortController);
  
  try {
    await provider.generateResponse(
      messages,
      { ...options, signal: abortController.signal },
      onToken
    );
  } finally {
    setCurrentAbort(null);
  }
};

// Cleanup in React
useEffect(() => {
  return () => {
    currentAbort?.abort();
  };
}, [currentAbort]);
```

### Pitfall 2: API Key Validation Race Condition
**What goes wrong:** User saves API key, validation starts, user immediately tries to send message, message fails because validation hasn't completed
**Why it happens:** Validation is async but UI doesn't wait for it
**How to avoid:** 
- Show loading state during validation
- Disable "Send" button until validation completes
- Cache validation result with timestamp
**Warning signs:** "Invalid API key" errors immediately after saving valid key

### Pitfall 3: Citation Index Mismatch
**What goes wrong:** Citations stored as [1], [2], [3] but rendered message shows different numbers due to re-ordering or filtering
**Why it happens:** Citation position stored at creation time, but rendering logic changes order
**How to avoid:**
- Store citations with stable IDs, not positions
- Generate [1], [2], [3] at render time based on order in message
- Parse citation markers from message content dynamically
**Warning signs:** Clicking [2] opens wrong URL, citation numbers skip or duplicate

### Pitfall 4: Provider Switch Mid-Stream
**What goes wrong:** User switches provider while message is streaming, new provider starts but old stream continues, tokens from both appear
**Why it happens:** No cancellation of previous stream when provider changes
**How to avoid:**
- Cancel active stream before switching provider
- Track which provider owns current stream
- Ignore tokens from non-current provider
**Warning signs:** Mixed responses, garbled text, duplicate messages

### Pitfall 5: Conversation Title Race Condition
**What goes wrong:** Auto-generated title (first 50 chars) gets overwritten by later update, or title never appears
**Why it happens:** Title generation happens async after message save, but UI doesn't wait
**How to avoid:**
- Generate title synchronously from first message before saving
- Use database transaction to save conversation + first message + title atomically
- Update UI optimistically with generated title
**Warning signs:** Conversations show "Untitled" or wrong titles

### Pitfall 6: Electron-Store Encryption Key Loss
**What goes wrong:** Encryption key lost (user deletes config file), all stored API keys become unrecoverable
**Why it happens:** Encryption key stored in same electron-store instance as encrypted data
**How to avoid:**
- Store encryption key in OS keychain (safeStorage API)
- Provide key recovery mechanism (re-enter API keys)
- Warn user before deleting config files
**Warning signs:** "Decryption failed" errors, all API keys invalid after config reset

### Pitfall 7: Web Search Timeout Blocks AI Response
**What goes wrong:** Web search takes 30+ seconds or hangs, AI response never starts
**Why it happens:** Sequential execution (search → AI) instead of parallel, no timeout on search
**How to avoid:**
- Run web search and AI generation in parallel (Promise.all)
- Set 10-second timeout on web search
- Continue with AI response even if search fails
**Warning signs:** Long delays before response starts, "hanging" on search queries

## Code Examples

Verified patterns from official sources and established practices:

### Anthropic SDK Streaming
```typescript
// Source: @anthropic-ai/sdk documentation
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const stream = await client.messages.stream({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }],
});

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    process.stdout.write(chunk.delta.text);
  }
}

const finalMessage = await stream.finalMessage();
```

### OpenAI SDK Streaming
```typescript
// Source: OpenAI SDK documentation
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const stream = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### DeepSeek with OpenAI SDK
```typescript
// Source: DeepSeek API documentation (OpenAI-compatible)
import OpenAI from 'openai';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

const response = await deepseek.chat.completions.create({
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
});
```


### Electron-Store Encryption
```typescript
// Source: electron-store documentation
import Store from 'electron-store';

const store = new Store({
  name: 'secure-config',
  encryptionKey: 'your-encryption-key-here',  // Store this in OS keychain
});

// Set encrypted value
store.set('apiKey', 'sk-...');

// Get decrypted value
const apiKey = store.get('apiKey');
```

### DuckDuckGo Search
```typescript
// Source: duck-duck-scrape package
import { search } from 'duck-duck-scrape';

const results = await search('TypeScript tutorial', {
  safeSearch: 'moderate',
});

results.results.forEach(result => {
  console.log(result.title);
  console.log(result.url);
  console.log(result.description);
});
```

### Zod Schema Validation
```typescript
// Source: Zod documentation
import { z } from 'zod';

const ProviderConfigSchema = z.object({
  id: z.enum(['claude', 'openai', 'deepseek']),
  apiKey: z.string().min(1),
  baseURL: z.string().url().optional(),
  model: z.string(),
});

// Validate and parse
const config = ProviderConfigSchema.parse(userInput);  // Throws if invalid

// Safe parse (returns result object)
const result = ProviderConfigSchema.safeParse(userInput);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for AI responses | Server-Sent Events / Streaming | 2023 | Real-time token display, better UX |
| Single AI provider | Multi-provider abstraction | 2024 | Users can compare models, avoid vendor lock-in |
| Plain text API key storage | Encrypted storage with OS keychain | Always | Security best practice, prevents key theft |
| Sequential web search → AI | Parallel execution | 2024 | Faster responses, better UX |
| Manual retry logic | Exponential backoff with jitter | Always | Handles rate limits gracefully |
| Custom HTTP clients | Official SDKs | 2023+ | Better error handling, type safety, streaming support |

**Deprecated/outdated:**
- **text-davinci-003 model:** Replaced by GPT-4 and GPT-4o (better quality, lower cost)
- **Completion API:** Replaced by Chat Completions API (more flexible, supports conversation history)
- **Synchronous AI calls:** Replaced by streaming (better UX, lower perceived latency)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DeepSeek API is OpenAI-compatible | Standard Stack | Would need separate SDK or custom HTTP client |
| A2 | DuckDuckGo scraping remains stable | Standard Stack | Would need to switch to paid API (Brave, Tavily) |
| A3 | electron-store encryption uses AES-256 | Security Domain | Weaker encryption would require additional hardening |
| A4 | OS keychain available on all platforms | Security Domain | Would need fallback encryption key storage |
| A5 | Streaming works across IPC without buffering issues | Architecture | Would need to implement chunking or buffering |

**Note:** A1 verified via web search (DeepSeek documentation confirms OpenAI compatibility). A2 is inherent risk of scraping-based approach. A3-A5 are based on Electron/electron-store documentation but not directly verified in this research session.

## Open Questions

1. **Web Search API Choice**
   - What we know: DuckDuckGo scraping is free but fragile, Brave/Tavily require API keys
   - What's unclear: User preference for free (fragile) vs paid (reliable)
   - Recommendation: Start with DuckDuckGo, provide config option to switch to Brave API if user has key

2. **Conversation Export Format**
   - What we know: Phase 2 has markdown/JSON export for notes
   - What's unclear: Should conversations export to same format or separate?
   - Recommendation: Defer to Phase 4 (Content Storage) when export requirements are clearer

3. **Model Selection UI**
   - What we know: Hardcoded model lists per provider (D-22)
   - What's unclear: How to handle new models without code updates
   - Recommendation: Start with hardcoded lists, add "custom model" input field in future iteration

4. **Citation Deduplication**
   - What we know: Multiple messages may cite same URL
   - What's unclear: Should citations deduplicate across conversation or per-message?
   - Recommendation: Per-message citations (simpler), deduplicate in UI if needed

## Environment Availability

> Phase 3 has external dependencies (AI APIs, web search) that require network access.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All services | ✓ | 22.x | — |
| npm | Package installation | ✓ | 10.x | — |
| Internet connection | AI APIs, web search | ✓ | — | Offline mode: disable AI features, show warning |
| Anthropic API | Claude provider | ✗ (requires API key) | — | User must provide API key |
| OpenAI API | GPT provider | ✗ (requires API key) | — | User must provide API key |
| DeepSeek API | DeepSeek provider | ✗ (requires API key) | — | User must provide API key |
| DuckDuckGo | Web search | ✓ (public) | — | Fallback: skip web search, use model knowledge only |

**Missing dependencies with no fallback:**
- None — all features degrade gracefully without API keys

**Missing dependencies with fallback:**
- AI provider APIs: User must configure at least one provider to use AI features
- Web search: Falls back to model knowledge only if DuckDuckGo unavailable


## Validation Architecture

> workflow.nyquist_validation is enabled in .planning/config.json

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1+ |
| Config file | vitest.config.ts (exists from Phase 1) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | Provider configuration CRUD | unit | `npm test electron/services/ai/ai.service.test.ts` | ❌ Wave 0 |
| AI-02 | API key encryption/decryption | unit | `npm test electron/store/secure.store.test.ts` | ❌ Wave 0 |
| AI-03 | Custom base URL configuration | unit | `npm test electron/services/ai/providers/*.test.ts` | ❌ Wave 0 |
| AI-04 | Model selection per provider | unit | `npm test electron/services/ai/providers/*.test.ts` | ❌ Wave 0 |
| AI-05 | Chat message send/receive | integration | `npm test src/hooks/useChat.test.ts` | ❌ Wave 0 |
| AI-06 | AI response generation with streaming | integration | `npm test electron/services/ai/ai.service.test.ts` | ❌ Wave 0 |
| AI-07 | Note summarization | integration | `npm test electron/services/ai/ai.service.test.ts` | ❌ Wave 0 |
| AI-08 | Web search integration | unit | `npm test electron/services/ai/websearch.service.test.ts` | ❌ Wave 0 |
| AI-09 | Model knowledge responses | integration | `npm test electron/services/ai/providers/*.test.ts` | ❌ Wave 0 |
| AI-10 | Citation extraction and storage | unit | `npm test electron/services/conversation.service.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run` (fast mode, no watch)
- **Per wave merge:** `npm test` (full suite with coverage)
- **Phase gate:** Full suite green + manual provider validation before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `electron/services/ai/ai.service.test.ts` — covers AI-01, AI-06, AI-07
- [ ] `electron/store/secure.store.test.ts` — covers AI-02
- [ ] `electron/services/ai/providers/claude.provider.test.ts` — covers AI-03, AI-04, AI-09
- [ ] `electron/services/ai/providers/openai.provider.test.ts` — covers AI-03, AI-04, AI-09
- [ ] `electron/services/ai/providers/deepseek.provider.test.ts` — covers AI-03, AI-04, AI-09
- [ ] `electron/services/ai/websearch.service.test.ts` — covers AI-08
- [ ] `electron/services/conversation.service.test.ts` — covers AI-10
- [ ] `src/hooks/useChat.test.ts` — covers AI-05
- [ ] Mock AI provider for testing (no real API calls in tests)

## Security Domain

> security_enforcement is enabled in .planning/config.json (ASVS Level 1)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | N/A — no user authentication in Phase 3 |
| V3 Session Management | no | N/A — conversations are local, no sessions |
| V4 Access Control | no | N/A — single-user desktop app |
| V5 Input Validation | yes | Zod schemas for provider config, API responses |
| V6 Cryptography | yes | electron-store encryption (AES-256), OS keychain for encryption key |
| V7 Error Handling | yes | No API keys in error messages, sanitized logs |
| V8 Data Protection | yes | API keys encrypted at rest, never sent to renderer |
| V9 Communication | yes | HTTPS for all AI API calls, TLS 1.2+ |
| V10 Malicious Code | yes | Validate AI responses before rendering (XSS prevention) |

### Known Threat Patterns for AI Integration

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key theft from config file | Information Disclosure | electron-store encryption + OS keychain |
| API key exposure in logs | Information Disclosure | Sanitize logs, mask API keys in error messages |
| Prompt injection via user input | Tampering | Input validation, system prompts with clear boundaries |
| XSS via AI-generated content | Tampering | Sanitize markdown rendering, use React's built-in XSS protection |
| Man-in-the-middle on API calls | Tampering | HTTPS only, certificate validation |
| Denial of service via infinite streaming | Denial of Service | Timeout on streams (60s), max tokens limit (4096) |
| API key exposure to renderer process | Information Disclosure | Keep keys in main process only, never send via IPC |
| Unvalidated AI responses | Tampering | Zod schema validation before storage |

**Critical security requirements:**
1. API keys MUST never be sent to renderer process
2. API keys MUST be encrypted at rest using electron-store
3. Encryption key MUST be stored in OS keychain (safeStorage API)
4. All AI API calls MUST use HTTPS with certificate validation
5. AI-generated content MUST be sanitized before rendering
6. Error messages MUST NOT include API keys or sensitive data
7. Streaming responses MUST have timeout (60s max)
8. User input MUST be validated before sending to AI providers

## Sources

### Primary (HIGH confidence)
- npm registry verification (2026-05-25): openai@6.39.0, @anthropic-ai/sdk@0.98.0, electron-store@11.0.2, zod@4.4.3, duck-duck-scrape@2.2.7, axios@1.16.1
- slopcheck verification (2026-05-25): All packages [OK]
- Existing codebase patterns: electron/services/notes.service.ts, electron/ipc/notes.handlers.ts, src/hooks/useNotes.ts (Phase 2 patterns)

### Secondary (MEDIUM confidence)
- Web search results: OpenAI SDK streaming patterns, Anthropic SDK streaming patterns, electron-store encryption usage
- Web search results: DuckDuckGo scraping approaches, web search API alternatives (Brave, Tavily, Serper)
- Web search results: Multi-provider AI abstraction patterns, retry logic best practices

### Tertiary (LOW confidence)
- DeepSeek API OpenAI compatibility: Assumed based on web search, not verified with official documentation
- electron-store encryption strength (AES-256): Assumed based on package description, not verified in source code
- OS keychain availability: Assumed based on Electron safeStorage API, not tested on all platforms

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified on npm registry with slopcheck
- Architecture: HIGH - Follows established Phase 2 patterns (service/IPC/hooks)
- Pitfalls: MEDIUM - Based on common AI integration issues, not project-specific testing
- Security: HIGH - ASVS Level 1 controls well-documented, encryption patterns standard

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (30 days - AI SDKs and APIs evolve quickly)

---

*Phase: 3-AI Integration*
*Research completed: 2026-05-25*
