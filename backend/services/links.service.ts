import { eq, isNull, desc, asc, sql, and } from 'drizzle-orm';
import { notes, links } from '../database/schema.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema.js';

export interface WikiLink {
  raw: string;        // "[[Note Title|Alias]]"
  title: string;      // "Note Title"
  alias?: string;     // "Alias" (optional)
  startIndex: number;
  endIndex: number;
}

export interface Backlink {
  id: string;
  title: string;
  linkCount: number;
}

export interface RelatedNote {
  id: string;
  title: string;
  relationship: 'linked' | 'semantic' | 'missing';
  similarity?: number;
}

interface ActiveNoteLinkSource {
  id: string;
  title: string;
  body: string;
}

/**
 * Parse wiki-style links from text
 * Extracts [[title]] and [[title|alias]] patterns
 * @param text Text to parse
 * @returns Array of WikiLink objects
 */
export function parseWikiLinks(text: string): WikiLink[] {
  // Regex pattern: [[title]] or [[title|alias]]
  // Captures: [1] = title, [2] = alias (optional)
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const wikiLinks: WikiLink[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    wikiLinks.push({
      raw: match[0],
      title: match[1].trim(),
      alias: match[2]?.trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return wikiLinks;
}

/**
 * Update links table for a note based on wiki-links in its body
 * Deletes existing manual links and creates new ones based on current body content
 * @param noteId Source note ID
 * @param body Note body text containing wiki-links
 * @param db Drizzle ORM instance
 */
export async function updateNoteLinks(
  noteId: string,
  body: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<void> {
  // Delete existing manual links from this note (preserve semantic links)
  await db
    .delete(links)
    .where(and(eq(links.source_note_id, noteId), eq(links.link_type, 'manual')));

  // Parse wiki-links from body
  const wikiLinks = parseWikiLinks(body);
  console.log(`[Links] Found ${wikiLinks.length} wiki-links in note ${noteId}:`, wikiLinks.map(l => l.title));

  // For each unique wiki-link, find target note by title (case-insensitive)
  const uniqueWikiLinks = [...new Map(
    wikiLinks.map(link => [link.title.toLocaleLowerCase(), link])
  ).values()];
  for (const link of uniqueWikiLinks) {
    const [targetNote] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(sql`lower(${notes.title}) = lower(${link.title})`)
      .limit(1);

    console.log(`[Links] Wiki-link [[${link.title}]] -> target:`, targetNote ? targetNote.id : 'NOT FOUND');

    // If target note found, create link record
    if (targetNote) {
      await db.insert(links).values({
        id: crypto.randomUUID(),
        source_note_id: noteId,
        target_note_id: targetNote.id,
        link_type: 'manual',
        created_at: new Date(),
      });
    }
    // If target not found, skip (broken link - will show dimmed in UI)
  }
}

/**
 * Get all notes that link to the target note (backlinks)
 * @param noteId Target note ID
 * @param db Drizzle ORM instance
 * @returns Array of backlink notes with link counts, ordered by count DESC then title ASC
 */
export async function getBacklinks(
  noteId: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<Backlink[]> {
  const backlinks = await db
    .select({
      id: notes.id,
      title: notes.title,
      linkCount: sql<number>`count(${links.id})`.as('linkCount'),
    })
    .from(links)
    .innerJoin(notes, eq(links.source_note_id, notes.id))
    .where(sql`${links.target_note_id} = ${noteId} AND ${notes.deleted_at} IS NULL`)
    .groupBy(notes.id, notes.title)
    .orderBy(desc(sql`count(${links.id})`), asc(notes.title));

  return backlinks.map((row) => ({
    id: row.id,
    title: row.title,
    linkCount: Number(row.linkCount),
  }));
}

/**
 * Get notes connected in either direction. Manual wiki-links and backlinks are
 * presented as linked notes; semantic links include their similarity score.
 */
export async function getRelatedNotes(
  noteId: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<RelatedNote[]> {
  const rows = await db
    .select({
      sourceId: links.source_note_id,
      targetId: links.target_note_id,
      linkType: links.link_type,
      similarity: links.similarity_score,
    })
    .from(links)
    .where(sql`${links.source_note_id} = ${noteId} OR ${links.target_note_id} = ${noteId}`);
  const relatedById = new Map<string, RelatedNote>();
  const addRelated = (candidate: RelatedNote) => {
    const existing = relatedById.get(candidate.id);
    if (!existing || (existing.relationship !== 'linked' && candidate.relationship === 'linked')) {
      relatedById.set(candidate.id, candidate);
    }
  };

  for (const row of rows) {
    const relatedId = row.sourceId === noteId ? row.targetId : row.sourceId;
    const [related] = await db
      .select({ id: notes.id, title: notes.title })
      .from(notes)
      .where(and(eq(notes.id, relatedId), isNull(notes.deleted_at)))
      .limit(1);
    if (!related) continue;

    const candidate: RelatedNote = row.linkType === 'semantic'
      ? { ...related, relationship: 'semantic', similarity: row.similarity || 0 }
      : { ...related, relationship: 'linked' };
    addRelated(candidate);
  }

  // Some notes are imported or created outside the normal note service. Resolve
  // their live wiki-links too so Graph and the reader rail report the same links.
  const activeNotes: ActiveNoteLinkSource[] = await db
    .select({ id: notes.id, title: notes.title, body: notes.body })
    .from(notes)
    .where(isNull(notes.deleted_at));
  const currentNote = activeNotes.find(note => note.id === noteId);

  if (currentNote) {
    const notesByTitle = new Map<string, ActiveNoteLinkSource>();
    for (const note of activeNotes) {
      notesByTitle.set(note.title.toLocaleLowerCase(), note);
    }

    for (const wikiLink of parseWikiLinks(currentNote.body)) {
      const related = notesByTitle.get(wikiLink.title.toLocaleLowerCase());
      if (related && related.id !== noteId) {
        addRelated({ id: related.id, title: related.title, relationship: 'linked' });
      } else if (!related) {
        addRelated({
          id: `missing:${wikiLink.title.toLocaleLowerCase()}`,
          title: wikiLink.title,
          relationship: 'missing',
        });
      }
    }

    for (const candidate of activeNotes) {
      if (candidate.id === noteId) continue;
      const linksToCurrent = parseWikiLinks(candidate.body)
        .some(link => link.title.toLocaleLowerCase() === currentNote.title.toLocaleLowerCase());
      if (linksToCurrent) {
        addRelated({ id: candidate.id, title: candidate.title, relationship: 'linked' });
      }
    }
  }

  return [...relatedById.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Create semantic links from source note to similar notes per D-11 (automatic, silent)
 * @param sourceNoteId Source note ID
 * @param similarNotes Array of similar notes with similarity scores
 * @param db Drizzle ORM instance
 */
export async function createSemanticLinks(
  sourceNoteId: string,
  similarNotes: Array<{ id: string; similarity: number }>,
  db: BetterSQLite3Database<typeof schema>
): Promise<void> {
  if (similarNotes.length === 0) {
    return; // No similar notes to link
  }

  // Batch insert semantic links
  const linkValues = similarNotes.map((note) => ({
    id: crypto.randomUUID(),
    source_note_id: sourceNoteId,
    target_note_id: note.id,
    link_type: 'semantic',
    similarity_score: note.similarity,
    created_at: new Date(),
  }));

  await db.insert(links).values(linkValues);
}

/**
 * Get semantic links for note, ordered by similarity DESC
 * @param noteId Note ID
 * @param db Drizzle ORM instance
 * @returns Array of semantic links with id, title, and similarity
 */
export async function getSemanticLinks(
  noteId: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<Array<{ id: string; title: string; similarity: number }>> {
  const semanticLinks = await db
    .select({
      id: notes.id,
      title: notes.title,
      similarity: links.similarity_score,
    })
    .from(links)
    .innerJoin(notes, eq(links.target_note_id, notes.id))
    .where(
      and(
        eq(links.source_note_id, noteId),
        eq(links.link_type, 'semantic'),
        isNull(notes.deleted_at)
      )
    )
    .orderBy(desc(links.similarity_score));

  return semanticLinks.map((row) => ({
    id: row.id,
    title: row.title,
    similarity: row.similarity || 0,
  }));
}

/**
 * Delete all semantic links for note (used before rediscovery per D-10)
 * @param noteId Note ID
 * @param db Drizzle ORM instance
 */
export async function deleteSemanticLinks(
  noteId: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<void> {
  await db
    .delete(links)
    .where(and(eq(links.source_note_id, noteId), eq(links.link_type, 'semantic')));
}
