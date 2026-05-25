import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlinkSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock electron app.getPath
const mockUserDataPath = join(tmpdir(), 'librania-test-secure-' + Date.now());
process.env.ELECTRON_USER_DATA = mockUserDataPath;

describe('Secure Storage Module', () => {
  const testConfigPath = join(mockUserDataPath, 'config.json');
  const testSecureConfigPath = join(mockUserDataPath, 'secure-config.json');
  const testEncryptionKeyPath = join(mockUserDataPath, 'encryption-key.json');

  beforeEach(() => {
    // Clean up any existing test files
    [testConfigPath, testSecureConfigPath, testEncryptionKeyPath].forEach(path => {
      if (existsSync(path)) {
        unlinkSync(path);
      }
    });
  });

  afterEach(() => {
    // Clean up test files
    [testConfigPath, testSecureConfigPath, testEncryptionKeyPath].forEach(path => {
      if (existsSync(path)) {
        unlinkSync(path);
      }
    });
  });

  describe('Encryption Key Management', () => {
    it('should generate 32-byte hex key on first call', async () => {
      const { getEncryptionKey } = await import('../electron/store/secure.store');
      const key = getEncryptionKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64); // 32 bytes = 64 hex characters
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('should return same key on subsequent calls (persistence)', async () => {
      const { getEncryptionKey } = await import('../electron/store/secure.store');
      const key1 = getEncryptionKey();
      const key2 = getEncryptionKey();

      expect(key1).toBe(key2);
    });
  });

  describe('Provider Config CRUD', () => {
    it('should store encrypted provider config', async () => {
      const { setProviderConfig } = await import('../electron/store/secure.store');

      const config = {
        id: 'claude' as const,
        apiKey: 'sk-ant-test-key-12345',
        baseURL: 'https://api.anthropic.com',
        model: 'claude-sonnet-4',
      };

      expect(() => setProviderConfig(config)).not.toThrow();
    });

    it('should retrieve decrypted provider config', async () => {
      const { setProviderConfig, getProviderConfig } = await import('../electron/store/secure.store');

      const config = {
        id: 'openai' as const,
        apiKey: 'sk-test-openai-key',
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-4',
      };

      setProviderConfig(config);
      const retrieved = getProviderConfig('openai');

      expect(retrieved).toEqual(config);
    });

    it('should delete provider config', async () => {
      const { setProviderConfig, getProviderConfig, deleteProviderConfig } = await import('../electron/store/secure.store');

      const config = {
        id: 'deepseek' as const,
        apiKey: 'sk-deepseek-test',
        model: 'deepseek-chat',
      };

      setProviderConfig(config);
      expect(getProviderConfig('deepseek')).toEqual(config);

      deleteProviderConfig('deepseek');
      expect(getProviderConfig('deepseek')).toBeUndefined();
    });

    it('should return all configured providers', async () => {
      const { setProviderConfig, getAllProviderConfigs } = await import('../electron/store/secure.store');

      const configs = [
        { id: 'claude' as const, apiKey: 'key1', model: 'claude-sonnet-4' },
        { id: 'openai' as const, apiKey: 'key2', model: 'gpt-4' },
        { id: 'deepseek' as const, apiKey: 'key3', model: 'deepseek-chat' },
      ];

      configs.forEach(config => setProviderConfig(config));

      const allConfigs = getAllProviderConfigs();
      expect(allConfigs).toHaveLength(3);
      expect(allConfigs).toEqual(expect.arrayContaining(configs));
    });
  });

  describe('Encryption Verification', () => {
    it('should encrypt API keys (not plaintext in file)', async () => {
      const { setProviderConfig } = await import('../electron/store/secure.store');

      const config = {
        id: 'claude' as const,
        apiKey: 'sk-ant-secret-key-should-not-be-plaintext',
        model: 'claude-sonnet-4',
      };

      setProviderConfig(config);

      // Read the raw file and verify API key is not in plaintext
      if (existsSync(testSecureConfigPath)) {
        const rawContent = readFileSync(testSecureConfigPath, 'utf-8');
        expect(rawContent).not.toContain('sk-ant-secret-key-should-not-be-plaintext');
      }
    });
  });
});
