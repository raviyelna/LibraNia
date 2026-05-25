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
}

interface Backlink {
  id: string;
  title: string;
  linkCount: number;
}

interface LinksAPI {
  getBacklinks: (noteId: string) => Promise<Backlink[]>;
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
}

interface ExportAPI {
  selectDirectory: () => Promise<string | null>;
  selectFile: (defaultName: string) => Promise<string | null>;
  markdown: (noteIds: string[], directory: string) => Promise<{ success: boolean; count: number }>;
  json: (noteIds: string[], filePath: string) => Promise<{ success: boolean }>;
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
  tags: TagsAPI;
  notes: NotesAPI;
  links: LinksAPI;
  search: SearchAPI;
  export: ExportAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    api: WindowAPI;
  }
}

export {};
