import { Router } from 'express';
import { getORM } from '../database/connection.js';
import { upload } from '../middleware/upload.middleware.js';
import { createContent, getContentById, getAllContent, deleteContent, } from '../services/content.service.js';
const router = Router();
router.use((req, res, next) => {
    console.log(`[Content API] ${req.method} ${req.path}`);
    next();
});
router.post('/api/content/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
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
        res.status(201).json({ success: true, data: contentRecord });
    }
    catch (error) {
        console.error('[Content API] Upload failed:', error);
        if (error.message.includes('not allowed') || error.message.includes('too large')) {
            return res.status(400).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/api/content', async (req, res) => {
    try {
        const db = getORM();
        const contentRecords = await getAllContent(db);
        res.json({ success: true, data: contentRecords });
    }
    catch (error) {
        console.error('[Content API] Get all failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
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
    }
    catch (error) {
        console.error('[Content API] Get by ID failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
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
    }
    catch (error) {
        console.error('[Content API] Delete failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
