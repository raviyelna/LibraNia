import { app } from 'electron';
import path from 'path';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { embeddings } from '../database/schema.js';
let embeddingPipeline = null;
export async function generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
    }
    if (!embeddingPipeline) {
        const { pipeline } = await import('@xenova/transformers');
        embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { cache_dir: path.join(app.getPath('userData'), 'models') });
    }
    const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
    return output.data;
}
export async function storeEmbedding(noteId, vector, db) {
    if (vector.length !== 384) {
        throw new Error(`Invalid vector dimensions: expected 384, got ${vector.length}`);
    }
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
export async function getEmbedding(noteId, db) {
    const result = await db
        .select()
        .from(embeddings)
        .where(eq(embeddings.note_id, noteId))
        .limit(1);
    if (result.length === 0) {
        return null;
    }
    const embedding = result[0];
    const buffer = embedding.vector;
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}
export async function updateEmbedding(noteId, vector, db) {
    if (vector.length !== 384) {
        throw new Error(`Invalid vector dimensions: expected 384, got ${vector.length}`);
    }
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
export async function deleteEmbedding(noteId, db) {
    await db
        .delete(embeddings)
        .where(eq(embeddings.note_id, noteId));
}
