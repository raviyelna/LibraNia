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
        db.loadExtension(extensionPath);
        const result = db.prepare('SELECT vec_version() as version').get();
        if (!result || !result.version) {
            throw new Error('sqlite-vec extension loaded but vec_version() not available');
        }
    }
    catch (error) {
        const platform = process.platform;
        const nodeVersion = process.version;
        let platformGuidance = '';
        if (platform === 'win32') {
            platformGuidance = 'Ensure vec0.dll is present in electron/extensions/';
        }
        else if (platform === 'linux') {
            platformGuidance = 'Ensure vec0.so is present in electron/extensions/';
        }
        else if (platform === 'darwin') {
            platformGuidance = 'Ensure vec0.dylib is present in electron/extensions/';
        }
        else {
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
