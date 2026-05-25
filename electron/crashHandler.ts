/**
 * Crash handler for Electron main process
 * Handles uncaught exceptions, unhandled rejections, and process crashes
 */

import { app, dialog } from 'electron';
import { logger } from './logger.js';

/**
 * Set up global error handlers for the main process
 * Must be called before app.whenReady()
 */
export function setupCrashHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception in main process', error);

    // Show error dialog to user
    dialog.showErrorBox(
      'Unexpected Error',
      'An unexpected error occurred. The application will restart.\n\n' +
        `Error: ${error.message}`
    );

    // Relaunch and exit
    app.relaunch();
    app.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled promise rejection in main process', error);
    // Continue running - don't crash on promise rejections
  });

  // Handle renderer process crashes
  app.on('render-process-gone', (event, webContents, details) => {
    logger.error('Renderer process gone', new Error(`Reason: ${details.reason}, Exit code: ${details.exitCode}`));

    if (details.reason === 'crashed') {
      // Show dialog and offer to reload or quit
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
            // Reload
            webContents.reload();
          } else {
            // Quit
            app.quit();
          }
        });
    } else if (details.reason === 'killed') {
      logger.info('Renderer process was killed (normal shutdown)');
    }
  });

  // Handle child process crashes (non-critical)
  app.on('child-process-gone', (event, details) => {
    logger.warn('Child process gone', new Error(`Type: ${details.type}, Reason: ${details.reason}, Exit code: ${details.exitCode}`));
    // Continue running - child processes are non-critical
  });
}

/**
 * Show error dialog (synchronous)
 */
export function showErrorDialog(title: string, message: string): void {
  dialog.showErrorBox(title, message);
}
