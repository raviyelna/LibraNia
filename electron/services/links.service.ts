import { eq, isNull, desc, asc, sql } from 'drizzle-orm';
import { notes, links } from '../database/schema';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';

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
 * Deletes existing links and creates new ones based on current body content
 * @param noteId Source note ID
 * @param body Note body text containing wiki-links
 * @param db Drizzle ORM instance
 */
export async function updateNoteLinks(
  noteId: string,
  body: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<void> {
  // Delete existing links from this note
  await db.delete(links).where(eq(links.source_note_id, noteId));

  // Parse wiki-links from body
  const wikiLinks = parseWikiLinks(body);

  // For each wiki-link, find target note by title (case-insensitive)
  for (const link of wikiLinks) {
    const [targetNote] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(sql`lower(${notes.title}) = lower(${link.title})`)
      .limit(1);

    // If target note found, create link record
    if (targetNote) {
      await db.insert(links).values({
        id: crypto.randomUUID(),
        source_note_id: noteId,
        target_note_id: targetNote.id,
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
