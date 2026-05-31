import { apiRequest } from './client';
import type { Note } from './notes';

export type ExportFormat = 'markdown' | 'json';

interface ExportResponse {
  success: boolean;
  data: {
    format: ExportFormat;
    count: number;
    notes: Note[];
  };
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toMarkdown(notes: Note[]): string {
  return notes.map(note => [
    `# ${note.title}`,
    '',
    note.body,
  ].join('\n')).join('\n\n---\n\n');
}

export const exportAPI = {
  async download(format: ExportFormat, noteIds: string[]): Promise<number> {
    const response = await apiRequest<ExportResponse>('/api/export/notes', {
      method: 'POST',
      body: JSON.stringify({ format, noteIds }),
    });
    const filename = `librania-notes-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'markdown') {
      downloadFile(`${filename}.md`, toMarkdown(response.data.notes), 'text/markdown;charset=utf-8');
    } else {
      downloadFile(
        `${filename}.json`,
        JSON.stringify({ notes: response.data.notes }, null, 2),
        'application/json;charset=utf-8'
      );
    }

    return response.data.count;
  },
};
