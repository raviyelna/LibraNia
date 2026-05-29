/**
 * App HTTP REST API routes
 * Converted from electron/ipc/app.handlers.ts per Plan 01-03
 */

import { Router } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[App API] ${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/app/version - Get application version
 * Returns: 200 with version string
 */
router.get('/api/app/version', async (req, res) => {
  try {
    // Read version from package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    res.json({
      success: true,
      data: {
        version: packageJson.version || '0.1.0',
        name: packageJson.name || 'LibraNia',
      },
    });
  } catch (error: any) {
    console.error('[App API] Get version failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/app/logs - Get application logs
 * Query: { limit?: number, level?: string }
 * Returns: 200 with log entries
 */
router.get('/api/app/logs', async (req, res) => {
  try {
    const { limit = 100, level } = req.query;

    // For now, return empty array (actual log reading can be implemented later)
    // TODO: Implement log file reading from electron/logs directory
    const logs: any[] = [];

    res.json({ success: true, data: logs });
  } catch (error: any) {
    console.error('[App API] Get logs failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
