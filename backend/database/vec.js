import path from 'path';
export function setupVectorExtension(db) {
    let extensionPath;
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
            throw new Error(`Unsupported platform for sqlite-vec: ${process.platform}`);
    }
    try {
        db.loadExtension(extensionPath);
        const result = db.prepare('SELECT vec_version() as version').get();
        if (!result || !result.version) {
            throw new Error('sqlite-vec extension loaded but vec_version() not available');
        }
    }
    catch (error) {
        throw new Error(`Failed to load sqlite-vec extension from ${extensionPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
export function findSimilarNotes(db, noteId, queryVector, threshold, limit) {
    const vectorBlob = Buffer.from(queryVector.buffer);
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
    const results = db.prepare(query).all(vectorBlob, noteId, threshold, limit);
    return results;
}
