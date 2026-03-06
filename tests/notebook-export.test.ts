import { describe, expect, it } from 'vitest';
import { NOTEBOOK_ITEM_CHAR_LIMIT, NOTEBOOK_MAX_ITEMS, prepareNotebookExport } from '@/lib/export/notebook';

describe('notebook export renderer', () => {
  it('clamps item text and total item count', () => {
    const prepared = prepareNotebookExport({
      slug: 'demo',
      items: Array.from({ length: NOTEBOOK_MAX_ITEMS + 5 }, (_, index) => ({
        kind: index % 2 === 0 ? 'highlight' : 'note',
        title: `Item ${index + 1}`,
        text: 'x'.repeat(NOTEBOOK_ITEM_CHAR_LIMIT + 80),
        tags: ['alpha', `tag-${index}`],
        source: { type: 'evidence', id: `ev-${index}`, meta: {} },
        linkToApp: `/c/demo/provas?selected=ev-${index}`,
      })),
    });

    expect(prepared.items).toHaveLength(NOTEBOOK_MAX_ITEMS);
    expect(prepared.stats.omittedItems).toBe(5);
    expect(prepared.items[0]?.text.length).toBeLessThanOrEqual(NOTEBOOK_ITEM_CHAR_LIMIT);
  });
});
