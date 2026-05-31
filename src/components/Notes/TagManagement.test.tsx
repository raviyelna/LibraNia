import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TagManagement } from './TagManagement';

const { mockTagsAPI } = vi.hoisted(() => ({
  mockTagsAPI: {
    getAll: vi.fn(),
    getByNote: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    addToNote: vi.fn(),
    removeFromNote: vi.fn(),
  },
}));

vi.mock('../../api', () => ({
  tagsAPI: mockTagsAPI,
}));

vi.mock('../../utils/toast', () => ({
  handleAPIError: vi.fn(),
}));

describe('TagManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTagsAPI.getAll.mockResolvedValue([
      { id: 'tag-1', name: 'security', created_at: '2026-05-31' },
    ]);
    mockTagsAPI.getByNote.mockResolvedValue([]);
    mockTagsAPI.create.mockResolvedValue({ id: 'tag-2', name: 'cloud', created_at: '2026-05-31' });
    mockTagsAPI.delete.mockResolvedValue(undefined);
    mockTagsAPI.addToNote.mockResolvedValue(undefined);
    mockTagsAPI.removeFromNote.mockResolvedValue(undefined);
  });

  it('creates a global tag', async () => {
    render(<TagManagement selectedNoteId={null} />);

    await screen.findByText('security');
    fireEvent.change(screen.getByPlaceholderText('Create a tag...'), { target: { value: 'cloud' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create tag' }));

    await waitFor(() => expect(mockTagsAPI.create).toHaveBeenCalledWith({ name: 'cloud' }));
  });

  it('links a tag to the selected note', async () => {
    render(<TagManagement selectedNoteId="note-1" />);

    await screen.findByText('security');
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));

    await waitFor(() => expect(mockTagsAPI.addToNote).toHaveBeenCalledWith('note-1', 'security'));
  });

  it('deletes a global tag after confirmation', async () => {
    render(<TagManagement selectedNoteId={null} />);

    await screen.findByText('security');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete tag' }));

    await waitFor(() => expect(mockTagsAPI.delete).toHaveBeenCalledWith('tag-1'));
  });
});
