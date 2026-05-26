import { eq, isNull, isNotNull, desc, and } from 'drizzle-orm';
import { notes } from '../database/schema';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';
import { updateNoteLinks, createSemanticLinks, deleteSemanticLinks } from './links.service';
import { generateEmbedding, storeEmbedding, updateEmbedding, getEmbedding } from './embeddings.service';
import { findSimilarNotes } from '../database/vec';
import { getDatabase } from '../database/connection';

export interface CreateNoteInput {
  title: string;
  body: string;
  metadata?: string;
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  metadata?: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  metadata: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Create a new note
 * @param data Note data (title, body, optional metadata)
 * @param db Drizzle ORM instance
 * @returns Created note with id and timestamps
 */
export async function createNote(
  data: CreateNoteInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Note> {
  const now = new Date();
  const id = crypto.randomUUID();

  const [note] = await db
    .insert(notes)
    .values({
      id,
      title: data.title,
      body: data.body,
      metadata: data.metadata || null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })
    .returning();

  // Update links table based on wiki-links in body
  await updateNoteLinks(note.id, note.body, db);

  // Generate embedding and discover semantic links per D-01, D-10
  // DISABLED: embeddings table not created until sqlite-vec available
  /*
  const text = `${note.title} ${note.body}`.trim(); // Combined per D-03

  // Only generate embedding if text is non-empty
  if (text.length > 0) {
    const embedding = await generateEmbedding(text);
    await storeEmbedding(note.id, embedding, db);

    // Discover semantic links (top 5, threshold 0.7 per D-09, D-12)
    // Gracefully degrade if sqlite-vec extension unavailable
    try {
      const rawDb = getDatabase();
      const similar = findSimilarNotes(rawDb, note.id, embedding, 0.7, 5);
      await createSemanticLinks(note.id, similar, db);
    } catch (error) {
      console.warn('[Notes] Semantic link discovery skipped (sqlite-vec unavailable):', error);
    }
  }
  */

  return note as Note;
}

/**
 * Update an existing note
 * @param id Note ID
 * @param data Partial note data to update
 * @param db Drizzle ORM instance
 * @returns Updated note
 * @throws Error if note not found or is deleted
 */
export async function updateNote(
  id: string,
  data: UpdateNoteInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Note> {
  const now = new Date();

  // Check if note exists and is not deleted
  const existing = await getNoteById(id, db, false);
  if (!existing) {
    throw new Error(`Note with id ${id} not found or is deleted`);
  }

  const [updated] = await db
    .update(notes)
    .set({
      ...data,
      updated_at: now,
    })
    .where(and(eq(notes.id, id), isNull(notes.deleted_at)))
    .returning();

  if (!updated) {
    throw new Error(`Failed to update note with id ${id}`);
  }

  // Update links table if body was changed
  if (data.body !== undefined) {
    await updateNoteLinks(updated.id, updated.body, db);
  }

  // Regenerate embedding if title or body changed per D-01
  // DISABLED: embeddings table not created until sqlite-vec available
  /*
  if (data.title !== undefined || data.body !== undefined) {
    const text = `${updated.title} ${updated.body}`.trim();

    // Only generate embedding if text is non-empty
    if (text.length > 0) {
      const embedding = await generateEmbedding(text);

      // Update or create embedding
      const existing = await getEmbedding(updated.id, db);
      if (existing) {
        await updateEmbedding(updated.id, embedding, db);
      } else {
        await storeEmbedding(updated.id, embedding, db);
      }

      // Rediscover semantic links per D-10
      // Gracefully degrade if sqlite-vec extension unavailable
      try {
        await deleteSemanticLinks(updated.id, db); // Remove old semantic links
        const rawDb = getDatabase();
        const similar = findSimilarNotes(rawDb, updated.id, embedding, 0.7, 5);
        await createSemanticLinks(updated.id, similar, db);
      } catch (error) {
        console.warn('[Notes] Semantic link discovery skipped (sqlite-vec unavailable):', error);
      }
    }
  }
  */

  return updated as Note;
}

/**
 * Delete a note (soft or hard delete)
 * @param id Note ID
 * @param hard If true, permanently delete. If false, soft delete (set deleted_at)
 * @param db Drizzle ORM instance
 * @returns True if deleted successfully
 */
export async function deleteNote(
  id: string,
  hard: boolean,
  db: BetterSQLite3Database<typeof schema>
): Promise<boolean> {
  if (hard) {
    // Hard delete: remove row permanently
    const result = await db.delete(notes).where(eq(notes.id, id));
    return result.changes > 0;
  } else {
    // Soft delete: set deleted_at timestamp
    const now = new Date();
    const [deleted] = await db
      .update(notes)
      .set({ deleted_at: now })
      .where(eq(notes.id, id))
      .returning();

    return !!deleted;
  }
}

/**
 * Restore a soft-deleted note
 * @param id Note ID
 * @param db Drizzle ORM instance
 * @returns Restored note
 * @throws Error if note not found
 */
export async function restoreNote(
  id: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<Note> {
  const [restored] = await db
    .update(notes)
    .set({ deleted_at: null })
    .where(eq(notes.id, id))
    .returning();

  if (!restored) {
    throw new Error(`Note with id ${id} not found`);
  }

  return restored as Note;
}

/**
 * Get a note by ID
 * @param id Note ID
 * @param db Drizzle ORM instance
 * @param includeDeleted If true, include soft-deleted notes
 * @returns Note or null if not found
 */
export async function getNoteById(
  id: string,
  db: BetterSQLite3Database<typeof schema>,
  includeDeleted: boolean = false
): Promise<Note | null> {
  const conditions = includeDeleted
    ? eq(notes.id, id)
    : and(eq(notes.id, id), isNull(notes.deleted_at));

  const [note] = await db
    .select()
    .from(notes)
    .where(conditions)
    .limit(1);

  return note ? (note as Note) : null;
}

/**
 * Get all notes (excluding soft-deleted)
 * @param db Drizzle ORM instance
 * @returns Array of notes ordered by updated_at DESC
 */
export async function getAllNotes(
  db: BetterSQLite3Database<typeof schema>
): Promise<Note[]> {
  const allNotes = await db
    .select()
    .from(notes)
    .where(isNull(notes.deleted_at))
    .orderBy(desc(notes.updated_at));

  return allNotes as Note[];
}

/**
 * Get all soft-deleted notes (trash view)
 * @param db Drizzle ORM instance
 * @returns Array of deleted notes ordered by deleted_at DESC
 */
export async function getDeletedNotes(
  db: BetterSQLite3Database<typeof schema>
): Promise<Note[]> {
  const deletedNotes = await db
    .select()
    .from(notes)
    .where(isNotNull(notes.deleted_at))
    .orderBy(desc(notes.deleted_at));

  return deletedNotes as Note[];
}
