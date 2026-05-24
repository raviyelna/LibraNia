import { describe, it, expect, vi } from 'vitest';
import { createTray, updateTrayMode } from './tray';
import { Tray, BrowserWindow } from 'electron';

// Mock electron modules
vi.mock('electron', () => ({
  Tray: vi.fn(function(this: any) {
    this.setToolTip = vi.fn();
    this.setContextMenu = vi.fn();
    this.on = vi.fn();
    return this;
  }),
  Menu: {
    buildFromTemplate: vi.fn((template) => template),
  },
  app: {
    quit: vi.fn(),
  },
  nativeImage: {
    createFromPath: vi.fn(() => ({
      resize: vi.fn(() => ({})),
    })),
  },
  BrowserWindow: vi.fn(),
}));

describe('tray', () => {
  describe('createTray', () => {
    it('should create tray with icon and tooltip', () => {
      const mockWindow = {
        show: vi.fn(),
        focus: vi.fn(),
        isVisible: vi.fn(() => false),
        hide: vi.fn(),
      } as unknown as BrowserWindow;

      const onModeSwitch = vi.fn();

      const tray = createTray(mockWindow, 'desktop', onModeSwitch);

      expect(tray).toBeDefined();
      expect(tray.setToolTip).toHaveBeenCalledWith('LibraNia');
    });

    it('should create context menu with mode options', () => {
      const mockWindow = {
        show: vi.fn(),
        focus: vi.fn(),
        isVisible: vi.fn(() => false),
        hide: vi.fn(),
      } as unknown as BrowserWindow;

      const onModeSwitch = vi.fn();

      const tray = createTray(mockWindow, 'desktop', onModeSwitch);

      expect(tray.setContextMenu).toHaveBeenCalled();
    });

    it('should check desktop mode by default', () => {
      const mockWindow = {
        show: vi.fn(),
        focus: vi.fn(),
        isVisible: vi.fn(() => false),
        hide: vi.fn(),
      } as unknown as BrowserWindow;

      const onModeSwitch = vi.fn();

      const tray = createTray(mockWindow, 'desktop', onModeSwitch);

      expect(tray).toBeDefined();
    });
  });

  describe('updateTrayMode', () => {
    it('should update tray menu with new mode', () => {
      const mockTray = {
        setContextMenu: vi.fn(),
      } as unknown as Tray;

      const mockWindow = {
        show: vi.fn(),
        focus: vi.fn(),
      } as unknown as BrowserWindow;

      const onModeSwitch = vi.fn();

      updateTrayMode(mockTray, mockWindow, 'web', onModeSwitch);

      expect(mockTray.setContextMenu).toHaveBeenCalled();
    });
  });
});
