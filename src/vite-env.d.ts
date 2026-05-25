/// <reference types="vite/client" />

import type { LogEntry } from './types/logger';

interface ElectronAPI {
  log: (entry: LogEntry) => void;
  logError: (error: { message: string; stack?: string; componentStack?: string }) => Promise<void>;
  openLogsDirectory: () => Promise<void>;
  reloadApp: () => void;
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    api: WindowAPI;
  }
}

export {};
