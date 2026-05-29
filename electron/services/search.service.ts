import type Database from 'better-sqlite3';
import { generateEmbedding } from './embeddings.service.js';
import { findSimilarNotes } from '../database/vec.js';

/**
 * Quick navigation search - title-only search with prefix matching
 * Used for autocomplete (Cmd+K) functionality
 *
 * @param db Database instance
 * @param query Search query
 * @param limit Maximum number of results (default: 50)
 * @returns Array of matching notes with id, title, updated_at, and rank
 */
export function quickNavSearch(
  db: Database.Database,
  query: string,
  limit = 50
): Array<{ id: string; title: string; updated_at: number; rank: number }> {
  // Escape FTS5 special characters to prevent syntax errors
  const escapedQuery = query.replace(/['"*]/g, '');

  // Return empty array if query is empty after escaping
  if (!escapedQuery.trim()) {
    return [];
  }

  // Title-only search with prefix matching (append * for prefix)
  const results = db
    .prepare(
      `
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
  `
    )
    .all(`title:${escapedQuery}*`, limit) as Array<{
    id: string;
    title: string;
    updated_at: number;
    rank: number;
  }>;

  return results;
}

/**
 * Full-text search - searches both title and body with custom ranking
 * Includes BM25 ranking with recency boost (1.5x for notes updated in last 7 days)
 *
 * @param db Database instance
 * @param query Search query
 * @param limit Maximum number of results (default: 50)
 * @returns Array of matching notes with id, title, snippet, updated_at, and score
 */
export function fullTextSearch(
  db: Database.Database,
  query: string,
  limit = 50
): Array<{
  id: string;
  title: string;
  snippet: string;
  updated_at: number;
  score: number;
}> {
  // Escape FTS5 special characters to prevent syntax errors
  const escapedQuery = query.replace(/['"*]/g, '');

  // Return empty array if query is empty after escaping
  if (!escapedQuery.trim()) {
    return [];
  }

  // 7 days ago in milliseconds
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Full-text search with recency boost
  // FTS5 rank is negative (lower = better)
  // Multiply recent notes by 0.67 (1/1.5) to make them less negative (better)
  // Multiply old notes by 1.0 (no change)
  // Order by score DESC so less negative (better) scores come first
  const results = db
    .prepare(
      `
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
  `
    )
    .all(sevenDaysAgo, escapedQuery, limit) as Array<{
    id: string;
    title: string;
    snippet: string;
    updated_at: number;
    score: number;
  }>;

  return results;
}

/**
 * Fuzzy search - typo-tolerant search using trigram tokenizer
 * Used as fallback when exact/stemmed search returns no results
 *
 * @param db Database instance
 * @param query Search query
 * @param limit Maximum number of results (default: 20, fuzzy search is slower)
 * @returns Array of matching notes with id, title, updated_at, and rank
 */
export function fuzzySearch(
  db: Database.Database,
  query: string,
  limit = 20
): Array<{ id: string; title: string; updated_at: number; rank: number }> {
  // Escape FTS5 special characters to prevent syntax errors
  const escapedQuery = query.replace(/['"*]/g, '');

  // Return empty array if query is empty after escaping
  if (!escapedQuery.trim()) {
    return [];
  }

  // Fuzzy search using trigram tokenizer
  const results = db
    .prepare(
      `
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
  `
    )
    .all(escapedQuery, limit) as Array<{
    id: string;
    title: string;
    updated_at: number;
    rank: number;
  }>;

  return results;
}

/**
 * Semantic search using embeddings and vector similarity per D-07, D-09
 * Searches by meaning rather than keywords
 *
 * @param db Database instance
 * @param query Search query
 * @param limit Maximum number of results (default: 20)
 * @returns Array of matching notes with id, title, updated_at, and similarity
 */
export async function semanticSearch(
  db: Database.Database,
  query: string,
  limit = 20
): Promise<Array<{ id: string; title: string; updated_at: number; similarity: number }>> {
  // Validate query: return empty array if query is empty
  if (!query.trim()) {
    return [];
  }

  // Generate embedding from query text
  const queryEmbedding = await generateEmbedding(query);

  // Use findSimilarNotes with threshold 0.7 per D-09
  // Pass empty string for noteId since we're not excluding any note
  const similarNotes = findSimilarNotes(db, '', queryEmbedding, 0.7, limit);

  // Map results to include updated_at from notes table
  const results = similarNotes.map((note) => {
    const noteData = db
      .prepare('SELECT updated_at FROM notes WHERE id = ?')
      .get(note.id) as { updated_at: number } | undefined;

    return {
      id: note.id,
      title: note.title,
      updated_at: noteData?.updated_at || 0,
      similarity: note.similarity,
    };
  });

  return results;
}
