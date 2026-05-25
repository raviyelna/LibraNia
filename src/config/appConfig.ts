import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { AppConfig, DEFAULT_CONFIG } from '../types/config';

export function getConfigPath(): string {
  // Store config in project root, not AppData
  return path.join(process.cwd(), 'config.json');
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const configPath = getConfigPath();
    const data = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(data);

    // Merge with DEFAULT_CONFIG to handle partial configs
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch (error) {
    // File not found or invalid JSON - return defaults
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(updates: Partial<AppConfig>): Promise<void> {
  // Load current config
  const currentConfig = await loadConfig();

  // Merge with updates
  const newConfig = {
    ...currentConfig,
    ...updates,
  };

  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  // Ensure userData directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Write to temp file first (atomic operation)
  const tempPath = `${configPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(newConfig, null, 2), 'utf-8');

  // Rename temp file to actual config file (atomic on most systems)
  await fs.rename(tempPath, configPath);
}

export async function updateConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
  // Load current config
  const currentConfig = await loadConfig();

  // Merge updates
  const newConfig = {
    ...currentConfig,
    ...updates,
  };

  // Save merged config
  await saveConfig(updates);

  return newConfig;
}
