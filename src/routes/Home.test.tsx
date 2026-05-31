import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from './Home';

vi.mock('../hooks/useNotes', () => ({
  useNotes: () => ({
    notes: [
      { id: 'note-1', title: 'Prompt Security', updated_at: new Date().toISOString() },
      { id: 'note-2', title: 'Knowledge Graphs', updated_at: new Date().toISOString() },
    ],
    loading: false,
  }),
}));

vi.mock('../hooks/useGraph', () => ({
  useGraph: () => ({
    graphData: {
      nodes: [{ id: 'note-1' }, { id: 'note-2' }],
      links: [{ source: 'note-1', target: 'note-2' }],
    },
    loading: false,
  }),
}));

vi.mock('../hooks/useTags', () => ({
  useTags: () => ({
    tags: [{ id: 'tag-1', name: 'security' }],
    loading: false,
  }),
}));

vi.mock('../hooks/useConversations', () => ({
  useConversations: () => ({
    conversations: [{ id: 'conversation-1', title: 'Research AI security', updated_at: new Date().toISOString() }],
    loading: false,
  }),
}));

describe('Home dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders live workspace metrics and widgets', () => {
    render(<Home />, { wrapper: MemoryRouter });

    expect(screen.getByText('Your LibraNia dashboard')).toBeInTheDocument();
    expect(screen.getByText('Prompt Security')).toBeInTheDocument();
    expect(screen.getByText('Research AI security')).toBeInTheDocument();
    expect(screen.getByText('0.5')).toBeInTheDocument();
  });

  it('persists hidden dashboard widgets', () => {
    render(<Home />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    fireEvent.click(screen.getByRole('button', { name: /Recent notes/ }));

    expect(screen.queryByText('Prompt Security')).not.toBeInTheDocument();
    expect(localStorage.getItem('home-dashboard-widgets')).toContain('"recentNotes":false');
  });
});
