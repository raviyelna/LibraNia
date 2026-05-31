import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportAPI } from './export';

describe('exportAPI', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads exported notes as a browser Markdown file', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          format: 'markdown',
          count: 1,
          notes: [{ id: 'note-1', title: 'Guide', body: 'Details' }],
        },
      }),
    }) as any;
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await expect(exportAPI.download('markdown', ['note-1'])).resolves.toBe(1);

    expect(global.fetch).toHaveBeenCalledWith('/api/export/notes', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ format: 'markdown', noteIds: ['note-1'] }),
    }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:export');
  });
});
