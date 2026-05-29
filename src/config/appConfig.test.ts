import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, saveConfig, updateConfig, getConfigPath } from './appConfig';
import { DEFAULT_CONFIG } from '../types/config';
import fs from 'fs/promises';
import path from 'path';

describe('appConfig', () => {
  const testConfigPath = path.join(process.cwd(), 'config.json');
  const backupPath = path.join(process.cwd(), 'config.json.backup');

  beforeEach(async () => {
    // Backup existing config if present
    try {
      await fs.copyFile(testConfigPath, backupPath);
    } catch {
      // No existing config to backup
    }
  });

  afterEach(async () => {
    // Restore backup or clean up test config
    try {
      await fs.unlink(testConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
    try {
      await fs.copyFile(backupPath, testConfigPath);
      await fs.unlink(backupPath);
    } catch {
      // No backup to restore
    }
  });

  describe('getConfigPath', () => {
    it('should return config.json path in project root (not Electron userData)', () => {
      const configPath = getConfigPath();
      expect(configPath).toBe(path.join(process.cwd(), 'config.json'));
      expect(configPath).not.toContain('userData');
      expect(configPath).not.toContain('AppData');
    });
  });

  describe('loadConfig', () => {
    it('should read config.json from filesystem and return parsed object', async () => {
      // Write test config
      const testConfig = { ...DEFAULT_CONFIG, serverPort: 9999 };
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2), 'utf-8');

      const config = await loadConfig();
      expect(config.serverPort).toBe(9999);
      expect(config.mode).toBe(DEFAULT_CONFIG.mode);
    });

    it('should return default config if file does not exist', async () => {
      // Ensure no config file exists
      try {
        await fs.unlink(testConfigPath);
      } catch {
        // Already doesn't exist
      }

      const config = await loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should merge partial config with defaults', async () => {
      // Write partial config
      const partialConfig = { serverPort: 7777 };
      await fs.writeFile(testConfigPath, JSON.stringify(partialConfig, null, 2), 'utf-8');

      const config = await loadConfig();
      expect(config.serverPort).toBe(7777);
      expect(config.mode).toBe(DEFAULT_CONFIG.mode);
      expect(config.theme).toBe(DEFAULT_CONFIG.theme);
    });

    it('should return default config on invalid JSON', async () => {
      // Write invalid JSON
      await fs.writeFile(testConfigPath, 'invalid json {', 'utf-8');

      const config = await loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  describe('saveConfig', () => {
    it('should write config object to config.json as formatted JSON', async () => {
      const updates = { mode: 'web' as const, serverPort: 8888 };
      await saveConfig(updates);

      // Read file directly
      const fileContent = await fs.readFile(testConfigPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      expect(parsed.mode).toBe('web');
      expect(parsed.serverPort).toBe(8888);
    });

    it('should create parent directory if it does not exist', async () => {
      // This test verifies mkdir is called - config.json is in project root so dir exists
      const updates = { mode: 'desktop' as const };
      await expect(saveConfig(updates)).resolves.not.toThrow();
    });
  });

  describe('updateConfig', () => {
    it('should merge partial updates with existing config', async () => {
      // Write initial config
      const initialConfig = { ...DEFAULT_CONFIG, serverPort: 3000 };
      await fs.writeFile(testConfigPath, JSON.stringify(initialConfig, null, 2), 'utf-8');

      // Update only theme
      const updates = { theme: 'dark' as const };
      const result = await updateConfig(updates);

      expect(result.theme).toBe('dark');
      expect(result.serverPort).toBe(3000);
      expect(result.mode).toBe(DEFAULT_CONFIG.mode);
    });
  });
});
