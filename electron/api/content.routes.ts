/**
 * Content HTTP REST API routes
 * Converted from electron/ipc/content.handlers.ts per Plan 01-03
 */

import { Router } from 'express';
import { getORM } from '../database/connection.js';
import { upload } from '../middleware/upload.middleware.js';
import {
  createContent,
  getContentById,
  getAllContent,
  deleteContent,
} from '../services/content.service.js';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Content API] ${req.method} ${req.path}`);
  next();
});

/**
 * POST /api/content/upload - Upload a file
 * Uses Multer middleware for multipart/form-data
 * Returns: 201 with created content or 400 for validation errors
 */
router.post('/api/content/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // Handle Multer errors (file type, size limit, etc.)
      console.error('[Content API] Upload middleware error:', err);
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please provide a file in the "file" field.',
      });
    }

    const db = getORM();

    // Create content record with uploaded file
    const contentRecord = await createContent(
      {
        filePath: req.file.path,
        source: 'manual',
        originalFilename: req.file.originalname,
      },
      db
    );

    res.status(201).json({ success: true, data: contentRecord });
  } catch (error: any) {
    console.error('[Content API] Upload failed:', error);

    // Check for validation errors
    if (error.message.includes('not allowed') || error.message.includes('too large')) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/content - Get all content records
 * Returns: 200 with array of content
 */
router.get('/api/content', async (req, res) => {
  try {
    const db = getORM();
    const contentRecords = await getAllContent(db);

    res.json({ success: true, data: contentRecords });
  } catch (error: any) {
    console.error('[Content API] Get all failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/content/:id - Get a content record by ID
 * Returns: 200 with content or 404 if not found
 */
router.get('/api/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getORM();
    const contentRecord = await getContentById(id, db);

    if (!contentRecord) {
      return res.status(404).json({
        success: false,
        error: `Content with id ${id} not found`,
      });
    }

    res.json({ success: true, data: contentRecord });
  } catch (error: any) {
    console.error('[Content API] Get by ID failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/content/:id - Delete content and associated files
 * Returns: 200 on success or 404 if not found
 */
router.delete('/api/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getORM();

    const success = await deleteContent(id, db);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: `Content with id ${id} not found`,
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Content API] Delete failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
