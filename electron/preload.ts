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
    ipcRenderer.invoke('log:error', error)
});
