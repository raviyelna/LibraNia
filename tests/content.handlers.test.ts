import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';

// Mock modules before importing handlers
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

vi.mock('../electron/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../electron/database/connection', () => ({
  getORM: vi.fn(),
}));

vi.mock('../electron/services/content.service', () => ({
  createContent: vi.fn(),
  getContentById: vi.fn(),
  updateContent: vi.fn(),
  deleteContent: vi.fn(),
  getAllContent: vi.fn(),
}));

describe('Content IPC Handlers', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;
  let ipcHandlers: Map<string, Function>;

  beforeEach(async () => {
    // Create in-memory database for testing
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
      );
    `);

    // Reset mocks
    vi.clearAllMocks();

    // Capture IPC handlers
    ipcHandlers = new Map();
    const { ipcMain } = await import('electron');
    (ipcMain.handle as any).mockImplementation((channel: string, handler: Function) => {
      ipcHandlers.set(channel, handler);
    });

    // Mock getORM to return our test database
    const { getORM } = await import('../electron/database/connection');
    (getORM as any).mockReturnValue(db);

    // Import and register handlers
    const { registerContentHandlers } = await import('../electron/ipc/content.handlers');
    registerContentHandlers();
  });

  afterEach(() => {
    sqlite.close();
  });

  describe('content:upload', () => {
    it('should show file picker dialog and return selected file path', async () => {
      const { dialog } = await import('electron');
      (dialog.showOpenDialog as any).mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/document.pdf'],
      });

      const handler = ipcHandlers.get('content:upload');
      expect(handler).toBeDefined();

      const result = await handler!({}, {});

      expect(dialog.showOpenDialog).toHaveBeenCalledWith({
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] },
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
        ],
      });
      expect(result).toEqual({
        canceled: false,
        filePath: '/path/to/document.pdf',
      });
    });

    it('should return canceled true when user cancels dialog', async () => {
      const { dialog } = await import('electron');
      (dialog.showOpenDialog as any).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      const handler = ipcHandlers.get('content:upload');
      const result = await handler!({}, {});

      expect(result).toEqual({
        canceled: true,
        filePath: null,
      });
    });

    it('should log the upload operation', async () => {
      const { dialog } = await import('electron');
      const { logger } = await import('../electron/logger');
      (dialog.showOpenDialog as any).mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/image.png'],
      });

      const handler = ipcHandlers.get('content:upload');
      await handler!({}, {});

      expect(logger.info).toHaveBeenCalledWith('IPC: content:upload', { canceled: false });
    });
  });

  describe('content:create', () => {
    it('should call createContent service and return Content record', async () => {
      const { createContent } = await import('../electron/services/content.service');
      const mockContent = {
        id: 'content-123',
        file_path: 'content/abc123.pdf',
        thumbnail_path: null,
        mime_type: 'application/pdf',
        original_filename: 'document.pdf',
        file_size: 1024,
        extracted_text: 'Sample text',
        source: 'manual',
        confidence_score: null,
        metadata: null,
        note_id: null,
        message_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      (createContent as any).mockResolvedValue(mockContent);

      const handler = ipcHandlers.get('content:create');
      expect(handler).toBeDefined();

      const inputData = {
        filePath: '/path/to/document.pdf',
        source: 'manual' as const,
      };
      const result = await handler!({}, inputData);

      expect(createContent).toHaveBeenCalledWith(inputData, db);
      expect(result).toEqual(mockContent);
    });

    it('should handle AI-generated content with confidence score', async () => {
      const { createContent } = await import('../electron/services/content.service');
      const mockContent = {
        id: 'content-456',
        file_path: 'content/def456.png',
        thumbnail_path: 'content/thumbnails/def456.jpg',
        mime_type: 'image/png',
        original_filename: 'diagram.png',
        file_size: 2048,
        extracted_text: null,
        source: 'ai-generated',
        confidence_score: 85,
        metadata: null,
        note_id: 'note-123',
        message_id: 'msg-456',
        created_at: new Date(),
        updated_at: new Date(),
      };
      (createContent as any).mockResolvedValue(mockContent);

      const handler = ipcHandlers.get('content:create');
      const inputData = {
        filePath: '/path/to/diagram.png',
        source: 'ai-generated' as const,
        confidence_score: 85,
        note_id: 'note-123',
        message_id: 'msg-456',
      };
      const result = await handler!({}, inputData);

      expect(createContent).toHaveBeenCalledWith(inputData, db);
      expect(result).toEqual(mockContent);
    });

    it('should log the create operation', async () => {
      const { createContent } = await import('../electron/services/content.service');
      const { logger } = await import('../electron/logger');
      (createContent as any).mockResolvedValue({ id: 'content-123' });

      const handler = ipcHandlers.get('content:create');
      const inputData = {
        filePath: '/path/to/document.pdf',
        source: 'manual' as const,
      };
      await handler!({}, inputData);

      expect(logger.info).toHaveBeenCalledWith('IPC: content:create', {
        filePath: '/path/to/document.pdf',
        source: 'manual',
      });
    });

    it('should catch and log errors', async () => {
      const { createContent } = await import('../electron/services/content.service');
      const { logger } = await import('../electron/logger');
      const error = new Error('File validation failed');
      (createContent as any).mockRejectedValue(error);

      const handler = ipcHandlers.get('content:create');
      const inputData = {
        filePath: '/path/to/invalid.exe',
        source: 'manual' as const,
      };

      await expect(handler!({}, inputData)).rejects.toThrow('File validation failed');
      expect(logger.error).toHaveBeenCalledWith('content:create failed', error);
    });
  });

  describe('content:getById', () => {
    it('should call getContentById service and return Content or null', async () => {
      const { getContentById } = await import('../electron/services/content.service');
      const mockContent = {
        id: 'content-123',
        file_path: 'content/abc123.pdf',
        thumbnail_path: null,
        mime_type: 'application/pdf',
        original_filename: 'document.pdf',
        file_size: 1024,
        extracted_text: 'Sample text',
        source: 'manual',
        confidence_score: null,
        metadata: null,
        note_id: null,
        message_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      (getContentById as any).mockResolvedValue(mockContent);

      const handler = ipcHandlers.get('content:getById');
      expect(handler).toBeDefined();

      const result = await handler!({}, { id: 'content-123' });

      expect(getContentById).toHaveBeenCalledWith('content-123', db);
      expect(result).toEqual(mockContent);
    });

    it('should return null when content not found', async () => {
      const { getContentById } = await import('../electron/services/content.service');
      (getContentById as any).mockResolvedValue(null);

      const handler = ipcHandlers.get('content:getById');
      const result = await handler!({}, { id: 'nonexistent' });

      expect(result).toBeNull();
    });

    it('should log the getById operation', async () => {
      const { getContentById } = await import('../electron/services/content.service');
      const { logger } = await import('../electron/logger');
      (getContentById as any).mockResolvedValue(null);

      const handler = ipcHandlers.get('content:getById');
      await handler!({}, { id: 'content-123' });

      expect(logger.info).toHaveBeenCalledWith('IPC: content:getById', { id: 'content-123' });
    });

    it('should catch and log errors', async () => {
      const { getContentById } = await import('../electron/services/content.service');
      const { logger } = await import('../electron/logger');
      const error = new Error('Database error');
      (getContentById as any).mockRejectedValue(error);

      const handler = ipcHandlers.get('content:getById');

      await expect(handler!({}, { id: 'content-123' })).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('content:getById failed', error);
    });
  });

  describe('content:getAll', () => {
    it('should call getAllContent service and return Content array', async () => {
      const { getAllContent } = await import('../electron/services/content.service');
      const mockContents = [
        {
          id: 'content-1',
          file_path: 'content/abc.pdf',
          thumbnail_path: null,
          mime_type: 'application/pdf',
          original_filename: 'doc1.pdf',
          file_size: 1024,
          extracted_text: 'Text 1',
          source: 'manual',
          confidence_score: null,
          metadata: null,
          note_id: null,
          message_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'content-2',
          file_path: 'content/def.png',
          thumbnail_path: 'content/thumbnails/def.jpg',
          mime_type: 'image/png',
          original_filename: 'image1.png',
          file_size: 2048,
          extracted_text: null,
          source: 'ai-generated',
          confidence_score: 90,
          metadata: null,
          note_id: null,
          message_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      (getAllContent as any).mockResolvedValue(mockContents);

      const handler = ipcHandlers.get('content:getAll');
      expect(handler).toBeDefined();

      const result = await handler!({}, {});

      expect(getAllContent).toHaveBeenCalledWith(db);
      expect(result).toEqual(mockContents);
      expect(result).toHaveLength(2);
    });

    it('should log the getAll operation', async () => {
      const { getAllContent } = await import('../electron/services/content.service');
      const { logger } = await import('../electron/logger');
      (getAllContent as any).mockResolvedValue([]);

      const handler = ipcHandlers.get('content:getAll');
      await handler!({}, {});

      expect(logger.info).toHaveBeenCalledWith('IPC: content:getAll');
    });

    it('should catch and log errors', async () => {
      const { getAllContent } = await import('../electron/services/content.service');
      const { logger } = await import('../electron/logger');
      const error = new Error('Database error');
      (getAllContent as any).mockRejectedValue(error);

      const handler = ipcHandlers.get('content:getAll');

      await expect(handler!({}, {})).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('content:getAll failed', error);
    });
  });

  describe('content:update', () => {
    it('should call updateContent service and return updated Content', async () => {
      const { updateContent } = await import('../electron/services/content.service');
      const mockUpdated = {
        id: 'content-123',
        file_path: 'content/abc123.pdf',
        thumbnail_path: null,
        mime_type: 'application/pdf',
        original_filename: 'document.pdf',
        file_size: 1024,
        extracted_text: 'Updated text',
        source: 'manual',
        confidence_score: null,
        metadata: '{"key":"value"}',
        note_id: null,
        message_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      (updateContent as any).mockResolvedValue(mockUpdated);

      const handler = ipcHandlers.get('content:update');
      expect(handler).toBeDefined();

      const updateData = {
        id: 'content-123',
        extracted_text: 'Updated text',
        metadata: '{"key":"value"}',
      };
      const result = await handler!({}, updateData);

      expect(updateContent).toHaveBeenCalledWith(
        'content-123',
        { extracted_text: 'Updated text', metadata: '{"key":"value"}' },
        db
      );
      expect(result).toEqual(mockUpdated);
    });

    it('should log the update operation', async () => {
      const { updateContent } = await import('../electron/services/content.service');
      const { logger } = await import('../electron/logger');
      (updateContent as any).mockResolvedValue({ id: 'content-123' });

      const handler = ipcHandlers.get('content:update');
      await handler!({}, { id: 'content-123', extracted_text: 'New text' });

      expect(logger.info).toHaveBeenCalledWith('IPC: content:update', { id: 'content-123' });
    });

    it('should catch and log errors', async () => {
      const { updateContent } = await import('../electron/services/content.service');
      const { logger } = await import('../electron/logger');
      const error = new Error('Content not found');
      (updateContent as any).mockRejectedValue(error);

      const handler = ipcHandlers.get('content:update');

      await expect(handler!({}, { id: 'nonexistent', extracted_text: 'text' })).rejects.toThrow(
        'Content not found'
      );
      expect(logger.error).toHaveBeenCalledWith('content:update failed', error);
    });
  });

  describe('content:delete', () => {
    it('should call deleteContent service and return success boolean', async () => {
      const { deleteContent } = await import('../electron/services/content.service');
      (deleteContent as any).mockResolvedValue(true);

      const handler = ipcHandlers.get('content:delete');
      expect(handler).toBeDefined();

      const result = await handler!({}, { id: 'content-123' });

      expect(deleteContent).toHaveBeenCalledWith('content-123', db);
      expect(result).toEqual({ success: true });
    });

    it('should return success false when content not found', async () => {
      const { deleteContent } = await import('../electron/services/content.service');
      (deleteContent as any).mockResolvedValue(false);

      const handler = ipcHandlers.get('content:delete');
      const result = await handler!({}, { id: 'nonexistent' });

      expect(result).toEqual({ success: false });
    });

    it('should log the delete operation', async () => {
      const { deleteContent } = await import('../electron/services/content.service');
      const { logger } = await import('../electron/logger');
      (deleteContent as any).mockResolvedValue(true);

      const handler = ipcHandlers.get('content:delete');
      await handler!({}, { id: 'content-123' });

      expect(logger.info).toHaveBeenCalledWith('IPC: content:delete', { id: 'content-123' });
    });

    it('should catch and log errors', async () => {
      const { deleteContent } = await import('../electron/services/content.service');
      const { logger } = await import('../electron/logger');
      const error = new Error('File deletion failed');
      (deleteContent as any).mockRejectedValue(error);

      const handler = ipcHandlers.get('content:delete');

      await expect(handler!({}, { id: 'content-123' })).rejects.toThrow('File deletion failed');
      expect(logger.error).toHaveBeenCalledWith('content:delete failed', error);
    });
  });
});
