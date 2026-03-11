import { describe, expect, it } from 'vitest';
import { EDITORIAL_PROGRAM_2026, getEditorialBatch2026Plan } from '@/lib/editorial/programBatch';

describe('editorial batch 2026', () => {
  it('defines three universes with unique slugs and labels', () => {
    const plan = getEditorialBatch2026Plan();
    expect(EDITORIAL_PROGRAM_2026.slug).toBe('programa-editorial-2026');
    expect(plan).toHaveLength(3);
    expect(new Set(plan.map((item) => item.slug)).size).toBe(3);
    expect(plan.map((item) => item.templateId)).toEqual(['issue_investigation', 'territorial_memory', 'campaign_watch']);
  });

  it('keeps all universes unpublished with bootstrap as current lane', () => {
    const plan = getEditorialBatch2026Plan();
    for (const universe of plan) {
      expect(universe.currentLane).toBe('bootstrap');
      expect(universe.nextLane).toBe('ingest');
      expect(universe.metas.docsImported).toBeGreaterThan(0);
    }
  });
});
