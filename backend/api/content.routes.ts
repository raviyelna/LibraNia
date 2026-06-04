/**
 * Content HTTP REST API routes
 * Converted from electron/ipc/content.handlers.ts per Plan 01-03
 */

import { Router, Request } from 'express';
import { promises as fs } from 'fs';
import { getORM } from '../database/connection.js';
import { upload } from '../middleware/upload.middleware.js';
import {
  createContent,
  appendContentReferenceToNote,
  getContentById,
  getAllContent,
  deleteContent,
} from '../services/content.service.js';
import { getNoteById } from '../services/notes.service.js';
import { importContentAsNote } from '../services/note-import.service.js';

const router = Router();

// Extend Express Request type for multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

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
}, async (req: MulterRequest, res) => {
  let createdContentId: string | undefined;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please provide a file in the "file" field.',
      });
    }

    const db = getORM();
    const noteId = req.body.note_id || undefined;

    if (noteId && !(await getNoteById(noteId, db))) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ success: false, error: `Note with id ${noteId} not found` });
    }

    const confidenceScore = req.body.confidence_score !== undefined
      ? Number(req.body.confidence_score)
      : undefined;

    // Create content record with uploaded file
    const contentRecord = await createContent({
      filePath: req.file.path,
      source: req.body.source === 'ai-generated' ? 'ai-generated' : 'manual',
      originalFilename: req.file.originalname,
      confidence_score: Number.isFinite(confidenceScore) ? confidenceScore : undefined,
      note_id: noteId,
      message_id: req.body.message_id || undefined,
    }, db);
    createdContentId = contentRecord.id;

    if (req.body.append_reference !== 'false') {
      await appendContentReferenceToNote(contentRecord, db);
    }

    // Multer stores an upload staging file; createContent copied it to managed storage.
    await fs.unlink(req.file.path).catch(() => {});

    res.status(201).json({ success: true, data: contentRecord });
  } catch (error: any) {
    console.error('[Content API] Upload failed:', error);
    if (createdContentId) {
      await deleteContent(createdContentId, getORM()).catch(() => {});
    }
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    // Check for validation errors
    if (error.message.includes('not allowed') || error.message.includes('too large')) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/content/import-note - Import a document as a new note
 * Markdown is preserved. Other readable documents are normalized by the configured LLM.
 */
router.post('/api/content/import-note', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
}, async (req: MulterRequest, res) => {
  let createdContentId: string | undefined;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please provide a file in the "file" field.',
      });
    }

    const db = getORM();
    const contentRecord = await createContent({
      filePath: req.file.path,
      source: 'manual',
      originalFilename: req.file.originalname,
    }, db);
    createdContentId = contentRecord.id;
    const result = await importContentAsNote(contentRecord, db, {
      providerId: req.body.provider_id || undefined,
      model: req.body.model || undefined,
    });

    await fs.unlink(req.file.path).catch(() => {});
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Content API] Import note failed:', error);
    if (createdContentId) {
      await deleteContent(createdContentId, getORM()).catch(() => {});
    }
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    const message = error.message || 'Import failed';
    const status = message.includes('requires a configured AI provider') ||
      message.includes('No readable text') ||
      message.includes('not allowed') ||
      message.includes('too large')
      ? 400
      : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * GET /api/content - Get all content records
 * Returns: 200 with array of content
 */
router.get('/api/content', async (req, res) => {
  try {
    const db = getORM();
    const noteId = typeof req.query.noteId === 'string' ? req.query.noteId : undefined;
    const contentRecords = await getAllContent(db, noteId);

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
