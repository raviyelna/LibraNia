/**
 * Notes HTTP REST API routes
 * Converted from electron/ipc/notes.handlers.ts per Plan 01-03
 */

import { Router } from 'express';
import { getORM } from '../database/connection.js';
import {
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  getNoteById,
  getAllNotes,
  getDeletedNotes,
} from '../services/notes.service.js';
import { getBacklinks } from '../services/links.service.js';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Notes API] ${req.method} ${req.path}`);
  next();
});

/**
 * POST /api/notes - Create a new note
 * Body: { title: string, body: string, metadata?: string }
 * Returns: 201 with created note or 400 for validation errors
 */
router.post('/api/notes', async (req, res) => {
  try {
    const { title, body, metadata } = req.body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required field: title',
      });
    }

    if (!body || typeof body !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required field: body',
      });
    }

    const db = getORM();
    const note = await createNote({ title, body, metadata }, db);

    res.status(201).json({ success: true, data: note });
  } catch (error: any) {
    console.error('[Notes API] Create failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notes - Get all notes (excluding soft-deleted)
 * Returns: 200 with array of notes
 */
router.get('/api/notes', async (req, res) => {
  try {
    const db = getORM();
    const notes = await getAllNotes(db);

    res.json({ success: true, data: notes });
  } catch (error: any) {
    console.error('[Notes API] Get all failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notes/deleted - Get all soft-deleted notes (trash view)
 * Returns: 200 with array of deleted notes
 */
router.get('/api/notes/deleted', async (req, res) => {
  try {
    const db = getORM();
    const notes = await getDeletedNotes(db);

    res.json({ success: true, data: notes });
  } catch (error: any) {
    console.error('[Notes API] Get deleted failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notes/:id - Get a note by ID
 * Returns: 200 with note or 404 if not found
 */
router.get('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getORM();
    const note = await getNoteById(id, db, false);

    if (!note) {
      return res.status(404).json({
        success: false,
        error: `Note with id ${id} not found`,
      });
    }

    res.json({ success: true, data: note });
  } catch (error: any) {
    console.error('[Notes API] Get by ID failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notes/:id/backlinks - Get backlinks for a note
 * Returns: 200 with array of backlinks
 */
router.get('/api/notes/:id/backlinks', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getORM();
    const backlinks = await getBacklinks(id, db);

    res.json({ success: true, data: backlinks });
  } catch (error: any) {
    console.error('[Notes API] Get backlinks failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notes/:id/related - Get related notes (semantic links)
 * Returns: 200 with array of related notes
 */
router.get('/api/notes/:id/related', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: implement semantic links when sqlite-vec available
    res.json({ success: true, data: [] });
  } catch (error: any) {
    console.error('[Notes API] Get related failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/notes/:id - Update a note
 * Body: { title?: string, body?: string, metadata?: string }
 * Returns: 200 with updated note or 404 if not found
 */
router.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, metadata } = req.body;

    const db = getORM();
    const note = await updateNote(id, { title, body, metadata }, db);

    res.json({ success: true, data: note });
  } catch (error: any) {
    console.error('[Notes API] Update failed:', error);

    // Check if error is "not found"
    if (error.message.includes('not found') || error.message.includes('deleted')) {
      return res.status(404).json({ success: false, error: error.message });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/notes/:id - Soft delete a note
 * Returns: 200 on success
 */
router.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getORM();

    // Soft delete (hard = false)
    const success = await deleteNote(id, false, db);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: `Note with id ${id} not found`,
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Notes API] Delete failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notes/:id/restore - Restore a soft-deleted note
 * Returns: 200 with restored note or 404 if not found
 */
router.post('/api/notes/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getORM();
    const note = await restoreNote(id, db);

    res.json({ success: true, data: note });
  } catch (error: any) {
    console.error('[Notes API] Restore failed:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
