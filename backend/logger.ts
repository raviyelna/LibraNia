/**
 * Main process logger - TEMPORARY STUB for phase 6 testing
 * Winston disabled to avoid ESM/CJS bundling issues
 */

// Temporary console-based logger
export const logger = {
  error(message: string, errorOrMeta?: Error | any): void {
    if (errorOrMeta instanceof Error) {
      console.error('[ERROR]', message, errorOrMeta.stack || errorOrMeta);
    } else if (errorOrMeta) {
      console.error('[ERROR]', message, errorOrMeta);
    } else {
      console.error('[ERROR]', message);
    }
  },

  warn(message: string, meta?: any): void {
    if (meta) {
      console.warn('[WARN]', message, meta);
    } else {
      console.warn('[WARN]', message);
    }
  },

  info(message: string, meta?: any): void {
    if (meta) {
      console.log('[INFO]', message, meta);
    } else {
      console.log('[INFO]', message);
    }
  },

  debug(message: string, meta?: any): void {
    if (meta) {
      console.log('[DEBUG]', message, meta);
    } else {
      console.log('[DEBUG]', message);
    }
  }
};
