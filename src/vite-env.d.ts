/// <reference types="vite/client" />

import type { LogEntry } from './types/logger';

interface Tag {
  id: string;
  name: string;
  created_at: Date;
}

interface Note {
  id: string;
  title: string;
  body: string;
  metadata: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface ElectronAPI {
  log: (entry: LogEntry) => void;
  logError: (error: { message: string; stack?: string; componentStack?: string }) => Promise<void>;
  openLogsDirectory: () => Promise<void>;
  reloadApp: () => void;
}

interface TagsAPI {
  getAll: () => Promise<Tag[]>;
  create: (name: string) => Promise<Tag>;
  delete: (id: string) => Promise<boolean>;
  rename: (id: string, name: string) => Promise<Tag | null>;
  addToNote: (noteId: string, tagNames: string[]) => Promise<string[]>;
  removeFromNote: (noteId: string, tagId: string) => Promise<boolean>;
  getForNote: (noteId: string) => Promise<Tag[]>;
  getNotesByTag: (tagId: string) => Promise<Note[]>;
  setForNote: (noteId: string, tagNames: string[]) => Promise<boolean>;
}

interface NotesAPI {
  create: (data: { title: string; body: string; metadata?: string }) => Promise<Note>;
  update: (data: { id: string; title?: string; body?: string; metadata?: string }) => Promise<Note>;
  delete: (id: string, hard: boolean) => Promise<{ success: boolean }>;
  restore: (id: string) => Promise<Note>;
  getById: (id: string, includeDeleted?: boolean) => Promise<Note | null>;
  getAll: () => Promise<Note[]>;
  getDeleted: () => Promise<Note[]>;
  onCreated: (callback: (note: Note) => void) => () => void;
  onUpdated: (callback: (note: Note) => void) => () => void;
}

interface Backlink {
  id: string;
  title: string;
  linkCount: number;
}

interface LinksAPI {
  getBacklinks: (noteId: string) => Promise<Backlink[]>;
  getSemanticLinks: (noteId: string) => Promise<Backlink[]>;
}

interface SearchResult {
  id: string;
  title: string;
  updated_at: number;
  rank: number;
}

interface FullTextSearchResult {
  id: string;
  title: string;
  snippet: string;
  updated_at: number;
  score: number;
}

interface SearchAPI {
  quickNav: (query: string) => Promise<SearchResult[]>;
  fullText: (query: string) => Promise<FullTextSearchResult[]>;
  fuzzy: (query: string) => Promise<SearchResult[]>;
  semantic: (query: string) => Promise<SearchResult[]>;
}

interface ExportAPI {
  selectDirectory: () => Promise<string | null>;
  selectFile: (defaultName: string) => Promise<string | null>;
  markdown: (noteIds: string[], directory: string) => Promise<{ success: boolean; count: number }>;
  json: (noteIds: string[], filePath: string) => Promise<{ success: boolean }>;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  provider_id?: string;
  model?: string;
  created_at: Date;
}

interface Citation {
  id: string;
  message_id: string;
  title: string;
  url: string;
  snippet?: string;
  position: number;
}

interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  messages?: Message[];
  citations?: Citation[];
}

interface ChatAPI {
  send: (data: {
    conversationId: string | null;
    message: string;
    providerId: string;
    model: string;
    useWebSearch: boolean;
  }) => Promise<{ conversationId: string; messageId: string; response: string }>;
  summarizeNote: (noteId: string) => Promise<{ summary: string }>;
  onToken: (callback: (data: { conversationId: string; token: string }) => void) => () => void;
  offToken: (callback: (data: { conversationId: string; token: string }) => void) => void;
}

interface ConversationAPI {
  create: (data: { title: string }) => Promise<Conversation>;
  getAll: () => Promise<Conversation[]>;
  get: (conversationId: string) => Promise<Conversation | null>;
  delete: (conversationId: string) => Promise<{ success: boolean }>;
}

interface ProviderConfig {
  id: 'claude' | 'openai' | 'deepseek';
  apiKey: string;
  baseURL?: string;
  model: string;
}

interface ProvidersAPI {
  setConfig: (config: ProviderConfig) => Promise<{ success: boolean }>;
  getConfig: (providerId: string) => Promise<ProviderConfig | undefined>;
  getAllConfigs: () => Promise<ProviderConfig[]>;
  deleteConfig: (providerId: string) => Promise<{ success: boolean }>;
  validate: (providerId: string, apiKey: string, baseURL?: string) => Promise<{ valid: boolean; error?: string }>;
}

interface Content {
  id: string;
  file_path: string;
  thumbnail_path: string | null;
  mime_type: string;
  original_filename: string;
  file_size: number;
  extracted_text: string | null;
  source: 'manual' | 'ai-generated';
  confidence_score: number | null;
  metadata: string | null;
  note_id: string | null;
  message_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ContentAPI {
  getAll: () => Promise<Content[]>;
  getById: (id: string) => Promise<Content | null>;
  upload: () => Promise<{ filePath: string; canceled: boolean }>;
  create: (data: {
    filePath: string;
    source: 'manual' | 'ai-generated';
    confidence_score?: number;
    note_id?: string;
    message_id?: string;
  }) => Promise<Content>;
  delete: (id: string) => Promise<boolean>;
}

interface WindowAPI {
  getConfig: () => Promise<any>;
  setConfig: (key: string, value: any) => Promise<{ success: boolean }>;
  updateConfig: (updates: any) => Promise<any>;
  switchMode: (mode: string) => Promise<void>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  restartApp: () => Promise<void>;
  logError: (error: { message: string; stack?: string; componentStack?: string }) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  tags: TagsAPI;
  notes: NotesAPI;
  links: LinksAPI;
  search: SearchAPI;
  export: ExportAPI;
  chat: ChatAPI;
  conversation: ConversationAPI;
  providers: ProvidersAPI;
  content: ContentAPI;
  graph: {
    getData: () => Promise<any>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    api: WindowAPI;
  }
}

export {};
