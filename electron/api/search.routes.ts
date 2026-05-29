/**
 * Search HTTP REST API routes
 * Converted from electron/ipc/search.handlers.ts per Plan 01-03
 */

import { Router } from 'express';
import { getORM } from '../database/connection.js';
import { getAllNotes } from '../services/notes.service.js';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Search API] ${req.method} ${req.path}`);
  next();
});

/**
 * POST /api/search - Full-text search in notes
 * Body: { query: string, type?: 'fullText' | 'quickNav' | 'fuzzy' }
 * Returns: 200 with search results
 */
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
      // Quick navigation search (title only)
      results = notes
        .filter(note => note.title.toLowerCase().includes(queryLower))
        .map(note => ({
          id: note.id,
          title: note.title,
        }));
    } else if (type === 'fuzzy') {
      // Fuzzy search (simple implementation)
      results = notes
        .filter(note => {
          const title = note.title.toLowerCase();
          const body = note.body.toLowerCase();
          // Simple fuzzy: check if all query chars appear in order
          let queryIdx = 0;
          for (const char of title + ' ' + body) {
            if (char === queryLower[queryIdx]) {
              queryIdx++;
              if (queryIdx === queryLower.length) return true;
            }
          }
          return false;
        })
        .map(note => ({
          id: note.id,
          title: note.title,
          body: note.body.substring(0, 200),
        }));
    } else {
      // Full-text search (default)
      results = notes
        .filter(note =>
          note.title.toLowerCase().includes(queryLower) ||
          note.body.toLowerCase().includes(queryLower)
        )
        .map(note => ({
          id: note.id,
          title: note.title,
          body: note.body.substring(0, 200), // Preview
          created_at: note.created_at,
          updated_at: note.updated_at,
        }));
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('[Search API] Search failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/search/semantic - Semantic search (placeholder)
 * Body: { query: string, limit?: number }
 * Returns: 200 with search results (empty for now)
 */
router.post('/api/search/semantic', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required field: query',
      });
    }

    // TODO: Implement with embeddings service
    res.json({ success: true, data: [] });
  } catch (error: any) {
    console.error('[Search API] Semantic search failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
