import matter from 'gray-matter';
import { promises as fs } from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';
import { notes, links } from '../database/schema';
import { getNoteById } from './notes.service';
import { getNoteTags } from './tags.service';
import { parseWikiLinks } from './links.service';
export async function exportNotesToMarkdown(noteIds, outputDir, db) {
    let exportedCount = 0;
    for (const noteId of noteIds) {
        const note = await getNoteById(noteId, db, false);
        if (!note)
            continue;
        const tags = await getNoteTags(noteId);
        const convertedBody = await convertWikiLinksToMarkdown(note.body, db);
        const frontmatter = {
            id: note.id,
            title: note.title,
            tags: tags.map((t) => t.name),
            created: note.created_at.toISOString(),
            updated: note.updated_at.toISOString(),
        };
        const markdown = matter.stringify(convertedBody, frontmatter);
        const filename = `${note.id}.md`;
        const filepath = path.join(outputDir, filename);
        await fs.writeFile(filepath, markdown, 'utf-8');
        exportedCount++;
    }
    return exportedCount;
}
async function convertWikiLinksToMarkdown(body, db) {
    const wikiLinks = parseWikiLinks(body);
    let converted = body;
    for (let i = wikiLinks.length - 1; i >= 0; i--) {
        const link = wikiLinks[i];
        const [targetNote] = await db
            .select({ id: notes.id })
            .from(notes)
            .where(sql `lower(${notes.title}) = lower(${link.title})`)
            .limit(1);
        if (targetNote) {
            const displayText = link.alias || link.title;
            const markdownLink = `[${displayText}](${targetNote.id}.md)`;
            converted =
                converted.slice(0, link.startIndex) +
                    markdownLink +
                    converted.slice(link.endIndex);
        }
        else {
            const plainText = link.alias || link.title;
            converted =
                converted.slice(0, link.startIndex) +
                    plainText +
                    converted.slice(link.endIndex);
        }
    }
    return converted;
}
export async function exportNotesToJSON(noteIds, outputPath, db) {
    const exportData = [];
    for (const noteId of noteIds) {
        const note = await getNoteById(noteId, db, false);
        if (!note)
            continue;
        const tags = await getNoteTags(noteId);
        const outgoingLinks = await db
            .select({ targetId: links.target_note_id })
            .from(links)
            .where(sql `${links.source_note_id} = ${noteId}`);
        const backlinks = await db
            .select({ sourceId: links.source_note_id })
            .from(links)
            .where(sql `${links.target_note_id} = ${noteId}`);
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
