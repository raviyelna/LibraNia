import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';

// Mock @xenova/transformers
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(),
}));

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/user/data'),
  },
}));

import { pipeline } from '@xenova/transformers';

describe('Embeddings Service', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;
  let embeddingsService: any;

  beforeEach(async () => {
    // Create in-memory database
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // Create embeddings table
    sqlite.exec(`
      CREATE TABLE embeddings (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL UNIQUE,
        vector BLOB NOT NULL,
        model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
        dimensions INTEGER NOT NULL DEFAULT 384,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Reset mocks
    vi.clearAllMocks();

    // Clear module cache to reset module-level state
    vi.resetModules();

    // Re-import service to get fresh instance
    embeddingsService = await import('../electron/services/embeddings.service');
  });

  afterEach(() => {
    sqlite.close();
  });

  describe('generateEmbedding', () => {
    it('should return Float32Array of 384 dimensions for sample text', async () => {
      // Mock pipeline to return fake embedding
      const mockEmbedding = new Float32Array(384).fill(0.1);
      const mockPipelineInstance = vi.fn().mockResolvedValue({ data: mockEmbedding });
      vi.mocked(pipeline).mockResolvedValue(mockPipelineInstance as any);

      const result = await embeddingsService.generateEmbedding('Sample text');

      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(384);
    });

    it('should normalize embeddings (L2 norm ≈ 1.0)', async () => {
      // Create normalized vector (L2 norm = 1.0)
      const normalizedVector = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        normalizedVector[i] = 1 / Math.sqrt(384); // Each element = 1/sqrt(384) so sum of squares = 1
      }

      const mockPipelineInstance = vi.fn().mockResolvedValue({ data: normalizedVector });
      vi.mocked(pipeline).mockResolvedValue(mockPipelineInstance as any);

      const result = await embeddingsService.generateEmbedding('Sample text');

      // Calculate L2 norm
      let sumSquares = 0;
      for (let i = 0; i < result.length; i++) {
        sumSquares += result[i] * result[i];
      }
      const l2Norm = Math.sqrt(sumSquares);

      expect(l2Norm).toBeCloseTo(1.0, 2);
    });

    it('should load pipeline lazily on first call and reuse cached instance', async () => {
      const mockEmbedding = new Float32Array(384).fill(0.1);
      const mockPipelineInstance = vi.fn().mockResolvedValue({ data: mockEmbedding });
      vi.mocked(pipeline).mockResolvedValue(mockPipelineInstance as any);

      // Clear any previous calls
      vi.mocked(pipeline).mockClear();

      // First call - should load pipeline
      await embeddingsService.generateEmbedding('First text');
      expect(pipeline).toHaveBeenCalledTimes(1);
      expect(pipeline).toHaveBeenCalledWith(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        expect.objectContaining({ cache_dir: expect.stringContaining('models') })
      );

      // Second call - should reuse cached pipeline
      await embeddingsService.generateEmbedding('Second text');
      expect(pipeline).toHaveBeenCalledTimes(1); // Still 1, not called again
      expect(mockPipelineInstance).toHaveBeenCalledTimes(2); // But pipeline function called twice
    });

    it('should throw error if text is empty', async () => {
      await expect(
        embeddingsService.generateEmbedding('')
      ).rejects.toThrow('Text cannot be empty');
    });
  });

  describe('storeEmbedding', () => {
    it('should insert embedding to database with correct note_id and vector blob', async () => {
      const noteId = 'note-123';
      const vector = new Float32Array(384).fill(0.5);

      await embeddingsService.storeEmbedding(noteId, vector, db);

      // Verify embedding was inserted
      const result = sqlite.prepare('SELECT * FROM embeddings WHERE note_id = ?').get(noteId) as any;
      expect(result).toBeDefined();
      expect(result.note_id).toBe(noteId);
      expect(result.model).toBe('all-MiniLM-L6-v2');
      expect(result.dimensions).toBe(384);
      expect(result.vector).toBeInstanceOf(Buffer);
      expect(result.vector.length).toBe(384 * 4); // 384 float32 values = 1536 bytes
    });
  });

  describe('getEmbedding', () => {
    it('should retrieve embedding by note_id and return Float32Array', async () => {
      const noteId = 'note-456';
      const vector = new Float32Array(384).fill(0.7);

      // Store embedding first
      await embeddingsService.storeEmbedding(noteId, vector, db);

      // Retrieve embedding
      const result = await embeddingsService.getEmbedding(noteId, db);

      expect(result).toBeInstanceOf(Float32Array);
      expect(result?.length).toBe(384);
      expect(result?.[0]).toBeCloseTo(0.7, 5);
    });

    it('should return null if embedding not found', async () => {
      const result = await embeddingsService.getEmbedding('non-existent', db);
      expect(result).toBeNull();
    });
  });

  describe('updateEmbedding', () => {
    it('should update existing embedding vector and updated_at timestamp', async () => {
      const noteId = 'note-789';
      const originalVector = new Float32Array(384).fill(0.3);
      const updatedVector = new Float32Array(384).fill(0.9);

      // Store original embedding
      await embeddingsService.storeEmbedding(noteId, originalVector, db);

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update embedding
      await embeddingsService.updateEmbedding(noteId, updatedVector, db);

      // Verify update
      const result = await embeddingsService.getEmbedding(noteId, db);
      expect(result?.[0]).toBeCloseTo(0.9, 5);
    });

    it('should throw error if note_id not found', async () => {
      const vector = new Float32Array(384).fill(0.5);

      await expect(
        embeddingsService.updateEmbedding('non-existent', vector, db)
      ).rejects.toThrow('Embedding not found for note_id: non-existent');
    });
  });

  describe('deleteEmbedding', () => {
    it('should remove embedding by note_id', async () => {
      const noteId = 'note-delete';
      const vector = new Float32Array(384).fill(0.4);

      // Store embedding
      await embeddingsService.storeEmbedding(noteId, vector, db);
      expect(await embeddingsService.getEmbedding(noteId, db)).not.toBeNull();

      // Delete embedding
      await embeddingsService.deleteEmbedding(noteId, db);

      // Verify deletion
      expect(await embeddingsService.getEmbedding(noteId, db)).toBeNull();
    });
  });

  describe('generateEmbedding - combined title and body', () => {
    it('should combine title and body per D-03 (single vector per note)', async () => {
      const mockEmbedding = new Float32Array(384).fill(0.1);
      const mockPipelineInstance = vi.fn().mockResolvedValue({ data: mockEmbedding });
      vi.mocked(pipeline).mockResolvedValue(mockPipelineInstance as any);

      const title = 'Note Title';
      const body = 'Note body content';
      const combinedText = `${title}\n\n${body}`;

      await embeddingsService.generateEmbedding(combinedText);

      expect(mockPipelineInstance).toHaveBeenCalledWith(
        combinedText,
        { pooling: 'mean', normalize: true }
      );
    });
  });
});
