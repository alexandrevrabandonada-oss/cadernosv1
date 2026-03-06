import { describe, expect, it } from 'vitest';
import { recommendStudyNext } from '@/lib/study/recommend';
import type { StudySession } from '@/lib/study/types';

const sessions: StudySession[] = [
  {
    id: 's1',
    universeSlug: 'demo',
    startedAt: '2026-03-05T10:00:00.000Z',
    endedAt: '2026-03-05T10:20:00.000Z',
    durationSec: 1200,
    focusMinutes: 20,
    lastSection: 'provas',
    stats: { evidence_view: 2, doc_open: 1 },
    items: [
      { type: 'evidence', id: 'ev-1', action: 'evidence_view', count: 2, label: 'Evidencia A', nodeSlug: 'saude', tags: ['sus'] },
      { type: 'doc', id: 'doc-1', action: 'doc_open', count: 1, label: 'Doc A', nodeSlug: 'saude', tags: ['sus'] },
    ],
  },
];

describe('study recommendations', () => {
  it('prefers nodes and evidences aligned with prior activity', () => {
    const result = recommendStudyNext({
      sessions,
      nodes: [
        { id: 'n1', slug: 'saude', title: 'Saude publica', tags: ['sus'] },
        { id: 'n2', slug: 'trabalho', title: 'Trabalho', tags: ['emprego'] },
        { id: 'n3', slug: 'educacao', title: 'Educacao', tags: ['escola'] },
      ],
      evidences: [
        { id: 'ev-1', title: 'Fila do SUS', href: '/c/demo/provas?selected=ev-1', nodeSlug: 'saude', tags: ['sus'] },
        { id: 'ev-2', title: 'Mercado de trabalho', href: '/c/demo/provas?selected=ev-2', nodeSlug: 'trabalho', tags: ['emprego'] },
        { id: 'ev-3', title: 'APS em territorio', href: '/c/demo/provas?selected=ev-3', nodeSlug: 'saude', tags: ['sus'] },
      ],
    });

    expect(result.nodes[0]?.slug).toBe('saude');
    expect(result.evidences[0]?.nodeSlug).toBe('saude');
    expect(result.evidences).toHaveLength(3);
  });
});
