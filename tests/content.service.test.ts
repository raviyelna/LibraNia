import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';

// Mock file-type module
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn(),
  PDFParse: vi.fn(),
}));

// Mock mammoth
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn(),
}));

import { fileTypeFromBuffer } from 'file-type';
import pdfParse, { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import sharp from 'sharp';
import * as contentService from '../electron/services/content.service';

describe('Content Service - File Validation', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeEach(() => {
    // Create in-memory database
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // Create content table
    sqlite.exec(`
      CREATE TABLE content (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        thumbnail_path TEXT,
        mime_type TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        extracted_text TEXT,
        source TEXT NOT NULL,
        confidence_score INTEGER,
        metadata TEXT,
        note_id TEXT,
        message_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  });

  afterEach(() => {
    sqlite.close();
    vi.restoreAllMocks();
  });

  describe('validateFileType', () => {
    it('should reject files with disallowed MIME types', async () => {
      const buffer = Buffer.from('fake executable');
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        ext: 'exe',
        mime: 'application/x-msdownload',
      } as any);

      await expect(
        contentService.validateFileType(buffer)
      ).rejects.toThrow('File type application/x-msdownload not allowed');
    });

    it('should accept PDF files', async () => {
      const buffer = Buffer.from('fake pdf');
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        ext: 'pdf',
        mime: 'application/pdf',
      } as any);

      const result = await contentService.validateFileType(buffer);
      expect(result).toEqual({ mime: 'application/pdf', ext: 'pdf' });
    });

    it('should accept DOCX files', async () => {
      const buffer = Buffer.from('fake docx');
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        ext: 'docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      } as any);

      const result = await contentService.validateFileType(buffer);
      expect(result.mime).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should accept PNG files', async () => {
      const buffer = Buffer.from('fake png');
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        ext: 'png',
        mime: 'image/png',
      } as any);

      const result = await contentService.validateFileType(buffer);
      expect(result).toEqual({ mime: 'image/png', ext: 'png' });
    });

    it('should accept JPG files', async () => {
      const buffer = Buffer.from('fake jpg');
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        ext: 'jpg',
        mime: 'image/jpeg',
      } as any);

      const result = await contentService.validateFileType(buffer);
      expect(result).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
    });

    it('should accept WebP files', async () => {
      const buffer = Buffer.from('fake webp');
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        ext: 'webp',
        mime: 'image/webp',
      } as any);

      const result = await contentService.validateFileType(buffer);
      expect(result).toEqual({ mime: 'image/webp', ext: 'webp' });
    });
  });

  describe('validateFileSize', () => {
    it('should throw on files exceeding 50MB limit', async () => {
      const largeFileSize = 51 * 1024 * 1024; // 51MB
      vi.spyOn(fs, 'stat').mockResolvedValue({
        size: largeFileSize,
      } as any);

      await expect(
        contentService.validateFileSize('/path/to/large.pdf')
      ).rejects.toThrow('File too large (max 50MB)');
    });

    it('should accept files under 50MB limit', async () => {
      const validFileSize = 10 * 1024 * 1024; // 10MB
      vi.spyOn(fs, 'stat').mockResolvedValue({
        size: validFileSize,
      } as any);

      const size = await contentService.validateFileSize('/path/to/valid.pdf');
      expect(size).toBe(validFileSize);
    });

    it('should accept files exactly at 50MB limit', async () => {
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      vi.spyOn(fs, 'stat').mockResolvedValue({
        size: maxFileSize,
      } as any);

      const size = await contentService.validateFileSize('/path/to/max.pdf');
      expect(size).toBe(maxFileSize);
    });
  });

  describe('writeFileAtomic', () => {
    it('should write to temp file then rename atomically', async () => {
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fs, 'rename').mockResolvedValue(undefined);

      const filePath = '/content/test.pdf';
      const data = Buffer.from('test data');

      await contentService.writeFileAtomic(filePath, data);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/content\/test\.pdf\.tmp\./),
        data
      );
      expect(fs.rename).toHaveBeenCalledWith(
        expect.stringMatching(/\/content\/test\.pdf\.tmp\./),
        filePath
      );
    });

    it('should clean up temp file on failure', async () => {
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fs, 'rename').mockRejectedValue(new Error('Rename failed'));
      vi.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      const filePath = '/content/test.pdf';
      const data = Buffer.from('test data');

      await expect(
        contentService.writeFileAtomic(filePath, data)
      ).rejects.toThrow('Rename failed');

      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringMatching(/\/content\/test\.pdf\.tmp\./)
      );
    });
  });

  describe('createContent', () => {
    it('should generate UUID filename with original extension', async () => {
      const fileBuffer = Buffer.from('fake pdf content');
      vi.spyOn(fs, 'readFile').mockResolvedValue(fileBuffer as any);
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        ext: 'pdf',
        mime: 'application/pdf',
      } as any);
      vi.spyOn(fs, 'stat').mockResolvedValue({ size: 1024 } as any);
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any);
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fs, 'rename').mockResolvedValue(undefined);

      // Mock text extraction
      vi.mocked(PDFParse).mockResolvedValue({ text: 'Sample text' } as any);

      const inputData = {
        filePath: '/tmp/document.pdf',
        source: 'manual' as const,
      };

      const result = await contentService.createContent(inputData, db);

      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result.file_path).toMatch(/^content\/[0-9a-f-]+\.pdf$/);
      expect(result.original_filename).toBe('document.pdf');
    });

    it('should store file in /content/ directory', async () => {
      const fileBuffer = Buffer.from('fake png content');
      vi.spyOn(fs, 'readFile').mockResolvedValue(fileBuffer as any);
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        ext: 'png',
        mime: 'image/png',
      } as any);
      vi.spyOn(fs, 'stat').mockResolvedValue({ size: 2048 } as any);
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any);
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fs, 'rename').mockResolvedValue(undefined);

      // Mock thumbnail generation
      const mockSharp = {
        resize: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(sharp).mockReturnValue(mockSharp as any);

      const inputData = {
        filePath: '/tmp/image.png',
        source: 'manual' as const,
      };

      const result = await contentService.createContent(inputData, db);

      expect(fs.mkdir).toHaveBeenCalledWith('content', { recursive: true });
      expect(result.file_path).toMatch(/^content\//);
    });

    it('should insert metadata to database with source and confidence_score', async () => {
      const fileBuffer = Buffer.from('fake pdf content');
      vi.spyOn(fs, 'readFile').mockResolvedValue(fileBuffer as any);
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        ext: 'pdf',
        mime: 'application/pdf',
      } as any);
      vi.spyOn(fs, 'stat').mockResolvedValue({ size: 5000 } as any);
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any);
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fs, 'rename').mockResolvedValue(undefined);

      // Mock text extraction
      vi.mocked(PDFParse).mockResolvedValue({ text: 'Sample text' } as any);

      const inputData = {
        filePath: '/tmp/document.pdf',
        source: 'ai-generated' as const,
        confidence_score: 0.95,
        note_id: 'note-123',
      };

      const result = await contentService.createContent(inputData, db);

      expect(result.source).toBe('ai-generated');
      expect(result.confidence_score).toBe(0.95);
      expect(result.note_id).toBe('note-123');
      expect(result.mime_type).toBe('application/pdf');
      expect(result.file_size).toBe(5000);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getContentById', () => {
    it('should return content by id', async () => {
      // Insert test content
      const id = crypto.randomUUID();
      const now = Date.now();
      sqlite.prepare(`
        INSERT INTO content (id, file_path, mime_type, original_filename, file_size, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, 'content/test.pdf', 'application/pdf', 'test.pdf', 1024, 'manual', now, now);

      const result = await contentService.getContentById(id, db);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(id);
      expect(result?.file_path).toBe('content/test.pdf');
    });

    it('should return null if content not found', async () => {
      const result = await contentService.getContentById('non-existent-id', db);
      expect(result).toBeNull();
    });
  });

  describe('updateContent', () => {
    it('should update content fields', async () => {
      // Insert test content
      const id = crypto.randomUUID();
      const now = Date.now();
      sqlite.prepare(`
        INSERT INTO content (id, file_path, mime_type, original_filename, file_size, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, 'content/test.pdf', 'application/pdf', 'test.pdf', 1024, 'manual', now, now);

      const updateData = {
        extracted_text: 'This is extracted text from the PDF',
        thumbnail_path: 'content/thumbnails/test.jpg',
      };

      const result = await contentService.updateContent(id, updateData, db);

      expect(result.extracted_text).toBe('This is extracted text from the PDF');
      expect(result.thumbnail_path).toBe('content/thumbnails/test.jpg');
    });

    it('should throw if content not found', async () => {
      await expect(
        contentService.updateContent('non-existent-id', { extracted_text: 'test' }, db)
      ).rejects.toThrow('not found');
    });
  });

  describe('deleteContent', () => {
    it('should delete content and associated files', async () => {
      // Insert test content
      const id = crypto.randomUUID();
      const now = Date.now();
      const filePath = 'content/test.pdf';
      const thumbnailPath = 'content/thumbnails/test.jpg';

      sqlite.prepare(`
        INSERT INTO content (id, file_path, thumbnail_path, mime_type, original_filename, file_size, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, filePath, thumbnailPath, 'application/pdf', 'test.pdf', 1024, 'manual', now, now);

      vi.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      const result = await contentService.deleteContent(id, db);

      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith(filePath);
      expect(fs.unlink).toHaveBeenCalledWith(thumbnailPath);

      // Verify database deletion
      const deleted = await contentService.getContentById(id, db);
      expect(deleted).toBeNull();
    });

    it('should return false if content not found', async () => {
      vi.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      const result = await contentService.deleteContent('non-existent-id', db);
      expect(result).toBe(false);
    });
  });

  describe('getAllContent', () => {
    it('should return all content ordered by created_at DESC', async () => {
      const now = Date.now();
      const id1 = crypto.randomUUID();
      const id2 = crypto.randomUUID();

      sqlite.prepare(`
        INSERT INTO content (id, file_path, mime_type, original_filename, file_size, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id1, 'content/first.pdf', 'application/pdf', 'first.pdf', 1024, 'manual', now - 1000, now - 1000);

      sqlite.prepare(`
        INSERT INTO content (id, file_path, mime_type, original_filename, file_size, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id2, 'content/second.pdf', 'application/pdf', 'second.pdf', 2048, 'manual', now, now);

      const result = await contentService.getAllContent(db);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(id2); // Most recent first
      expect(result[1].id).toBe(id1);
    });

    it('should return empty array if no content exists', async () => {
      const result = await contentService.getAllContent(db);
      expect(result).toEqual([]);
    });
  });
});
