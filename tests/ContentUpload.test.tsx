import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentUpload } from '../src/components/ContentUpload';
import * as useContentHooks from '../src/hooks/useContent';

vi.mock('../src/hooks/useContent');

describe('ContentUpload', () => {
  const mockUpload = vi.fn();
  const mockOnUploadComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useContentHooks, 'useUploadContent').mockReturnValue({
      upload: mockUpload,
      uploading: false,
      error: null,
    });
  });

  it('should render upload button', () => {
    render(<ContentUpload />);
    const button = screen.getByRole('button', { name: /upload/i });
    expect(button).toBeDefined();
  });

  it('should call useUploadContent hook on button click', async () => {
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

    mockUpload.mockResolvedValue(mockContent);

    render(<ContentUpload onUploadComplete={mockOnUploadComplete} />);

    const button = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith('manual');
    });
  });

  it('should show loading state during upload', () => {
    vi.spyOn(useContentHooks, 'useUploadContent').mockReturnValue({
      upload: mockUpload,
      uploading: true,
      error: null,
    });

    render(<ContentUpload />);

    const button = screen.getByRole('button', { name: /upload/i });
    expect(button).toHaveAttribute('disabled');
  });

  it('should display error message on upload failure', () => {
    const error = new Error('Upload failed');
    vi.spyOn(useContentHooks, 'useUploadContent').mockReturnValue({
      upload: mockUpload,
      uploading: false,
      error,
    });

    render(<ContentUpload />);

    expect(screen.getByText(/upload failed/i)).toBeDefined();
  });
});
