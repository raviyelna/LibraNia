/// <reference types="vite/client" />

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
    api: WindowAPI;
  }
}

export {};
