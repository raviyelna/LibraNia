import path from 'path';
import matter from 'gray-matter';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../database/schema.js';
import { loadAllProvidersFromEnv, loadProviderFromEnv } from '../store/env.store.js';
import { ClaudeProvider } from './ai/providers/claude.provider.js';
import { DeepSeekProvider } from './ai/providers/deepseek.provider.js';
import { OpenAIProvider } from './ai/providers/openai.provider.js';
import { appendContentReferenceToNote, type Content, updateContent } from './content.service.js';
import { parseWikiLinks } from './links.service.js';
import { createNote, deleteNote, getAllNotes, type Note } from './notes.service.js';
import { addTagsToNote } from './tags.service.js';

interface ImportedNoteDraft {
  title: string;
  body: string;
  tags: string[];
}

class LLMResponseFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMResponseFormatError';
  }
}

export interface ImportNoteOptions {
  providerId?: string;
  model?: string;
}

export interface ImportNoteResult {
  note: Note;
  content: Content;
  normalizedByAI: boolean;
}

function titleFromFilename(filename: string): string {
  const basename = path.basename(filename, path.extname(filename));
  const title = basename.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return title || 'Imported Note';
}

function sanitizeTitle(title: string, fallback: string): string {
  return title.replace(/^#+\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 160) || fallback;
}

function uniqueTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map(tag => tag.trim().toLocaleLowerCase())
    .filter(Boolean))]
    .slice(0, 12);
}

function appendMentionedNoteLinks(body: string, existingNotes: Note[]): string {
  const linkedTitles = new Set(parseWikiLinks(body).map(link => link.title.toLocaleLowerCase()));
  const mentioned = existingNotes.filter(note => {
    if (note.title.trim().length < 3) return false;
    if (linkedTitles.has(note.title.toLocaleLowerCase())) return false;
    return body.toLocaleLowerCase().includes(note.title.toLocaleLowerCase());
  });

  if (mentioned.length === 0) return body.trim();

  return `${body.trim()}\n\n## Related Notes\n\n${mentioned
    .slice(0, 12)
    .map(note => `- [[${note.title}]]`)
    .join('\n')}`;
}

function removeInventedLinks(body: string, existingNotes: Note[]): string {
  const knownTitles = new Set(existingNotes.map(note => note.title.toLocaleLowerCase()));
  return body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, title: string, alias?: string) => {
    return knownTitles.has(title.trim().toLocaleLowerCase()) ? _match : alias || title;
  });
}

function markdownDraft(content: Content, existingNotes: Note[]): ImportedNoteDraft {
  const parsed = matter(content.extracted_text || '');
  const heading = parsed.content.match(/^#\s+(.+)$/m)?.[1];
  const fallback = titleFromFilename(content.original_filename);
  const title = sanitizeTitle(
    typeof parsed.data.title === 'string' ? parsed.data.title : heading || fallback,
    fallback
  );

  return {
    title,
    body: appendMentionedNoteLinks(parsed.content, existingNotes),
    tags: uniqueTags(parsed.data.tags),
  };
}

function plainTextDraft(content: Content, existingNotes: Note[]): ImportedNoteDraft {
  const fallback = titleFromFilename(content.original_filename);
  return {
    title: fallback,
    body: appendMentionedNoteLinks(content.extracted_text || '', existingNotes),
    tags: [],
  };
}

function extractJSONObject(response: string): ImportedNoteDraft {
  if (!response.trim()) {
    throw new LLMResponseFormatError('The AI provider returned an empty response.');
  }

  const fenced = response.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const firstBrace = response.indexOf('{');
  const lastBrace = response.lastIndexOf('}');
  const candidate = fenced || (firstBrace >= 0 && lastBrace > firstBrace
    ? response.slice(firstBrace, lastBrace + 1)
    : '');

  if (!candidate.trim()) {
    throw new LLMResponseFormatError('The AI provider response did not contain a JSON object.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new LLMResponseFormatError('The AI provider response was not valid JSON.');
  }

  if (typeof parsed.title !== 'string' || typeof parsed.body !== 'string') {
    throw new LLMResponseFormatError('The AI provider response did not contain a valid note title and body.');
  }

  return {
    title: parsed.title,
    body: parsed.body,
    tags: uniqueTags(parsed.tags),
  };
}

async function normalizeWithAI(
  content: Content,
  existingNotes: Note[],
  options: ImportNoteOptions
): Promise<ImportedNoteDraft> {
  const config = options.providerId
    ? loadProviderFromEnv(options.providerId)
    : loadAllProvidersFromEnv()[0];
  if (!config) {
    throw new Error('Importing non-Markdown documents requires a configured AI provider. Add one in Settings.');
  }

  const Provider = config.id === 'claude'
    ? ClaudeProvider
    : (config.id === 'openai' || config.id === 'custom')
      ? OpenAIProvider
      : DeepSeekProvider;
  const provider = new Provider(
    config.apiKey,
    config.baseURL,
    Object.fromEntries((config.customHeaders || []).map(header => [header.name, header.value]))
  );
  const noteTitles = existingNotes.map(note => note.title).slice(0, 500);
  const response = await provider.generateResponse([
    {
      role: 'system',
      content: `Convert extracted document text into one clean Markdown knowledge note.
Return ONLY JSON with this shape: {"title":"...","body":"...","tags":["..."]}.
Choose a concise descriptive title. Preserve important facts and structure. Use headings, lists, and tables where useful.
Create wiki-links only when relevant and only using exact titles from the existing-note list, formatted [[Existing Note Title]].
Do not invent facts, links, or tags. Tags must be short lowercase concepts.`,
    },
    {
      role: 'user',
      content: `Original filename: ${content.original_filename}
Existing note titles: ${JSON.stringify(noteTitles)}

Extracted document text:
${content.extracted_text?.slice(0, 80_000)}`,
    },
  ], {
    model: options.model || config.model,
    temperature: 0.2,
    maxTokens: 4096,
  }, () => {});

  const draft = extractJSONObject(response);
  const fallback = titleFromFilename(content.original_filename);
  return {
    title: sanitizeTitle(draft.title, fallback),
    body: appendMentionedNoteLinks(removeInventedLinks(draft.body, existingNotes), existingNotes),
    tags: draft.tags,
  };
}

export async function importContentAsNote(
  content: Content,
  db: BetterSQLite3Database<typeof schema>,
  options: ImportNoteOptions = {}
): Promise<ImportNoteResult> {
  if (!content.extracted_text?.trim()) {
    throw new Error('No readable text could be extracted from this file.');
  }

  const existingNotes = await getAllNotes(db);
  let normalizedByAI = false;
  let draft: ImportedNoteDraft;

  if (content.mime_type === 'text/markdown') {
    draft = markdownDraft(content, existingNotes);
  } else {
    try {
      draft = await normalizeWithAI(content, existingNotes, options);
      normalizedByAI = true;
    } catch (error) {
      if (!(error instanceof LLMResponseFormatError)) {
        throw error;
      }
      console.warn(`[NoteImport] ${error.message} Importing extracted text without AI normalization.`);
      draft = plainTextDraft(content, existingNotes);
    }
  }

  const note = await createNote({
    title: draft.title,
    body: draft.body,
    metadata: JSON.stringify({
      importedFrom: content.original_filename,
      normalizedByAI,
    }),
  }, db);

  try {
    const attachedContent = await updateContent(content.id, { note_id: note.id }, db);
    await appendContentReferenceToNote(attachedContent, db);
    if (draft.tags.length > 0) {
      await addTagsToNote(note.id, draft.tags);
    }

    return { note, content: attachedContent, normalizedByAI };
  } catch (error) {
    await deleteNote(note.id, true, db).catch(() => {});
    throw error;
  }
}
