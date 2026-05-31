import { promises as fs } from 'fs';
import { lookup } from 'dns/promises';
import net from 'net';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema.js';
import {
  createContent,
  deleteContent,
  getContentMarkdownReference,
  updateContent,
  type Content,
} from './content.service.js';
import { getNoteById, updateNote } from './notes.service.js';
import { logger } from '../logger.js';

const MAX_REMOTE_IMAGES = 3;
const MAX_REMOTE_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const DOWNLOAD_TIMEOUT_MS = 10_000;

export interface RemoteNoteImage {
  url: string;
  section?: string;
  alt?: string;
}

function isPublicIpAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b, c] = address.split('.').map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith('::ffff:')) {
      return isPublicIpAddress(normalized.slice('::ffff:'.length));
    }
    return !(
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    );
  }

  return false;
}

async function assertPublicImageUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP(S) image URLs are allowed');
  }
  if (url.username || url.password) {
    throw new Error('Image URLs with credentials are not allowed');
  }

  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new Error('Image URL must resolve to a public network address');
  }

  return url;
}

function getRemoteFilename(url: URL): string {
  const basename = path.basename(decodeURIComponent(url.pathname)) || 'web-image';
  return basename.replace(/[\[\]()]/g, '_').slice(0, 120) || 'web-image';
}

async function downloadRemoteImage(rawUrl: string): Promise<{ tempPath: string; filename: string }> {
  let url = await assertPublicImageUrl(rawUrl);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirects === MAX_REDIRECTS) {
        throw new Error('Image download exceeded redirect limit');
      }
      url = await assertPublicImageUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`Image download failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type')?.split(';')[0].trim();
    if (!contentType?.startsWith('image/') || contentType === 'image/svg+xml') {
      throw new Error(`Unsupported remote image type: ${contentType || 'unknown'}`);
    }

    const declaredSize = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_REMOTE_IMAGE_SIZE) {
      throw new Error('Remote image is too large');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_REMOTE_IMAGE_SIZE) {
      throw new Error('Remote image is too large');
    }

    const filename = getRemoteFilename(url);
    const tempPath = path.join(os.tmpdir(), `librania-web-image-${crypto.randomUUID()}-${filename}`);
    await fs.writeFile(tempPath, buffer);
    return { tempPath, filename };
  }

  throw new Error('Image download failed');
}

function normalizeHeading(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findIllustrationPoints(body: string): Array<{ offset: number; heading?: string }> {
  const relatedNotesOffset = body.search(/^## Related Notes\s*$/m);
  const searchableBody = relatedNotesOffset >= 0 ? body.slice(0, relatedNotesOffset) : body;
  const lines = searchableBody.match(/.*(?:\r?\n|$)/g)?.filter(Boolean) || [];
  const points: Array<{ offset: number; heading?: string }> = [];
  let offset = 0;
  let activeHeading: string | undefined;
  let inFence = false;
  let blockEnd: number | undefined;

  const flushBlock = () => {
    if (blockEnd !== undefined) {
      points.push({ offset: blockEnd, heading: activeHeading });
      blockEnd = undefined;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const lineEnd = offset + line.length;

    if (trimmed.startsWith('```')) {
      flushBlock();
      inFence = !inFence;
    } else if (!inFence && /^#{1,6}\s+/.test(trimmed)) {
      flushBlock();
      activeHeading = trimmed.replace(/^#{1,6}\s+/, '');
    } else if (!inFence && trimmed === '') {
      flushBlock();
    } else if (
      !inFence &&
      !trimmed.startsWith('![') &&
      !trimmed.startsWith('|') &&
      !trimmed.startsWith('---')
    ) {
      blockEnd = lineEnd;
    }

    offset = lineEnd;
  }

  flushBlock();
  return points;
}

export function insertImageReferenceIntoBody(
  body: string,
  reference: string,
  imageIndex: number,
  imageCount: number,
  section?: string
): string {
  if (body.includes(reference)) return body;

  const points = findIllustrationPoints(body);
  const normalizedSection = section ? normalizeHeading(section) : '';
  const sectionPoint = normalizedSection
    ? points.find(point => point.heading && (
      normalizeHeading(point.heading).includes(normalizedSection) ||
      normalizedSection.includes(normalizeHeading(point.heading))
    ))
    : undefined;
  const distributedIndex = points.length > 0
    ? Math.min(points.length - 1, Math.floor((imageIndex * points.length) / Math.max(imageCount, 1)))
    : -1;
  const insertionOffset = sectionPoint?.offset ?? points[distributedIndex]?.offset ?? body.length;
  const before = body.slice(0, insertionOffset).replace(/\s+$/, '');
  const after = body.slice(insertionOffset).replace(/^\s+/, '');

  return `${before}${before ? '\n\n' : ''}${reference}${after ? `\n\n${after}` : '\n'}`;
}

export async function importRemoteImagesToNote(
  images: Array<string | RemoteNoteImage>,
  noteId: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<Content[]> {
  const imported: Content[] = [];
  const uniqueImages = [...new Map(images
    .map(image => typeof image === 'string' ? { url: image } : image)
    .filter(image => typeof image?.url === 'string' && image.url.trim())
    .map(image => [image.url, image])).values()]
    .slice(0, MAX_REMOTE_IMAGES);

  for (const [imageIndex, image] of uniqueImages.entries()) {
    const imageUrl = image.url;
    let tempPath: string | undefined;
    let contentId: string | undefined;

    try {
      const download = await downloadRemoteImage(imageUrl);
      tempPath = download.tempPath;
      const record = await createContent({
        filePath: tempPath,
        originalFilename: download.filename,
        source: 'ai-generated',
        note_id: noteId,
      }, db);
      contentId = record.id;
      const updated = await updateContent(record.id, {
        metadata: JSON.stringify({ sourceUrl: imageUrl, section: image.section, alt: image.alt }),
      }, db);
      const note = await getNoteById(noteId, db);
      if (!note) throw new Error(`Note with id ${noteId} not found or is deleted`);
      const reference = image.alt
        ? `![${image.alt}](${updated.file_path})`
        : getContentMarkdownReference(updated);
      await updateNote(noteId, {
        body: insertImageReferenceIntoBody(
          note.body,
          reference,
          imageIndex,
          uniqueImages.length,
          image.section
        ),
      }, db);
      imported.push(updated);
    } catch (error) {
      logger.warn('Skipping remote note image', { imageUrl, error });
      if (contentId) {
        await deleteContent(contentId, db).catch(() => {});
      }
    } finally {
      if (tempPath) {
        await fs.unlink(tempPath).catch(() => {});
      }
    }
  }

  return imported;
}
