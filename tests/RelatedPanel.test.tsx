import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RelatedPanel } from '../src/components/Notes/RelatedPanel';

// Mock the useSemanticLinks hook
vi.mock('../src/hooks/useSemanticLinks', () => ({
  useSemanticLinks: vi.fn(),
}));

import { useSemanticLinks } from '../src/hooks/useSemanticLinks';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RelatedPanel', () => {
  it('should render "Related notes" heading', () => {
    (useSemanticLinks as any).mockReturnValue({
      links: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const onNavigate = vi.fn();
    render(<RelatedPanel noteId="note-123" onNavigate={onNavigate} />);

    expect(screen.getByText('Related notes')).toBeInTheDocument();
  });

  it('should show loading state while fetching semantic links', () => {
    (useSemanticLinks as any).mockReturnValue({
      links: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const onNavigate = vi.fn();
    render(<RelatedPanel noteId="note-123" onNavigate={onNavigate} />);

    expect(screen.getByText('Related notes')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show "No related notes yet" when links array is empty', () => {
    (useSemanticLinks as any).mockReturnValue({
      links: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const onNavigate = vi.fn();
    render(<RelatedPanel noteId="note-123" onNavigate={onNavigate} />);

    expect(screen.getByText(/no related notes yet/i)).toBeInTheDocument();
  });

  it('should render list of semantic links with titles', () => {
    const mockLinks = [
      { id: '1', title: 'Related Note 1', similarity: 0.85 },
      { id: '2', title: 'Related Note 2', similarity: 0.72 },
    ];

    (useSemanticLinks as any).mockReturnValue({
      links: mockLinks,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const onNavigate = vi.fn();
    render(<RelatedPanel noteId="note-123" onNavigate={onNavigate} />);

    expect(screen.getByText('Related Note 1')).toBeInTheDocument();
    expect(screen.getByText('Related Note 2')).toBeInTheDocument();
  });

  it('should show similarity percentage for each link', () => {
    const mockLinks = [
      { id: '1', title: 'Note A', similarity: 0.85 },
      { id: '2', title: 'Note B', similarity: 0.72 },
    ];

    (useSemanticLinks as any).mockReturnValue({
      links: mockLinks,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const onNavigate = vi.fn();
    render(<RelatedPanel noteId="note-123" onNavigate={onNavigate} />);

    expect(screen.getByText(/85% similar/i)).toBeInTheDocument();
    expect(screen.getByText(/72% similar/i)).toBeInTheDocument();
  });

  it('should call onNavigate with note id when link clicked', () => {
    const mockLinks = [
      { id: 'note-abc', title: 'Clickable Note', similarity: 0.9 },
    ];

    (useSemanticLinks as any).mockReturnValue({
      links: mockLinks,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const onNavigate = vi.fn();
    render(<RelatedPanel noteId="note-123" onNavigate={onNavigate} />);

    const linkElement = screen.getByText('Clickable Note');
    fireEvent.click(linkElement);

    expect(onNavigate).toHaveBeenCalledWith('note-abc');
  });

  it('should have hover states on links', () => {
    const mockLinks = [
      { id: '1', title: 'Hoverable Note', similarity: 0.8 },
    ];

    (useSemanticLinks as any).mockReturnValue({
      links: mockLinks,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const onNavigate = vi.fn();
    render(<RelatedPanel noteId="note-123" onNavigate={onNavigate} />);

    const linkElement = screen.getByText('Hoverable Note');

    // Check for hover-related classes
    expect(linkElement.className).toMatch(/hover:text-primary/);
    expect(linkElement.className).toMatch(/hover:underline/);
    expect(linkElement.className).toMatch(/cursor-pointer/);
  });

  it('shows unresolved wiki-links without navigating', () => {
    (useSemanticLinks as any).mockReturnValue({
      links: [{ id: 'missing:future-note', title: 'Future Note', relationship: 'missing' }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const onNavigate = vi.fn();
    render(<RelatedPanel noteId="note-123" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Future Note'));
    expect(screen.getByText(/linked note not found/i)).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
