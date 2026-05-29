import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { eq, desc } from 'drizzle-orm';
import { content } from '../database/schema.js';
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp',
];
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_TEXT_SIZE = 102400;
export async function validateFileType(buffer, filePath) {
    const { fileTypeFromBuffer } = await import('file-type');
    const uint8Array = new Uint8Array(buffer);
    const fileType = await fileTypeFromBuffer(uint8Array);
    if (fileType) {
        if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
            throw new Error(`File type ${fileType.mime} not allowed`);
        }
        return { mime: fileType.mime, ext: fileType.ext };
    }
    const extension = path.extname(filePath).toLowerCase();
    const extensionToMime = {
        '.txt': { mime: 'text/plain', ext: 'txt' },
        '.md': { mime: 'text/markdown', ext: 'md' },
    };
    const mappedType = extensionToMime[extension];
    if (mappedType && ALLOWED_MIME_TYPES.includes(mappedType.mime)) {
        return mappedType;
    }
    throw new Error('Unable to determine file type');
}
export async function validateFileSize(filePath) {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
        throw new Error('File too large (max 50MB)');
    }
    return stats.size;
}
export async function writeFileAtomic(filePath, data) {
    const tempPath = `${filePath}.tmp.${crypto.randomUUID()}`;
    try {
        await fs.writeFile(tempPath, data);
        await fs.rename(tempPath, filePath);
    }
    catch (error) {
        await fs.unlink(tempPath).catch(() => { });
        throw error;
    }
}
export async function extractText(filePath, mimeType) {
    let text = '';
    if (mimeType === 'application/pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const data = await PDFParse(dataBuffer);
        text = data.text;
    }
    else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
    }
    else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        text = await fs.readFile(filePath, 'utf-8');
    }
    else {
        return '';
    }
    if (text.length > MAX_TEXT_SIZE) {
        text = text.substring(0, MAX_TEXT_SIZE);
    }
    return text;
}
export async function generateThumbnail(inputPath, mimeType) {
    if (!mimeType.startsWith('image/')) {
        return null;
    }
    await fs.mkdir('content/thumbnails', { recursive: true });
    const basename = path.basename(inputPath, path.extname(inputPath));
    const thumbnailPath = `content/thumbnails/${basename}.jpg`;
    return '';
}
export async function createContent(data, db) {
    const fileBuffer = await fs.readFile(data.filePath);
    const { mime, ext } = await validateFileType(fileBuffer, data.filePath);
    const fileSize = await validateFileSize(data.filePath);
    const uuid = crypto.randomUUID();
    const destinationPath = `content/${uuid}.${ext}`;
    await fs.mkdir('content', { recursive: true });
    await writeFileAtomic(destinationPath, fileBuffer);
    const extractedText = await extractText(destinationPath, mime);
    const thumbnailPath = await generateThumbnail(destinationPath, mime);
    const originalFilename = data.originalFilename || path.basename(data.filePath);
    const now = new Date();
    const [record] = await db
        .insert(content)
        .values({
        id: uuid,
        file_path: destinationPath,
        thumbnail_path: thumbnailPath,
        mime_type: mime,
        original_filename: originalFilename,
        file_size: fileSize,
        extracted_text: extractedText || null,
        source: data.source,
        confidence_score: data.confidence_score ?? null,
        metadata: null,
        note_id: data.note_id ?? null,
        message_id: data.message_id ?? null,
        created_at: now,
        updated_at: now,
    })
        .returning();
    return record;
}
export async function getContentById(id, db) {
    const [record] = await db
        .select()
        .from(content)
        .where(eq(content.id, id))
        .limit(1);
    return record ? record : null;
}
export async function updateContent(id, data, db) {
    const existing = await getContentById(id, db);
    if (!existing) {
        throw new Error(`Content with id ${id} not found`);
    }
    const now = new Date();
    const [updated] = await db
        .update(content)
        .set({
        ...data,
        updated_at: now,
    })
        .where(eq(content.id, id))
        .returning();
    if (!updated) {
        throw new Error(`Failed to update content with id ${id}`);
    }
    return updated;
}
export async function deleteContent(id, db) {
    const record = await getContentById(id, db);
    if (!record) {
        return false;
    }
    const result = await db.delete(content).where(eq(content.id, id));
    if (result.changes === 0) {
        return false;
    }
    await fs.unlink(record.file_path).catch(() => { });
    if (record.thumbnail_path) {
        await fs.unlink(record.thumbnail_path).catch(() => { });
    }
    return true;
}
export async function getAllContent(db) {
    const records = await db
        .select()
        .from(content)
        .orderBy(desc(content.created_at));
    return records;
}
