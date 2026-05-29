import { Router } from 'express';
import { getORM } from '../database/connection';
import { getAllNotes } from '../services/notes.service';
const router = Router();
router.use((req, res, next) => {
    console.log(`[Export API] ${req.method} ${req.path}`);
    next();
});
router.post('/api/export/notes', async (req, res) => {
    try {
        const { format = 'json', noteIds = [] } = req.body;
        const db = getORM();
        let notes = await getAllNotes(db);
        if (noteIds.length > 0) {
            notes = notes.filter(note => noteIds.includes(note.id));
        }
        res.json({
            success: true,
            data: {
                format,
                count: notes.length,
                notes,
            },
        });
    }
    catch (error) {
        console.error('[Export API] Export notes failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
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
    }
    catch (error) {
        console.error('[Export API] Export library failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
