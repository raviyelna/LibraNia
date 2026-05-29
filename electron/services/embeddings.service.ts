import { app } from 'electron';
import path from 'path';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { embeddings } from '../database/schema.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema.js';

/**
 * Module-level state for lazy-loaded pipeline instance
 */
let embeddingPipeline: any = null;

/**
 * Generate 384-dimensional embedding from text using all-MiniLM-L6-v2 model
 *
 * Lazy loads the transformer model on first call and caches it for subsequent calls.
 * The model is downloaded (~80MB) on first use and cached in userData/models directory.
 *
 * @param text - Text to generate embedding for (combined title + body)
 * @returns Float32Array of 384 dimensions, normalized (L2 norm ≈ 1.0)
 * @throws Error if text is empty or pipeline fails
 */
export async function generateEmbedding(text: string): Promise<Float32Array> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  // Lazy load pipeline on first call
  if (!embeddingPipeline) {
    const { pipeline } = await import('@xenova/transformers');
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { cache_dir: path.join(app.getPath('userData'), 'models') }
    );
  }

  // Generate embedding with mean pooling and normalization
  const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true });

  return output.data as Float32Array;
}

/**
 * Store embedding vector in database
 *
 * Converts Float32Array to Buffer for efficient binary storage in SQLite.
 * Creates new embedding record with generated UUID.
 *
 * @param noteId - ID of the note this embedding belongs to
 * @param vector - 384-dimensional Float32Array embedding vector
 * @param db - Drizzle database instance
 * @throws Error if vector dimensions don't match expected 384
 */
export async function storeEmbedding(
  noteId: string,
  vector: Float32Array,
  db: BetterSQLite3Database<typeof schema>
): Promise<void> {
  // Validate vector dimensions (T-05-11: mitigate dimension mismatch)
  if (vector.length !== 384) {
    throw new Error(`Invalid vector dimensions: expected 384, got ${vector.length}`);
  }

  // Convert Float32Array to Buffer for SQLite blob storage
  const vectorBuffer = Buffer.from(vector.buffer);

  const now = new Date();

  await db.insert(embeddings).values({
    id: crypto.randomUUID(),
    note_id: noteId,
    vector: vectorBuffer,
    model: 'all-MiniLM-L6-v2',
    dimensions: 384,
    created_at: now,
    updated_at: now,
  });
}

/**
 * Retrieve embedding vector by note ID
 *
 * Converts Buffer back to Float32Array for use in similarity calculations.
 *
 * @param noteId - ID of the note to retrieve embedding for
 * @param db - Drizzle database instance
 * @returns Float32Array of 384 dimensions, or null if not found
 */
export async function getEmbedding(
  noteId: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<Float32Array | null> {
  const result = await db
    .select()
    .from(embeddings)
    .where(eq(embeddings.note_id, noteId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const embedding = result[0];

  // Convert Buffer back to Float32Array
  const buffer = embedding.vector as Buffer;
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}

/**
 * Update existing embedding vector
 *
 * Updates the vector blob and updated_at timestamp for an existing embedding.
 *
 * @param noteId - ID of the note to update embedding for
 * @param vector - New 384-dimensional Float32Array embedding vector
 * @param db - Drizzle database instance
 * @throws Error if embedding not found or vector dimensions invalid
 */
export async function updateEmbedding(
  noteId: string,
  vector: Float32Array,
  db: BetterSQLite3Database<typeof schema>
): Promise<void> {
  // Validate vector dimensions
  if (vector.length !== 384) {
    throw new Error(`Invalid vector dimensions: expected 384, got ${vector.length}`);
  }

  // Convert Float32Array to Buffer
  const vectorBuffer = Buffer.from(vector.buffer);

  const result = await db
    .update(embeddings)
    .set({
      vector: vectorBuffer,
      updated_at: new Date(),
    })
    .where(eq(embeddings.note_id, noteId))
    .returning();

  if (result.length === 0) {
    throw new Error(`Embedding not found for note_id: ${noteId}`);
  }
}

/**
 * Delete embedding by note ID
 *
 * Removes embedding record from database. Note: CASCADE delete handles this
 * automatically when note is deleted, but this function allows explicit deletion.
 *
 * @param noteId - ID of the note to delete embedding for
 * @param db - Drizzle database instance
 */
export async function deleteEmbedding(
  noteId: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<void> {
  await db
    .delete(embeddings)
    .where(eq(embeddings.note_id, noteId));
}
