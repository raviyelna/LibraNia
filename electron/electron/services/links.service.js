import { eq, isNull, desc, asc, sql, and } from 'drizzle-orm';
import { notes, links } from '../database/schema.js';
export function parseWikiLinks(text) {
    const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const wikiLinks = [];
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
export async function updateNoteLinks(noteId, body, db) {
    await db
        .delete(links)
        .where(and(eq(links.source_note_id, noteId), eq(links.link_type, 'manual')));
    const wikiLinks = parseWikiLinks(body);
    console.log(`[Links] Found ${wikiLinks.length} wiki-links in note ${noteId}:`, wikiLinks.map(l => l.title));
    for (const link of wikiLinks) {
        const [targetNote] = await db
            .select({ id: notes.id })
            .from(notes)
            .where(sql `lower(${notes.title}) = lower(${link.title})`)
            .limit(1);
        console.log(`[Links] Wiki-link [[${link.title}]] -> target:`, targetNote ? targetNote.id : 'NOT FOUND');
        if (targetNote) {
            await db.insert(links).values({
                id: crypto.randomUUID(),
                source_note_id: noteId,
                target_note_id: targetNote.id,
                link_type: 'manual',
                created_at: new Date(),
            });
        }
    }
}
export async function getBacklinks(noteId, db) {
    const backlinks = await db
        .select({
        id: notes.id,
        title: notes.title,
        linkCount: sql `count(${links.id})`.as('linkCount'),
    })
        .from(links)
        .innerJoin(notes, eq(links.source_note_id, notes.id))
        .where(sql `${links.target_note_id} = ${noteId} AND ${notes.deleted_at} IS NULL`)
        .groupBy(notes.id, notes.title)
        .orderBy(desc(sql `count(${links.id})`), asc(notes.title));
    return backlinks.map((row) => ({
        id: row.id,
        title: row.title,
        linkCount: Number(row.linkCount),
    }));
}
export async function createSemanticLinks(sourceNoteId, similarNotes, db) {
    if (similarNotes.length === 0) {
        return;
    }
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
export async function getSemanticLinks(noteId, db) {
    const semanticLinks = await db
        .select({
        id: notes.id,
        title: notes.title,
        similarity: links.similarity_score,
    })
        .from(links)
        .innerJoin(notes, eq(links.target_note_id, notes.id))
        .where(and(eq(links.source_note_id, noteId), eq(links.link_type, 'semantic'), isNull(notes.deleted_at)))
        .orderBy(desc(links.similarity_score));
    return semanticLinks.map((row) => ({
        id: row.id,
        title: row.title,
        similarity: row.similarity || 0,
    }));
}
export async function deleteSemanticLinks(noteId, db) {
    await db
        .delete(links)
        .where(and(eq(links.source_note_id, noteId), eq(links.link_type, 'semantic')));
}
