import * as fs from 'fs';
import * as path from 'path';
function getEnvPath() {
    let userDataPath;
    try {
        const electron = require('electron');
        userDataPath = electron.app?.getPath('userData') || process.cwd();
    }
    catch {
        userDataPath = process.env.LIBRANIA_DATA_DIR || process.cwd();
    }
    return path.join(userDataPath, '.env');
}
function parseEnv(content) {
    const env = {};
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
    }
    return env;
}
function serializeEnv(env) {
    return Object.entries(env)
        .map(([key, value]) => `${key}="${value}"`)
        .join('\n') + '\n';
}
export function readEnv() {
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
function writeEnv(env) {
    const envPath = getEnvPath();
    const content = serializeEnv(env);
    fs.writeFileSync(envPath, content, 'utf-8');
    console.log('[ENV] Config saved to:', envPath);
}
export function saveProviderToEnv(config) {
    const env = readEnv();
    const prefix = config.id.toUpperCase();
    env[`${prefix}_API_KEY`] = config.apiKey;
    env[`${prefix}_MODEL`] = config.model;
    if (config.baseURL) {
        env[`${prefix}_BASE_URL`] = config.baseURL;
    }
    writeEnv(env);
}
export function loadProviderFromEnv(providerId) {
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
        id: providerId,
        apiKey,
        model,
        baseURL: env[`${prefix}_BASE_URL`],
    };
}
export function loadAllProvidersFromEnv() {
    const providers = [];
    for (const id of ['claude', 'openai', 'deepseek']) {
        const config = loadProviderFromEnv(id);
        if (config) {
            providers.push(config);
        }
    }
    return providers;
}
export function deleteProviderFromEnv(providerId) {
    const env = readEnv();
    const prefix = providerId.toUpperCase();
    delete env[`${prefix}_API_KEY`];
    delete env[`${prefix}_MODEL`];
    delete env[`${prefix}_BASE_URL`];
    writeEnv(env);
}
