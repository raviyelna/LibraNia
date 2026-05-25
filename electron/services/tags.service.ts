import { eq, asc, and, isNull, desc } from 'drizzle-orm';
import { getDatabase, getORM } from '../database/connection';
import { tags, noteTags, notes } from '../database/schema';
import { randomUUID } from 'crypto';

/**
 * Tag type definition
 */
export interface Tag {
  id: string;
  name: string;
  created_at: Date;
}

/**
 * Create a new tag or return existing tag if name already exists
 * @param name Tag name (case-sensitive)
 * @returns Created or existing tag
 */
export async function createTag(name: string): Promise<Tag> {
  const orm = getORM();

  // Check if tag with this name already exists (case-sensitive)
  const existing = await orm
    .select()
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new tag
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

/**
 * Get all tags ordered by name ASC
 * @returns Array of all tags
 */
export async function getAllTags(): Promise<Tag[]> {
  const orm = getORM();

  const allTags = await orm
    .select()
    .from(tags)
    .orderBy(asc(tags.name));

  return allTags;
}

/**
 * Get tag by ID
 * @param id Tag ID
 * @returns Tag or null if not found
 */
export async function getTagById(id: string): Promise<Tag | null> {
  const orm = getORM();

  const result = await orm
    .select()
    .from(tags)
    .where(eq(tags.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Delete tag and cascade delete all note-tag associations
 * @param id Tag ID
 * @returns True if deleted, false if tag not found
 */
export async function deleteTag(id: string): Promise<boolean> {
  const orm = getORM();

  // Check if tag exists
  const existing = await getTagById(id);
  if (!existing) {
    return false;
  }

  // Delete tag (CASCADE will delete note_tags associations via foreign key)
  await orm.delete(tags).where(eq(tags.id, id));

  return true;
}

/**
 * Rename tag, preserving all associations
 * @param id Tag ID
 * @param newName New tag name
 * @returns Updated tag or null if tag not found
 */
export async function renameTag(id: string, newName: string): Promise<Tag | null> {
  const orm = getORM();

  // Check if tag exists
  const existing = await getTagById(id);
  if (!existing) {
    return null;
  }

  // Update tag name
  const updated = await orm
    .update(tags)
    .set({ name: newName })
    .where(eq(tags.id, id))
    .returning();

  return updated.length > 0 ? updated[0] : null;
}

/**
 * Add tags to a note (creates tags if they don't exist)
 * @param noteId Note ID
 * @param tagNames Array of tag names
 * @returns Array of tag IDs that were associated
 */
export async function addTagsToNote(noteId: string, tagNames: string[]): Promise<string[]> {
  const orm = getORM();
  const tagIds: string[] = [];

  // Create or get existing tags
  for (const name of tagNames) {
    const tag = await createTag(name); // Reuses existing if duplicate
    tagIds.push(tag.id);
  }

  // Create note-tag associations (ignore duplicates)
  for (const tagId of tagIds) {
    try {
      await orm.insert(noteTags).values({ note_id: noteId, tag_id: tagId });
    } catch (error: any) {
      // Ignore duplicate key errors (tag already associated)
      if (!error.message.includes('UNIQUE constraint')) {
        throw error;
      }
    }
  }

  return tagIds;
}

/**
 * Remove tag from note
 * @param noteId Note ID
 * @param tagId Tag ID
 */
export async function removeTagFromNote(noteId: string, tagId: string): Promise<void> {
  const orm = getORM();

  await orm
    .delete(noteTags)
    .where(and(eq(noteTags.note_id, noteId), eq(noteTags.tag_id, tagId)));
}

/**
 * Get all tags associated with a note
 * @param noteId Note ID
 * @returns Array of tags
 */
export async function getNoteTags(noteId: string): Promise<Tag[]> {
  const orm = getORM();

  const results = await orm
    .select({ tag: tags })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tag_id, tags.id))
    .where(eq(noteTags.note_id, noteId))
    .orderBy(asc(tags.name));

  return results.map((r) => r.tag);
}

/**
 * Get all notes with a specific tag (excludes soft-deleted notes)
 * @param tagId Tag ID
 * @returns Array of notes
 */
export async function getNotesByTag(tagId: string) {
  const orm = getORM();

  const results = await orm
    .select({ note: notes })
    .from(noteTags)
    .innerJoin(notes, eq(noteTags.note_id, notes.id))
    .where(and(eq(noteTags.tag_id, tagId), isNull(notes.deleted_at)))
    .orderBy(desc(notes.updated_at));

  return results.map((r) => r.note);
}

/**
 * Replace all tags on a note
 * @param noteId Note ID
 * @param tagNames Array of tag names
 */
export async function setNoteTags(noteId: string, tagNames: string[]): Promise<void> {
  const orm = getORM();

  // Delete existing associations
  await orm.delete(noteTags).where(eq(noteTags.note_id, noteId));

  // Add new associations
  if (tagNames.length > 0) {
    await addTagsToNote(noteId, tagNames);
  }
}
