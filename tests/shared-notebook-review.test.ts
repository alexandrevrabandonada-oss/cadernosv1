import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('shared notebook review flow (mock)', () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as typeof globalThis & { __cvSharedNotebookMockState?: unknown }).__cvSharedNotebookMockState = {
      notebooks: [],
      members: [],
      items: [],
      auditLogs: [],
    };
  });

  it('moves item through draft, review and promote with audit trail', async () => {
    const mod = await import('@/lib/shared-notebooks/mock');
    const notebook = mod.createMockSharedNotebook({
      universeSlug: 'demo',
      universeId: 'u-1',
      userId: 'user-1',
      title: 'Base da semana',
      visibility: 'team',
    });

    const item = mod.addMockSharedNotebookItem({
      notebookId: notebook.id,
      universeSlug: 'demo',
      universeId: 'u-1',
      userId: 'user-1',
      sourceType: 'note',
      title: 'Nota base',
      text: 'Trecho para fila editorial coletiva.',
      tags: ['demo'],
    });
    expect(item?.reviewStatus).toBe('draft');

    const inReview = mod.updateMockSharedNotebookReview({
      universeSlug: 'demo',
      notebookId: notebook.id,
      itemId: item?.id ?? '',
      toStatus: 'review',
      note: 'Subir para review',
      userId: 'user-1',
    });
    expect(inReview?.reviewStatus).toBe('review');
    expect(inReview?.editorialNote).toBe('Subir para review');

    const promoted = mod.promoteMockSharedNotebookItem({
      universeSlug: 'demo',
      notebookId: notebook.id,
      itemId: item?.id ?? '',
      targetType: 'evidence',
      note: 'Promovido para evidence',
      userId: 'user-1',
    });
    expect(promoted?.item.reviewStatus).toBe('approved');
    expect(promoted?.item.promotedType).toBe('evidence');
    expect(promoted?.promotedId).toBeTruthy();

    const detail = mod.getMockSharedNotebookReview({
      universeSlug: 'demo',
      notebookIdOrSlug: notebook.id,
      userId: 'user-1',
      isUniversePublished: true,
    });
    expect(detail?.auditByItem[item?.id ?? '']?.map((entry) => entry.action)).toEqual(['promote', 'status_change', 'create']);
  });
});
