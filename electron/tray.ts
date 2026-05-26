import { Tray, Menu, app, nativeImage, BrowserWindow } from 'electron';
import path from 'path';
// import { fileURLToPath } from 'url';
import { AppMode } from '../src/types/config.js';

// CJS globals work in bundled output
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

export function createTray(
  window: BrowserWindow,
  currentMode: AppMode,
  onModeSwitch: (mode: AppMode) => void
): Tray {
  // Load icon from resources - use app.getAppPath() instead of __dirname
  const iconPath = path.join(app.getAppPath(), 'resources/icon.svg');
  const icon = nativeImage.createFromPath(iconPath);

  // Create tray
  const tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('LibraNia');

  // Build context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show LibraNia',
      click: () => {
        window.show();
        window.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Mode',
      submenu: [
        {
          label: 'Desktop',
          type: 'radio',
          checked: currentMode === 'desktop',
          click: () => onModeSwitch('desktop'),
        },
        {
          label: 'Web',
          type: 'radio',
          checked: currentMode === 'web',
          click: () => onModeSwitch('web'),
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Toggle window visibility on tray icon click
  tray.on('click', () => {
    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
      window.focus();
    }
  });

  return tray;
}

export function updateTrayMode(
  tray: Tray,
  window: BrowserWindow,
  mode: AppMode,
  onModeSwitch: (mode: AppMode) => void
): void {
  // Rebuild context menu with updated mode
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show LibraNia',
      click: () => {
        window.show();
        window.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Mode',
      submenu: [
        {
          label: 'Desktop',
          type: 'radio',
          checked: mode === 'desktop',
          click: () => onModeSwitch('desktop'),
        },
        {
          label: 'Web',
          type: 'radio',
          checked: mode === 'web',
          click: () => onModeSwitch('web'),
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}
