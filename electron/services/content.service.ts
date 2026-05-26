import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
// import sharp from 'sharp'; // Disabled for phase 6 testing - native module issues
import { eq, desc } from 'drizzle-orm';
import { content, contentTags } from '../database/schema';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';

/**
 * Input interface for creating content
 */
export interface CreateContentInput {
  filePath: string;
  source: 'manual' | 'ai-generated';
  confidence_score?: number;
  note_id?: string;
  message_id?: string;
}

/**
 * Input interface for updating content
 */
export interface UpdateContentInput {
  extracted_text?: string;
  thumbnail_path?: string;
  metadata?: string;
}

/**
 * Content record interface matching database schema
 */
export interface Content {
  id: string;
  file_path: string;
  thumbnail_path: string | null;
  mime_type: string;
  original_filename: string;
  file_size: number;
  extracted_text: string | null;
  source: string;
  confidence_score: number | null;
  metadata: string | null;
  note_id: string | null;
  message_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Allowed MIME types for content uploads
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
];

/**
 * Maximum file size in bytes (50MB)
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Maximum extracted text size (100KB) to prevent FTS5 bloat
 */
const MAX_TEXT_SIZE = 102400;

/**
 * Validate file type using magic bytes detection
 * @param buffer File buffer to validate
 * @returns Object with mime type and extension
 * @throws Error if file type is not allowed
 */
export async function validateFileType(buffer: Buffer): Promise<{ mime: string; ext: string }> {
  const { fileTypeFromBuffer } = await import('file-type');
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType) {
    throw new Error('Unable to determine file type');
  }

  if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    throw new Error(`File type ${fileType.mime} not allowed`);
  }

  return { mime: fileType.mime, ext: fileType.ext };
}

/**
 * Validate file size
 * @param filePath Path to file to validate
 * @returns File size in bytes
 * @throws Error if file exceeds size limit
 */
export async function validateFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);

  if (stats.size > MAX_FILE_SIZE) {
    throw new Error('File too large (max 50MB)');
  }

  return stats.size;
}

/**
 * Write file atomically using temp file + rename pattern
 * @param filePath Destination file path
 * @param data File data buffer
 */
export async function writeFileAtomic(filePath: string, data: Buffer): Promise<void> {
  const tempPath = `${filePath}.tmp.${crypto.randomUUID()}`;

  try {
    await fs.writeFile(tempPath, data);
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on failure
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}

/**
 * Extract text from document files
 * @param filePath Path to file
 * @param mimeType MIME type of file
 * @returns Extracted text (truncated to 100KB)
 */
export async function extractText(filePath: string, mimeType: string): Promise<string> {
  let text = '';

  if (mimeType === 'application/pdf') {
    // Extract text from PDF using pdf-parse
    const dataBuffer = await fs.readFile(filePath);
    const data = await PDFParse(dataBuffer);
    text = data.text;
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // Extract text from DOCX using mammoth
    const result = await mammoth.extractRawText({ path: filePath });
    text = result.value;
  } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    // Read plain text files directly
    text = await fs.readFile(filePath, 'utf-8');
  } else {
    // No text extraction for images
    return '';
  }

  // Truncate to 100KB to prevent FTS5 index bloat
  if (text.length > MAX_TEXT_SIZE) {
    text = text.substring(0, MAX_TEXT_SIZE);
  }

  return text;
}

/**
 * Generate thumbnail for image files
 * @param inputPath Path to input image
 * @param mimeType MIME type of file
 * @returns Path to generated thumbnail or null if not an image
 */
export async function generateThumbnail(inputPath: string, mimeType: string): Promise<string | null> {
  // Only generate thumbnails for images
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  // Ensure thumbnails directory exists
  await fs.mkdir('content/thumbnails', { recursive: true });

  // Extract UUID from input path and create thumbnail filename
  const basename = path.basename(inputPath, path.extname(inputPath));
  const thumbnailPath = `content/thumbnails/${basename}.jpg`;

  // Generate 200x200 thumbnail using sharp
  // DISABLED for phase 6 testing - sharp native module issues
  // await sharp(inputPath)
  //   .resize(200, 200, {
  //     fit: 'cover',
  //     position: 'center',
  //   })
  //   .jpeg({ quality: 80 })
  //   .toFile(thumbnailPath);

  // Temporary: return empty thumbnail path
  return '';
}

/**
 * Create new content record with file storage
 * @param data Content input data
 * @param db Drizzle ORM database instance
 * @returns Created content record
 */
export async function createContent(
  data: CreateContentInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Content> {
  // Read file from source path
  const fileBuffer = await fs.readFile(data.filePath);

  // Validate file type using magic bytes
  const { mime, ext } = await validateFileType(fileBuffer);

  // Validate file size
  const fileSize = await validateFileSize(data.filePath);

  // Generate UUID for filename
  const uuid = crypto.randomUUID();
  const destinationPath = `content/${uuid}.${ext}`;

  // Ensure content directory exists
  await fs.mkdir('content', { recursive: true });

  // Write file atomically
  await writeFileAtomic(destinationPath, fileBuffer);

  // Extract text from documents
  const extractedText = await extractText(destinationPath, mime);

  // Generate thumbnail for images
  const thumbnailPath = await generateThumbnail(destinationPath, mime);

  // Get original filename
  const originalFilename = path.basename(data.filePath);

  // Insert metadata to database
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

  return record as Content;
}

/**
 * Get content by ID
 * @param id Content ID
 * @param db Drizzle ORM database instance
 * @returns Content record or null if not found
 */
export async function getContentById(
  id: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<Content | null> {
  const [record] = await db
    .select()
    .from(content)
    .where(eq(content.id, id))
    .limit(1);

  return record ? (record as Content) : null;
}

/**
 * Update content metadata
 * @param id Content ID
 * @param data Update data
 * @param db Drizzle ORM database instance
 * @returns Updated content record
 * @throws Error if content not found
 */
export async function updateContent(
  id: string,
  data: UpdateContentInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Content> {
  // Check if content exists
  const existing = await getContentById(id, db);
  if (!existing) {
    throw new Error(`Content with id ${id} not found`);
  }

  const now = new Date();

  // Update content
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

  return updated as Content;
}

/**
 * Delete content and associated files
 * @param id Content ID
 * @param db Drizzle ORM database instance
 * @returns True if deleted successfully
 */
export async function deleteContent(
  id: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<boolean> {
  // Get content record to find file paths
  const record = await getContentById(id, db);
  if (!record) {
    return false;
  }

  // Delete from database (CASCADE handles content_tags cleanup)
  const result = await db.delete(content).where(eq(content.id, id));

  if (result.changes === 0) {
    return false;
  }

  // Delete file from filesystem
  await fs.unlink(record.file_path).catch(() => {});

  // Delete thumbnail if exists
  if (record.thumbnail_path) {
    await fs.unlink(record.thumbnail_path).catch(() => {});
  }

  return true;
}

/**
 * Get all content records
 * @param db Drizzle ORM database instance
 * @returns Array of content records ordered by created_at DESC
 */
export async function getAllContent(
  db: BetterSQLite3Database<typeof schema>
): Promise<Content[]> {
  const records = await db
    .select()
    .from(content)
    .orderBy(desc(content.created_at));

  return records as Content[];
}
