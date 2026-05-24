import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import windowStateKeeper from 'electron-window-state';
import Store from 'electron-store';
import log from 'electron-log';
import { loadConfig, saveConfig, updateConfig } from '../src/config/appConfig.js';
import { AppConfig } from '../src/types/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize electron-store for config
const store = new Store();

// Configure logging
log.transports.file.resolvePathFn = () =>
  path.join(app.getPath('userData'), 'logs', 'main.log');
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

let mainWindow: BrowserWindow | null = null;
let currentConfig: AppConfig;

function createWindow() {
  // Restore previous window state
  const windowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800
  });

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

  // Track window state changes
  windowState.manage(mainWindow);

  // Load app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
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

  // Logging
  ipcMain.handle('log:error', (_event, error: { message: string; stack?: string; componentStack?: string }) => {
    log.error('Renderer error:', error);
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Load config on startup
  currentConfig = await loadConfig();
  log.info('Config loaded:', currentConfig);

  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
