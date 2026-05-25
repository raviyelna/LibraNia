import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useContent, useUploadContent, useDeleteContent, useContentById } from '../src/hooks/useContent';

// Mock window.api.content
const mockContentApi = {
  getAll: vi.fn(),
  getById: vi.fn(),
  upload: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (global as any).window = {
    api: {
      content: mockContentApi,
    },
  };
});

describe('useContent', () => {
  it('should fetch all content on mount', async () => {
    const mockContent = [
      {
        id: '1',
        file_path: '/content/test.pdf',
        thumbnail_path: null,
        mime_type: 'application/pdf',
        original_filename: 'test.pdf',
        file_size: 1024,
        extracted_text: 'Test content',
        source: 'manual' as const,
        confidence_score: null,
        metadata: null,
        note_id: null,
        message_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    mockContentApi.getAll.mockResolvedValue(mockContent);

    const { result } = renderHook(() => useContent());

    expect(result.current.loading).toBe(true);

    // Wait for async update
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toEqual(mockContent);
    expect(result.current.error).toBeNull();
    expect(mockContentApi.getAll).toHaveBeenCalledTimes(1);
  });

  it('should return content array and loading state', async () => {
    mockContentApi.getAll.mockResolvedValue([]);

    const { result } = renderHook(() => useContent());

    expect(result.current).toHaveProperty('content');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

describe('useUploadContent', () => {
  it('should call window.api.content.upload then window.api.content.create', async () => {
    const mockFilePath = '/tmp/test.pdf';
    const mockContent = {
      id: '1',
      file_path: '/content/test.pdf',
      thumbnail_path: null,
      mime_type: 'application/pdf',
      original_filename: 'test.pdf',
      file_size: 1024,
      extracted_text: null,
      source: 'manual' as const,
      confidence_score: null,
      metadata: null,
      note_id: null,
      message_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockContentApi.upload.mockResolvedValue({ filePath: mockFilePath, canceled: false });
    mockContentApi.create.mockResolvedValue(mockContent);

    const { result } = renderHook(() => useUploadContent());

    const uploadedContent = await result.current.upload('manual');

    expect(mockContentApi.upload).toHaveBeenCalledTimes(1);
    expect(mockContentApi.create).toHaveBeenCalledWith({
      filePath: mockFilePath,
      source: 'manual',
    });
    expect(uploadedContent).toEqual(mockContent);
  });

  it('should return upload function, loading state, and error state', async () => {
    mockContentApi.upload.mockResolvedValue({ filePath: '/tmp/test.pdf', canceled: false });
    mockContentApi.create.mockResolvedValue({});

    const { result } = renderHook(() => useUploadContent());

    expect(result.current).toHaveProperty('upload');
    expect(result.current).toHaveProperty('uploading');
    expect(result.current).toHaveProperty('error');
    expect(typeof result.current.upload).toBe('function');
  });
});

describe('useDeleteContent', () => {
  it('should call window.api.content.delete and return success', async () => {
    mockContentApi.delete.mockResolvedValue(true);

    const { result } = renderHook(() => useDeleteContent());

    const success = await result.current.deleteContent('1');

    expect(mockContentApi.delete).toHaveBeenCalledWith('1');
    expect(success).toBe(true);
  });
});

describe('useContentById', () => {
  it('should fetch single content by ID', async () => {
    const mockContent = {
      id: '1',
      file_path: '/content/test.pdf',
      thumbnail_path: null,
      mime_type: 'application/pdf',
      original_filename: 'test.pdf',
      file_size: 1024,
      extracted_text: 'Test content',
      source: 'manual' as const,
      confidence_score: null,
      metadata: null,
      note_id: null,
      message_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockContentApi.getById.mockResolvedValue(mockContent);

    const { result } = renderHook(() => useContentById('1'));

    expect(result.current.loading).toBe(true);

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toEqual(mockContent);
    expect(mockContentApi.getById).toHaveBeenCalledWith('1');
  });
});
