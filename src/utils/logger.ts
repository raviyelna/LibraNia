/**
 * Renderer process logger
 * Logs to console and sends logs to main process via IPC
 */

import type { LogEntry, LogLevel } from '../types/logger';

// Helper to format console output
function formatConsoleMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

// Helper to create log entry
function createLogEntry(level: LogLevel, message: string, stack?: string): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    process: 'renderer',
    stack
  };
}

// Export logger interface
export const logger = {
  error(message: string, error?: Error): void {
    const formattedMessage = formatConsoleMessage('error', message);
    console.error(formattedMessage);

    const stack = error?.stack;
    const logEntry = createLogEntry('error', message, stack);

    // Send to main process if electronAPI is available
    if (window.electronAPI?.log) {
      window.electronAPI.log(logEntry);
    }
  },

  warn(message: string): void {
    const formattedMessage = formatConsoleMessage('warn', message);
    console.warn(formattedMessage);

    const logEntry = createLogEntry('warn', message);

    if (window.electronAPI?.log) {
      window.electronAPI.log(logEntry);
    }
  },

  info(message: string): void {
    const formattedMessage = formatConsoleMessage('info', message);
    console.info(formattedMessage);

    const logEntry = createLogEntry('info', message);

    if (window.electronAPI?.log) {
      window.electronAPI.log(logEntry);
    }
  },

  debug(message: string): void {
    const formattedMessage = formatConsoleMessage('debug', message);
    console.debug(formattedMessage);

    const logEntry = createLogEntry('debug', message);

    if (window.electronAPI?.log) {
      window.electronAPI.log(logEntry);
    }
  }
};
