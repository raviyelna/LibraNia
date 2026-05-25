/**
 * Main process logger using Winston
 * Logs to both console and rotating daily log files
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Create logs directory
const logsDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for log messages
const logFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  const stackTrace = stack ? `\n${stack}` : '';
  return `[${timestamp}] [${level}] [main] ${message}${stackTrace}`;
});

// Create Winston logger
const winstonLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        logFormat
      )
    }),
    // Daily rotating file transport
    new DailyRotateFile({
      filename: 'main-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      dirname: logsDir,
      maxFiles: '7d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        logFormat
      )
    })
  ]
});

// Export logger interface
export const logger = {
  error(message: string, error?: Error): void {
    if (error) {
      winstonLogger.error(message, { stack: error.stack });
    } else {
      winstonLogger.error(message);
    }
  },

  warn(message: string): void {
    winstonLogger.warn(message);
  },

  info(message: string): void {
    winstonLogger.info(message);
  },

  debug(message: string): void {
    winstonLogger.debug(message);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', error);
  // Don't exit immediately - let crash handler in main.ts handle it
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled promise rejection', error);
  // Continue running - don't crash on promise rejections
});
