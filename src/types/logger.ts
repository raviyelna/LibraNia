/**
 * Logger types for LibraNia
 * Shared between main and renderer processes
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  process: 'main' | 'renderer';
  stack?: string;
}

export interface Logger {
  error(message: string, error?: Error): void;
  warn(message: string): void;
  info(message: string): void;
  debug(message: string): void;
}
