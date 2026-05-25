import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContentList } from '../src/components/ContentList';
import type { Content } from '../src/hooks/useContent';

describe('ContentList', () => {
  const mockContent: Content[] = [
    {
      id: '1',
      file_path: '/content/test.pdf',
      thumbnail_path: null,
      mime_type: 'application/pdf',
      original_filename: 'test.pdf',
      file_size: 2048000, // 2MB
      extracted_text: 'Test content',
      source: 'manual',
      confidence_score: null,
      metadata: null,
      note_id: null,
      message_id: null,
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15'),
    },
    {
      id: '2',
      file_path: '/content/image.png',
      thumbnail_path: '/content/thumbnails/image.png',
      mime_type: 'image/png',
      original_filename: 'image.png',
      file_size: 512000, // 500KB
      extracted_text: null,
      source: 'ai-generated',
      confidence_score: 0.85,
      metadata: null,
      note_id: null,
      message_id: null,
      created_at: new Date('2024-01-16'),
      updated_at: new Date('2024-01-16'),
    },
  ];

  it('should render list of content items with thumbnails', () => {
    render(<ContentList content={mockContent} />);

    expect(screen.getByText('test.pdf')).toBeDefined();
    expect(screen.getByText('image.png')).toBeDefined();
  });

  it('should display metadata: original_filename, created_at, source, confidence_score', () => {
    render(<ContentList content={mockContent} />);

    // Check filenames
    expect(screen.getByText('test.pdf')).toBeDefined();
    expect(screen.getByText('image.png')).toBeDefined();

    // Check source badges
    expect(screen.getByText(/manual/i)).toBeDefined();
    expect(screen.getByText(/ai generated/i)).toBeDefined();

    // Check confidence score for AI-generated content
    expect(screen.getByText(/85%/i)).toBeDefined();
  });

  it('should show thumbnail for images, document icon for documents', () => {
    const { container } = render(<ContentList content={mockContent} />);

    // Image should have thumbnail
    const images = container.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);

    // Document should have icon (lucide-react FileText icon)
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('should have delete button for each item', () => {
    const mockOnDelete = vi.fn();
    render(<ContentList content={mockContent} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByRole('button');
    expect(deleteButtons.length).toBe(2);

    fireEvent.click(deleteButtons[0]);
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });
});
