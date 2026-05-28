import { app, BrowserWindow, ipcMain, Tray, shell } from 'electron';
import path from 'path';
// import { fileURLToPath } from 'url';
// import Store from 'electron-store'; // ESM-only in v11, disabled for phase 6
// import { logger } from './logger.js';
import { setupCrashHandlers } from './crashHandler.js';
import { loadConfig, saveConfig, updateConfig } from '../src/config/appConfig.js';
import { AppConfig } from '../src/types/config.js';
import { startServer, stopServer, ServerInstance } from './server.js';
import { getWindowState, saveWindowState } from './windowState.js';
import { createTray, updateTrayMode } from './tray.js';
import type { LogEntry } from '../src/types/logger.js';
// import winston from 'winston';
// import DailyRotateFile from 'winston-daily-rotate-file';
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

// Temporary logger replacement for phase 6 testing
const logger = {
  error: (msg: string, err?: Error) => console.error('[ERROR]', msg, err),
  warn: (msg: string) => console.warn('[WARN]', msg),
  info: (msg: string) => console.log('[INFO]', msg),
  debug: (msg: string) => console.log('[DEBUG]', msg)
};

// Set up crash handlers before anything else
setupCrashHandlers();

// CJS globals work in bundled output
const __dirname = __dirname || path.dirname(__filename);

// Initialize electron-store for config
// const store = new Store(); // Disabled - ESM-only in v11

// Create renderer logger (separate from main logger)
// const logsDir = path.join(app.getPath('userData'), 'logs');
const rendererLogger = {
  error: (msg: string) => console.error('[RENDERER ERROR]', msg),
  warn: (msg: string) => console.warn('[RENDERER WARN]', msg),
  info: (msg: string) => console.log('[RENDERER INFO]', msg),
  debug: (msg: string) => console.log('[RENDERER DEBUG]', msg)
};

let mainWindow: BrowserWindow | null = null;
let currentConfig: AppConfig;
let serverInstance: ServerInstance | null = null;
let tray: Tray | null = null;

async function createWindow() {
  try {
    // Get window state from config
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

    // Save window state on close
    mainWindow.on('close', async () => {
      if (mainWindow) {
        await saveWindowState(mainWindow);
      }
    });

    // Handle window load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.error('Window failed to load', new Error(`Code: ${errorCode}, Description: ${errorDescription}`));
    });

    // Load app based on mode and environment
    const isDev = !!process.env.VITE_DEV_SERVER_URL;
    const isWebMode = currentConfig.mode === 'web';

    if (isDev) {
      // Development: Always use Vite dev server (both desktop and web mode)
      logger.info('Loading from Vite dev server: ' + process.env.VITE_DEV_SERVER_URL);
      await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
      mainWindow.webContents.openDevTools();
    } else if (isWebMode) {
      // Production web mode: Start Express server and load from it
      logger.info('Starting Express server for web mode');
      try {
        const distPath = path.join(__dirname, '../dist');
        serverInstance = await startServer(currentConfig.serverPort, distPath);
        await mainWindow.loadURL(`http://localhost:${serverInstance.port}`);
      } catch (error) {
        logger.error('Failed to start server, falling back to desktop mode', error as Error);
        // Fall back to desktop mode
        await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
      }
    } else {
      // Production desktop mode: Load from file system
      logger.info('Loading from file system (desktop mode)');
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (error) {
    logger.error('Failed to create window', error as Error);
    throw error;
  }
}

// IPC Handlers
function registerIpcHandlers() {
  // Config operations

  // Logging - renderer process logs
  ipcMain.on('log:write', (_event, entry: LogEntry) => {
    try {
      // Write renderer logs to console (winston disabled for phase 6 testing)
      const level = entry.level;
      const msg = entry.message;
      if (level === 'error') {
        console.error('[RENDERER ERROR]', msg, entry.stack);
      } else if (level === 'warn') {
        console.warn('[RENDERER WARN]', msg);
      } else {
        console.log(`[RENDERER ${level.toUpperCase()}]`, msg);
      }
    } catch (error) {
      logger.error('IPC log:write failed', error as Error);
    }
  });

  // App reload
  ipcMain.on('app:reload', () => {
    try {
      mainWindow?.reload();
    } catch (error) {
      logger.error('IPC app:reload failed', error as Error);
    }
  });
}

// Mode switch handler for tray
function handleModeSwitch(mode: 'desktop' | 'web') {
  updateConfig({ mode }).then(() => {
    logger.info('Mode switched via tray to: ' + mode);
    // Trigger restart via IPC would require renderer, so we'll just relaunch
    app.relaunch();
    app.exit(0);
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'librania.db');
  await initDatabase(dbPath);
  logger.info('Database initialized');

  // Initialize file storage
  const storageDir = app.getPath('userData');
  initFileStorage(storageDir);
  logger.info('File storage initialized at: ' + path.join(storageDir, 'notes'));

  // Load config on startup
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

  // Register handlers that need mainWindow after window is created
  if (mainWindow) {
    registerNotesHandlers(mainWindow);
    registerAIHandlers(mainWindow);
    logger.info('AI IPC handlers registered');
  }

  // Create system tray
  if (mainWindow) {
    tray = createTray(mainWindow, currentConfig.mode, handleModeSwitch);
    logger.info('System tray created');
  }

  // Start HTTP server if in web mode
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
  // Destroy tray
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // Stop server if running
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

// Process monitoring - log memory and CPU usage periodically
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Log memory usage in MB
  const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  logger.debug(`Memory usage: ${memoryMB}MB (heap used)`);

  // Warn if memory usage exceeds 500MB (potential memory leak)
  if (memoryUsage.heapUsed > 500 * 1024 * 1024) {
    logger.warn(`High memory usage detected: ${memoryMB}MB - potential memory leak`);
  }

  // Log CPU usage (user + system time in microseconds)
  const cpuSeconds = (cpuUsage.user + cpuUsage.system) / 1000000;
  logger.debug(`CPU usage: ${cpuSeconds.toFixed(2)}s (cumulative)`);
}, 5 * 60 * 1000); // Every 5 minutes
