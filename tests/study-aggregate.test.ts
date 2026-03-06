import { describe, expect, it } from 'vitest';
import { applyStudyEvent, buildStudyDaily, buildStudyRecapData, createEmptySession, finalizeStudySession } from '@/lib/study/aggregate';

describe('study aggregate', () => {
  it('aggregates daily focus and actions by day', () => {
    const first = finalizeStudySession(
      applyStudyEvent(createEmptySession('demo', 's1', 'provas'), {
        action: 'doc_open',
        item: { type: 'doc', id: 'doc-1', label: 'Doc 1', href: '/c/demo/doc/doc-1' },
        lastSection: 'provas',
      }),
      { endedAt: '2026-03-05T12:20:00.000Z', focusSeconds: 600 },
    );
    const second = finalizeStudySession(
      applyStudyEvent(createEmptySession('demo', 's2', 'provas'), {
        action: 'highlight_created',
        item: { type: 'highlight', id: 'hl-1', label: 'Highlight 1', href: '/c/demo/doc/doc-1?hl=hl-1' },
        lastSection: 'provas',
      }),
      { endedAt: '2026-03-05T14:00:00.000Z', focusSeconds: 300 },
    );

    const daily = buildStudyDaily([first, second], 'UTC');
    expect(daily).toHaveLength(1);
    expect(daily[0]?.focusMinutes).toBe(15);
    expect(daily[0]?.actions.doc_open).toBe(1);
    expect(daily[0]?.actions.highlight_created).toBe(1);
  });

  it('builds recap cards with active days and studied items', () => {
    const sessionA = finalizeStudySession(
      applyStudyEvent(createEmptySession('demo', 's1', 'provas'), {
        action: 'evidence_view',
        item: { type: 'evidence', id: 'ev-1', label: 'Evidencia 1', href: '/c/demo/provas?selected=ev-1&panel=detail' },
        lastSection: 'provas',
      }),
      { endedAt: '2026-03-04T10:00:00.000Z', focusSeconds: 900 },
    );
    const sessionB = finalizeStudySession(
      applyStudyEvent(createEmptySession('demo', 's2', 'tutor'), {
        action: 'tutor_ask',
        item: { type: 'tutor', id: 'tp-1', label: 'Tutor point', href: '/c/demo/tutor/s/1/p/0' },
        lastSection: 'tutor',
      }),
      { endedAt: '2026-03-05T11:00:00.000Z', focusSeconds: 600 },
    );

    const recap = buildStudyRecapData({
      sessions: [sessionA, sessionB],
      timeZone: 'UTC',
      continueItem: { label: 'Tutor point', href: '/c/demo/tutor/s/1/p/0', section: 'tutor' },
      recommendations: { nodes: [], evidences: [] },
    });

    expect(recap.week.activeDays).toBeGreaterThanOrEqual(2);
    expect(recap.week.focusMinutes).toBe(25);
    expect(recap.week.itemsStudied).toBe(1);
    expect(recap.continueItem?.href).toContain('/c/demo/tutor');
  });
});
