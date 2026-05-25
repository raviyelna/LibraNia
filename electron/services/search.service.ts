import type Database from 'better-sqlite3';

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
