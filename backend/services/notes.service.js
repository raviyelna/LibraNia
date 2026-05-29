import { eq, isNull, isNotNull, desc, and } from 'drizzle-orm';
import { notes } from '../database/schema.js';
import { updateNoteLinks } from './links.service.js';
import { getDatabase } from '../database/connection.js';
export async function createNote(data, db) {
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
    await updateNoteLinks(note.id, note.body, db);
    return note;
}
export async function updateNote(id, data, db) {
    console.log('[Notes] updateNote called for id:', id);
    const now = new Date();
    console.log('[Notes] About to call getNoteById');
    const existing = await getNoteById(id, db, false);
    console.log('[Notes] getNoteById returned:', existing ? 'found' : 'not found');
    if (!existing) {
        throw new Error(`Note with id ${id} not found or is deleted`);
    }
    console.log('[Notes] About to run update query for note:', id);
    const rawDb = getDatabase();
    const stmt = rawDb.prepare('UPDATE notes SET title = ?, body = ?, metadata = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL');
    stmt.run(data.title ?? existing.title, data.body ?? existing.body, data.metadata ?? existing.metadata, now.getTime(), id);
    console.log('[Notes] Update completed, fetching updated note');
    const updated = await getNoteById(id, db, false);
    if (!updated) {
        throw new Error(`Failed to update note with id ${id}`);
    }
    if (data.body !== undefined) {
        await updateNoteLinks(updated.id, updated.body, db);
    }
    return updated;
}
export async function deleteNote(id, hard, db) {
    if (hard) {
        const result = await db.delete(notes).where(eq(notes.id, id));
        return result.changes > 0;
    }
    else {
        const now = new Date();
        const [deleted] = await db
            .update(notes)
            .set({ deleted_at: now })
            .where(eq(notes.id, id))
            .returning();
        return !!deleted;
    }
}
export async function restoreNote(id, db) {
    const [restored] = await db
        .update(notes)
        .set({ deleted_at: null })
        .where(eq(notes.id, id))
        .returning();
    if (!restored) {
        throw new Error(`Note with id ${id} not found`);
    }
    return restored;
}
export async function getNoteById(id, db, includeDeleted = false) {
    const conditions = includeDeleted
        ? eq(notes.id, id)
        : and(eq(notes.id, id), isNull(notes.deleted_at));
    const [note] = await db
        .select()
        .from(notes)
        .where(conditions)
        .limit(1);
    return note ? note : null;
}
export async function getAllNotes(db) {
    const allNotes = await db
        .select()
        .from(notes)
        .where(isNull(notes.deleted_at))
        .orderBy(desc(notes.updated_at));
    return allNotes;
}
export async function getDeletedNotes(db) {
    const deletedNotes = await db
        .select()
        .from(notes)
        .where(isNotNull(notes.deleted_at))
        .orderBy(desc(notes.deleted_at));
    return deletedNotes;
}
