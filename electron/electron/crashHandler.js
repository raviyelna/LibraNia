import { app, dialog } from 'electron';
const logger = {
    error: (msg, err) => console.error('[ERROR]', msg, err),
    warn: (msg, err) => console.warn('[WARN]', msg, err),
    info: (msg) => console.log('[INFO]', msg),
    debug: (msg) => console.log('[DEBUG]', msg)
};
export function setupCrashHandlers() {
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception in main process', error);
        dialog.showErrorBox('Unexpected Error', 'An unexpected error occurred. The application will restart.\n\n' +
            `Error: ${error.message}`);
        app.relaunch();
        app.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        logger.error('Unhandled promise rejection in main process', error);
    });
    app.on('render-process-gone', (event, webContents, details) => {
        logger.error('Renderer process gone', new Error(`Reason: ${details.reason}, Exit code: ${details.exitCode}`));
        if (details.reason === 'crashed') {
            dialog
                .showMessageBox({
                type: 'error',
                title: 'Renderer Process Crashed',
                message: 'The application window has crashed.',
                buttons: ['Reload', 'Quit'],
                defaultId: 0
            })
                .then((result) => {
                if (result.response === 0) {
                    webContents.reload();
                }
                else {
                    app.quit();
                }
            });
        }
        else if (details.reason === 'killed') {
            logger.info('Renderer process was killed (normal shutdown)');
        }
    });
    app.on('child-process-gone', (event, details) => {
        logger.warn('Child process gone', new Error(`Type: ${details.type}, Reason: ${details.reason}, Exit code: ${details.exitCode}`));
    });
}
export function showErrorDialog(title, message) {
    dialog.showErrorBox(title, message);
}
