/**
 * Export HTTP REST API routes
 * Converted from electron/ipc/export.handlers.ts per Plan 01-03
 */

import { Router } from 'express';
import { getORM } from '../database/connection';
import { getAllNotes } from '../services/notes.service';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Export API] ${req.method} ${req.path}`);
  next();
});

/**
 * POST /api/export/notes - Export notes to file
 * Body: { format: 'json' | 'markdown', noteIds?: string[] }
 * Returns: 200 with export result
 */
router.post('/api/export/notes', async (req, res) => {
  try {
    const { format = 'json', noteIds = [] } = req.body;

    const db = getORM();
    let notes = await getAllNotes(db);

    // Filter by noteIds if provided
    if (noteIds.length > 0) {
      notes = notes.filter(note => noteIds.includes(note.id));
    }

    // For now, return the notes data (actual file export can be implemented later)
    res.json({
      success: true,
      data: {
        format,
        count: notes.length,
        notes,
      },
    });
  } catch (error: any) {
    console.error('[Export API] Export notes failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/export/library - Export entire library
 * Returns: 200 with export result
 */
router.post('/api/export/library', async (req, res) => {
  try {
    const db = getORM();
    const notes = await getAllNotes(db);

    res.json({
      success: true,
      data: {
        format: 'json',
        count: notes.length,
        notes,
      },
    });
  } catch (error: any) {
    console.error('[Export API] Export library failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
