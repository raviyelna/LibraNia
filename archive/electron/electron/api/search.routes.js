import { Router } from 'express';
import { getORM } from '../database/connection.js';
import { getAllNotes } from '../services/notes.service.js';
const router = Router();
router.use((req, res, next) => {
    console.log(`[Search API] ${req.method} ${req.path}`);
    next();
});
router.post('/api/search', async (req, res) => {
    try {
        const { query, type = 'fullText' } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid required field: query',
            });
        }
        const db = getORM();
        const notes = await getAllNotes(db);
        const queryLower = query.toLowerCase();
        let results;
        if (type === 'quickNav') {
            results = notes
                .filter(note => note.title.toLowerCase().includes(queryLower))
                .map(note => ({
                id: note.id,
                title: note.title,
            }));
        }
        else if (type === 'fuzzy') {
            results = notes
                .filter(note => {
                const title = note.title.toLowerCase();
                const body = note.body.toLowerCase();
                let queryIdx = 0;
                for (const char of title + ' ' + body) {
                    if (char === queryLower[queryIdx]) {
                        queryIdx++;
                        if (queryIdx === queryLower.length)
                            return true;
                    }
                }
                return false;
            })
                .map(note => ({
                id: note.id,
                title: note.title,
                body: note.body.substring(0, 200),
            }));
        }
        else {
            results = notes
                .filter(note => note.title.toLowerCase().includes(queryLower) ||
                note.body.toLowerCase().includes(queryLower))
                .map(note => ({
                id: note.id,
                title: note.title,
                body: note.body.substring(0, 200),
                created_at: note.created_at,
                updated_at: note.updated_at,
            }));
        }
        res.json({ success: true, data: results });
    }
    catch (error) {
        console.error('[Search API] Search failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/api/search/semantic', async (req, res) => {
    try {
        const { query, limit = 10 } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid required field: query',
            });
        }
        res.json({ success: true, data: [] });
    }
    catch (error) {
        console.error('[Search API] Semantic search failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
