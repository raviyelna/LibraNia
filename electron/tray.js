import { Tray, Menu, app, nativeImage } from 'electron';
import path from 'path';
export function createTray(window, currentMode, onModeSwitch) {
    const iconPath = path.join(app.getAppPath(), 'resources/icon.svg');
    const icon = nativeImage.createFromPath(iconPath);
    const tray = new Tray(icon.resize({ width: 16, height: 16 }));
    tray.setToolTip('LibraNia');
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
    tray.on('click', () => {
        if (window.isVisible()) {
            window.hide();
        }
        else {
            window.show();
            window.focus();
        }
    });
    return tray;
}
export function updateTrayMode(tray, window, mode, onModeSwitch) {
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
