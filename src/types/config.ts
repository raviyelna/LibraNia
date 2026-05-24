export type AppMode = 'desktop' | 'web';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppConfig {
  mode: AppMode;
  theme: 'light' | 'dark' | 'system';
  windowBounds: WindowBounds | null;
  serverPort: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  mode: 'desktop',
  theme: 'system',
  windowBounds: null,
  serverPort: 3000,
};
