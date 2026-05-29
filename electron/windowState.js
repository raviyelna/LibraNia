import { screen } from 'electron';
import { loadConfig, updateConfig } from '../src/config/appConfig.js';
export async function getWindowState() {
    const config = await loadConfig();
    if (config.windowBounds && isOnScreen(config.windowBounds)) {
        return config.windowBounds;
    }
    return {
        x: undefined,
        y: undefined,
        width: 1200,
        height: 800,
    };
}
export async function saveWindowState(window) {
    const bounds = window.getBounds();
    await updateConfig({ windowBounds: bounds });
}
export function isOnScreen(bounds) {
    try {
        const display = screen.getDisplayMatching({
            x: bounds.x || 0,
            y: bounds.y || 0,
            width: bounds.width,
            height: bounds.height,
        });
        return display !== null;
    }
    catch {
        return false;
    }
}
