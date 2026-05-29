import matter from 'gray-matter';
import { promises as fs } from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';
import { notes, links } from '../database/schema.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema.js';
import { getNoteById } from './notes.service.js';
import { getNoteTags } from './tags.service.js';
import { parseWikiLinks, type WikiLink } from './links.service.js';

/**
 * Export notes to markdown files with YAML frontmatter
 * @param noteIds Array of note IDs to export
 * @param outputDir Directory to write markdown files
 * @param db Drizzle ORM instance
 * @returns Count of exported files
 */
export async function exportNotesToMarkdown(
  noteIds: string[],
  outputDir: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<number> {
  let exportedCount = 0;

  for (const noteId of noteIds) {
    const note = await getNoteById(noteId, db, false);
    if (!note) continue;

    // Get tags for note
    const tags = await getNoteTags(noteId);

    // Convert wiki-links to standard markdown
    const convertedBody = await convertWikiLinksToMarkdown(note.body, db);

    // Create YAML frontmatter
    const frontmatter = {
      id: note.id,
      title: note.title,
      tags: tags.map((t) => t.name),
      created: note.created_at.toISOString(),
      updated: note.updated_at.toISOString(),
    };

    // Generate markdown with frontmatter
    const markdown = matter.stringify(convertedBody, frontmatter);

    // Write to file
    const filename = `${note.id}.md`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, markdown, 'utf-8');

    exportedCount++;
  }

  return exportedCount;
}

/**
 * Convert wiki-links in body to standard markdown links
 * @param body Note body text
 * @param db Drizzle ORM instance
 * @returns Body with wiki-links converted to markdown links
 */
async function convertWikiLinksToMarkdown(
  body: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<string> {
  const wikiLinks = parseWikiLinks(body);
  let converted = body;

  // Process in reverse order to preserve indices
  for (let i = wikiLinks.length - 1; i >= 0; i--) {
    const link = wikiLinks[i];

    // Find target note by title (case-insensitive)
    const [targetNote] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(sql`lower(${notes.title}) = lower(${link.title})`)
      .limit(1);

    if (targetNote) {
      // Convert to standard markdown link
      const displayText = link.alias || link.title;
      const markdownLink = `[${displayText}](${targetNote.id}.md)`;
      converted =
        converted.slice(0, link.startIndex) +
        markdownLink +
        converted.slice(link.endIndex);
    } else {
      // Broken link - preserve as plain text
      const plainText = link.alias || link.title;
      converted =
        converted.slice(0, link.startIndex) +
        plainText +
        converted.slice(link.endIndex);
    }
  }

  return converted;
}

/**
 * Export notes to JSON file with all fields and relationships
 * @param noteIds Array of note IDs to export
 * @param outputPath File path to write JSON
 * @param db Drizzle ORM instance
 * @returns True if export successful
 */
export async function exportNotesToJSON(
  noteIds: string[],
  outputPath: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<boolean> {
  const exportData: any[] = [];

  for (const noteId of noteIds) {
    const note = await getNoteById(noteId, db, false);
    if (!note) continue;

    // Get tags
    const tags = await getNoteTags(noteId);

    // Get outgoing links (notes this note links to)
    const outgoingLinks = await db
      .select({ targetId: links.target_note_id })
      .from(links)
      .where(sql`${links.source_note_id} = ${noteId}`);

    // Get backlinks (notes that link to this note)
    const backlinks = await db
      .select({ sourceId: links.source_note_id })
      .from(links)
      .where(sql`${links.target_note_id} = ${noteId}`);

    exportData.push({
      id: note.id,
      title: note.title,
      body: note.body,
      tags: tags.map((t) => t.name),
      created_at: note.created_at.getTime(),
      updated_at: note.updated_at.getTime(),
      metadata: note.metadata ? JSON.parse(note.metadata) : {},
      links: outgoingLinks.map((l) => l.targetId).filter(Boolean),
      backlinks: backlinks.map((l) => l.sourceId).filter(Boolean),
    });
  }

  const json = JSON.stringify({ notes: exportData }, null, 2);
  await fs.writeFile(outputPath, json, 'utf-8');

  return true;
}
