import { afterEach, describe, expect, it, vi } from 'vitest';
import { callDeepSeek } from './ai-chat.service';
import { closeDatabase, getDatabase, initDatabase } from '../../database/connection';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe('callDeepSeek', () => {
  const originalDataDir = process.env.LIBRANIA_DATA_DIR;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalDataDir === undefined) {
      delete process.env.LIBRANIA_DATA_DIR;
    } else {
      process.env.LIBRANIA_DATA_DIR = originalDataDir;
    }
  });

  it('uses the configured OpenAI-compatible base URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: 'Configured endpoint response' } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await callDeepSeek(
      [{ role: 'user', content: 'Hello' }],
      'test-key',
      'custom-model',
      'https://gateway.example.com/v1'
    );

    expect(response).toBe('Configured endpoint response');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gateway.example.com/v1/chat/completions',
      expect.any(Object)
    );
  });

  it('rejects a completion that contains no final answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      choices: [{
        finish_reason: 'stop',
        message: {
          content: null,
          reasoning_content: 'Internal reasoning without a final answer',
        },
      }],
    })));

    await expect(callDeepSeek(
      [{ role: 'user', content: 'Hello' }],
      'test-key',
      'custom-model'
    )).rejects.toThrow(
      'DeepSeek API returned an empty final answer (finish_reason: stop). The model returned reasoning but no final content.'
    );
  });

  it('removes web search after three calls while keeping write-back tools', async () => {
    process.env.LIBRANIA_DATA_DIR = 'Z:\\missing-librania-test-data';
    const toolCall = (id: string, query: string) => ({
      choices: [{
        message: {
          content: null,
          tool_calls: [{
            id,
            function: {
              name: 'web_search',
              arguments: JSON.stringify({ query }),
            },
          }],
        },
      }],
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(toolCall('call-1', 'query one')))
      .mockResolvedValueOnce(jsonResponse(toolCall('call-2', 'query two')))
      .mockResolvedValueOnce(jsonResponse(toolCall('call-3', 'query three')))
      .mockResolvedValueOnce(jsonResponse({
        choices: [{ message: { content: 'Synthesized answer' } }],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await callDeepSeek(
      [{ role: 'user', content: 'Research this topic' }],
      'test-key',
      'custom-model',
      undefined,
      [{
        name: 'web_search',
        description: 'Search the web',
        input_schema: { type: 'object', properties: {}, required: [] },
      }, {
        name: 'create_note',
        description: 'Create a note',
        input_schema: { type: 'object', properties: {}, required: [] },
      }]
    );

    expect(response).toBe('Synthesized answer');
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const finalRequest = JSON.parse(fetchMock.mock.calls[3][1].body);
    expect(finalRequest.tools).toHaveLength(1);
    expect(finalRequest.tools[0].function.name).toBe('create_note');
    expect(finalRequest.messages.at(-1).content).toContain('Web search is complete');
  });

  it('executes DSML note, link, and tag tool calls', async () => {
    process.env.LIBRANIA_DATA_DIR = 'Z:\\missing-librania-test-data';
    await initDatabase(':memory:');
    const db = getDatabase();
    const now = Date.now();
    db.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?)
    `).run('related-note', 'Related Note', 'Existing knowledge', now, now);
    db.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?)
    `).run('tag-target', 'Tag Target', 'Existing note for tags', now, now);

    const dsml = `<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="create_note">
<｜｜DSML｜｜parameter name="title" string="true">AgentCore Guide</｜｜DSML｜｜parameter>
<｜｜DSML｜｜parameter name="body" string="true">Setup details. See [[Related Note]].</｜｜DSML｜｜parameter>
</｜｜DSML｜｜invoke>
<｜｜DSML｜｜invoke name="add_tags">
<｜｜DSML｜｜parameter name="noteId" string="true">tag-target</｜｜DSML｜｜parameter>
<｜｜DSML｜｜parameter name="tags">["aws","agentcore"]</｜｜DSML｜｜parameter>
</｜｜DSML｜｜invoke>
</｜｜DSML｜｜tool_calls>`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        choices: [{ message: { content: dsml } }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        choices: [{ message: { content: 'Normal final answer' } }],
      }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      const response = await callDeepSeek(
        [{ role: 'user', content: 'Create a guide' }],
        'test-key',
        'custom-model',
        undefined,
        [
          {
            name: 'create_note',
            description: 'Create a note',
            input_schema: { type: 'object', properties: {}, required: [] },
          },
          {
            name: 'add_tags',
            description: 'Add tags',
            input_schema: { type: 'object', properties: {}, required: [] },
          },
        ]
      );

      expect(response).toBe('Normal final answer');
      expect(db.prepare('SELECT title FROM notes WHERE title = ?').get('AgentCore Guide')).toEqual({
        title: 'AgentCore Guide',
      });
      expect(db.prepare('SELECT COUNT(*) AS count FROM links').get()).toEqual({ count: 1 });
      expect(db.prepare(`
        SELECT tags.name
        FROM tags
        JOIN note_tags ON note_tags.tag_id = tags.id
        WHERE note_tags.note_id = ?
        ORDER BY tags.name
      `).all('tag-target')).toEqual([{ name: 'agentcore' }, { name: 'aws' }]);
    } finally {
      closeDatabase();
    }
  });
});
