import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickNav } from '../../src/components/Notes/QuickNav';

const mockApi = {
  search: {
    quickNav: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    (window as any).api = mockApi;
  }
});

describe('QuickNav', () => {
  it('should open modal with Cmd+K', () => {
    const onNavigate = vi.fn();
    render(<QuickNav onNavigate={onNavigate} />);

    // Simulate Cmd+K
    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(screen.getByPlaceholderText(/search notes/i)).toBeInTheDocument();
  });

  it('should open modal with Ctrl+K', () => {
    const onNavigate = vi.fn();
    render(<QuickNav onNavigate={onNavigate} />);

    // Simulate Ctrl+K
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByPlaceholderText(/search notes/i)).toBeInTheDocument();
  });

  it('should search notes when typing', async () => {
    const mockResults = [
      { id: '1', title: 'React Basics', updated_at: Date.now(), rank: -1.5 },
      { id: '2', title: 'React Hooks', updated_at: Date.now(), rank: -2.0 },
    ];
    mockApi.search.quickNav.mockResolvedValue(mockResults);

    const onNavigate = vi.fn();
    render(<QuickNav onNavigate={onNavigate} />);

    // Open modal
    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    const searchInput = screen.getByPlaceholderText(/search notes/i);
    fireEvent.change(searchInput, { target: { value: 'react' } });

    await waitFor(() => {
      expect(screen.getByText('React Basics')).toBeInTheDocument();
    });

    expect(screen.getByText('React Hooks')).toBeInTheDocument();
  });

  it('should navigate with arrow keys', async () => {
    const mockResults = [
      { id: '1', title: 'React Basics', updated_at: Date.now(), rank: -1.5 },
      { id: '2', title: 'React Hooks', updated_at: Date.now(), rank: -2.0 },
    ];
    mockApi.search.quickNav.mockResolvedValue(mockResults);

    const onNavigate = vi.fn();
    render(<QuickNav onNavigate={onNavigate} />);

    // Open modal
    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    const searchInput = screen.getByPlaceholderText(/search notes/i);
    fireEvent.change(searchInput, { target: { value: 'react' } });

    await waitFor(() => {
      expect(screen.getByText('React Basics')).toBeInTheDocument();
    });

    // Arrow down
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    // First item should be selected by default, arrow down moves to second
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveClass('selected');
  });

  it('should navigate on Enter key', async () => {
    const mockResults = [
      { id: '1', title: 'React Basics', updated_at: Date.now(), rank: -1.5 },
    ];
    mockApi.search.quickNav.mockResolvedValue(mockResults);

    const onNavigate = vi.fn();
    render(<QuickNav onNavigate={onNavigate} />);

    // Open modal
    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    const searchInput = screen.getByPlaceholderText(/search notes/i);
    fireEvent.change(searchInput, { target: { value: 'react' } });

    await waitFor(() => {
      expect(screen.getByText('React Basics')).toBeInTheDocument();
    });

    // Press Enter
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onNavigate).toHaveBeenCalledWith('1');
  });

  it('should close on Escape key', () => {
    const onNavigate = vi.fn();
    render(<QuickNav onNavigate={onNavigate} />);

    // Open modal
    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(screen.getByPlaceholderText(/search notes/i)).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByPlaceholderText(/search notes/i)).not.toBeInTheDocument();
  });

  it('should navigate on click', async () => {
    const mockResults = [
      { id: '1', title: 'React Basics', updated_at: Date.now(), rank: -1.5 },
    ];
    mockApi.search.quickNav.mockResolvedValue(mockResults);

    const onNavigate = vi.fn();
    render(<QuickNav onNavigate={onNavigate} />);

    // Open modal
    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    const searchInput = screen.getByPlaceholderText(/search notes/i);
    fireEvent.change(searchInput, { target: { value: 'react' } });

    await waitFor(() => {
      expect(screen.getByText('React Basics')).toBeInTheDocument();
    });

    // Click on result
    fireEvent.click(screen.getByText('React Basics'));

    expect(onNavigate).toHaveBeenCalledWith('1');
  });
});
