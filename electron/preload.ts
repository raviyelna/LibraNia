import { contextBridge, ipcRenderer } from 'electron';
import type { LogEntry } from '../src/types/logger';

// Expose safe IPC APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Logging
  log: (entry: LogEntry) => ipcRenderer.send('log:write', entry),
  logError: (error: { message: string; stack?: string; componentStack?: string }) =>
    ipcRenderer.invoke('log:error', error),
  openLogsDirectory: () => ipcRenderer.invoke('logs:open'),
  reloadApp: () => ipcRenderer.send('app:reload'),
  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
});

// Keep legacy 'api' namespace for backward compatibility
contextBridge.exposeInMainWorld('api', {
  // Config operations
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
    update: (updates: any) => ipcRenderer.invoke('config:update', updates),
    setEnvVar: (key: string, value: string) => ipcRenderer.invoke('config:setEnvVar', { key, value }),
  },
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  updateConfig: (updates: any) => ipcRenderer.invoke('config:update', updates),

  // Mode switching
  switchMode: (mode: string) => ipcRenderer.invoke('mode:switch', mode),

  // Window operations
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // App operations
  restartApp: () => ipcRenderer.invoke('app:restart'),

  // Logging
  logError: (error: { message: string; stack?: string; componentStack?: string }) =>
    ipcRenderer.invoke('log:error', error),

  // Tags operations
  tags: {
    getAll: () => ipcRenderer.invoke('tags:getAll'),
    create: (name: string) => ipcRenderer.invoke('tags:create', { name }),
    delete: (id: string) => ipcRenderer.invoke('tags:delete', { id }),
    rename: (id: string, name: string) => ipcRenderer.invoke('tags:rename', { id, name }),
    addToNote: (noteId: string, tagNames: string[]) => ipcRenderer.invoke('tags:addToNote', { noteId, tagNames }),
    removeFromNote: (noteId: string, tagId: string) => ipcRenderer.invoke('tags:removeFromNote', { noteId, tagId }),
    getForNote: (noteId: string) => ipcRenderer.invoke('tags:getForNote', { noteId }),
    getNotesByTag: (tagId: string) => ipcRenderer.invoke('tags:getNotesByTag', { tagId }),
    setForNote: (noteId: string, tagNames: string[]) => ipcRenderer.invoke('tags:setForNote', { noteId, tagNames }),
  },

  // Notes operations
  notes: {
    create: (data: { title: string; body: string; metadata?: string }) =>
      ipcRenderer.invoke('notes:create', data),
    update: (data: { id: string; title?: string; body?: string; metadata?: string }) =>
      ipcRenderer.invoke('notes:update', data),
    delete: (id: string, hard: boolean) =>
      ipcRenderer.invoke('notes:delete', { id, hard }),
    restore: (id: string) =>
      ipcRenderer.invoke('notes:restore', { id }),
    getById: (id: string, includeDeleted?: boolean) =>
      ipcRenderer.invoke('notes:getById', { id, includeDeleted }),
    getAll: () =>
      ipcRenderer.invoke('notes:getAll'),
    getDeleted: () =>
      ipcRenderer.invoke('notes:getDeleted'),
    onCreated: (callback: (note: any) => void) => {
      const listener = (_event: any, note: any) => callback(note);
      ipcRenderer.on('notes:created', listener);
      return () => ipcRenderer.removeListener('notes:created', listener);
    },
    onUpdated: (callback: (note: any) => void) => {
      const listener = (_event: any, note: any) => callback(note);
      ipcRenderer.on('notes:updated', listener);
      return () => ipcRenderer.removeListener('notes:updated', listener);
    },
  },

  // Links operations
  links: {
    getBacklinks: (noteId: string) =>
      ipcRenderer.invoke('links:getBacklinks', { noteId }),
    getSemanticLinks: (noteId: string) =>
      ipcRenderer.invoke('links:getSemanticLinks', { noteId }),
  },

  // Search operations
  search: {
    quickNav: (query: string) => ipcRenderer.invoke('search:quickNav', { query }),
    fullText: (query: string) => ipcRenderer.invoke('search:fullText', { query }),
    fuzzy: (query: string) => ipcRenderer.invoke('search:fuzzy', { query }),
    semantic: (query: string) => ipcRenderer.invoke('search:semantic', { query }),
  },

  // Export operations
  export: {
    selectDirectory: () => ipcRenderer.invoke('export:selectDirectory'),
    selectFile: (defaultName: string) => ipcRenderer.invoke('export:selectFile', { defaultName }),
    markdown: (noteIds: string[], directory: string) => ipcRenderer.invoke('export:markdown', { noteIds, directory }),
    json: (noteIds: string[], filePath: string) => ipcRenderer.invoke('export:json', { noteIds, filePath }),
  },

  // Chat operations
  chat: {
    send: (data: {
      conversationId: string | null;
      message: string;
      providerId: string;
      model: string;
      useWebSearch: boolean;
    }) => ipcRenderer.invoke('chat:send', data),
    summarizeNote: (noteId: string) => ipcRenderer.invoke('chat:summarizeNote', { noteId }),
    onToken: (callback: (data: { conversationId: string; token: string }) => void) => {
      const listener = (_event: any, data: { conversationId: string; token: string }) => callback(data);
      ipcRenderer.on('chat:token', listener);
      return () => ipcRenderer.removeListener('chat:token', listener);
    },
    offToken: (callback: (data: { conversationId: string; token: string }) => void) => {
      ipcRenderer.removeListener('chat:token', callback);
    },
  },

  // Conversation operations
  conversation: {
    create: (data: { title: string }) => ipcRenderer.invoke('conversation:create', data),
    getAll: () => ipcRenderer.invoke('conversation:getAll'),
    get: (conversationId: string) => ipcRenderer.invoke('conversation:get', { conversationId }),
    delete: (conversationId: string) => ipcRenderer.invoke('conversation:delete', { conversationId }),
    rename: (conversationId: string, title: string) => ipcRenderer.invoke('conversation:rename', { conversationId, title }),
  },

  // Provider operations
  providers: {
    setConfig: (config: any) => ipcRenderer.invoke('provider:setConfig', config),
    getConfig: (providerId: string) => ipcRenderer.invoke('provider:getConfig', { providerId }),
    getAllConfigs: () => ipcRenderer.invoke('provider:getAllConfigs'),
    deleteConfig: (providerId: string) => ipcRenderer.invoke('provider:deleteConfig', { providerId }),
    validate: (providerId: string, apiKey: string, baseURL?: string) =>
      ipcRenderer.invoke('provider:validate', { providerId, apiKey, baseURL }),
  },

  // Content operations
  content: {
    upload: () => ipcRenderer.invoke('content:upload'),
    create: (data: {
      filePath: string;
      source: 'manual' | 'ai-generated';
      confidence_score?: number;
      note_id?: string;
      message_id?: string;
    }) => ipcRenderer.invoke('content:create', data),
    getById: (id: string) => ipcRenderer.invoke('content:getById', { id }),
    getAll: () => ipcRenderer.invoke('content:getAll'),
    update: (data: {
      id: string;
      extracted_text?: string;
      thumbnail_path?: string;
      metadata?: string;
    }) => ipcRenderer.invoke('content:update', data),
    delete: (id: string) => ipcRenderer.invoke('content:delete', { id }),
  },

  // Graph operations
  graph: {
    getData: () => ipcRenderer.invoke('graph:getData'),
  },

  // AI operations
  ai: {
    chat: (data: {
      conversationId: string;
      messages: Array<{ role: string; content: string }>;
      providerId?: string;
      model?: string;
      researchMode?: boolean;
    }) => ipcRenderer.invoke('ai:chat', data),
    getMessages: (conversationId: string) => ipcRenderer.invoke('ai:getMessages', { conversationId }),
  },
});
