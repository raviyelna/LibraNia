import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphControls } from './GraphControls';

// Mock useSearch hook
const mockSearch = vi.fn();
const mockResults = vi.fn(() => []);
vi.mock('../../hooks/useSearch', () => ({
  useSearch: () => ({
    search: mockSearch,
    results: mockResults(),
    loading: false,
  }),
}));

describe('GraphControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    const mockOnSearchResults = vi.fn();
    render(<GraphControls onSearchResults={mockOnSearchResults} />);

    const searchInput = screen.getByPlaceholderText(/search graph/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('calls search when user types', async () => {
    const user = userEvent.setup();
    const mockOnSearchResults = vi.fn();
    render(<GraphControls onSearchResults={mockOnSearchResults} />);

    const searchInput = screen.getByPlaceholderText(/search graph/i);
    await user.type(searchInput, 'test query');

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled();
    });
  });

  it('calls onSearchResults with node IDs when results change', async () => {
    const mockOnSearchResults = vi.fn();
    const testResults = [
      { id: 'note-1', title: 'Test Note 1', updated_at: 123, rank: 1 },
      { id: 'note-2', title: 'Test Note 2', updated_at: 456, rank: 2 },
    ];

    mockResults.mockReturnValue(testResults);

    render(<GraphControls onSearchResults={mockOnSearchResults} />);

    await waitFor(() => {
      expect(mockOnSearchResults).toHaveBeenCalledWith(['note-1', 'note-2']);
    });
  });

  it('clears search results when input is cleared', async () => {
    const user = userEvent.setup();
    const mockOnSearchResults = vi.fn();

    // Start with results
    mockResults.mockReturnValue([
      { id: 'note-1', title: 'Test', updated_at: 123, rank: 1 },
    ]);

    const { rerender } = render(<GraphControls onSearchResults={mockOnSearchResults} />);

    // Clear results
    mockResults.mockReturnValue([]);
    rerender(<GraphControls onSearchResults={mockOnSearchResults} />);

    await waitFor(() => {
      expect(mockOnSearchResults).toHaveBeenCalledWith([]);
    });
  });
});
