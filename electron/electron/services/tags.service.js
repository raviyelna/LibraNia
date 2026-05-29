import { eq, asc, and, isNull, desc } from 'drizzle-orm';
import { getORM } from '../database/connection.js';
import { tags, noteTags, notes } from '../database/schema.js';
import { randomUUID } from 'crypto';
export async function createTag(name) {
    const orm = getORM();
    const existing = await orm
        .select()
        .from(tags)
        .where(eq(tags.name, name))
        .limit(1);
    if (existing.length > 0) {
        return existing[0];
    }
    const newTag = await orm
        .insert(tags)
        .values({
        id: randomUUID(),
        name,
        created_at: new Date(),
    })
        .returning();
    return newTag[0];
}
export async function getAllTags() {
    const orm = getORM();
    const allTags = await orm
        .select()
        .from(tags)
        .orderBy(asc(tags.name));
    return allTags;
}
export async function getTagById(id) {
    const orm = getORM();
    const result = await orm
        .select()
        .from(tags)
        .where(eq(tags.id, id))
        .limit(1);
    return result.length > 0 ? result[0] : null;
}
export async function deleteTag(id) {
    const orm = getORM();
    const existing = await getTagById(id);
    if (!existing) {
        return false;
    }
    await orm.delete(tags).where(eq(tags.id, id));
    return true;
}
export async function renameTag(id, newName) {
    const orm = getORM();
    const existing = await getTagById(id);
    if (!existing) {
        return null;
    }
    const updated = await orm
        .update(tags)
        .set({ name: newName })
        .where(eq(tags.id, id))
        .returning();
    return updated.length > 0 ? updated[0] : null;
}
export async function addTagsToNote(noteId, tagNames) {
    const orm = getORM();
    const tagIds = [];
    for (const name of tagNames) {
        const tag = await createTag(name);
        tagIds.push(tag.id);
    }
    for (const tagId of tagIds) {
        try {
            await orm.insert(noteTags).values({ note_id: noteId, tag_id: tagId });
        }
        catch (error) {
            if (!error.message.includes('UNIQUE constraint')) {
                throw error;
            }
        }
    }
    return tagIds;
}
export async function removeTagFromNote(noteId, tagId) {
    const orm = getORM();
    await orm
        .delete(noteTags)
        .where(and(eq(noteTags.note_id, noteId), eq(noteTags.tag_id, tagId)));
}
export async function getNoteTags(noteId) {
    const orm = getORM();
    const results = await orm
        .select({ tag: tags })
        .from(noteTags)
        .innerJoin(tags, eq(noteTags.tag_id, tags.id))
        .where(eq(noteTags.note_id, noteId))
        .orderBy(asc(tags.name));
    return results.map((r) => r.tag);
}
export async function getNotesByTag(tagId) {
    const orm = getORM();
    const results = await orm
        .select({ note: notes })
        .from(noteTags)
        .innerJoin(notes, eq(noteTags.note_id, notes.id))
        .where(and(eq(noteTags.tag_id, tagId), isNull(notes.deleted_at)))
        .orderBy(desc(notes.updated_at));
    return results.map((r) => r.note);
}
export async function setNoteTags(noteId, tagNames) {
    const orm = getORM();
    console.log('[TagsService] setNoteTags called:', { noteId, tagNames, count: tagNames.length });
    await orm.delete(noteTags).where(eq(noteTags.note_id, noteId));
    console.log('[TagsService] Deleted existing tags for note:', noteId);
    if (tagNames.length > 0) {
        await addTagsToNote(noteId, tagNames);
        console.log('[TagsService] Added new tags:', tagNames);
    }
    else {
        console.log('[TagsService] No tags to add (empty array)');
    }
}
