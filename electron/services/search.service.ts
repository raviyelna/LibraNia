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
