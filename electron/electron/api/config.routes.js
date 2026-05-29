import { Router } from 'express';
import { loadConfig, saveConfig, updateConfig } from '../../src/config/appConfig';
const router = Router();
router.use((req, res, next) => {
    console.log(`[Config API] ${req.method} ${req.path}`);
    next();
});
router.get('/api/config', async (req, res) => {
    try {
        const config = await loadConfig();
        res.json({ success: true, data: config });
    }
    catch (error) {
        console.error('[Config API] Get config failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put('/api/config', async (req, res) => {
    try {
        await updateConfig(req.body);
        res.json({ success: true });
    }
    catch (error) {
        console.error('[Config API] Update config failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/api/config/reset', async (req, res) => {
    try {
        const defaultConfig = {
            theme: 'light',
            language: 'en',
            autoSave: true,
        };
        await saveConfig(defaultConfig);
        res.json({ success: true, data: defaultConfig });
    }
    catch (error) {
        console.error('[Config API] Reset config failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
