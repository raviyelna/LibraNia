import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getApiKeyPreview,
  getTavilyApiKeyPreview,
  hasTavilyApiKey,
  readEnv,
  saveTavilyApiKey,
  saveProviderToEnv,
  loadProviderFromEnv,
  deleteProviderFromEnv,
} from './env.store';

describe('Tavily env storage', () => {
  let tempDir: string;
  let previousDataDir: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'librania-env-store-'));
    previousDataDir = process.env.LIBRANIA_DATA_DIR;
    process.env.LIBRANIA_DATA_DIR = tempDir;
  });

  afterEach(() => {
    if (previousDataDir === undefined) {
      delete process.env.LIBRANIA_DATA_DIR;
    } else {
      process.env.LIBRANIA_DATA_DIR = previousDataDir;
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('stores Tavily in the configured data directory', () => {
    saveTavilyApiKey('tvly-test-key');

    expect(readEnv().TAVILY_API_KEY).toBe('tvly-test-key');
    expect(hasTavilyApiKey()).toBe(true);
    expect(getTavilyApiKeyPreview()).toBe('tvly-...t-key');
    expect(fs.readFileSync(path.join(tempDir, '.env'), 'utf-8')).toContain(
      'TAVILY_API_KEY="tvly-test-key"'
    );
  });

  it('removes Tavily when an empty key is saved', () => {
    saveTavilyApiKey('tvly-test-key');
    saveTavilyApiKey('');

    expect(readEnv().TAVILY_API_KEY).toBeUndefined();
    expect(hasTavilyApiKey()).toBe(false);
  });

  it('shows only the first and last five key characters', () => {
    expect(getApiKeyPreview('abcde-secret-value-vwxyz')).toBe('abcde...vwxyz');
  });

  it('stores and deletes custom provider keys and headers', () => {
    saveProviderToEnv({
      id: 'custom',
      apiKey: 'custom-key-one',
      apiKeys: ['custom-key-one', 'custom-key-two'],
      model: 'custom-model',
      baseURL: 'https://gateway.example.com/v1',
      customHeaders: [{ name: 'X-Team', value: 'library' }],
    });

    const config = loadProviderFromEnv('custom');
    expect(config?.apiKey).toBe('custom-key-one');
    expect(config?.apiKeys).toEqual(['custom-key-one', 'custom-key-two']);
    expect(config?.customHeaders).toEqual([{ name: 'X-Team', value: 'library' }]);

    deleteProviderFromEnv('custom');
    expect(loadProviderFromEnv('custom')).toBeNull();
  });
});
