/**
 * Tests for renderer process logger
 * TDD RED phase - these tests should fail initially
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock window.electronAPI
const mockLog = vi.fn();
global.window = {
  electronAPI: {
    log: mockLog
  }
} as any;

describe('Renderer Process Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  it('should export logger with error, warn, info, debug methods', async () => {
    const { logger } = await import('./logger.js');

    expect(logger).toBeDefined();
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should log error to console and send to main process', async () => {
    const { logger } = await import('./logger.js');

    logger.error('Test error');

    expect(console.error).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        message: 'Test error',
        process: 'renderer'
      })
    );
  });

  it('should log error with stack trace when Error object provided', async () => {
    const { logger } = await import('./logger.js');
    const testError = new Error('Test error');

    logger.error('Error occurred', testError);

    expect(console.error).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        message: 'Error occurred',
        process: 'renderer',
        stack: expect.stringContaining('Error: Test error')
      })
    );
  });

  it('should log warn to console and send to main process', async () => {
    const { logger } = await import('./logger.js');

    logger.warn('Test warning');

    expect(console.warn).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: 'Test warning',
        process: 'renderer'
      })
    );
  });

  it('should log info to console and send to main process', async () => {
    const { logger } = await import('./logger.js');

    logger.info('Test info');

    expect(console.info).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Test info',
        process: 'renderer'
      })
    );
  });

  it('should log debug to console and send to main process', async () => {
    const { logger } = await import('./logger.js');

    logger.debug('Test debug');

    expect(console.debug).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'debug',
        message: 'Test debug',
        process: 'renderer'
      })
    );
  });

  it('should format console output with timestamp and level', async () => {
    const { logger } = await import('./logger.js');

    logger.info('Test message');

    const consoleCall = (console.info as any).mock.calls[0][0];
    expect(consoleCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[info\] Test message/);
  });
});
