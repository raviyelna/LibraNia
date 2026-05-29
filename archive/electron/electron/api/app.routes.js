import { Router } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
const router = Router();
router.use((req, res, next) => {
    console.log(`[App API] ${req.method} ${req.path}`);
    next();
});
router.get('/api/app/version', async (req, res) => {
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        res.json({
            success: true,
            data: {
                version: packageJson.version || '0.1.0',
                name: packageJson.name || 'LibraNia',
            },
        });
    }
    catch (error) {
        console.error('[App API] Get version failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/api/app/logs', async (req, res) => {
    try {
        const { limit = 100, level } = req.query;
        const logs = [];
        res.json({ success: true, data: logs });
    }
    catch (error) {
        console.error('[App API] Get logs failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
