import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWindowState, saveWindowState, isOnScreen } from './windowState';
import { BrowserWindow, screen } from 'electron';

// Mock electron modules
vi.mock('electron', () => ({
  screen: {
    getDisplayMatching: vi.fn((bounds) => {
      // Mock display that matches if bounds are reasonable
      if (bounds.x >= 0 && bounds.y >= 0 && bounds.width > 0 && bounds.height > 0) {
        return { bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
      }
      return null;
    }),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock('../src/config/appConfig.js', () => ({
  loadConfig: vi.fn(async () => ({
    mode: 'desktop',
    theme: 'system',
    windowBounds: null,
    serverPort: 3000,
  })),
  updateConfig: vi.fn(async (updates) => updates),
}));

describe('windowState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWindowState', () => {
    it('should return default centered state when no saved bounds', async () => {
      const state = await getWindowState();

      expect(state).toBeDefined();
      expect(state.width).toBe(1200);
      expect(state.height).toBe(800);
    });

    it('should return saved bounds if they exist and are on-screen', async () => {
      const { loadConfig } = await import('../src/config/appConfig.js');
      vi.mocked(loadConfig).mockResolvedValueOnce({
        mode: 'desktop',
        theme: 'system',
        windowBounds: { x: 100, y: 100, width: 1000, height: 600 },
        serverPort: 3000,
      });

      const state = await getWindowState();

      expect(state.x).toBe(100);
      expect(state.y).toBe(100);
      expect(state.width).toBe(1000);
      expect(state.height).toBe(600);
    });
  });

  describe('isOnScreen', () => {
    it('should return true for valid on-screen bounds', () => {
      const bounds = { x: 100, y: 100, width: 800, height: 600 };
      const result = isOnScreen(bounds);

      expect(result).toBe(true);
    });

    it('should return false for off-screen bounds', () => {
      const bounds = { x: -2000, y: -2000, width: 800, height: 600 };
      const result = isOnScreen(bounds);

      expect(result).toBe(false);
    });
  });

  describe('saveWindowState', () => {
    it('should save window bounds to config', async () => {
      const mockWindow = {
        getBounds: vi.fn(() => ({ x: 200, y: 200, width: 1100, height: 700 })),
      } as unknown as BrowserWindow;

      await saveWindowState(mockWindow);

      const { updateConfig } = await import('../src/config/appConfig.js');
      expect(updateConfig).toHaveBeenCalledWith({
        windowBounds: { x: 200, y: 200, width: 1100, height: 700 },
      });
    });
  });
});
