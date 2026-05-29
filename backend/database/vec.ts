import type Database from 'better-sqlite3';
import path from 'path';

/**
 * Result interface for similar notes query
 */
export interface SimilarNote {
  id: string;
  title: string;
  similarity: number;
}

/**
 * Load sqlite-vec extension for vector similarity search
 *
 * Determines platform-specific extension path and loads the binary.
 * Verifies successful loading by calling vec_version().
 *
 * @param db - better-sqlite3 Database instance
 * @throws Error if extension fails to load or is not available for platform
 */
export function setupVectorExtension(db: Database.Database): void {
  // Determine platform-specific extension path
  let extensionPath: string;

  switch (process.platform) {
    case 'win32':
      extensionPath = path.join(__dirname, '../extensions/vec0.dll');
      break;
    case 'linux':
      extensionPath = path.join(__dirname, '../extensions/vec0.so');
      break;
    case 'darwin':
      extensionPath = path.join(__dirname, '../extensions/vec0.dylib');
      break;
    default:
      const platform = process.platform;
      const nodeVersion = process.version;

      const errorMessage = `
Failed to load sqlite-vec extension

Platform: ${platform}
Node.js: ${nodeVersion}
Reason: Platform '${platform}' is not supported

Supported platforms: win32 (Windows), linux (Linux), darwin (macOS)

See: https://github.com/asg017/sqlite-vec#installation
      `.trim();

      throw new Error(errorMessage);
  }

  try {
    // Load the extension
    db.loadExtension(extensionPath);

    // Verify extension loaded successfully
    const result = db.prepare('SELECT vec_version() as version').get() as any;
    if (!result || !result.version) {
      throw new Error('sqlite-vec extension loaded but vec_version() not available');
    }
  } catch (error) {
    const platform = process.platform;
    const nodeVersion = process.version;

    // Build platform-specific guidance
    let platformGuidance = '';
    if (platform === 'win32') {
      platformGuidance = 'Ensure vec0.dll is present in electron/extensions/';
    } else if (platform === 'linux') {
      platformGuidance = 'Ensure vec0.so is present in electron/extensions/';
    } else if (platform === 'darwin') {
      platformGuidance = 'Ensure vec0.dylib is present in electron/extensions/';
    } else {
      platformGuidance = `Platform '${platform}' is not supported. Supported platforms: win32, linux, darwin`;
    }

    const errorMessage = `
Failed to load sqlite-vec extension

Platform: ${platform}
Node.js: ${nodeVersion}
Extension path: ${extensionPath}
${platformGuidance}

Original error: ${error instanceof Error ? error.message : String(error)}

If the extension file exists but fails to load, you may be missing build tools.
See: https://github.com/asg017/sqlite-vec#installation
    `.trim();

    throw new Error(errorMessage);
  }
}

/**
 * Find notes similar to query vector using cosine similarity
 *
 * Queries embeddings table using sqlite-vec's vec_distance_cosine function.
 * Filters by similarity threshold, excludes query note and soft-deleted notes.
 * Returns top N results ordered by similarity descending.
 *
 * @param db - better-sqlite3 Database instance
 * @param noteId - ID of the query note (excluded from results)
 * @param queryVector - 384-dimensional Float32Array embedding vector
 * @param threshold - Minimum cosine similarity (0.0-1.0), typically 0.7+ per D-09
 * @param limit - Maximum number of results to return
 * @returns Array of similar notes with id, title, and similarity score
 */
export function findSimilarNotes(
  db: Database.Database,
  noteId: string,
  queryVector: Float32Array,
  threshold: number,
  limit: number
): SimilarNote[] {
  // Convert Float32Array to Buffer for SQLite blob parameter
  const vectorBlob = Buffer.from(queryVector.buffer);

  // Query using vec_distance_cosine for similarity search
  // Note: vec_distance_cosine returns distance (lower = more similar)
  // We need to convert to similarity score (higher = more similar)
  // Cosine distance = 1 - cosine similarity, so similarity = 1 - distance
  const query = `
    SELECT
      n.id,
      n.title,
      (1 - vec_distance_cosine(e.vector, ?)) as similarity
    FROM embeddings e
    INNER JOIN notes n ON e.note_id = n.id
    WHERE e.note_id != ?
      AND n.deleted_at IS NULL
      AND similarity >= ?
    ORDER BY similarity DESC
    LIMIT ?
  `;

  const results = db.prepare(query).all(vectorBlob, noteId, threshold, limit) as SimilarNote[];

  return results;
}
