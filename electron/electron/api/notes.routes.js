import { Router } from 'express';
import { getORM } from '../database/connection';
import { createNote, updateNote, deleteNote, restoreNote, getNoteById, getAllNotes, getDeletedNotes, } from '../services/notes.service';
const router = Router();
router.use((req, res, next) => {
    console.log(`[Notes API] ${req.method} ${req.path}`);
    next();
});
router.post('/api/notes', async (req, res) => {
    try {
        const { title, body, metadata } = req.body;
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
    }
    catch (error) {
        console.error('[Notes API] Create failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/api/notes', async (req, res) => {
    try {
        const db = getORM();
        const notes = await getAllNotes(db);
        res.json({ success: true, data: notes });
    }
    catch (error) {
        console.error('[Notes API] Get all failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
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
    }
    catch (error) {
        console.error('[Notes API] Get by ID failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, body, metadata } = req.body;
        const db = getORM();
        const note = await updateNote(id, { title, body, metadata }, db);
        res.json({ success: true, data: note });
    }
    catch (error) {
        console.error('[Notes API] Update failed:', error);
        if (error.message.includes('not found') || error.message.includes('deleted')) {
            return res.status(404).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});
router.delete('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getORM();
        const success = await deleteNote(id, false, db);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: `Note with id ${id} not found`,
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('[Notes API] Delete failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/api/notes/:id/restore', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getORM();
        const note = await restoreNote(id, db);
        res.json({ success: true, data: note });
    }
    catch (error) {
        console.error('[Notes API] Restore failed:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/api/notes/deleted', async (req, res) => {
    try {
        const db = getORM();
        const notes = await getDeletedNotes(db);
        res.json({ success: true, data: notes });
    }
    catch (error) {
        console.error('[Notes API] Get deleted failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
