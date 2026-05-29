import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_CONFIG } from '../types/config.js';
export function getConfigPath() {
    return path.join(process.cwd(), 'config.json');
}
export async function loadConfig() {
    try {
        const configPath = getConfigPath();
        const data = await fs.readFile(configPath, 'utf-8');
        const parsed = JSON.parse(data);
        return {
            ...DEFAULT_CONFIG,
            ...parsed,
        };
    }
    catch (error) {
        return DEFAULT_CONFIG;
    }
}
export async function saveConfig(updates) {
    const currentConfig = await loadConfig();
    const newConfig = {
        ...currentConfig,
        ...updates,
    };
    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });
    const tempPath = `${configPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(newConfig, null, 2), 'utf-8');
    await fs.rename(tempPath, configPath);
}
export async function updateConfig(updates) {
    const currentConfig = await loadConfig();
    const newConfig = {
        ...currentConfig,
        ...updates,
    };
    await saveConfig(updates);
    return newConfig;
}
