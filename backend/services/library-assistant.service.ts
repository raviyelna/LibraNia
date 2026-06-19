import { and, eq, isNull } from 'drizzle-orm';
import { getORM } from '../database/connection.js';
import { links, notes } from '../database/schema.js';
import { getRelatedNotes } from './links.service.js';
import { getNoteById, getNoteGroupFromMetadata } from './notes.service.js';
import { getNoteTags } from './tags.service.js';

export async function buildLibraryAssistantContext(noteId: string): Promise<string> {
  const db = getORM();
  const note = await getNoteById(noteId, db);
  if (!note) throw new Error(`Note with id ${noteId} not found`);

  const [related, tags, linkedNotes] = await Promise.all([
    getRelatedNotes(noteId, db),
    getNoteTags(noteId),
    db
      .select({ id: notes.id, title: notes.title })
      .from(links)
      .innerJoin(notes, eq(links.target_note_id, notes.id))
      .where(and(eq(links.source_note_id, noteId), eq(links.link_type, 'manual'), isNull(notes.deleted_at))),
  ]);

  return `You are LibraRian Ask, a contextual reading assistant inside the user's Library.
Answer the reader's question using the current note and graph context below.
Use search_notes, get_note, get_backlinks, and web_search when more evidence is needed.
Do not call create_note or add_tags in this mode. The reader decides whether to append your answer, create a new note, or keep it as conversation only.
Write an answer that can stand alone if the reader chooses to save it.

## Current Note
Title: ${note.title}
Tags: ${tags.map(tag => tag.name).join(', ') || 'None'}
Group: ${getNoteGroupFromMetadata(note.metadata) || 'None'}

${note.body.slice(0, 20_000)}

## Linked Notes
${linkedNotes.map(link => `- ${link.title} (${link.id})`).join('\n') || '- None'}

## Related Notes
${related.map(link => `- ${link.title} (${link.relationship}${link.similarity !== undefined ? `, ${Math.round(link.similarity * 100)}% similar` : ''})`).join('\n') || '- None'}`;
}
