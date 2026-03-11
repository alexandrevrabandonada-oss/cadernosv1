import { describe, expect, it } from 'vitest';
import { resolveHomeEditorialState, type HomeEditorialSignal, type HomeEditorialUniverse } from '@/lib/catalog/homeEditorial';

function makeUniverse(overrides: Partial<HomeEditorialUniverse> & Pick<HomeEditorialUniverse, 'slug' | 'title'>): HomeEditorialUniverse {
  return {
    id: overrides.id ?? `u-${overrides.slug}`,
    slug: overrides.slug,
    title: overrides.title,
    summary: overrides.summary ?? `${overrides.title} summary`,
    cover_url: null,
    ui_theme: null,
    published_at: overrides.published_at ?? '2026-03-10T10:00:00.000Z',
    published: true,
    tags: overrides.tags ?? [],
    hasHighlights: overrides.hasHighlights ?? true,
    nodes: overrides.nodes ?? 4,
    trails: overrides.trails ?? 2,
    evidences: overrides.evidences ?? 6,
    is_featured: overrides.is_featured ?? false,
    featured_rank: overrides.featured_rank ?? 99,
    focus_note: overrides.focus_note ?? null,
    focus_override: overrides.focus_override ?? false,
  };
}

function makeSignal(universeSlug: string, type: HomeEditorialSignal['type'], id: string): HomeEditorialSignal {
  return {
    id,
    type,
    label: type,
    title: `${type} ${id}`,
    description: `signal ${id}`,
    href: `/c/${universeSlug}`,
    universeSlug,
  };
}

describe('home editorial engine', () => {
  it('uses published featured universe as focus when it is the strongest candidate', () => {
    const featured = makeUniverse({ slug: 'featured', title: 'Featured', is_featured: true, featured_rank: 1 });
    const regular = makeUniverse({ slug: 'regular', title: 'Regular', is_featured: false, featured_rank: 99, evidences: 1 });

    const result = resolveHomeEditorialState({
      universes: [regular, featured],
      signalsByUniverse: {
        featured: [makeSignal('featured', 'evidence', 'ev-1')],
        regular: [],
      },
    });

    expect(result.focusUniverse?.slug).toBe('featured');
    expect(result.featuredUniverses[0]?.slug).toBe('featured');
  });

  it('respects featured rank among featured universes when there is no focus override', () => {
    const rank2 = makeUniverse({ slug: 'rank-2', title: 'Rank 2', is_featured: true, featured_rank: 2 });
    const rank1 = makeUniverse({ slug: 'rank-1', title: 'Rank 1', is_featured: true, featured_rank: 1 });

    const result = resolveHomeEditorialState({
      universes: [rank2, rank1],
      signalsByUniverse: {
        'rank-1': [makeSignal('rank-1', 'thread', 'th-1')],
        'rank-2': [makeSignal('rank-2', 'event', 'ev-1')],
      },
    });

    expect(result.focusUniverse?.slug).toBe('rank-1');
    expect(result.featuredUniverses.map((item) => item.slug)).toEqual(['rank-1', 'rank-2']);
  });

  it('returns empty state when there are no published universes', () => {
    const result = resolveHomeEditorialState({
      universes: [],
      signalsByUniverse: {},
    });

    expect(result.focusUniverse).toBeNull();
    expect(result.featuredUniverses).toEqual([]);
    expect(result.signals).toEqual([]);
    expect(result.hasPublishedUniverses).toBe(false);
  });
});
