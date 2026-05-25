import { app, BrowserWindow, ipcMain, Tray, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { logger } from './logger.js';
import { loadConfig, saveConfig, updateConfig } from '../src/config/appConfig.js';
import { AppConfig } from '../src/types/config.js';
import { startServer, stopServer, ServerInstance } from './server.js';
import { getWindowState, saveWindowState } from './windowState.js';
import { createTray, updateTrayMode } from './tray.js';
import type { LogEntry } from '../src/types/logger.js';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize electron-store for config
const store = new Store();

// Create renderer logger (separate from main logger)
const logsDir = path.join(app.getPath('userData'), 'logs');
const rendererLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, stack }) => {
      const stackTrace = stack ? `\n${stack}` : '';
      return `[${timestamp}] [${level}] [renderer] ${message}${stackTrace}`;
    })
  ),
  transports: [
    new DailyRotateFile({
      filename: 'renderer-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      dirname: logsDir,
      maxFiles: '7d'
    })
  ]
});

let mainWindow: BrowserWindow | null = null;
let currentConfig: AppConfig;
let serverInstance: ServerInstance | null = null;
let tray: Tray | null = null;

async function createWindow() {
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

  // Load app based on mode and environment
  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  const isWebMode = currentConfig.mode === 'web';

  if (isDev) {
    // Development: Always use Vite dev server (both desktop and web mode)
    logger.info('Loading from Vite dev server: ' + process.env.VITE_DEV_SERVER_URL);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else if (isWebMode) {
    // Production web mode: Start Express server and load from it
    logger.info('Starting Express server for web mode');
    const distPath = path.join(__dirname, '../dist');
    serverInstance = await startServer(currentConfig.serverPort, distPath);
    mainWindow.loadURL(`http://localhost:${serverInstance.port}`);
  } else {
    // Production desktop mode: Load from file system
    logger.info('Loading from file system (desktop mode)');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
function registerIpcHandlers() {
  // Config operations
  ipcMain.handle('config:get', async () => {
    return currentConfig;
  });

  ipcMain.handle('config:set', async (_event, updates: Partial<AppConfig>) => {
    await saveConfig(updates);
    currentConfig = await loadConfig();
    return { success: true };
  });

  ipcMain.handle('config:update', async (_event, updates: Partial<AppConfig>) => {
    currentConfig = await updateConfig(updates);
    return currentConfig;
  });

  // Window operations
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });

  // App operations
  ipcMain.handle('app:restart', () => {
    app.relaunch();
    app.exit(0);
  });

  // Mode switching
  ipcMain.handle('mode:switch', async (_event, newMode: 'desktop' | 'web') => {
    await updateConfig({ mode: newMode });
    currentConfig = await loadConfig();
    logger.info('Mode switched to: ' + newMode);

    // Update tray menu
    if (tray && mainWindow) {
      updateTrayMode(tray, mainWindow, newMode, handleModeSwitch);
    }

    return { success: true, requiresRestart: true };
  });

  // Logging - renderer process logs
  ipcMain.on('log:write', (_event, entry: LogEntry) => {
    // Write renderer logs to separate file
    rendererLogger.log({
      level: entry.level,
      message: entry.message,
      stack: entry.stack
    });
  });

  ipcMain.handle('log:error', (_event, error: { message: string; stack?: string; componentStack?: string }) => {
    logger.error('Renderer error: ' + error.message, error.stack ? new Error(error.stack) : undefined);
  });

  // Logs directory operations
  ipcMain.handle('logs:open', async () => {
    const logsPath = path.join(app.getPath('userData'), 'logs');
    await shell.openPath(logsPath);
  });

  // App reload
  ipcMain.on('app:reload', () => {
    mainWindow?.reload();
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
  // Load config on startup
  currentConfig = await loadConfig();
  logger.info('Config loaded');
  logger.info('App ready, mode: ' + currentConfig.mode);

  registerIpcHandlers();
  await createWindow();

  // Create system tray
  if (mainWindow) {
    tray = createTray(mainWindow, currentConfig.mode, handleModeSwitch);
    logger.info('System tray created');
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
