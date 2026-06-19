import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../database/schema.js';
import { loadAllProvidersFromEnv, loadProviderFromEnv } from '../store/env.store.js';
import { ClaudeProvider } from './ai/providers/claude.provider.js';
import { DeepSeekProvider } from './ai/providers/deepseek.provider.js';
import { OpenAIProvider } from './ai/providers/openai.provider.js';
import { parseWikiLinks } from './links.service.js';
import { getAllNotes, getNoteById, updateNote, type Note } from './notes.service.js';

export interface AutoLinkOptions {
  providerId?: string;
  model?: string;
}

export interface AutoLinkResult {
  note: Note;
  addedLinks: string[];
}

function extractJSON(response: string): { links?: unknown } | null {
  const fenced = response.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const firstBrace = response.indexOf('{');
  const lastBrace = response.lastIndexOf('}');
  const candidate = fenced || (firstBrace >= 0 && lastBrace > firstBrace
    ? response.slice(firstBrace, lastBrace + 1)
    : '');

  if (!candidate.trim()) {
    return null;
  }

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function extractSuggestedTitles(response: string, candidateTitles: string[]): string[] {
  const parsed = extractJSON(response);
  const fromJSON = Array.isArray(parsed?.links)
    ? parsed.links.filter((title): title is string => typeof title === 'string')
    : [];

  if (fromJSON.length > 0) {
    return fromJSON;
  }

  const responseLower = response.toLocaleLowerCase();
  return candidateTitles.filter((title) => {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wikiPattern = new RegExp(`\\[\\[\\s*${escaped}\\s*\\]\\]`, 'i');
    const quotedPattern = new RegExp(`["'\`]\\s*${escaped}\\s*["'\`]`, 'i');
    return wikiPattern.test(response) || quotedPattern.test(response) || responseLower.includes(`- ${title.toLocaleLowerCase()}`);
  });
}

function existingLinkedTitles(body: string): Set<string> {
  return new Set(parseWikiLinks(body).map(link => link.title.toLocaleLowerCase()));
}

function appendLinksToBody(body: string, titles: string[]): string {
  if (titles.length === 0) return body;

  const bullets = titles.map(title => `- [[${title}]]`).join('\n');
  const trimmed = body.trimEnd();

  if (/^##\s+Related Notes\s*$/im.test(trimmed)) {
    return `${trimmed}\n${bullets}\n`;
  }

  return `${trimmed}\n\n## Related Notes\n\n${bullets}\n`;
}

export async function autoLinkNote(
  noteId: string,
  db: BetterSQLite3Database<typeof schema>,
  options: AutoLinkOptions = {}
): Promise<AutoLinkResult> {
  const note = await getNoteById(noteId, db);
  if (!note) {
    throw new Error(`Note with id ${noteId} not found or is deleted`);
  }

  const config = options.providerId
    ? loadProviderFromEnv(options.providerId)
    : loadAllProvidersFromEnv()[0];
  if (!config) {
    throw new Error('Auto Link requires a configured AI provider. Add one in Settings.');
  }

  const allNotes = await getAllNotes(db);
  const alreadyLinked = existingLinkedTitles(note.body);
  const candidates = allNotes
    .filter(candidate => candidate.id !== note.id)
    .filter(candidate => !alreadyLinked.has(candidate.title.toLocaleLowerCase()))
    .map(candidate => ({
      title: candidate.title,
      excerpt: candidate.body.replace(/\s+/g, ' ').trim().slice(0, 500),
    }))
    .slice(0, 250);

  if (candidates.length === 0) {
    return { note, addedLinks: [] };
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
  const response = await provider.generateResponse([
    {
      role: 'system',
      content: `You add internal wiki-links for a personal knowledge base.
Return ONLY JSON with this shape: {"links":["Exact Existing Note Title"]}.
Choose only notes that are clearly related to the source note's topic, concepts, references, or neighborhood.
Use exact titles from the candidate list. Do not invent titles. Return at most 10 links. Return an empty array if there are no good links.`,
    },
    {
      role: 'user',
      content: `Source note:
Title: ${note.title}
Body:
${note.body.slice(0, 20_000)}

Candidate notes:
${JSON.stringify(candidates)}`,
    },
  ], {
    model: options.model || config.model,
    temperature: 0.1,
    maxTokens: 1024,
  }, () => {});

  const suggestedTitles = extractSuggestedTitles(response, candidates.map(candidate => candidate.title));
  if (suggestedTitles.length === 0 && response.trim()) {
    console.warn('[AutoLink] AI provider did not return parseable link suggestions. Response preview:', response.slice(0, 500));
  }

  const candidateByTitle = new Map(candidates.map(candidate => [candidate.title.toLocaleLowerCase(), candidate.title]));
  const addedLinks = [...new Set(suggestedTitles
    .map(title => candidateByTitle.get(title.trim().toLocaleLowerCase()))
    .filter((title): title is string => Boolean(title)))]
    .slice(0, 10);

  if (addedLinks.length === 0) {
    return { note, addedLinks: [] };
  }

  const updated = await updateNote(note.id, {
    body: appendLinksToBody(note.body, addedLinks),
  }, db);

  return { note: updated, addedLinks };
}
