/**
 * Environment file config storage
 * Stores provider configs in .env file
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CustomHeader {
  name: string;
  value: string;
}

export interface ProviderConfig {
  id: 'claude' | 'openai' | 'deepseek' | 'custom';
  apiKey: string;
  apiKeys?: string[];
  baseURL?: string;
  model: string;
  customHeaders?: CustomHeader[];
}

export interface ProviderConfigStatus {
  id: ProviderConfig['id'];
  configured: boolean;
  apiKeyPreview: string;
  apiKeyPreviews?: string[];
  baseURL?: string;
  model: string;
  customHeaders?: Array<{ name: string; valuePreview: string }>;
}

// Get .env file path in data directory
function getEnvPath(): string {
  // Always use data/.env
  const dataDir = process.env.LIBRANIA_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dataDir, '.env');
}

// Parse .env file
function parseEnv(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  }

  return env;
}

// Serialize env object to .env format
function serializeEnv(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n') + '\n';
}

// Read .env file
export function readEnv(): Record<string, string> {
  const envPath = getEnvPath();
  console.log('[ENV] Reading from:', envPath);

  if (!fs.existsSync(envPath)) {
    console.log('[ENV] File does not exist');
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const parsed = parseEnv(content);
  console.log('[ENV] Loaded keys:', Object.keys(parsed));
  return parsed;
}

// Write .env file
function writeEnv(env: Record<string, string>): void {
  const envPath = getEnvPath();
  const content = serializeEnv(env);
  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  fs.writeFileSync(envPath, content, 'utf-8');
  console.log('[ENV] Config saved to:', envPath);
}

export function saveTavilyApiKey(apiKey: string): void {
  const env = readEnv();

  if (apiKey) {
    env.TAVILY_API_KEY = apiKey;
  } else {
    delete env.TAVILY_API_KEY;
  }

  writeEnv(env);
}

export function hasTavilyApiKey(): boolean {
  return !!readEnv().TAVILY_API_KEY;
}

export function getTavilyApiKeyPreview(): string {
  return getApiKeyPreview(readEnv().TAVILY_API_KEY);
}

export function getApiKeyPreview(apiKey?: string): string {
  if (!apiKey) return '';
  return `${apiKey.slice(0, 5)}...${apiKey.slice(-5)}`;
}

export function getProviderConfigStatus(config: ProviderConfig): ProviderConfigStatus {
  return {
    id: config.id,
    configured: !!config.apiKey,
    apiKeyPreview: getApiKeyPreview(config.apiKey),
    apiKeyPreviews: config.apiKeys?.map(getApiKeyPreview),
    model: config.model,
    baseURL: config.baseURL,
    customHeaders: config.customHeaders?.map(header => ({
      name: header.name,
      valuePreview: getApiKeyPreview(header.value),
    })),
  };
}

// Save provider config to .env
export function saveProviderToEnv(config: ProviderConfig): void {
  const env = readEnv();

  const prefix = config.id.toUpperCase();
  env[`${prefix}_API_KEY`] = config.apiKey;
  env[`${prefix}_MODEL`] = config.model;
  if (config.apiKeys?.length) {
    env[`${prefix}_API_KEYS`] = JSON.stringify(config.apiKeys);
  } else {
    delete env[`${prefix}_API_KEYS`];
  }

  if (config.baseURL) {
    env[`${prefix}_BASE_URL`] = config.baseURL;
  } else {
    delete env[`${prefix}_BASE_URL`];
  }

  if (config.customHeaders?.length) {
    env[`${prefix}_CUSTOM_HEADERS`] = JSON.stringify(config.customHeaders);
  } else {
    delete env[`${prefix}_CUSTOM_HEADERS`];
  }

  writeEnv(env);
}

// Load provider config from .env
export function loadProviderFromEnv(providerId: string): ProviderConfig | null {
  const env = readEnv();
  const prefix = providerId.toUpperCase();

  console.log('[ENV] loadProviderFromEnv:', providerId);
  console.log('[ENV] Prefix:', prefix);
  console.log('[ENV] All env keys:', Object.keys(env));

  const apiKey = env[`${prefix}_API_KEY`];
  const model = env[`${prefix}_MODEL`];

  console.log('[ENV] Found apiKey:', !!apiKey);
  console.log('[ENV] Found model:', !!model);

  const apiKeys = env[`${prefix}_API_KEYS`]
    ? JSON.parse(env[`${prefix}_API_KEYS`])
    : undefined;
  const customHeaders = env[`${prefix}_CUSTOM_HEADERS`]
    ? JSON.parse(env[`${prefix}_CUSTOM_HEADERS`])
    : undefined;

  if (!apiKey || !model) {
    return null;
  }

  return {
    id: providerId as any,
    apiKey,
    apiKeys: Array.isArray(apiKeys) ? apiKeys : undefined,
    model,
    baseURL: env[`${prefix}_BASE_URL`],
    customHeaders: Array.isArray(customHeaders) ? customHeaders : undefined,
  };
}

// Load all provider configs from .env
export function loadAllProvidersFromEnv(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  for (const id of ['claude', 'openai', 'deepseek', 'custom']) {
    const config = loadProviderFromEnv(id);
    if (config) {
      providers.push(config);
    }
  }

  return providers;
}

// Delete provider config from .env
export function deleteProviderFromEnv(providerId: string): void {
  const env = readEnv();
  const prefix = providerId.toUpperCase();

  delete env[`${prefix}_API_KEY`];
  delete env[`${prefix}_API_KEYS`];
  delete env[`${prefix}_MODEL`];
  delete env[`${prefix}_BASE_URL`];
  delete env[`${prefix}_CUSTOM_HEADERS`];

  writeEnv(env);
}
