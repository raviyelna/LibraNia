/**
 * Main process logger - TEMPORARY STUB for phase 6 testing
 * Winston disabled to avoid ESM/CJS bundling issues
 */

// Temporary console-based logger
export const logger = {
  error(message: string, error?: Error): void {
    if (error) {
      console.error('[ERROR]', message, error.stack || error);
    } else {
      console.error('[ERROR]', message);
    }
  },

  warn(message: string): void {
    console.warn('[WARN]', message);
  },

  info(message: string): void {
    console.log('[INFO]', message);
  },

  debug(message: string): void {
    console.log('[DEBUG]', message);
  }
};
