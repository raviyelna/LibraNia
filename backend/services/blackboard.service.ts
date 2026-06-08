import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../database/schema.js';
import { getAllNotes } from './notes.service.js';
import { loadAllProvidersFromEnv, loadProviderFromEnv, type ProviderConfig } from '../store/env.store.js';
import { readEnv } from '../store/env.store.js';
import { executeToolCall, RESEARCH_TOOLS, type ResearchToolContext } from '../tools/research.tools.js';
import { searchWeb } from './web-search.service.js';
import { searchWithClaude, searchWithDeepSeek, searchWithOpenAI } from './provider-search.service.js';
import { ClaudeProvider } from './ai/providers/claude.provider.js';
import { DeepSeekProvider } from './ai/providers/deepseek.provider.js';
import { OpenAIProvider } from './ai/providers/openai.provider.js';

export interface BlackboardAgent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  customTools: string;
  maxResponseTokens?: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlackboardTool {
  id: string;
  name: string;
  description: string;
  type: 'static' | 'http';
  inputSchema: string;
  staticResponse: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  httpUrl: string;
  httpBody: string;
  httpHeaders: Array<{ name: string; value: string }>;
  timeoutMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlackboardMessage {
  id: string;
  sessionId: string;
  agentId: string | null;
  agentName: string;
  role: 'task' | 'agent' | 'system' | 'user';
  content: string;
  details?: string;
  createdAt: string;
}

export interface BlackboardArtifact {
  id: string;
  type: 'scope' | 'relevant_notes' | 'topic_clusters' | 'review_summary' | 'candidate_ideas' | 'final_recommendation' | 'handoff' | 'open_questions';
  title: string;
  content: string;
  updatedBy: string;
  updatedAt: string;
}

export interface BlackboardSession {
  id: string;
  title: string;
  task: string;
  status: 'running' | 'complete' | 'failed';
  agentIds: string[];
  createdAt: string;
  updatedAt: string;
  artifacts: BlackboardArtifact[];
  messages: BlackboardMessage[];
}

interface BlackboardStore {
  agents: BlackboardAgent[];
  tools: BlackboardTool[];
  sessions: BlackboardSession[];
}

interface AssignTaskInput {
  task: string;
  agentIds?: string[];
  providerId?: string;
  model?: string;
}

interface AddMessageInput {
  content: string;
  providerId?: string;
  model?: string;
}

interface ExecuteToolInput {
  input?: any;
}

const BUILTIN_TOOL_NAMES = ['search_notes', 'get_note', 'get_backlinks', 'get_note_tags', 'web_search', 'create_note', 'add_tags', 'export_blackboard'];

const DEFAULT_AGENTS: BlackboardAgent[] = [
  {
    id: 'default-librarian',
    name: 'LibraNia Librarian',
    description: 'Finds relevant notes, tags, and library context.',
    systemPrompt: 'You are the LibraNia Librarian. Connect tasks to existing notes, tags, and knowledge gaps. For review or date-range tasks, summarize the provided notes with created_at and updated_at timestamps so later agents can filter them. Be concrete and cite note titles when useful.',
    tools: ['search_notes', 'get_note', 'list_tags'],
    customTools: '',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-architect',
    name: 'Architecture Planner',
    description: 'Designs system architecture, workflows, diagrams, implementation plans, and technical risks when requested.',
    systemPrompt: 'You are the Architecture Planner. Your role is system and workflow design: architecture diagrams, component boundaries, implementation roadmaps, dependencies, and technical risks. Do not generate ideas, conduct research, or plan another agent workflow unless the user asks for architecture, workflow, diagram, implementation plan, requirements, or system design. If the task only asks for ideas or research, hand off to the matching agent and wait for a later architecture request.',
    tools: ['create_note', 'update_note'],
    customTools: '',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-linker',
    name: 'Link Curator',
    description: 'Suggests internal note links and neighborhoods.',
    systemPrompt: 'You are the Link Curator. Identify neighboring concepts and suggest exact wiki-links that should exist between notes.',
    tools: ['search_notes', 'auto_link'],
    customTools: '',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-export-agent',
    name: 'Export Agent',
    description: 'Summarizes a Blackboard session and exports it to a LibraNia note, Markdown file, or both when explicitly selected or mentioned.',
    systemPrompt: `You are the Export Agent. You only act when the user explicitly selects you or mentions @Export Agent.

Your job:
1. Read the full Blackboard session context, shared artifacts, agent outputs, and user messages.
2. Summarize all useful knowledge from the session into a clean Markdown export.
3. Treat user-authored task/messages as "Questionnaire and Extra User Input" in the export, not as agent findings.
4. Ask no follow-up unless the export mode is missing.
5. Call export_blackboard with:
   - mode: "library_note", "markdown_file", or "both"
   - title: concise export title
   - summaryMarkdown: optional short executive summary only

Never call create_note directly. If exporting to a library note, export_blackboard will create the note after it has built the session export package.
Do not put the full Markdown export inside the JSON tool call. The export_blackboard tool packages the session messages and shared artifacts for you.
Do not export raw transcripts. Preserve decisions, requirements, ideas, architecture, open questions, and useful links.`,
    tools: ['export_blackboard'],
    customTools: '',
    maxResponseTokens: 3600,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const LEGACY_DEFAULT_PROMPTS: Record<string, string[]> = {
  'default-librarian': [
    'You are the LibraNia Librarian. Connect tasks to existing notes, tags, and knowledge gaps. Be concrete and cite note titles when useful.',
  ],
};

function getStorePath(): string {
  const dataDir = process.env.LIBRANIA_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dataDir, 'blackboard.json');
}

function defaultHttpBodyForTool(name: string): string {
  if (name === 'create_weekly_review_note') {
    return `{
  "title": "Weekly Review - {{week_label}}",
  "body": "# Weekly Review - {{week_label}}\\n\\n## Accomplishments\\n{{accomplishments}}\\n\\n## Blockers\\n{{blockers}}\\n\\n## Next Priorities\\n{{next_priorities}}\\n\\n## Reflection\\n{{reflection}}\\n\\n## Tags\\n{{tags}}",
  "metadata": "{\\"source\\":\\"blackboard-tool\\",\\"tool\\":\\"create_weekly_review_note\\",\\"tags\\":\\"{{tags}}\\"}",
  "tags": "{{tags}}"
}`;
  }

  return '';
}

function sanitizeFilename(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'blackboard-export';
}

function getBlackboardExportDir(): string {
  const dataDir = process.env.LIBRANIA_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dataDir, 'blackboard-exports');
}

function normalizeStoredTool(tool: BlackboardTool): BlackboardTool {
  return {
    ...tool,
    httpBody: tool.httpBody || defaultHttpBodyForTool(tool.name),
  };
}

function normalizeResponseBudget(value: unknown, fallback?: number): number | undefined {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(Math.max(Math.round(parsed), 512), 12000);
}

function normalizeStoredSession(session: BlackboardSession): BlackboardSession {
  const artifacts = Array.isArray(session.artifacts) ? session.artifacts : [];
  if (artifacts.length > 0) {
    return {
      ...session,
      artifacts: artifacts.map(artifact => artifact.type === 'relevant_notes'
        ? {
            ...artifact,
            title: artifact.updatedBy === 'Blackboard' ? 'Relevant Note Titles' : artifact.title,
            content: noteTitlesOnly(artifact.content) || artifact.content,
          }
        : artifact),
    };
  }

  const observation = session.messages?.find(message => message.agentName === 'Blackboard' && message.role === 'system')?.content || '';
  const migratedArtifacts = observation
    ? initialArtifactsFromObservation(session.task || session.title, observation, [])
    : [];
  for (const message of session.messages || []) {
    if (message.role !== 'agent') continue;
    const agentName = message.agentName || '';
    const haystack = `${message.agentName} ${message.content}`;
    const type: BlackboardArtifact['type'] = /\blibrarian|library|research/i.test(agentName)
      ? 'relevant_notes'
      : /\breview/i.test(agentName)
        ? 'review_summary'
        : /\bidea|build|recommend|suggest|opportunit/i.test(haystack)
        ? 'candidate_ideas'
        : /\breview/i.test(haystack)
          ? 'review_summary'
          : 'handoff';
    migratedArtifacts.push({
      id: crypto.randomUUID(),
      type,
      title: `${message.agentName} contribution`,
      content: message.content,
      updatedBy: message.agentName,
      updatedAt: message.createdAt,
    });
  }

  return {
    ...session,
    artifacts: migratedArtifacts,
  };
}

async function readStore(): Promise<BlackboardStore> {
  const storePath = getStorePath();
  try {
    const parsed = JSON.parse(await fs.readFile(storePath, 'utf-8')) as Partial<BlackboardStore>;
    const storedAgents = Array.isArray(parsed.agents) ? parsed.agents : [];
    const storedTools = Array.isArray(parsed.tools) ? parsed.tools.map(tool => normalizeStoredTool(tool as BlackboardTool)) : [];
    const defaultIds = new Set(DEFAULT_AGENTS.map(agent => agent.id));
    const customAgents = storedAgents.filter(agent => !defaultIds.has(agent.id));
    const defaultOverrides = new Map(storedAgents
      .filter(agent => defaultIds.has(agent.id))
      .map(agent => [agent.id, agent]));
    return {
      agents: DEFAULT_AGENTS.map(agent => {
        const override = defaultOverrides.get(agent.id);
        if (!override) return agent;
        const legacyPrompts = LEGACY_DEFAULT_PROMPTS[agent.id] || [];
        return {
          ...agent,
          ...override,
          systemPrompt: legacyPrompts.includes(override.systemPrompt) ? agent.systemPrompt : override.systemPrompt,
          description: override.description || agent.description,
          tools: override.tools?.length ? override.tools : agent.tools,
          maxResponseTokens: normalizeResponseBudget(override.maxResponseTokens, agent.maxResponseTokens),
        };
      }).concat(customAgents.map(agent => ({
        ...agent,
        maxResponseTokens: normalizeResponseBudget(agent.maxResponseTokens),
      }))),
      tools: storedTools,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.map(session => normalizeStoredSession(session as BlackboardSession)) : [],
    };
  } catch {
    return { agents: DEFAULT_AGENTS, tools: [], sessions: [] };
  }
}

async function writeStore(store: BlackboardStore): Promise<void> {
  const storePath = getStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), 'utf-8');
}

function providerHeaders(config: ProviderConfig): Record<string, string> | undefined {
  if (!config.customHeaders?.length) return undefined;
  return Object.fromEntries(config.customHeaders.map(header => [header.name, header.value]));
}

function createProvider(config: ProviderConfig) {
  if (config.id === 'claude') return new ClaudeProvider(config.apiKey, config.baseURL);
  if (config.id === 'openai' || config.id === 'custom') {
    return new OpenAIProvider(config.apiKey, config.baseURL, providerHeaders(config));
  }
  return new DeepSeekProvider(config.apiKey, config.baseURL);
}

function getBlackboardWebSearchFn(config: ProviderConfig): (query: string) => Promise<any> {
  const tavilyApiKey = readEnv().TAVILY_API_KEY;
  if (tavilyApiKey) {
    return async (query: string) => searchWeb(query, tavilyApiKey);
  }
  if (config.id === 'claude') {
    return async (query: string) => searchWithClaude(query, config.apiKey, config.baseURL);
  }
  if (config.id === 'openai' || config.id === 'custom') {
    return async (query: string) => searchWithOpenAI(query, config.apiKey, config.baseURL);
  }
  return async (query: string) => searchWithDeepSeek(query, config.apiKey);
}

interface InlineToolCall {
  name: string;
  input: any;
}

function stripJsonFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function toolCallsFromParsedObject(parsed: unknown): InlineToolCall[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return [];
  const record = parsed as Record<string, any>;
  if (typeof record.tool === 'string') {
    return [{ name: record.tool, input: record.args || record.input || {} }];
  }

  return Object.entries(record)
    .filter(([, value]) => typeof value === 'object' && value !== null && !Array.isArray(value))
    .map(([name, input]) => ({ name, input }));
}

function normalizeToolInput(toolName: string, input: any): any {
  const normalized = input && typeof input === 'object' && !Array.isArray(input) ? { ...input } : {};
  if (['get_note', 'get_backlinks', 'get_note_tags'].includes(toolName) && !normalized.noteId && normalized.id) {
    normalized.noteId = normalized.id;
  }
  if (toolName === 'add_tags' && !normalized.noteId && normalized.id) {
    normalized.noteId = normalized.id;
  }
  if (toolName === 'create_note' && !normalized.body) {
    normalized.body = normalized.content || normalized.markdown || normalized.summaryMarkdown;
  }
  if (toolName === 'export_blackboard' && !normalized.summaryMarkdown) {
    normalized.summaryMarkdown = normalized.content || normalized.body || normalized.markdown;
  }
  return normalized;
}

function parsePlainTextToolCalls(response: string): InlineToolCall[] {
  const calls: InlineToolCall[] = [];
  const pattern = /\b([a-z][a-z0-9_]*)\s+call\s*:\s*(\{[^\n]*\})/gi;
  for (const match of response.matchAll(pattern)) {
    try {
      const name = match[1];
      calls.push({ name, input: normalizeToolInput(name, JSON.parse(match[2])) });
    } catch {
      return [];
    }
  }
  return calls;
}

function parseJsonLineToolCalls(response: string): InlineToolCall[] {
  const calls: InlineToolCall[] = [];
  for (const line of response.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) continue;
    try {
      calls.push(...toolCallsFromParsedObject(JSON.parse(trimmed))
        .map(call => ({ ...call, input: normalizeToolInput(call.name, call.input) })));
    } catch {
      continue;
    }
  }
  return calls;
}

function parseXmlToolCalls(response: string): InlineToolCall[] {
  const trimmed = response.trim();
  const calls: InlineToolCall[] = [];
  const blockPattern = /<([a-z][a-z0-9_]*)>\s*([\s\S]*?)\s*<\/\1>/gi;
  let remaining = trimmed;

  for (const match of trimmed.matchAll(blockPattern)) {
    const name = match[1];
    const body = match[2].trim();
    const input: Record<string, any> = {};
    const childPattern = /<([a-z][a-z0-9_]*)>\s*([\s\S]*?)\s*<\/\1>/gi;
    for (const child of body.matchAll(childPattern)) {
      input[child[1]] = child[2].trim();
    }
    if (Object.keys(input).length === 0 && body) {
      input.value = body;
    }
    calls.push({ name, input: normalizeToolInput(name, input) });
    remaining = remaining.replace(match[0], '').trim();
  }

  return remaining.length === 0 ? calls : [];
}

function parseInlineToolCalls(response: string): InlineToolCall[] {
  const trimmed = stripJsonFence(response);
  const plainTextCalls = parsePlainTextToolCalls(response);
  if (plainTextCalls.length > 0 && response.replace(/\b[a-z][a-z0-9_]*\s+call\s*:\s*\{[^\n]*\}/gi, '').trim() === '') {
    return plainTextCalls;
  }
  const xmlCalls = parseXmlToolCalls(response);
  if (xmlCalls.length > 0) return xmlCalls;
  const jsonLineCalls = parseJsonLineToolCalls(response);
  if (jsonLineCalls.length > 0) return jsonLineCalls;

  const fencedBlocks = [...response.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  if (fencedBlocks.length > 0) {
    const calls: InlineToolCall[] = [];
    for (const block of fencedBlocks) {
      try {
        calls.push(...toolCallsFromParsedObject(JSON.parse(block[1].trim())));
      } catch {
        return [];
      }
    }
    if (calls.length > 0) {
      return calls.map(call => ({ ...call, input: normalizeToolInput(call.name, call.input) }));
    }
  }

  if (!trimmed.startsWith('{')) return [];

  try {
    return toolCallsFromParsedObject(JSON.parse(trimmed))
      .map(call => ({ ...call, input: normalizeToolInput(call.name, call.input) }));
  } catch {
    return [];
  }
}

function knownBlackboardToolNames(customTools: BlackboardTool[] = []): string[] {
  return [...new Set([
    ...BUILTIN_TOOL_NAMES,
    ...RESEARCH_TOOLS.map(tool => tool.name),
    ...customTools.map(tool => tool.name),
  ])];
}

function looksLikeToolRequest(response: string, customTools: BlackboardTool[] = []): boolean {
  const toolNames = knownBlackboardToolNames(customTools);
  const escapedNames = toolNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escapedNames.length === 0) return false;
  const namesPattern = escapedNames.join('|');
  return new RegExp(`<\\s*(${namesPattern})\\b|\\b(${namesPattern})\\s+call\\s*:|["'](${namesPattern})["']\\s*:`,'i').test(response);
}

function agentHasBlackboardTool(agent: BlackboardAgent, toolName: string): boolean {
  const isExportAgent = agent.id === 'default-export-agent' || /export/i.test(agent.name);
  if (isExportAgent && toolName !== 'export_blackboard') return false;
  if (agent.tools.includes(toolName)) return true;
  return toolName === 'export_blackboard' && isExportAgent;
}

function canExecuteBlackboardTool(agent: BlackboardAgent, toolName: string, customTools: BlackboardTool[] = []): boolean {
  if (customTools.some(tool => tool.name === toolName)) {
    return agentHasBlackboardTool(agent, toolName);
  }
  const knownResearchTool = RESEARCH_TOOLS.some(tool => tool.name === toolName);
  if (toolName === 'export_blackboard') return agentHasBlackboardTool(agent, toolName);
  if (!knownResearchTool) return false;
  if (['search_notes', 'get_note', 'get_backlinks', 'get_note_tags', 'web_search'].includes(toolName)) return true;
  return agentHasBlackboardTool(agent, toolName);
}

function renderTemplate(value: string, input: any): string {
  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key) => {
    const resolved = String(key).split('.').reduce((current: any, part: string) => current?.[part], input);
    return resolved === undefined || resolved === null ? '' : String(resolved);
  });
}

function parseToolInputSchema(value: string): any {
  if (!value.trim()) return { type: 'object', properties: {} };
  try {
    return JSON.parse(value);
  } catch {
    return { type: 'object', properties: {}, warning: 'Input schema is not valid JSON.' };
  }
}

async function executeCustomTool(tool: BlackboardTool, input: any): Promise<any> {
  if (tool.type === 'static') {
    return {
      tool: tool.name,
      type: tool.type,
      input,
      result: renderTemplate(tool.staticResponse || '', input || {}),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), tool.timeoutMs || 10000);
  try {
    const renderedUrl = renderTemplate(tool.httpUrl, input || {});
    const resolvedUrl = renderedUrl.startsWith('/')
      ? `${process.env.LIBRANIA_API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3001}`}${renderedUrl}`
      : renderedUrl;
    const method = tool.httpMethod || 'GET';
    const headers = Object.fromEntries((tool.httpHeaders || [])
      .filter(header => header.name.trim())
      .map(header => [header.name.trim(), renderTemplate(header.value, input || {})]));
    if (['POST', 'PUT', 'PATCH'].includes(method) &&
        !Object.keys(headers).some(name => name.toLocaleLowerCase() === 'content-type')) {
      headers['Content-Type'] = 'application/json';
    }
    const renderedBody = tool.httpBody?.trim()
      ? renderTemplate(tool.httpBody, input || {})
      : JSON.stringify(input || {});
    const response = await fetch(resolvedUrl, {
      method,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(method) ? renderedBody : undefined,
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : await response.text();
    return {
      tool: tool.name,
      type: tool.type,
      status: response.status,
      ok: response.ok,
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return 'unknown';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 'unknown' : date.toISOString();
}

function compactText(value: string, maxLength: number): string {
  const compacted = value.replace(/\s+/g, ' ').trim();
  return compacted.length > maxLength ? `${compacted.slice(0, maxLength - 1)}...` : compacted;
}

const RELEVANCE_STOPWORDS = new Set([
  'about', 'after', 'agent', 'agents', 'analyze', 'based', 'blackboard', 'content', 'create',
  'current', 'given', 'help', 'idea', 'library', 'multi', 'need', 'plan', 'problem',
  'should', 'system', 'task', 'thing', 'this', 'triage', 'what', 'with',
]);

const AGENT_MATCH_STOPWORDS = new Set([
  ...RELEVANCE_STOPWORDS,
  'able', 'also', 'answer', 'any', 'can', 'check', 'could', 'from', 'give', 'have',
  'into', 'make', 'more', 'name', 'note', 'notes', 'output', 'read', 'some', 'take',
  'tell', 'then', 'there', 'user', 'will', 'work',
]);

function isReviewTask(task: string): boolean {
  return /\b(review|reivew|summary|summarize|summarise|weekly|week|lastweek|thisweek)\b/i.test(task);
}

function isWeekTask(task: string): boolean {
  return /\b(this\s*week|last\s*week|weekly|week)\b/i.test(task);
}

function isReviewerAgent(agent: BlackboardAgent): boolean {
  return /\breview/i.test(`${agent.name} ${agent.description} ${agent.systemPrompt}`);
}

function isLibrarianAgent(agent: BlackboardAgent): boolean {
  return /\blibrarian|library|notes?|research\b/i.test(`${agent.name} ${agent.description} ${agent.systemPrompt}`);
}

function isIdeaAgent(agent: BlackboardAgent): boolean {
  return /\bidea|ideation|brainstorm|build|opportunity\b/i.test(`${agent.name} ${agent.description} ${agent.systemPrompt}`);
}

function expectedArtifactGuidance(agent: BlackboardAgent): string {
  if (isReviewerAgent(agent)) {
    return 'Primary artifacts to update: review_summary, scope if the scope needs correction, handoff. Do not repeat the full note inventory; validate scope, remove irrelevant notes, and summarize implications.';
  }
  if (isIdeaAgent(agent)) {
    return 'Primary artifacts to update: candidate_ideas, final_recommendation, handoff. If the task asks for ideas, produce 5 complete ideas unless the user requested a different number.';
  }
  if (isLibrarianAgent(agent)) {
    return 'Primary artifacts to update: relevant_notes, topic_clusters, open_questions, handoff. Do not perform another specialized agent role; hand off to the matching agent when the task needs work outside your role.';
  }
  return 'Primary artifacts to update: whichever artifact your role improves, plus handoff.';
}

function defaultArtifactTypeForAgent(agent: BlackboardAgent): BlackboardArtifact['type'] {
  if (isReviewerAgent(agent)) return 'review_summary';
  if (isIdeaAgent(agent)) return 'candidate_ideas';
  if (isLibrarianAgent(agent)) return 'relevant_notes';
  return 'handoff';
}

function maxTokensForAgent(agent: BlackboardAgent): number {
  const configuredBudget = normalizeResponseBudget(agent.maxResponseTokens);
  if (configuredBudget) return configuredBudget;

  const haystack = `${agent.name} ${agent.description} ${agent.systemPrompt}`.toLocaleLowerCase();
  if (/architect|architecture|planner|diagram|roadmap|implementation/.test(haystack)) return 3600;
  if (/research|search|source|web/.test(haystack)) return 3600;
  if (isIdeaAgent(agent)) return 3000;
  if (isReviewerAgent(agent)) return 2400;
  return 2200;
}

function extractBlackboardObservation(transcript: string): string | null {
  const match = transcript.match(/Blackboard: (## Blackboard Observation:[\s\S]*?)(?=\n\n(?:You|System|LibraNia|Reviewer|Architecture|Link|Blackboard):|\s*$)/);
  return match?.[1]?.trim() || null;
}

interface AgentOutput {
  content: string;
  details?: string;
}

function buildDeterministicReviewFallback(task: string, observation: string | null): AgentOutput {
  if (!observation) {
    return {
      content: `## Blackboard Review

Task: ${task}

No Blackboard observation is available yet, so there is not enough shared state to summarize.`,
      details: `Task: ${task}\n\nNo Blackboard observation was available.`,
    };
  }

  if (observation.includes('## Blackboard Observation: Weekly Content Review')) {
    const topicCounts = observation.match(/### Topic Counts\n([\s\S]*?)(?:\n\n###|\n\nController guidance:|\s*$)/)?.[1]?.trim() || '- No topic counts available';
    const notes = [...observation.matchAll(/^- (.+?) \((.+?)\): created (.+?), updated (.+)$/gm)]
      .map(match => ({ title: match[1], topic: match[2], created: match[3], updated: match[4] }));
    const relevant = notes.filter(note => !/Personal Reading|Fiction/i.test(note.topic));
    const excluded = notes.filter(note => /Personal Reading|Fiction/i.test(note.topic));
    const buildThemes = [
      notes.some(note => /malware|portable executable|iat|hash|process/i.test(`${note.title} ${note.topic}`)) ? '- Windows malware internals are a strong build direction.' : '',
      notes.some(note => /agent|blackboard|multi-agent/i.test(`${note.title} ${note.topic}`)) ? '- Multi-agent/Blackboard architecture is a strong build direction.' : '',
      notes.some(note => /xdr|sentinel|defender|sc 200/i.test(note.title)) ? '- SOC/XDR integration can make the build practical for defenders.' : '',
    ].filter(Boolean).join('\n') || '- No obvious build theme was detected.';

    return {
      content: `## Reviewer Scope Check

I reviewed the Blackboard weekly observation for: ${task}

### Validated Topic Counts
${topicCounts}

### Scope Decision
- Keep ${relevant.length} build-relevant notes.
- Exclude ${excluded.length} off-topic note${excluded.length === 1 ? '' : 's'} from the build-idea step${excluded.length > 0 ? `: ${excluded.map(note => note.title).join(', ')}` : '.'}

### Build-Relevant Themes
${buildThemes}

### Handoff to Idea Agent
Use the validated build-relevant scope only. Generate concrete project ideas from the malware-analysis, agentic workflow, and SOC/XDR themes. Do not repeat the raw note inventory.`,
      details: `Task: ${task}\n\nSource Blackboard observation:\n${observation}`,
    };
  }

  return {
    content: `## Blackboard Review

Task: ${task}

Reviewer handoff:
- This result is based on the current Blackboard observation because the AI provider returned an empty response.
- The next agent should build on this shared state instead of repeating the transcript.`,
    details: `Task: ${task}\n\nSource Blackboard observation:\n${observation}`,
  };
}

function buildLibrarianFallback(task: string, noteContext: string): string {
  const noteTitles = noteContext
    .split('\n')
    .filter(line => line.startsWith('- title:'))
    .slice(0, 12)
    .map(line => line.replace('- title:', '-').trim())
    .join('\n');

  return `## Librarian Context

Task: ${task}

Relevant library notes:
${noteTitles || 'No notes found.'}

Handoff:
- Use the Blackboard Observation message as the shared source of truth.
- Ask the user only when the observation and note context are insufficient.
- Build on the relevant notes above without dumping the full library inventory.`;
}

function buildAgentFallback(agent: BlackboardAgent, task: string, transcript: string): AgentOutput {
  const observation = extractBlackboardObservation(transcript);
  const previousAgent = [...transcript.matchAll(/\n\n([^:\n]+): ##/g)].map(match => match[1]).at(-1);
  if (isReviewerAgent(agent)) {
    return buildDeterministicReviewFallback(task, observation);
  }
  if (isResearchAgent(agent)) {
    return {
      content: `## Research Agent Could Not Complete Research

The model returned an empty or unusable response before making a valid tool call. No research note was created.

Next step: rerun @Research Agent with a narrower query, or test \`search_notes\`, \`web_search\`, and \`create_note\` in Playground.`,
      details: [
        `Task: ${task}`,
        '',
        'Fallback reason:',
        '- Research Agent produced no usable model response.',
        '',
        'Expected behavior:',
        '- Search LibraNia first.',
        '- Use web_search when needed.',
        '- Create a LibraNia note after web research.',
        '',
        'Shared Blackboard state:',
        observation || 'No Blackboard observation is available.',
        '',
        'Transcript excerpt:',
        compactText(transcript || 'No transcript is available.', 4000),
      ].join('\n'),
    };
  }

  return {
    content: `## ${agent.name} Could Not Respond

The model returned an empty or unusable response. No shared artifact was updated from this fallback.`,
    details: [
      `Task: ${task}`,
      '',
      'Fallback context:',
      previousAgent ? `- ${previousAgent}'s prior output` : '- The Blackboard observation',
      '',
      'Shared Blackboard state:',
      observation || 'No Blackboard observation is available.',
      '',
      'Transcript excerpt:',
      compactText(transcript || 'No transcript is available.', 4000),
    ].join('\n'),
  };
}

function buildToolTraceSummary(agentName: string, toolTrace: string[]): string | null {
  const createdNotes: Array<{ id: string; title: string }> = [];
  const taggedNotes: string[] = [];
  const searchedQueries: string[] = [];
  const errors: string[] = [];

  for (const trace of toolTrace) {
    try {
      const results = JSON.parse(trace);
      if (!Array.isArray(results)) continue;
      for (const item of results) {
        if (item?.tool === 'create_note' && item.result?.id && item.result?.title) {
          createdNotes.push({ id: String(item.result.id), title: String(item.result.title) });
        }
        if (item?.tool === 'add_tags' && item.result?.success) {
          taggedNotes.push(String(item.input?.noteId || item.input?.id || 'note'));
        }
        if (item?.tool === 'web_search' && item.input?.query) {
          searchedQueries.push(String(item.input.query));
        }
        if (item?.error) {
          errors.push(`${item.tool || 'tool'}: ${item.error}`);
        }
      }
    } catch {
      continue;
    }
  }

  if (createdNotes.length === 0 && taggedNotes.length === 0 && searchedQueries.length === 0) return null;

  const sections = [`## ${agentName} Tool Summary`];
  if (createdNotes.length > 0) {
    sections.push('', '### Created Notes');
    sections.push(...createdNotes.map(note => `- [[${note.title}]] (${note.id})`));
  }
  if (taggedNotes.length > 0) {
    sections.push('', '### Tags Updated');
    sections.push(...taggedNotes.map(noteId => `- ${noteId}`));
  }
  if (searchedQueries.length > 0) {
    sections.push('', '### Searches Used');
    sections.push(...[...new Set(searchedQueries)].map(query => `- ${query}`));
  }
  if (errors.length > 0) {
    sections.push('', '### Tool Warnings');
    sections.push(...errors.map(error => `- ${error}`));
  }
  sections.push('', 'The model continued requesting tools after the tool budget was exhausted, so Blackboard surfaced this deterministic summary from the executed tool results.');
  return sections.join('\n');
}

function hasSuccessfulToolResult(toolTrace: string[], toolName: string): boolean {
  for (const trace of toolTrace) {
    try {
      const items = JSON.parse(trace);
      if (Array.isArray(items) && items.some(item => item?.tool === toolName && item.result && !item.error)) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

function getSuccessfulToolResults(toolTrace: string[], toolName: string): Array<{ input: any; result: any }> {
  const matches: Array<{ input: any; result: any }> = [];
  for (const trace of toolTrace) {
    try {
      const items = JSON.parse(trace);
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (item?.tool === toolName && item.result && !item.error) {
          matches.push({ input: item.input || {}, result: item.result });
        }
      }
    } catch {
      continue;
    }
  }
  return matches;
}

function isResearchAgent(agent: BlackboardAgent): boolean {
  return /research/i.test(`${agent.name} ${agent.description}`);
}

function buildFallbackResearchNote(task: string, toolTrace: string[]): { title: string; body: string } {
  const searches = getSuccessfulToolResults(toolTrace, 'web_search');
  const localMatches = getSuccessfulToolResults(toolTrace, 'search_notes');
  const sections = searches.map((entry, index) => {
    const results = Array.isArray(entry.result?.results) ? entry.result.results.slice(0, 5) : [];
    return [
      `## Search ${index + 1}: ${entry.input?.query || 'Web research'}`,
      '',
      ...results.map((result: any, resultIndex: number) => [
        `### ${resultIndex + 1}. ${result.title || 'Untitled result'}`,
        result.url ? `Source: ${result.url}` : '',
        '',
        result.content ? String(result.content).replace(/\s+/g, ' ').slice(0, 900) : 'No excerpt available.',
      ].filter(Boolean).join('\n')),
    ].join('\n');
  });
  const localSection = localMatches.length > 0
    ? [
        '## Existing LibraNia Matches',
        '',
        ...localMatches.flatMap(entry => Array.isArray(entry.result) ? entry.result.slice(0, 8).map((note: any) => [
          `### [[${note.title || 'Untitled note'}]]`,
          note.id ? `ID: ${note.id}` : '',
          '',
          note.body ? String(note.body).replace(/\s+/g, ' ').slice(0, 700) : '',
        ].filter(Boolean).join('\n')) : []),
      ].join('\n')
    : '';

  const compactTask = task.replace(/\s+/g, ' ').trim();
  return {
    title: `Research Notes - ${compactTask.slice(0, 80)}`,
    body: [
      `# Research Notes - ${compactTask}`,
      '',
      '## Summary',
      'This note was created automatically by Blackboard because Research Agent performed web research but did not create a note before ending its turn.',
      'Review and refine this note if a more polished synthesis is needed.',
      '',
      '## Research Task',
      compactTask,
      '',
      localSection,
      localSection ? '' : '',
      sections.join('\n\n') || 'No web search result details were available in the tool trace.',
      '',
      '## LibraNia Connections',
      '- Add related `[[Note Title]]` links after reviewing the library context.',
    ].join('\n'),
  };
}

async function recoverResearchAgentTurn(params: {
  task: string;
  toolTrace: string[];
  webSearchFn?: ((query: string) => Promise<any>);
  toolContext: ResearchToolContext;
}): Promise<string> {
  const results: any[] = [];
  const query = params.task.replace(/\s+/g, ' ').trim().slice(0, 240);

  if (!hasSuccessfulToolResult(params.toolTrace, 'search_notes')) {
    try {
      const result = await executeToolCall('search_notes', { query }, params.webSearchFn, params.toolContext);
      results.push({ tool: 'search_notes', input: { query }, result, enforced: true });
    } catch (error: any) {
      results.push({ tool: 'search_notes', input: { query }, error: error.message || String(error), enforced: true });
    }
  }

  if (!hasSuccessfulToolResult(params.toolTrace, 'web_search') && params.webSearchFn) {
    try {
      const result = await executeToolCall('web_search', { query }, params.webSearchFn, params.toolContext);
      results.push({ tool: 'web_search', input: { query }, result, enforced: true });
    } catch (error: any) {
      results.push({ tool: 'web_search', input: { query }, error: error.message || String(error), enforced: true });
    }
  }

  if (results.length > 0) {
    params.toolTrace.push(JSON.stringify(results, null, 2));
  }

  if (!hasSuccessfulToolResult(params.toolTrace, 'create_note')) {
    const fallbackNote = buildFallbackResearchNote(params.task, params.toolTrace);
    const createResults: any[] = [];
    try {
      const result = await executeToolCall('create_note', fallbackNote, params.webSearchFn, params.toolContext);
      createResults.push({ tool: 'create_note', input: fallbackNote, result, enforced: true });
    } catch (error: any) {
      createResults.push({ tool: 'create_note', input: fallbackNote, error: error.message || String(error), enforced: true });
    }
    params.toolTrace.push(JSON.stringify(createResults, null, 2));
  }

  const created = getSuccessfulToolResults(params.toolTrace, 'create_note').at(-1)?.result;
  const searched = getSuccessfulToolResults(params.toolTrace, 'web_search').length;
  const local = getSuccessfulToolResults(params.toolTrace, 'search_notes').length;
  const warnings = params.toolTrace.flatMap(trace => {
    try {
      const items = JSON.parse(trace);
      return Array.isArray(items)
        ? items.filter(item => item?.error).map(item => `- ${item.tool}: ${item.error}`)
        : [];
    } catch {
      return [];
    }
  });

  return [
    '## Research Agent Recovery Completed',
    '',
    'The model response was empty or unusable, so Blackboard ran the Research Agent recovery workflow deterministically.',
    '',
    '### Recovery Actions',
    `- Local library searches executed: ${local}`,
    `- Web searches executed: ${searched}`,
    created?.id ? `- Research note created: [[${created.title}]] (${created.id})` : '- Research note creation failed',
    warnings.length > 0 ? '\n### Warnings\n' + warnings.join('\n') : '',
  ].filter(Boolean).join('\n');
}

function guardUnverifiedNoteCreationClaims(content: string, toolTrace: string[]): string {
  if (hasSuccessfulToolResult(toolTrace, 'create_note')) return content;
  if (!/\b(created|new)\s+(?:libraNia\s+)?notes?\b|\bnotes?\s+(?:i'?ve\s+)?created\b/i.test(content)) {
    return content;
  }

  return [
    content
      .replace(/\bNew Notes Created\b/gi, 'Proposed Notes')
      .replace(/\bnew LibraNia notes I've created\b/gi, 'proposed LibraNia notes')
      .replace(/\bnotes I've created\b/gi, 'notes I propose creating')
      .replace(/\bI created\b/gi, 'I proposed')
      .replace(/\bI've created\b/gi, 'I proposed'),
    '',
    '> Blackboard warning: this response mentioned note creation, but no successful `create_note` tool result was recorded for this turn. Treat any note titles here as proposed drafts until a tool result shows a note ID.',
  ].join('\n');
}

function buildQuestionnaireSection(session: BlackboardSession): string {
  const userInputs = session.messages
    .filter(message => message.role === 'task' || message.role === 'user')
    .map(message => `- **${message.role === 'task' ? 'Task' : 'User'} (${message.createdAt})**: ${message.content.replace(/\s+/g, ' ').trim()}`)
    .filter(Boolean);

  if (userInputs.length === 0) return '';
  return [
    '## Questionnaire and Extra User Input',
    ...userInputs,
  ].join('\n');
}

function latestAgentMessage(session: BlackboardSession, agentName: string): BlackboardMessage | undefined {
  return [...session.messages]
    .reverse()
    .find(message => message.role === 'agent' && message.agentName === agentName);
}

function latestAgentExportContent(session: BlackboardSession, agentName: string): string {
  const content = latestAgentMessage(session, agentName)?.content || '';
  return cleanAgentExportContent(content);
}

function cleanAgentExportContent(content: string): string {
  return stripArtifactBlocks(content).content
    .replace(/```blackboard-artifact[\s\S]*?(?=\n#{1,3}\s|$)/gi, '')
    .trim();
}

function isExportArtifact(artifact: BlackboardArtifact): boolean {
  return artifact.updatedBy === 'Export Agent' ||
    /Session Export Complete|Export Summary|export_blackboard/i.test(`${artifact.title}\n${artifact.content}`);
}

function uniqueExportSections(sections: Array<{ heading: string; content?: string }>): string {
  const seen = new Set<string>();
  return sections
    .map(section => {
      const content = section.content?.trim();
      if (!content) return '';
      const key = content.replace(/\s+/g, ' ').slice(0, 500);
      if (seen.has(key)) return '';
      seen.add(key);
      return [`## ${section.heading}`, '', content].join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

function createdNoteSummaryFromMessages(session: BlackboardSession): string {
  const matches = new Map<string, string>();
  for (const message of session.messages) {
    if (message.role !== 'agent') continue;
    for (const match of message.content.matchAll(/\[\[([^\]]+)\]\]\s*\(([0-9a-f-]{12,})\)/gi)) {
      matches.set(match[2], match[1]);
    }
  }
  if (matches.size === 0) return '';
  return [
    '## Created LibraNia Notes',
    '',
    ...[...matches.entries()].map(([id, title]) => `- [[${title}]] (${id})`),
  ].join('\n');
}

function buildMainSessionExport(session: BlackboardSession): string {
  const createdNotes = createdNoteSummaryFromMessages(session);
  const agentTurns = session.messages
    .filter(message => message.role === 'agent' && message.agentName !== 'Export Agent')
    .map((message, index) => {
      const content = cleanAgentExportContent(message.content);
      if (!content || /Could Not Respond|Could Not Complete Research|Tool Request Was Not Executed/i.test(content)) {
        return '';
      }
      return [
        `### ${index + 1}. ${message.agentName}`,
        `Time: ${message.createdAt}`,
        '',
        content,
      ].join('\n');
    })
    .filter(Boolean)
    .join('\n\n');

  return uniqueExportSections([
    { heading: 'Created LibraNia Notes', content: createdNotes.replace(/^## Created LibraNia Notes\s*/i, '').trim() },
    { heading: 'Complete Agent Contributions', content: agentTurns },
  ]);
}

function buildExportMarkdown(session: BlackboardSession, input: any): string {
  const title = String(input.title || `Blackboard Export - ${session.title}`).trim();
  const summaryMarkdown = String(input.summaryMarkdown || input.body || input.content || input.markdown || '').trim();
  const fallbackSummary = [
    '## Summary',
    `This export captures the useful knowledge from the Blackboard session "${session.title}".`,
    'It includes the user task and follow-up inputs as questionnaire context, plus the shared artifacts produced by the agent team.',
  ].join('\n');
  const questionnaire = buildQuestionnaireSection(session);
  const mainSessionExport = buildMainSessionExport(session);
  const exportableArtifacts = session.artifacts.filter(artifact => !isExportArtifact(artifact));
  const artifactSummary = exportableArtifacts.length > 0
    ? [
        '## Appendix: Shared Blackboard Artifacts',
        ...exportableArtifacts.map(artifact => [
          `### ${artifact.title}`,
          `Type: ${artifact.type}; updated by ${artifact.updatedBy} at ${artifact.updatedAt}`,
          '',
          artifact.content,
        ].join('\n')),
      ].join('\n\n')
    : '';

  return [
    `# ${title}`,
    '',
    `Exported from Blackboard session: ${session.title}`,
    `Session ID: ${session.id}`,
    `Created: ${session.createdAt}`,
    `Updated: ${session.updatedAt}`,
    '',
    summaryMarkdown || fallbackSummary,
    questionnaire ? `\n${questionnaire}` : '',
    mainSessionExport ? `\n${mainSessionExport}` : '',
    artifactSummary ? `\n${artifactSummary}` : '',
  ].filter(Boolean).join('\n');
}

async function exportBlackboardSession(session: BlackboardSession, input: any): Promise<any> {
  const mode = String(input.mode || input.exportTo || input.target || '').trim() || 'both';
  if (!['library_note', 'markdown_file', 'both'].includes(mode)) {
    throw new Error('export_blackboard mode must be library_note, markdown_file, or both.');
  }

  const title = String(input.title || `Blackboard Export - ${session.title}`).trim();
  const markdown = buildExportMarkdown(session, { ...input, title });
  const result: Record<string, any> = {
    mode,
    title,
  };

  if (mode === 'library_note' || mode === 'both') {
    const note = await executeToolCall('create_note', {
      title,
      body: markdown,
    }, undefined, { pendingImageUrls: [] });
    result.note = {
      id: note.id,
      title: note.title,
    };
  }

  if (mode === 'markdown_file' || mode === 'both') {
    const exportDir = getBlackboardExportDir();
    await fs.mkdir(exportDir, { recursive: true });
    const filename = `${sanitizeFilename(title)}-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    const filePath = path.join(exportDir, filename);
    await fs.writeFile(filePath, markdown, 'utf-8');
    result.file = {
      path: filePath,
      filename,
    };
  }

  return result;
}

function formatArtifactsForPrompt(artifacts: BlackboardArtifact[]): string {
  if (artifacts.length === 0) return 'No structured artifacts yet.';
  return artifacts
    .map(artifact => [
      `### ${artifact.type}: ${artifact.title}`,
      `Updated by: ${artifact.updatedBy} at ${artifact.updatedAt}`,
      artifact.content,
    ].join('\n'))
    .join('\n\n');
}

function upsertArtifact(
  session: BlackboardSession,
  input: Omit<BlackboardArtifact, 'id' | 'updatedAt'>
): BlackboardArtifact {
  const now = new Date().toISOString();
  const existing = session.artifacts.find(artifact => artifact.type === input.type);
  const artifact: BlackboardArtifact = {
    id: existing?.id || crypto.randomUUID(),
    type: input.type,
    title: input.title,
    content: input.content.trim(),
    updatedBy: input.updatedBy,
    updatedAt: now,
  };
  session.artifacts = existing
    ? session.artifacts.map(candidate => candidate.id === artifact.id ? artifact : candidate)
    : [...session.artifacts, artifact];
  return artifact;
}

function stripArtifactBlocks(response: string): { content: string; artifacts: Array<Pick<BlackboardArtifact, 'type' | 'title' | 'content'>> } {
  const artifacts: Array<Pick<BlackboardArtifact, 'type' | 'title' | 'content'>> = [];
  const pattern = /```blackboard-artifact\s*([\s\S]*?)```/gi;
  const content = response.replace(pattern, (_match, block) => {
    try {
      const parsed = JSON.parse(String(block).trim());
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') continue;
        if (!['scope', 'relevant_notes', 'topic_clusters', 'review_summary', 'candidate_ideas', 'final_recommendation', 'handoff', 'open_questions'].includes(candidate.type)) continue;
        artifacts.push({
          type: candidate.type,
          title: String(candidate.title || candidate.type),
          content: String(candidate.content || ''),
        });
      }
    } catch {
      artifacts.push({
        type: 'handoff',
        title: 'Unparsed artifact block',
        content: String(block).trim(),
      });
    }
    return '';
  }).trim();
  return { content, artifacts };
}

function initialArtifactsFromObservation(task: string, observation: string, agents: BlackboardAgent[]): BlackboardArtifact[] {
  const now = new Date().toISOString();
  const artifacts: BlackboardArtifact[] = [
    {
      id: crypto.randomUUID(),
      type: 'scope',
      title: 'Task Scope',
      content: [
        `Task: ${task}`,
        `Active agents: ${agents.map(agent => agent.name).join(', ') || 'none'}`,
        'Mode: collaborative blackboard team workspace',
        'Handoff rule: @mention an active or inactive agent when that agent should join or respond.',
      ].join('\n'),
      updatedBy: 'Blackboard',
      updatedAt: now,
    },
  ];

  const notesMatch = observation.match(/### Notes In Scope\n([\s\S]*?)(?:\n\nController guidance:|\n\n###|\s*$)/);
  const countsMatch = observation.match(/### Topic Counts\n([\s\S]*?)(?:\n\n###|\n\nController guidance:|\s*$)/);
  const relevantNotesMatch = observation.match(/Relevant notes from database:\n([\s\S]*?)(?:\n\nController guidance:|\s*$)/);

  if (countsMatch?.[1]) {
    artifacts.push({
      id: crypto.randomUUID(),
      type: 'topic_clusters',
      title: 'Initial Topic Clusters',
      content: countsMatch[1].trim(),
      updatedBy: 'Blackboard',
      updatedAt: now,
    });
  }

  const noteContent = noteTitlesOnly(notesMatch?.[1]?.trim() || relevantNotesMatch?.[1]?.trim() || '');
  if (noteContent) {
    artifacts.push({
      id: crypto.randomUUID(),
      type: 'relevant_notes',
      title: 'Relevant Note Titles',
      content: noteContent,
      updatedBy: 'Blackboard',
      updatedAt: now,
    });
  }

  return artifacts;
}

function noteTitlesOnly(content: string): string {
  return content
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('- ')) return '';
      let title = trimmed.slice(2).trim();
      title = title.replace(/\s+\([^)]+\):\s+created\s+.*$/i, '');
      title = title.replace(/:\s+created\s+.*$/i, '');
      title = title.replace(/\s+id:\s+.*$/i, '');
      return title ? `- ${title.trim()}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getTaskDateWindow(task: string): { label: string; start: Date; end: Date } {
  const now = new Date();
  const today = startOfUtcDay(now);
  if (/\bthis\s*week\b/i.test(task)) {
    const day = today.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    const start = new Date(today.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { label: 'current UTC week, Monday through Sunday', start, end };
  }

  const end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { label: 'last 7 UTC days from server time', start, end };
}

function bucketNote(note: Awaited<ReturnType<typeof getAllNotes>>[number]): string {
  if (note.group) return note.group;

  const text = `${note.title} ${note.body}`.toLocaleLowerCase();
  const title = note.title.toLocaleLowerCase();
  return title.match(/multi-agent malware|malware analysis framework/)
    ? 'Agentic Malware Analysis'
    : title.match(/api hashing|hashdb|iat hooking|process injection|process hollowing|portable executable|\bpe\b/)
      ? 'Malware Analysis / Windows Internals'
      : title.match(/sc[-\s]?200|sentinel|defender|xdr|security operations/)
        ? 'Security Operations / XDR'
      : title.match(/chromiumos|syscall|system call/)
        ? 'Linux Internals / System Calls'
      : title.match(/multi-agent|blackboard|agentcore|agent harness|agent skill/)
        ? 'AI Agents / Multi-Agent Systems'
    : text.match(/agent|blackboard|multi-agent|bedrock|harness/)
      ? 'AI Agents / Multi-Agent Systems'
      : text.match(/malware|hooking|injection|portable executable|hashdb|iat|process hollowing/)
    ? 'Malware Analysis / Windows Internals'
    : text.match(/quantum|cryptography|encryption|pqc/)
      ? 'Cryptography'
        : text.match(/xdr|sentinel|defender|security|crowdstrike|sc-200|aws certified/)
          ? 'Security Operations / Certification'
          : text.match(/lord of the mysteries|pathways/)
            ? 'Personal Reading / Fiction'
            : 'General Knowledge';
}

function taskTerms(task: string): string[] {
  return task
    .toLocaleLowerCase()
    .replace(/[^a-z0-9+#\s-]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length >= 4 && !RELEVANCE_STOPWORDS.has(term));
}

function noteRelevanceScore(task: string, note: Awaited<ReturnType<typeof getAllNotes>>[number]): number {
  const terms = taskTerms(task);
  const taskLower = task.toLocaleLowerCase();
  const title = note.title.toLocaleLowerCase();
  const body = note.body.toLocaleLowerCase();
  const group = (note.group || '').toLocaleLowerCase();
  let score = 0;

  for (const term of terms) {
    if (title.includes(term)) score += 5;
    if (body.includes(term)) score += 1;
    if (group.includes(term)) score += 4;
  }

  if (/\bmalware\b/i.test(taskLower)) {
    if (/malware|hooking|injection|portable executable|\bpe\b|hashdb|iat|process hollowing|api hashing|syscall|system call/i.test(`${title} ${body}`)) {
      score += 8;
    }
  }
  if (/\bcloud|aws|azure|kubernetes|xdr|sentinel|defender|security|siem\b/i.test(taskLower)) {
    if (/cloud|aws|azure|kubernetes|xdr|sentinel|defender|security|siem|crowdstrike|bedrock/i.test(`${title} ${body}`)) {
      score += 7;
    }
  }
  if (/\bagent|multi-agent|blackboard|harness\b/i.test(taskLower)) {
    if (/agent|multi-agent|blackboard|harness|orchestrat/i.test(`${title} ${body}`)) {
      score += 6;
    }
  }

  if (!/lord of the mysteries|fiction|novel|pathways/i.test(taskLower) &&
      /lord of the mysteries|fiction|novel|pathways/i.test(`${title} ${body}`)) {
    score -= 20;
  }

  return score;
}

function relevantNotesForTask(
  task: string,
  notes: Awaited<ReturnType<typeof getAllNotes>>,
  limit = 8
): Awaited<ReturnType<typeof getAllNotes>> {
  return notes
    .map(note => ({ note, score: noteRelevanceScore(task, note) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.note);
}

function buildWeeklyReviewObservation(task: string, notes: Awaited<ReturnType<typeof getAllNotes>>): string | null {
  if (!isReviewTask(task) || !isWeekTask(task)) {
    return null;
  }

  const { label, start, end } = getTaskDateWindow(task);
  const inWindow = notes.filter(note => {
    const created = note.created_at instanceof Date ? note.created_at : new Date(note.created_at);
    const updated = note.updated_at instanceof Date ? note.updated_at : new Date(note.updated_at);
    return (created >= start && created < end) || (updated >= start && updated < end);
  });

  const buckets = new Map<string, typeof inWindow>();
  for (const note of inWindow) {
    const topic = bucketNote(note);
    buckets.set(topic, [...(buckets.get(topic) || []), note]);
  }

  const noteLines = inWindow.slice(0, 20).map(note =>
    `- ${note.title} (${bucketNote(note)}): created ${formatDate(note.created_at)}, updated ${formatDate(note.updated_at)}`
  );
  const topicSummary = [...buckets.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([topic, items]) => `- ${topic}: ${items.length} note${items.length === 1 ? '' : 's'}`)
    .join('\n');

  return `## Blackboard Observation: Weekly Content Review

Task: ${task}
Date window: ${start.toISOString()} through ${end.toISOString()} (${label}).
Matching notes: ${inWindow.length}

### Topic Counts
${topicSummary || '- No matching notes'}

### Notes In Scope
${noteLines.join('\n') || '- No matching notes'}

Controller guidance:
- This observation is computed from the database, not from an LLM.
- Agents should refine, critique, or summarize it without repeating the full Notes In Scope list.
- Use this as the source artifact for the weekly review.`;
}

function buildGeneralBlackboardObservation(
  task: string,
  notes: Awaited<ReturnType<typeof getAllNotes>>,
  agents: BlackboardAgent[]
): string {
  const relevantNotes = relevantNotesForTask(task, notes);
  const noteLines = relevantNotes.map(note =>
    `- ${note.title}${note.group ? ` (${note.group})` : ''}`
  );
  const agentLines = agents.map(agent => `- ${agent.name}: ${agent.description || 'No description'}`);

  return `## Blackboard Observation: Task Workspace

Task: ${task}
Active agents:
${agentLines.join('\n') || '- No active agents'}

Collaboration model:
- Active agents are teammates in the same Blackboard room, not an ordered chain.
- Agents should update shared artifacts and @mention another agent when that agent should join or respond.
- If an inactive agent is @mentioned, Blackboard should activate that agent for this session.

Relevant notes from database:
${noteLines.join('\n') || '- No direct title/body matches found. Agents may still reason from the task and available tools.'}

Controller guidance:
- This is the shared Blackboard state for the assigned task.
- Agents should update, critique, or build on this state instead of treating the task as isolated chat.
- When an agent needs another agent, mention it by @name so the session can activate it.
- Do not dump raw transcripts or full note inventories into handoffs.`;
}

function buildBlackboardObservation(
  task: string,
  notes: Awaited<ReturnType<typeof getAllNotes>>,
  agents: BlackboardAgent[]
): string {
  return buildWeeklyReviewObservation(task, notes) || buildGeneralBlackboardObservation(task, notes, agents);
}

export async function listBlackboardAgents(): Promise<BlackboardAgent[]> {
  return (await readStore()).agents;
}

export async function saveBlackboardAgent(input: Partial<BlackboardAgent>): Promise<BlackboardAgent> {
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = input.id ? store.agents.find(agent => agent.id === input.id) : undefined;
  const agent: BlackboardAgent = {
    id: existing?.id || crypto.randomUUID(),
    name: input.name?.trim() || existing?.name || 'Custom Agent',
    description: input.description?.trim() || existing?.description || '',
    systemPrompt: input.systemPrompt?.trim() || existing?.systemPrompt || 'You are a helpful LibraNia agent.',
    tools: Array.isArray(input.tools) ? input.tools.map(String).filter(Boolean) : existing?.tools || [],
    customTools: input.customTools || existing?.customTools || '',
    maxResponseTokens: normalizeResponseBudget(input.maxResponseTokens, existing?.maxResponseTokens),
    isDefault: existing?.isDefault || false,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  store.agents = existing
    ? store.agents.map(candidate => candidate.id === agent.id ? agent : candidate)
    : [agent, ...store.agents];
  await writeStore(store);
  return agent;
}

export async function deleteBlackboardAgent(id: string): Promise<void> {
  const store = await readStore();
  const agent = store.agents.find(candidate => candidate.id === id);
  if (agent?.isDefault) {
    throw new Error('Default agents can be edited but not deleted.');
  }
  store.agents = store.agents.filter(candidate => candidate.id !== id);
  await writeStore(store);
}

export async function listBlackboardTools(): Promise<BlackboardTool[]> {
  return (await readStore()).tools;
}

export async function saveBlackboardTool(input: Partial<BlackboardTool>): Promise<BlackboardTool> {
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = input.id ? store.tools.find(tool => tool.id === input.id) : undefined;
  const rawName = input.name?.trim() || existing?.name || 'custom_tool';
  const name = rawName.toLocaleLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'custom_tool';
  if (BUILTIN_TOOL_NAMES.includes(name)) {
    throw new Error('Custom tool name conflicts with a built-in tool.');
  }

  const tool: BlackboardTool = {
    id: existing?.id || crypto.randomUUID(),
    name,
    description: input.description?.trim() || existing?.description || '',
    type: input.type === 'http' ? 'http' : 'static',
    inputSchema: input.inputSchema || existing?.inputSchema || '{\n  "type": "object",\n  "properties": {}\n}',
    staticResponse: input.staticResponse || existing?.staticResponse || '',
    httpMethod: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(String(input.httpMethod))
      ? input.httpMethod as BlackboardTool['httpMethod']
      : existing?.httpMethod || 'GET',
    httpUrl: input.httpUrl || existing?.httpUrl || '',
    httpBody: input.httpBody ?? existing?.httpBody ?? defaultHttpBodyForTool(name),
    httpHeaders: Array.isArray(input.httpHeaders) ? input.httpHeaders : existing?.httpHeaders || [],
    timeoutMs: Number(input.timeoutMs || existing?.timeoutMs || 10000),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  store.tools = existing
    ? store.tools.map(candidate => candidate.id === tool.id ? tool : candidate)
    : [tool, ...store.tools];
  if (existing && existing.name !== tool.name) {
    store.agents = store.agents.map(agent => ({
      ...agent,
      tools: agent.tools.map(toolName => toolName === existing.name ? tool.name : toolName),
    }));
  }
  await writeStore(store);
  return tool;
}

export async function deleteBlackboardTool(id: string): Promise<void> {
  const store = await readStore();
  const tool = store.tools.find(candidate => candidate.id === id);
  if (!tool) return;
  store.tools = store.tools.filter(candidate => candidate.id !== id);
  store.agents = store.agents.map(agent => ({
    ...agent,
    tools: agent.tools.filter(toolName => toolName !== tool.name),
  }));
  await writeStore(store);
}

export async function executeBlackboardTool(idOrName: string, input: ExecuteToolInput = {}): Promise<any> {
  const store = await readStore();
  const customTool = store.tools.find(tool => tool.id === idOrName || tool.name === idOrName);
  if (customTool) {
    return executeCustomTool(customTool, input.input || {});
  }

  const builtinToolName = idOrName.startsWith('builtin:') ? idOrName.slice('builtin:'.length) : idOrName;
  if (!BUILTIN_TOOL_NAMES.includes(builtinToolName)) {
    throw new Error(`Tool not found: ${idOrName}`);
  }
  if (builtinToolName === 'export_blackboard') {
    throw new Error('export_blackboard requires an active Blackboard session and must be called by the Export Agent during a session.');
  }

  const config = loadAllProvidersFromEnv()[0];
  const webSearchFn = builtinToolName === 'web_search' && config
    ? getBlackboardWebSearchFn(config)
    : undefined;
  const result = await executeToolCall(builtinToolName, normalizeToolInput(builtinToolName, input.input || {}), webSearchFn, { pendingImageUrls: [] });
  return { tool: builtinToolName, type: 'builtin', result };
}

export async function listBlackboardSessions(): Promise<BlackboardSession[]> {
  return (await readStore()).sessions;
}

export async function getBlackboardSession(id: string): Promise<BlackboardSession | null> {
  return (await readStore()).sessions.find(session => session.id === id) || null;
}

function normalizeMention(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '');
}

function mentionedAgents(content: string, agents: BlackboardAgent[]): BlackboardAgent[] {
  const normalizedContent = content.toLocaleLowerCase();
  return agents
    .map(agent => {
      const fullName = agent.name.toLocaleLowerCase();
      const firstWord = normalizeMention(agent.name.split(/\s+/)[0] || '');
      const compactName = normalizeMention(agent.name);
      const compactMentionContent = normalizedContent.replace(/@([a-z0-9 _-]+)/gi, (_match, value) => `@${normalizeMention(value)}`);
      const candidates = [
        normalizedContent.indexOf(`@${fullName}`),
        compactMentionContent.indexOf(`@${compactName}`),
        firstWord.length > 2 ? normalizedContent.indexOf(`@${firstWord}`) : -1,
      ].filter(index => index >= 0);
      return {
        agent,
        index: candidates.length > 0 ? Math.min(...candidates) : -1,
      };
    })
    .filter(item => item.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map(item => item.agent);
}

function requestedAgentsFromTask(task: string, agents: BlackboardAgent[]): BlackboardAgent[] {
  const normalizedTask = task.toLocaleLowerCase();
  const compactTask = normalizeMention(task);
  return agents
    .map(agent => {
      const fullName = agent.name.toLocaleLowerCase();
      const compactName = normalizeMention(agent.name);
      const indexes = [
        normalizedTask.indexOf(fullName),
        compactName.length >= 5 ? compactTask.indexOf(compactName) : -1,
      ].filter(index => index >= 0);
      return {
        agent,
        index: indexes.length > 0 ? Math.min(...indexes) : -1,
      };
    })
    .filter(item => item.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map(item => item.agent);
}

function agentMatchTokens(value: string): string[] {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9+#\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 4 && !AGENT_MATCH_STOPWORDS.has(token));
}

function scoreAgentForTask(task: string, agent: BlackboardAgent): number {
  const taskTokens = agentMatchTokens(task);
  if (taskTokens.length === 0) return 0;

  const name = agent.name.toLocaleLowerCase();
  const description = agent.description.toLocaleLowerCase();
  const prompt = agent.systemPrompt.toLocaleLowerCase();
  const haystack = `${name} ${description} ${prompt}`;
  const roleSummary = `${name} ${description}`;
  let score = 0;

  for (const token of taskTokens) {
    if (name.includes(token)) score += 8;
    if (description.includes(token)) score += 5;
    if (prompt.includes(token)) score += 2;
    if (haystack.includes(token)) score += 1;
  }

  if (isReviewTask(task) && /\breview/i.test(roleSummary)) score += 15;
  if (/\b(research|search|web|source|sources|latest|current)\b/i.test(task) && /research|search|web|source/i.test(roleSummary)) score += 15;
  if (/\b(architecture|diagram|plan|planning|requirement|requirements|tech\s*stack|stack|design)\b/i.test(task) && /architect|plan|diagram|requirement|tech stack|design/i.test(roleSummary)) score += 15;
  if (/\b(link|links|backlink|neighborhood|graph|connect)\b/i.test(task) && /link|backlink|neighborhood|graph|connect/i.test(roleSummary)) score += 15;
  if (/\b(ideas?|ideation|brainstorm|recommend|suggest|opportunit(?:y|ies))\b|what\s+to\s+build|to\s+build/i.test(task) && /idea|ideation|brainstorm|recommend|suggest|opportunit|build/i.test(roleSummary)) score += 15;
  if (/\b(library|notes?|librania|context)\b/i.test(task) && /librarian|library|notes?|context/i.test(roleSummary)) score += 12;

  return score;
}

function neededAgentsForTask(task: string, agents: BlackboardAgent[]): BlackboardAgent[] {
  const explicitlyRequested = new Set(requestedAgentsFromTask(task, agents).map(agent => agent.id));
  return agents
    .map(agent => ({
      agent,
      score: explicitlyRequested.has(agent.id) ? Number.MAX_SAFE_INTEGER : scoreAgentForTask(task, agent),
    }))
    .filter(item => item.score >= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.agent);
}

function addUniqueAgents(target: BlackboardAgent[], agents: BlackboardAgent[]): BlackboardAgent[] {
  const added: BlackboardAgent[] = [];
  for (const agent of agents) {
    if (!target.some(candidate => candidate.id === agent.id)) {
      target.push(agent);
      added.push(agent);
    }
  }
  return added;
}

function orderAgentsForTask(task: string, agents: BlackboardAgent[], preserveOrder = false): BlackboardAgent[] {
  if (preserveOrder || !isReviewTask(task)) return agents;
  const wantsIdeas = /\bidea|build|recommend|suggest|opportunit/i.test(task);

  const rank = (agent: BlackboardAgent): number => {
    const haystack = `${agent.name} ${agent.description} ${agent.systemPrompt}`.toLocaleLowerCase();
    if (haystack.includes('librarian')) return 0;
    if (isReviewerAgent(agent)) return 1;
    if (wantsIdeas && isIdeaAgent(agent)) return 2;
    return wantsIdeas ? 3 : 1;
  };

  return [...agents].sort((a, b) => rank(a) - rank(b));
}

async function saveSession(store: BlackboardStore, session: BlackboardSession): Promise<void> {
  session.updatedAt = new Date().toISOString();
  store.sessions = [session, ...store.sessions.filter(candidate => candidate.id !== session.id)].slice(0, 100);
  await writeStore(store);
}

async function runAgentsForSession(params: {
  store: BlackboardStore;
  session: BlackboardSession;
  agents: BlackboardAgent[];
  task: string;
  providerConfig: ProviderConfig;
  model?: string;
  noteContext: string;
}): Promise<void> {
  const provider = createProvider(params.providerConfig);
  const webSearchFn = getBlackboardWebSearchFn(params.providerConfig);
  const toolContext: ResearchToolContext = { pendingImageUrls: [] };
  const storeSnapshot = await readStore();
  const customTools = storeSnapshot.tools;
  const allAgents = storeSnapshot.agents;
  const activeAgents = [...params.agents];
  const queuedAgents = [...params.agents];
  const processedAgentIds = new Set<string>();

  while (queuedAgents.length > 0) {
    const agent = queuedAgents.shift()!;
    if (processedAgentIds.has(agent.id)) continue;
    processedAgentIds.add(agent.id);
    try {
    const transcript = params.session.messages
      .map(message => `${message.agentName}: ${message.content}`)
      .join('\n\n');
    const observation = extractBlackboardObservation(transcript);
    const artifactState = formatArtifactsForPrompt(params.session.artifacts);
    const activeAgentLines = activeAgents.map(activeAgent => `- ${activeAgent.name}: ${activeAgent.description || 'No description'}`).join('\n') || '- none';
    const inactiveAgentLines = allAgents
      .filter(candidate => !activeAgents.some(activeAgent => activeAgent.id === candidate.id))
      .map(inactiveAgent => `- ${inactiveAgent.name}: ${inactiveAgent.description || 'No description'}`)
      .join('\n') || '- none';
    const totalAgentLines = allAgents
      .map(candidate => `- ${candidate.name}: ${candidate.description || 'No description'}`)
      .join('\n') || '- none';
    const taskNeededAgentLines = neededAgentsForTask(params.task, allAgents)
      .map(candidate => `- ${candidate.name}: ${candidate.description || 'No description'}`)
      .join('\n') || '- none';
    const alwaysAvailableTools = ['search_notes', 'get_note', 'get_backlinks', 'get_note_tags', 'web_search'];
    const enabledWriteTools = ['create_note', 'add_tags'].filter(tool => agentHasBlackboardTool(agent, tool));
    const enabledSessionTools = ['export_blackboard'].filter(tool => agentHasBlackboardTool(agent, tool));
    const enabledCustomTools = customTools.filter(tool => agentHasBlackboardTool(agent, tool.name));
    const agentMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `${agent.systemPrompt}

Total available Blackboard agents:
${totalAgentLines}

Currently active agents in this session:
${activeAgentLines}

Inactive agents you may activate with @mention:
${inactiveAgentLines}

Task-matched agents from name/description:
${taskNeededAgentLines}

Always-available read/search tool calls: ${alwaysAvailableTools.join(', ')}
Enabled write tool calls: ${enabledWriteTools.length > 0 ? enabledWriteTools.join(', ') : 'none'}
Enabled session export tool calls: ${enabledSessionTools.length > 0 ? enabledSessionTools.join(', ') : 'none'}
Enabled custom tool calls: ${enabledCustomTools.length > 0 ? enabledCustomTools.map(tool => tool.name).join(', ') : 'none'}
Executable custom tool definitions:
${customTools
  .filter(tool => agentHasBlackboardTool(agent, tool.name))
  .map(tool => `- ${tool.name}: ${tool.description || 'No description'} input_schema=${JSON.stringify(parseToolInputSchema(tool.inputSchema))}`)
  .join('\n') || 'none'}
Custom tool instructions:
${agent.customTools || 'none'}

When handling a Blackboard task:
- You are ${agent.name}. Never claim to be another agent or role.
- You are part of a collaborative Blackboard team, not an isolated chatbot.
- The structured shared artifacts are the source of truth. Update them instead of repeating raw transcript.
- ${expectedArtifactGuidance(agent)}
- If the task asks for a different inactive agent or role, @mention that agent instead of performing that role yourself.
- If the task matches another active or inactive agent better than your role, update your own artifact and @mention the better-matched agent.
- If you are Reviewer, build on the Librarian/relevant_notes artifact and validate scope; do not restate the original observation list.
- If you are an Idea Agent, build on the review_summary artifact and candidate scope; do not restart from the raw observation.
- If you need an available tool, return ONLY a JSON object like {"search_notes":{"query":"..."}}. Blackboard will execute it and return the result.
- Never use XML-style tool tags like <search_notes>; use the JSON object format only.
- create_note and add_tags only work when listed under "Enabled write tool calls". Enable them in Agent Management for agents that should write to LibraNia.
- After receiving tool results, write the final answer in Markdown. Do not output another JSON object unless another tool call is needed.
- Do not claim you executed a tool or created/updated a note unless Blackboard returned an explicit tool result.
- If a note should be created but create_note is unavailable, provide a "Proposed Note" draft with title, Markdown body, tags, and links.
- Treat the Blackboard Observation as the initial seed, not the full shared workspace.
- You are one active teammate in the Blackboard room, not one step in a fixed chain.
- Only perform your own role. If another role is needed, hand off with @AgentName.
- Treat earlier agent messages as proposed updates to shared artifacts, not as a raw transcript to repeat.
- Explicitly say which shared artifact or teammate contribution you are building on.
- If another active or inactive agent should respond, mention them explicitly with @AgentName in your handoff.
- If no other agent is needed, hand off to the user.
- If you need information, first inspect the Blackboard Observation, provided note context, and prior agent output.
- Do not ask the user for note data that the Blackboard Observation or a prior agent already provided.
- If you are Research Agent and you perform web_search, you must create a LibraNia note with create_note before your final answer.
- Keep handoffs compact. Do not paste full note inventories unless the task explicitly asks for raw data.
- Describe what you did, what artifact you updated, and what the next agent should use.
- To update shared artifacts, append one fenced block at the end using this exact format:
\`\`\`blackboard-artifact
{"type":"review_summary","title":"Short artifact title","content":"Markdown artifact content"}
\`\`\`
- Valid artifact types: scope, relevant_notes, topic_clusters, review_summary, candidate_ideas, final_recommendation, handoff, open_questions.
- Do not put private chain-of-thought in artifacts. Artifacts are user-visible shared workspace state.`,
      },
      {
        role: 'user',
        content: `Task:
${params.task}

Initial Blackboard observation:
${observation || 'No Blackboard Observation is available.'}

Current structured shared artifacts:
${artifactState}

Existing LibraNia note context:
${params.noteContext || 'No notes found.'}

Blackboard conversation so far:
${transcript}`,
      },
    ];

    const toolTrace: string[] = [];
    let response = '';
    for (let toolIteration = 0; toolIteration < 4; toolIteration++) {
      response = await provider.generateResponse(agentMessages, {
        model: params.model || params.providerConfig.model,
        temperature: 0.2,
        maxTokens: maxTokensForAgent(agent),
      }, () => {});

      const toolCalls = parseInlineToolCalls(response.trim());
      if (toolCalls.length === 0) {
        if (looksLikeToolRequest(response, customTools)) {
          agentMessages.push({
            role: 'assistant',
            content: response,
          });
          agentMessages.push({
            role: 'user',
            content: `Your previous response looked like a Blackboard tool request, but Blackboard could not parse it safely.

Return exactly one valid JSON tool call object such as {"search_notes":{"query":"example"}} if a tool is needed.
If no tool is needed, return a normal Markdown answer without tool syntax.
Do not use XML tags, pseudo-code, or prose around the JSON.`,
          });
          response = '';
          continue;
        }
        break;
      }

      const results = [];
      for (const toolCall of toolCalls) {
        if (!canExecuteBlackboardTool(agent, toolCall.name, customTools)) {
          results.push({
            tool: toolCall.name,
            error: `Tool ${toolCall.name} is not available to ${agent.name}.`,
          });
          continue;
        }

        try {
          const customTool = customTools.find(tool => tool.name === toolCall.name);
          const result = customTool
            ? await executeCustomTool(customTool, toolCall.input)
            : toolCall.name === 'export_blackboard'
            ? await exportBlackboardSession(params.session, toolCall.input)
            : await executeToolCall(toolCall.name, toolCall.input, webSearchFn, toolContext);
          results.push({ tool: toolCall.name, input: toolCall.input, result });
        } catch (error: any) {
          results.push({
            tool: toolCall.name,
            input: toolCall.input,
            error: error.message || String(error),
          });
        }
      }

      const resultText = JSON.stringify(results, null, 2);
      toolTrace.push(resultText);
      agentMessages.push({
        role: 'assistant',
        content: response,
      });
      agentMessages.push({
        role: 'user',
        content: `Blackboard tool result:\n${resultText}\n\nUse these results to produce your final Markdown answer. If another agent should act next, mention them with @AgentName.`,
      });
    }

    if (parseInlineToolCalls(response.trim()).length > 0 || looksLikeToolRequest(response, customTools)) {
      agentMessages.push({
        role: 'user',
        content: 'Tool budget is exhausted or your tool request could not be parsed safely. Do not request or output any more tool calls. Using the tool results already returned, write the best final Markdown answer now. If the research is incomplete, state the remaining gap briefly and hand off to the right agent.',
      });
      response = await provider.generateResponse(agentMessages, {
        model: params.model || params.providerConfig.model,
        temperature: 0.2,
        maxTokens: maxTokensForAgent(agent),
      }, () => {});

      if (parseInlineToolCalls(response.trim()).length > 0 || looksLikeToolRequest(response, customTools)) {
        response = buildToolTraceSummary(agent.name, toolTrace)
          || `## ${agent.name} Tool Request Not Executed\n\nThis agent attempted to call a Blackboard tool, but the request was not parseable or the tool budget was exhausted. No raw tool syntax was saved as an answer. Rerun this agent with a narrower request or use the Playground to test the tool directly.`;
      }
    }

    if (isResearchAgent(agent) &&
      hasSuccessfulToolResult(toolTrace, 'web_search') &&
      !hasSuccessfulToolResult(toolTrace, 'create_note')) {
      agentMessages.push({
        role: 'user',
        content: `Research Agent policy: web research was performed, but no LibraNia note was created.

You must now return ONLY one valid JSON create_note tool call.
Use the web search results already returned.
Create one durable Markdown note with:
- title
- body with Summary, Key Findings, Details, Sources, LibraNia Connections
Do not return prose around the JSON.`,
      });
      const createNoteResponse = await provider.generateResponse(agentMessages, {
        model: params.model || params.providerConfig.model,
        temperature: 0.2,
        maxTokens: maxTokensForAgent(agent),
      }, () => {});
      const createNoteCalls = parseInlineToolCalls(createNoteResponse.trim())
        .filter(call => call.name === 'create_note');
      const results = [];

      for (const toolCall of createNoteCalls.slice(0, 1)) {
        try {
          const result = await executeToolCall('create_note', normalizeToolInput('create_note', toolCall.input), webSearchFn, toolContext);
          results.push({ tool: 'create_note', input: normalizeToolInput('create_note', toolCall.input), result });
        } catch (error: any) {
          results.push({
            tool: 'create_note',
            input: normalizeToolInput('create_note', toolCall.input),
            error: error.message || String(error),
          });
        }
      }

      if (results.length === 0 || !results.some(item => item.result?.id)) {
        const fallbackNote = buildFallbackResearchNote(params.task, toolTrace);
        try {
          const result = await executeToolCall('create_note', fallbackNote, webSearchFn, toolContext);
          results.push({ tool: 'create_note', input: fallbackNote, result, enforced: true });
        } catch (error: any) {
          results.push({
            tool: 'create_note',
            input: fallbackNote,
            error: error.message || String(error),
            enforced: true,
          });
        }
      }

      const resultText = JSON.stringify(results, null, 2);
      toolTrace.push(resultText);
      const createdNote = results.find(item => item.result?.id)?.result;
      if (createdNote?.id && createdNote?.title) {
        response = [
          response.trim(),
          '',
          `## Research Note Created`,
          `- [[${createdNote.title}]] (${createdNote.id})`,
        ].filter(Boolean).join('\n');
      }
    }

    if (isResearchAgent(agent) && !hasSuccessfulToolResult(toolTrace, 'create_note')) {
      const recoveryContent = await recoverResearchAgentTurn({
        task: params.task,
        toolTrace,
        webSearchFn,
        toolContext,
      });
      response = [
        response.trim(),
        recoveryContent,
      ].filter(Boolean).join('\n\n');
    }

    const fallback = response.trim() ? null : (agent.id === 'default-librarian'
      ? { content: buildLibrarianFallback(params.task, params.noteContext) }
      : buildAgentFallback(agent, params.task, transcript));
    const finalContent = guardUnverifiedNoteCreationClaims(fallback?.content || response.trim(), toolTrace);
    const parsedResponse = stripArtifactBlocks(finalContent);
    for (const artifact of parsedResponse.artifacts) {
      upsertArtifact(params.session, {
        ...artifact,
        updatedBy: agent.name,
      });
    }
    if (!fallback && parsedResponse.artifacts.length === 0 && finalContent.trim()) {
      upsertArtifact(params.session, {
        type: defaultArtifactTypeForAgent(agent),
        title: `${agent.name} contribution`,
        content: finalContent,
        updatedBy: agent.name,
      });
    }
    const details = [
      `Task: ${params.task}`,
      '',
      `Current agent: ${agent.name}`,
      '',
      'Active agents at this turn:',
      activeAgentLines,
      '',
      'Inactive agents available by @mention:',
      inactiveAgentLines,
      '',
      'Shared Blackboard state:',
      observation || 'No Blackboard Observation is available.',
      '',
      'Structured shared artifacts before this response:',
      artifactState,
      '',
      'Relevant note context:',
      params.noteContext || 'No notes found.',
      '',
      'Transcript before this response:',
      compactText(transcript || 'No prior transcript is available.', 4000),
      ...(toolTrace.length > 0 ? ['', 'Executed Blackboard tools:', ...toolTrace] : []),
    ].join('\n');

    params.session.messages.push({
      id: crypto.randomUUID(),
      sessionId: params.session.id,
      agentId: agent.id,
      agentName: agent.name,
      role: 'agent',
      content: parsedResponse.content || finalContent,
      details: fallback?.details || details,
      createdAt: new Date().toISOString(),
    });

    const publicAgentContent = parsedResponse.content || finalContent;
    const newlyMentionedAgents = mentionedAgents(publicAgentContent, allAgents)
      .filter(mentioned => !activeAgents.some(activeAgent => activeAgent.id === mentioned.id));
    if (newlyMentionedAgents.length > 0) {
      for (const mentioned of newlyMentionedAgents) {
        activeAgents.push(mentioned);
        queuedAgents.push(mentioned);
      }
      params.session.agentIds = [...new Set([...params.session.agentIds, ...newlyMentionedAgents.map(mentioned => mentioned.id)])];
      params.session.messages.push({
        id: crypto.randomUUID(),
        sessionId: params.session.id,
        agentId: null,
        agentName: 'Blackboard',
        role: 'system',
        content: `Activated by @mention: ${newlyMentionedAgents.map(mentioned => mentioned.name).join(', ')}`,
        createdAt: new Date().toISOString(),
      });
    }
    await saveSession(params.store, params.session);
    } catch (error: any) {
      const message = error?.message || String(error);
      params.session.messages.push({
        id: crypto.randomUUID(),
        sessionId: params.session.id,
        agentId: agent.id,
        agentName: agent.name,
        role: 'agent',
        content: `## ${agent.name} Could Not Respond\n\nThis agent failed while generating its turn: ${message}\n\nThe rest of the Blackboard team can continue from the shared artifacts and prior messages.`,
        details: [
          `Task: ${params.task}`,
          '',
          `Failed agent: ${agent.name}`,
          '',
          `Error: ${message}`,
          '',
          error?.stack || '',
        ].join('\n'),
        createdAt: new Date().toISOString(),
      });
      await saveSession(params.store, params.session);
    }
  }
}

async function getNotesForBlackboard(db: BetterSQLite3Database<typeof schema>) {
  return getAllNotes(db);
}

function buildNoteContextFromNotes(notes: Awaited<ReturnType<typeof getAllNotes>>): string {
  return notes
    .slice(0, 30)
    .map(note => [
      `- title: ${note.title}`,
      `  id: ${note.id}`,
      `  group: ${note.group || 'None'}`,
      `  created_at: ${formatDate(note.created_at)}`,
      `  updated_at: ${formatDate(note.updated_at)}`,
      `  excerpt: ${note.body.replace(/\s+/g, ' ').slice(0, 220)}`,
    ].join('\n'))
    .join('\n');
}

function buildNoteContextForTask(task: string, notes: Awaited<ReturnType<typeof getAllNotes>>): string {
  const relevantNotes = relevantNotesForTask(task, notes, 12);
  return buildNoteContextFromNotes(relevantNotes.length > 0 ? relevantNotes : notes.slice(0, 8));
}

async function buildNoteContext(db: BetterSQLite3Database<typeof schema>): Promise<string> {
  const notes = await getAllNotes(db);
  return buildNoteContextFromNotes(notes);
}

export async function assignBlackboardTask(
  input: AssignTaskInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<BlackboardSession> {
  if (!input.task?.trim()) {
    throw new Error('Task is required.');
  }

  const store = await readStore();
  const initiallySelectedAgents = (input.agentIds?.length
    ? input.agentIds
    : store.agents.filter(agent => agent.id === 'default-librarian').map(agent => agent.id))
    .map(id => store.agents.find(agent => agent.id === id))
    .filter((agent): agent is BlackboardAgent => Boolean(agent));
  const selectedAgents = [...initiallySelectedAgents];
  const taskActivatedAgents = addUniqueAgents(selectedAgents, [
    ...requestedAgentsFromTask(input.task.trim(), store.agents),
    ...neededAgentsForTask(input.task.trim(), store.agents),
  ]);

  if (selectedAgents.length === 0) {
    throw new Error('Select at least one agent.');
  }

  const config = input.providerId ? loadProviderFromEnv(input.providerId) : loadAllProvidersFromEnv()[0];
  if (!config) {
    throw new Error('Blackboard requires a configured AI provider. Add one in Settings.');
  }

  const notes = await getNotesForBlackboard(db);
  const noteContext = buildNoteContextForTask(input.task.trim(), notes);
  const now = new Date().toISOString();
  const observation = buildBlackboardObservation(input.task.trim(), notes, selectedAgents);
  const session: BlackboardSession = {
    id: crypto.randomUUID(),
    title: input.task.trim().slice(0, 80),
    task: input.task.trim(),
    status: 'running',
    agentIds: selectedAgents.map(agent => agent.id),
    createdAt: now,
    updatedAt: now,
    artifacts: initialArtifactsFromObservation(input.task.trim(), observation, selectedAgents),
    messages: [{
      id: crypto.randomUUID(),
      sessionId: '',
      agentId: null,
      agentName: 'Task',
      role: 'task',
      content: input.task.trim(),
      createdAt: now,
    }],
  };
  session.messages[0].sessionId = session.id;
  session.messages.push({
    id: crypto.randomUUID(),
    sessionId: session.id,
    agentId: null,
    agentName: 'Blackboard',
    role: 'system',
    content: observation,
    createdAt: new Date().toISOString(),
  });
  if (taskActivatedAgents.length > 0) {
    session.messages.push({
      id: crypto.randomUUID(),
      sessionId: session.id,
      agentId: null,
      agentName: 'Blackboard',
      role: 'system',
      content: `Activated by task intent: ${taskActivatedAgents.map(agent => agent.name).join(', ')}`,
      createdAt: new Date().toISOString(),
    });
  }
  await saveSession(store, session);

  try {
    await runAgentsForSession({
      store,
      session,
      agents: selectedAgents,
      task: input.task.trim(),
      providerConfig: config,
      model: input.model,
      noteContext,
    });
    session.status = 'complete';
  } catch (error: any) {
    session.status = 'failed';
    session.messages.push({
      id: crypto.randomUUID(),
      sessionId: session.id,
      agentId: null,
      agentName: 'System',
      role: 'system',
      content: error.message || 'Blackboard task failed.',
      createdAt: new Date().toISOString(),
    });
  }

  await saveSession(store, session);
  return session;
}

export async function renameBlackboardSession(id: string, title: string): Promise<BlackboardSession> {
  const store = await readStore();
  const session = store.sessions.find(candidate => candidate.id === id);
  if (!session) {
    throw new Error('Blackboard session not found');
  }
  session.title = title.trim() || session.title;
  await saveSession(store, session);
  return session;
}

export async function deleteBlackboardSession(id: string): Promise<void> {
  const store = await readStore();
  store.sessions = store.sessions.filter(candidate => candidate.id !== id);
  await writeStore(store);
}

export async function addBlackboardUserMessage(
  sessionId: string,
  input: AddMessageInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<BlackboardSession> {
  if (!input.content?.trim()) {
    throw new Error('Message content is required.');
  }

  const store = await readStore();
  const session = store.sessions.find(candidate => candidate.id === sessionId);
  if (!session) {
    throw new Error('Blackboard session not found');
  }

  const config = input.providerId ? loadProviderFromEnv(input.providerId) : loadAllProvidersFromEnv()[0];
  if (!config) {
    throw new Error('Blackboard requires a configured AI provider. Add one in Settings.');
  }

  const notes = await getNotesForBlackboard(db);
  const mentions = mentionedAgents(input.content, store.agents);
  const currentAgents = session.agentIds
    .map(id => store.agents.find(agent => agent.id === id))
    .filter((agent): agent is BlackboardAgent => Boolean(agent));
  const inferredAgents = mentions.length > 0 ? [] : neededAgentsForTask(input.content.trim(), store.agents);
  const activatedAgents = addUniqueAgents(currentAgents, [
    ...mentions,
    ...inferredAgents,
  ]);
  session.agentIds = currentAgents.map(agent => agent.id);
  session.messages.push({
    id: crypto.randomUUID(),
    sessionId: session.id,
    agentId: null,
    agentName: 'You',
    role: 'user',
    content: input.content.trim(),
    createdAt: new Date().toISOString(),
  });
  session.status = 'running';
  if (activatedAgents.length > 0) {
    session.messages.push({
      id: crypto.randomUUID(),
      sessionId: session.id,
      agentId: null,
      agentName: 'Blackboard',
      role: 'system',
      content: `Activated by ${mentions.length > 0 ? '@mention' : 'task intent'}: ${activatedAgents.map(agent => agent.name).join(', ')}`,
      createdAt: new Date().toISOString(),
    });
  }
  await saveSession(store, session);

  const targetedAgents = mentions.length > 0 ? [...mentions] : [];
  const agentsToRun = orderAgentsForTask(input.content.trim(), mentions.length > 0
    ? targetedAgents
    : currentAgents,
    mentions.length > 0);
  session.messages.push({
    id: crypto.randomUUID(),
    sessionId: session.id,
    agentId: null,
    agentName: 'Blackboard',
    role: 'system',
    content: buildBlackboardObservation(input.content.trim(), notes, agentsToRun),
    createdAt: new Date().toISOString(),
  });
  await saveSession(store, session);
  const noteContext = buildNoteContextForTask(input.content.trim(), notes);

  try {
    await runAgentsForSession({
      store,
      session,
      agents: agentsToRun,
      task: input.content.trim(),
      providerConfig: config,
      model: input.model,
      noteContext,
    });
    session.status = 'complete';
  } catch (error: any) {
    session.status = 'failed';
    session.messages.push({
      id: crypto.randomUUID(),
      sessionId: session.id,
      agentId: null,
      agentName: 'System',
      role: 'system',
      content: error.message || 'Blackboard message failed.',
      createdAt: new Date().toISOString(),
    });
  }

  await saveSession(store, session);
  return session;
}
