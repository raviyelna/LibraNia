import { generateEmbedding } from './embeddings.service';
import { findSimilarNotes } from '../database/vec';
export function quickNavSearch(db, query, limit = 50) {
    const escapedQuery = query.replace(/['"*]/g, '');
    if (!escapedQuery.trim()) {
        return [];
    }
    const results = db
        .prepare(`
    SELECT
      n.id,
      n.title,
      n.updated_at,
      fts.rank
    FROM notes_fts fts
    INNER JOIN notes n ON fts.rowid = n.rowid
    WHERE notes_fts MATCH ?
      AND n.deleted_at IS NULL
    ORDER BY fts.rank
    LIMIT ?
  `)
        .all(`title:${escapedQuery}*`, limit);
    return results;
}
export function fullTextSearch(db, query, limit = 50) {
    const escapedQuery = query.replace(/['"*]/g, '');
    if (!escapedQuery.trim()) {
        return [];
    }
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const results = db
        .prepare(`
    SELECT
      n.id,
      n.title,
      snippet(notes_fts, 1, '<mark>', '</mark>', '...', 32) as snippet,
      n.updated_at,
      notes_fts.rank * (CASE WHEN n.updated_at > ? THEN 0.67 ELSE 1.0 END) as score
    FROM notes_fts
    INNER JOIN notes n ON notes_fts.rowid = n.rowid
    WHERE notes_fts MATCH ?
      AND n.deleted_at IS NULL
    ORDER BY score DESC
    LIMIT ?
  `)
        .all(sevenDaysAgo, escapedQuery, limit);
    return results;
}
export function fuzzySearch(db, query, limit = 20) {
    const escapedQuery = query.replace(/['"*]/g, '');
    if (!escapedQuery.trim()) {
        return [];
    }
    const results = db
        .prepare(`
    SELECT
      n.id,
      n.title,
      n.updated_at,
      notes_fts_trigram.rank
    FROM notes_fts_trigram
    INNER JOIN notes n ON notes_fts_trigram.rowid = n.rowid
    WHERE notes_fts_trigram MATCH ?
      AND n.deleted_at IS NULL
    ORDER BY notes_fts_trigram.rank
    LIMIT ?
  `)
        .all(escapedQuery, limit);
    return results;
}
export async function semanticSearch(db, query, limit = 20) {
    if (!query.trim()) {
        return [];
    }
    const queryEmbedding = await generateEmbedding(query);
    const similarNotes = findSimilarNotes(db, '', queryEmbedding, 0.7, limit);
    const results = similarNotes.map((note) => {
        const noteData = db
            .prepare('SELECT updated_at FROM notes WHERE id = ?')
            .get(note.id);
        return {
            id: note.id,
            title: note.title,
            updated_at: noteData?.updated_at || 0,
            similarity: note.similarity,
        };
    });
    return results;
}
