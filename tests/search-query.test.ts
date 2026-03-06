import { describe, expect, it } from 'vitest';
import { parseSearchQuery, parseSearchTypes } from '@/lib/search/query';

describe('search query parser', () => {
  it('detects @ as notes-only and strips the prefix', () => {
    const parsed = parseSearchQuery('@highlight real');
    expect(parsed.notesOnly).toBe(true);
    expect(parsed.text).toBe('highlight real');
    expect(parsed.tags).toEqual([]);
  });

  it('extracts #tags and keeps the remaining text', () => {
    const parsed = parseSearchQuery('conceito #demo #saude');
    expect(parsed.notesOnly).toBe(false);
    expect(parsed.text).toBe('conceito');
    expect(parsed.tags).toEqual(['demo', 'saude']);
  });

  it('normalizes requested types and falls back to all when invalid', () => {
    expect(parseSearchTypes('node,term,note')).toEqual(['node', 'term', 'note']);
    expect(parseSearchTypes('invalid')).toEqual(['node', 'term', 'doc', 'evidence', 'event', 'thread', 'note']);
  });
});
