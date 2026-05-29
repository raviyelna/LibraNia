import { BrowserWindow, screen } from 'electron';
import { loadConfig, updateConfig } from '../src/config/appConfig.js';

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export async function getWindowState(): Promise<WindowState> {
  const config = await loadConfig();

  // If we have saved bounds and they're on-screen, use them
  if (config.windowBounds && isOnScreen(config.windowBounds)) {
    return config.windowBounds;
  }

  // Otherwise return centered default
  return {
    x: undefined,
    y: undefined,
    width: 1200,
    height: 800,
  };
}

export async function saveWindowState(window: BrowserWindow): Promise<void> {
  const bounds = window.getBounds();
  await updateConfig({ windowBounds: bounds });
}

export function isOnScreen(bounds: WindowState): boolean {
  try {
    const display = screen.getDisplayMatching({
      x: bounds.x || 0,
      y: bounds.y || 0,
      width: bounds.width,
      height: bounds.height,
    });
    return display !== null;
  } catch {
    return false;
  }
}
