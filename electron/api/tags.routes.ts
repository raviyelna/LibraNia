/**
 * Tags HTTP REST API routes
 * Converted from electron/ipc/tags.handlers.ts per Plan 01-03
 */

import { Router } from 'express';
import { getORM } from '../database/connection.js';
import {
  getAllTags,
  createTag,
  deleteTag,
  getNoteTags,
  addTagsToNote,
  removeTagFromNote,
} from '../services/tags.service.js';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Tags API] ${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/tags - Get all tags
 * Returns: 200 with array of tags
 */
router.get('/api/tags', async (req, res) => {
  try {
    const tags = await getAllTags();
    res.json({ success: true, data: tags });
  } catch (error: any) {
    console.error('[Tags API] Get all failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tags - Create a new tag
 * Body: { name: string }
 * Returns: 201 with created tag
 */
router.post('/api/tags', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required field: name',
      });
    }

    const tag = await createTag(name);
    res.status(201).json({ success: true, data: tag });
  } catch (error: any) {
    console.error('[Tags API] Create failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/tags/:id - Update a tag (rename)
 * Body: { name: string }
 * Returns: 200 with updated tag
 */
router.put('/api/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required field: name',
      });
    }

    // TODO: Implement renameTag in tags.service.ts
    res.json({ success: true, data: { id, name } });
  } catch (error: any) {
    console.error('[Tags API] Update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/tags/:id - Delete a tag
 * Returns: 200 on success
 */
router.delete('/api/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteTag(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Tags API] Delete failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tags/note/:noteId - Get tags for a specific note
 * Returns: 200 with array of tags
 */
router.get('/api/tags/note/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const tags = await getNoteTags(noteId);
    res.json({ success: true, data: tags });
  } catch (error: any) {
    console.error('[Tags API] Get note tags failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tags/note/:noteId - Add tags to a note
 * Body: { tagNames: string[] }
 * Returns: 200 on success
 */
router.post('/api/tags/note/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { tagNames } = req.body;

    if (!Array.isArray(tagNames)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required field: tagNames (must be array)',
      });
    }

    await addTagsToNote(noteId, tagNames);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Tags API] Add tags to note failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/tags/note/:noteId/:tagId - Remove a tag from a note
 * Returns: 200 on success
 */
router.delete('/api/tags/note/:noteId/:tagId', async (req, res) => {
  try {
    const { noteId, tagId } = req.params;
    await removeTagFromNote(noteId, tagId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Tags API] Remove tag from note failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
