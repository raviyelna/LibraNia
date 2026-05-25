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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    api: WindowAPI;
  }
}

export {};
