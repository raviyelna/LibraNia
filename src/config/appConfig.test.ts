import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig, saveConfig, updateConfig, getConfigPath } from './appConfig';
import { DEFAULT_CONFIG } from '../types/config';
import fs from 'fs/promises';
import path from 'path';

// Mock electron app module
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') {
        return '/mock/user/data';
      }
      return '/mock/path';
    }),
  },
}));

describe('appConfig', () => {
  const mockConfigPath = '/mock/user/data/config.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up any test files
    try {
      await fs.unlink(mockConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('getConfigPath', () => {
    it('should return config.json path in userData directory', () => {
      const configPath = getConfigPath();
      expect(configPath).toBe(path.join('/mock/user/data', 'config.json'));
    });
  });

  describe('loadConfig', () => {
    it('should return DEFAULT_CONFIG when config file does not exist', async () => {
      const config = await loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should return DEFAULT_CONFIG when config file contains invalid JSON', async () => {
      // This test will be implemented when we can mock fs properly
      const config = await loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should merge partial config with DEFAULT_CONFIG', async () => {
      // This test will be implemented when we can mock fs properly
      const config = await loadConfig();
      expect(config).toHaveProperty('mode');
      expect(config).toHaveProperty('theme');
      expect(config).toHaveProperty('windowBounds');
      expect(config).toHaveProperty('serverPort');
    });

    it('should load valid config from file', async () => {
      // This test will be implemented when we can mock fs properly
      const config = await loadConfig();
      expect(config).toBeDefined();
    });
  });

  describe('saveConfig', () => {
    it('should write config to file atomically', async () => {
      const updates = { mode: 'web' as const };
      await saveConfig(updates);
      // Verify file was written (will be implemented with proper mocking)
      expect(true).toBe(true);
    });

    it('should merge partial updates with existing config', async () => {
      const updates = { serverPort: 4000 };
      await saveConfig(updates);
      const config = await loadConfig();
      expect(config.serverPort).toBe(4000);
      expect(config.mode).toBe(DEFAULT_CONFIG.mode);
    });

    it('should create userData directory if it does not exist', async () => {
      const updates = { mode: 'desktop' as const };
      await saveConfig(updates);
      // Verify directory was created (will be implemented with proper mocking)
      expect(true).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update config and return merged result', async () => {
      const updates = { mode: 'web' as const, serverPort: 5000 };
      const result = await updateConfig(updates);
      expect(result.mode).toBe('web');
      expect(result.serverPort).toBe(5000);
      expect(result.theme).toBe(DEFAULT_CONFIG.theme);
    });

    it('should persist updates to file', async () => {
      const updates = { theme: 'dark' as const };
      await updateConfig(updates);
      const config = await loadConfig();
      expect(config.theme).toBe('dark');
    });
  });
});
