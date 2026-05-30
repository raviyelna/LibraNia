/**
 * Renderer process logger
 * Logs to console only (no IPC in web mode)
 */

import type { LogEntry, LogLevel } from '../types/logger';

// Helper to format console output
function formatConsoleMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

// Export logger interface
export const logger = {
  error(message: string, error?: Error): void {
    const formattedMessage = formatConsoleMessage('error', message);
    console.error(formattedMessage, error);
  },

  warn(message: string): void {
    const formattedMessage = formatConsoleMessage('warn', message);
    console.warn(formattedMessage);
  },

  info(message: string): void {
    const formattedMessage = formatConsoleMessage('info', message);
    console.info(formattedMessage);
  },

  debug(message: string): void {
    const formattedMessage = formatConsoleMessage('debug', message);
    console.debug(formattedMessage);
  }
};
