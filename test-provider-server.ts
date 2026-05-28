/**
 * HTTP API server for testing provider config
 * Wraps secure store functions in REST endpoints
 */

import express from 'express';
import { setProviderConfig, getProviderConfig, getAllProviderConfigs, deleteProviderConfig } from './electron/store/secure.store';

const app = express();
app.use(express.json());

// POST /providers - Save provider config
app.post('/providers', async (req, res) => {
  try {
    const { id, apiKey, baseURL, model } = req.body;

    if (!id || !apiKey || !model) {
      return res.status(400).json({
        success: false,
        error: 'id, apiKey, and model required'
      });
    }

    await setProviderConfig({ id, apiKey, baseURL, model });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /providers - Get all provider configs
app.get('/providers', async (req, res) => {
  try {
    const configs = await getAllProviderConfigs();
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /providers/:id - Get specific provider config
app.get('/providers/:id', async (req, res) => {
  try {
    const config = await getProviderConfig(req.params.id);
    if (!config) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /providers/:id - Delete provider config
app.delete('/providers/:id', async (req, res) => {
  try {
    await deleteProviderConfig(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n✅ Provider Config API running on http://localhost:${PORT}`);
  console.log('\nTest commands:');
  console.log('  # Save config');
  console.log('  curl -X POST http://localhost:3001/providers -H "Content-Type: application/json" -d \'{"id":"deepseek","apiKey":"sk-test-123","model":"deepseek-chat","baseURL":"https://api.deepseek.com"}\'');
  console.log('\n  # Get all configs');
  console.log('  curl http://localhost:3001/providers');
  console.log('\n  # Get specific config');
  console.log('  curl http://localhost:3001/providers/deepseek');
  console.log('\n  # Delete config');
  console.log('  curl -X DELETE http://localhost:3001/providers/deepseek');
  console.log('');
});
