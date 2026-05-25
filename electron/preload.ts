import { contextBridge, ipcRenderer } from 'electron';
import type { LogEntry } from '../src/types/logger';

// Expose safe IPC APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Logging
  log: (entry: LogEntry) => ipcRenderer.send('log:write', entry),
  logError: (error: { message: string; stack?: string; componentStack?: string }) =>
    ipcRenderer.invoke('log:error', error),
  openLogsDirectory: () => ipcRenderer.invoke('logs:open'),
  reloadApp: () => ipcRenderer.send('app:reload')
});

// Keep legacy 'api' namespace for backward compatibility
contextBridge.exposeInMainWorld('api', {
  // Config operations
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
  },

  // Links operations
  links: {
    getBacklinks: (noteId: string) =>
      ipcRenderer.invoke('links:getBacklinks', { noteId }),
  },

  // Search operations
  search: {
    quickNav: (query: string) => ipcRenderer.invoke('search:quickNav', { query }),
    fullText: (query: string) => ipcRenderer.invoke('search:fullText', { query }),
    fuzzy: (query: string) => ipcRenderer.invoke('search:fuzzy', { query }),
  },

  // Export operations
  export: {
    selectDirectory: () => ipcRenderer.invoke('export:selectDirectory'),
    selectFile: (defaultName: string) => ipcRenderer.invoke('export:selectFile', { defaultName }),
    markdown: (noteIds: string[], directory: string) => ipcRenderer.invoke('export:markdown', { noteIds, directory }),
    json: (noteIds: string[], filePath: string) => ipcRenderer.invoke('export:json', { noteIds, filePath }),
  },
});
