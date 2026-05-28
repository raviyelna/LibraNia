/**
 * Environment file config storage
 * Stores provider configs in .env file
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

interface ProviderConfig {
  id: 'claude' | 'openai' | 'deepseek';
  apiKey: string;
  baseURL?: string;
  model: string;
}

// Get .env file path in user data directory
function getEnvPath(): string {
  const userDataPath = app?.getPath('userData') || process.cwd();
  return path.join(userDataPath, '.env');
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
function readEnv(): Record<string, string> {
  const envPath = getEnvPath();
  console.log('[ENV] Reading from:', envPath);

  if (!fs.existsSync(envPath)) {
    console.log('[ENV] File does not exist');
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  console.log('[ENV] File content:', content);
  const parsed = parseEnv(content);
  console.log('[ENV] Parsed env:', parsed);
  return parsed;
}

// Write .env file
function writeEnv(env: Record<string, string>): void {
  const envPath = getEnvPath();
  const content = serializeEnv(env);
  fs.writeFileSync(envPath, content, 'utf-8');
  console.log('[ENV] Config saved to:', envPath);
}

// Save provider config to .env
export function saveProviderToEnv(config: ProviderConfig): void {
  const env = readEnv();

  const prefix = config.id.toUpperCase();
  env[`${prefix}_API_KEY`] = config.apiKey;
  env[`${prefix}_MODEL`] = config.model;

  if (config.baseURL) {
    env[`${prefix}_BASE_URL`] = config.baseURL;
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

  if (!apiKey || !model) {
    return null;
  }

  return {
    id: providerId as any,
    apiKey,
    model,
    baseURL: env[`${prefix}_BASE_URL`],
  };
}

// Load all provider configs from .env
export function loadAllProvidersFromEnv(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  for (const id of ['claude', 'openai', 'deepseek']) {
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
  delete env[`${prefix}_MODEL`];
  delete env[`${prefix}_BASE_URL`];

  writeEnv(env);
}
