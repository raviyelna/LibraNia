import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import path from 'path';
import { setupCrashHandlers } from './crashHandler.js';
import { loadConfig, updateConfig } from '../src/config/appConfig.js';
import { startServer, stopServer } from './server.js';
import { getWindowState, saveWindowState } from './windowState.js';
import { createTray } from './tray.js';
import { initDatabase } from './database/connection.js';
import { initFileStorage } from './services/file-storage.service.js';
import { registerTagsHandlers } from './ipc/tags.handlers.js';
import { registerSearchHandlers } from './ipc/search.handlers.js';
import { registerNotesHandlers } from './ipc/notes.handlers.js';
import { registerExportHandlers } from './ipc/export.handlers.js';
import { registerAIHandlers } from './ipc/ai.handlers.js';
import { registerContentHandlers } from './ipc/content.handlers.js';
import { registerGraphHandlers } from './ipc/graph.handlers.js';
import { registerAppHandlers } from './ipc/app.handlers.js';
import { registerConfigHandlers } from './ipc/config.handlers.js';
import { registerWindowHandlers } from './ipc/window.handlers.js';
import { registerMiscHandlers } from './ipc/misc.handlers.js';
const logger = {
    error: (msg, err) => console.error('[ERROR]', msg, err),
    warn: (msg) => console.warn('[WARN]', msg),
    info: (msg) => console.log('[INFO]', msg),
    debug: (msg) => console.log('[DEBUG]', msg)
};
setupCrashHandlers();
const __dirname = __dirname || path.dirname(__filename);
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'librania',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: false
        }
    }
]);
const rendererLogger = {
    error: (msg) => console.error('[RENDERER ERROR]', msg),
    warn: (msg) => console.warn('[RENDERER WARN]', msg),
    info: (msg) => console.log('[RENDERER INFO]', msg),
    debug: (msg) => console.log('[RENDERER DEBUG]', msg)
};
let mainWindow = null;
let currentConfig;
let serverInstance = null;
let tray = null;
async function createWindow() {
    try {
        const windowState = await getWindowState();
        mainWindow = new BrowserWindow({
            x: windowState.x,
            y: windowState.y,
            width: windowState.width,
            height: windowState.height,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });
        mainWindow.on('close', async () => {
            if (mainWindow) {
                await saveWindowState(mainWindow);
            }
        });
        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            logger.error('Window failed to load', new Error(`Code: ${errorCode}, Description: ${errorDescription}`));
        });
        const isDev = !!process.env.VITE_DEV_SERVER_URL;
        const isWebMode = currentConfig.mode === 'web';
        if (isDev) {
            logger.info('Loading from Vite dev server: ' + process.env.VITE_DEV_SERVER_URL);
            await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
            mainWindow.webContents.openDevTools();
        }
        else if (isWebMode) {
            logger.info('Starting Express server for web mode');
            try {
                const distPath = path.join(__dirname, '../dist');
                serverInstance = await startServer(currentConfig.serverPort, distPath);
                await mainWindow.loadURL(`http://localhost:${serverInstance.port}`);
            }
            catch (error) {
                logger.error('Failed to start server, falling back to desktop mode', error);
                await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
            }
        }
        else {
            logger.info('Loading from file system (desktop mode)');
            await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        }
        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    }
    catch (error) {
        logger.error('Failed to create window', error);
        throw error;
    }
}
function registerIpcHandlers() {
    ipcMain.on('log:write', (_event, entry) => {
        try {
            const level = entry.level;
            const msg = entry.message;
            if (level === 'error') {
                console.error('[RENDERER ERROR]', msg, entry.stack);
            }
            else if (level === 'warn') {
                console.warn('[RENDERER WARN]', msg);
            }
            else {
                console.log(`[RENDERER ${level.toUpperCase()}]`, msg);
            }
        }
        catch (error) {
            logger.error('IPC log:write failed', error);
        }
    });
    ipcMain.on('app:reload', () => {
        try {
            mainWindow?.reload();
        }
        catch (error) {
            logger.error('IPC app:reload failed', error);
        }
    });
}
function handleModeSwitch(mode) {
    updateConfig({ mode }).then(() => {
        logger.info('Mode switched via tray to: ' + mode);
        app.relaunch();
        app.exit(0);
    });
}
app.whenReady().then(async () => {
    protocol.registerFileProtocol('librania', (request, callback) => {
        const url = request.url.replace('librania://', '');
        const filePath = path.normalize(decodeURIComponent(url));
        callback({ path: filePath });
    });
    logger.info('Custom protocol registered: librania://');
    const dbPath = path.join(app.getPath('userData'), 'librania.db');
    await initDatabase(dbPath);
    logger.info('Database initialized');
    const storageDir = app.getPath('userData');
    initFileStorage(storageDir);
    logger.info('File storage initialized at: ' + path.join(storageDir, 'notes'));
    currentConfig = await loadConfig();
    logger.info('Config loaded');
    logger.info('App ready, mode: ' + currentConfig.mode);
    registerIpcHandlers();
    registerAppHandlers();
    registerConfigHandlers();
    registerWindowHandlers();
    registerMiscHandlers();
    registerTagsHandlers();
    registerSearchHandlers();
    registerExportHandlers();
    registerContentHandlers();
    registerGraphHandlers();
    await createWindow();
    if (mainWindow) {
        registerNotesHandlers(mainWindow);
        registerAIHandlers(mainWindow);
        logger.info('AI IPC handlers registered');
    }
    if (mainWindow) {
        tray = createTray(mainWindow, currentConfig.mode, handleModeSwitch);
        logger.info('System tray created');
    }
    if (currentConfig.mode === 'web') {
        const distPath = path.join(__dirname, '../dist');
        serverInstance = await startServer(3000, distPath);
        logger.info('HTTP server started on port 3000');
    }
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('before-quit', async () => {
    if (tray) {
        tray.destroy();
        tray = null;
    }
    if (serverInstance) {
        await stopServer(serverInstance);
        serverInstance = null;
    }
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    logger.debug(`Memory usage: ${memoryMB}MB (heap used)`);
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) {
        logger.warn(`High memory usage detected: ${memoryMB}MB - potential memory leak`);
    }
    const cpuSeconds = (cpuUsage.user + cpuUsage.system) / 1000000;
    logger.debug(`CPU usage: ${cpuSeconds.toFixed(2)}s (cumulative)`);
}, 5 * 60 * 1000);
