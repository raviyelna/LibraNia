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
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import sharp from 'sharp';
import * as contentService from '../electron/services/content.service';

describe('Content Service - Text Extraction and Thumbnails', () => {
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

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    sqlite.close();
    vi.restoreAllMocks();
  });

  describe('extractText', () => {
    it('should extract text from PDF files using pdf-parse', async () => {
      const filePath = '/content/test.pdf';
      const mimeType = 'application/pdf';
      const pdfText = 'This is text extracted from a PDF document.';

      vi.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('fake pdf') as any);
      vi.mocked(pdfParse).mockResolvedValue({ text: pdfText } as any);

      const result = await contentService.extractText(filePath, mimeType);

      expect(result).toBe(pdfText);
      expect(pdfParse).toHaveBeenCalled();
    });

    it('should extract text from DOCX files using mammoth', async () => {
      const filePath = '/content/test.docx';
      const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const docxText = 'This is text extracted from a DOCX document.';

      vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: docxText } as any);

      const result = await contentService.extractText(filePath, mimeType);

      expect(result).toBe(docxText);
      expect(mammoth.extractRawText).toHaveBeenCalledWith({ path: filePath });
    });

    it('should extract text from TXT files using fs.readFile', async () => {
      const filePath = '/content/test.txt';
      const mimeType = 'text/plain';
      const txtContent = 'This is plain text content.';

      vi.spyOn(fs, 'readFile').mockResolvedValue(txtContent as any);

      const result = await contentService.extractText(filePath, mimeType);

      expect(result).toBe(txtContent);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should extract text from MD files using fs.readFile', async () => {
      const filePath = '/content/test.md';
      const mimeType = 'text/markdown';
      const mdContent = '# Markdown Title\n\nThis is markdown content.';

      vi.spyOn(fs, 'readFile').mockResolvedValue(mdContent as any);

      const result = await contentService.extractText(filePath, mimeType);

      expect(result).toBe(mdContent);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should return empty string for image files', async () => {
      const filePath = '/content/test.png';
      const mimeType = 'image/png';

      const result = await contentService.extractText(filePath, mimeType);

      expect(result).toBe('');
    });

    it('should truncate text to 100KB to prevent FTS5 bloat', async () => {
      const filePath = '/content/large.pdf';
      const mimeType = 'application/pdf';
      const largeText = 'a'.repeat(200000); // 200KB of text

      vi.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('fake pdf') as any);
      vi.mocked(pdfParse).mockResolvedValue({ text: largeText } as any);

      const result = await contentService.extractText(filePath, mimeType);

      expect(result.length).toBe(102400); // 100KB = 102400 bytes
      expect(result).toBe(largeText.substring(0, 102400));
    });
  });

  describe('generateThumbnail', () => {
    it('should create 200x200 JPEG thumbnail for images using sharp', async () => {
      const inputPath = '/content/test.png';
      const mimeType = 'image/png';
      const expectedThumbnailPath = 'content/thumbnails/test.jpg';

      const mockSharp = {
        resize: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(sharp).mockReturnValue(mockSharp as any);
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any);

      const result = await contentService.generateThumbnail(inputPath, mimeType);

      expect(result).toMatch(/content\/thumbnails\/.*\.jpg$/);
      expect(fs.mkdir).toHaveBeenCalledWith('content/thumbnails', { recursive: true });
      expect(sharp).toHaveBeenCalledWith(inputPath);
      expect(mockSharp.resize).toHaveBeenCalledWith(200, 200, {
        fit: 'cover',
        position: 'center',
      });
      expect(mockSharp.jpeg).toHaveBeenCalledWith({ quality: 80 });
      expect(mockSharp.toFile).toHaveBeenCalled();
    });

    it('should skip thumbnail generation for documents', async () => {
      const inputPath = '/content/test.pdf';
      const mimeType = 'application/pdf';

      const result = await contentService.generateThumbnail(inputPath, mimeType);

      expect(result).toBeNull();
      expect(sharp).not.toHaveBeenCalled();
    });
  });

  describe('createContent with text extraction and thumbnails', () => {
    it('should call extractText and store result in extracted_text column', async () => {
      const fileBuffer = Buffer.from('fake pdf content');
      const extractedText = 'Extracted PDF text';

      vi.spyOn(fs, 'readFile').mockResolvedValue(fileBuffer as any);
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        ext: 'pdf',
        mime: 'application/pdf',
      } as any);
      vi.spyOn(fs, 'stat').mockResolvedValue({ size: 1024 } as any);
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any);
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fs, 'rename').mockResolvedValue(undefined);
      vi.mocked(pdfParse).mockResolvedValue({ text: extractedText } as any);

      const inputData = {
        filePath: '/tmp/document.pdf',
        source: 'manual' as const,
      };

      const result = await contentService.createContent(inputData, db);

      expect(result.extracted_text).toBe(extractedText);
    });

    it('should call generateThumbnail for images and store path in thumbnail_path column', async () => {
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

      expect(result.thumbnail_path).toMatch(/content\/thumbnails\/.*\.jpg$/);
      expect(sharp).toHaveBeenCalled();
    });
  });
});
