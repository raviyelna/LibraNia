import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSearchService, SearchResult } from '../electron/services/ai/websearch.service';

// Mock duck-duck-scrape
vi.mock('duck-duck-scrape', () => ({
  search: vi.fn(),
}));

import { search } from 'duck-duck-scrape';

describe('WebSearchService', () => {
  let service: WebSearchService;

  beforeEach(() => {
    service = new WebSearchService();
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return array of SearchResult with title, url, snippet', async () => {
      const mockResults = {
        results: [
          { title: 'Test 1', url: 'https://example.com/1', description: 'Snippet 1' },
          { title: 'Test 2', url: 'https://example.com/2', description: 'Snippet 2' },
        ],
      };

      vi.mocked(search).mockResolvedValue(mockResults as any);

      const results = await service.search('test query');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        title: 'Test 1',
        url: 'https://example.com/1',
        snippet: 'Snippet 1',
      });
      expect(results[1]).toEqual({
        title: 'Test 2',
        url: 'https://example.com/2',
        snippet: 'Snippet 2',
      });
    });

    it('should limit results to maxResults parameter (default 5 per D-14)', async () => {
      const mockResults = {
        results: Array.from({ length: 10 }, (_, i) => ({
          title: `Test ${i + 1}`,
          url: `https://example.com/${i + 1}`,
          description: `Snippet ${i + 1}`,
        })),
      };

      vi.mocked(search).mockResolvedValue(mockResults as any);

      const results = await service.search('test query');

      expect(results).toHaveLength(5);
    });

    it('should respect custom maxResults parameter', async () => {
      const mockResults = {
        results: Array.from({ length: 10 }, (_, i) => ({
          title: `Test ${i + 1}`,
          url: `https://example.com/${i + 1}`,
          description: `Snippet ${i + 1}`,
        })),
      };

      vi.mocked(search).mockResolvedValue(mockResults as any);

      const results = await service.search('test query', 3);

      expect(results).toHaveLength(3);
    });

    it('should return empty array on error (graceful degradation)', async () => {
      vi.mocked(search).mockRejectedValue(new Error('Network error'));

      const results = await service.search('test query');

      expect(results).toEqual([]);
    });
  });

  describe('formatResultsForPrompt', () => {
    it('should create numbered citation format [1], [2], [3]', () => {
      const results: SearchResult[] = [
        { title: 'Test 1', url: 'https://example.com/1', snippet: 'Snippet 1' },
        { title: 'Test 2', url: 'https://example.com/2', snippet: 'Snippet 2' },
        { title: 'Test 3', url: 'https://example.com/3', snippet: 'Snippet 3' },
      ];

      const formatted = service.formatResultsForPrompt(results);

      expect(formatted).toContain('[1]');
      expect(formatted).toContain('[2]');
      expect(formatted).toContain('[3]');
    });

    it('should include title, snippet, and source URL per D-18', () => {
      const results: SearchResult[] = [
        { title: 'React Docs', url: 'https://react.dev', snippet: 'Learn React' },
      ];

      const formatted = service.formatResultsForPrompt(results);

      expect(formatted).toContain('React Docs');
      expect(formatted).toContain('Learn React');
      expect(formatted).toContain('Source: https://react.dev');
    });

    it('should return empty string if results array is empty', () => {
      const formatted = service.formatResultsForPrompt([]);

      expect(formatted).toBe('');
    });
  });

  describe('extractCitations', () => {
    it('should convert SearchResult[] to citation objects with position', () => {
      const results: SearchResult[] = [
        { title: 'Test 1', url: 'https://example.com/1', snippet: 'Snippet 1' },
        { title: 'Test 2', url: 'https://example.com/2', snippet: 'Snippet 2' },
      ];

      const citations = service.extractCitations(results);

      expect(citations).toHaveLength(2);
      expect(citations[0]).toEqual({
        url: 'https://example.com/1',
        title: 'Test 1',
        snippet: 'Snippet 1',
        position: 1,
      });
      expect(citations[1]).toEqual({
        url: 'https://example.com/2',
        title: 'Test 2',
        snippet: 'Snippet 2',
        position: 2,
      });
    });

    it('should return empty array for empty results', () => {
      const citations = service.extractCitations([]);

      expect(citations).toEqual([]);
    });
  });
});
