import { describe, expect, it } from 'vitest';
import { applyUniverseBootstrapTemplate, getUniverseBootstrapTemplate, listUniverseBootstrapTemplates } from '@/lib/universe/bootstrapTemplates';
import { buildBootstrapTemplateSnapshot, buildClonePreview, normalizeCloneOptions } from '@/lib/universe/bootstrap';

describe('universe bootstrap templates', () => {
  it('lists the operational templates and derives title/slug defaults', () => {
    const templates = listUniverseBootstrapTemplates();
    expect(templates.map((template) => template.id)).toEqual([
      'blank_minimal',
      'issue_investigation',
      'territorial_memory',
      'campaign_watch',
    ]);

    const issue = getUniverseBootstrapTemplate('issue_investigation');
    const applied = applyUniverseBootstrapTemplate(issue, {
      title: 'Poluicao em Volta Redonda',
    });

    expect(applied.slug).toBe('poluicao-em-volta-redonda');
    expect(applied.summary).toContain('Universo criado');
    expect(issue?.seedNodes.some((node) => node.slug === 'contexto')).toBe(true);
  });

  it('builds a stable seed snapshot for issue investigation', () => {
    const snapshot = buildBootstrapTemplateSnapshot('issue_investigation');
    expect(snapshot.nodes.length).toBeGreaterThanOrEqual(7);
    expect(snapshot.questions.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.collectiveTemplateIds).toContain('weekly_base');
  });

  it('keeps clone guardrails and disables blocked structures when options are off', () => {
    const preview = buildClonePreview({
      source: {
        nodes: 7,
        glossary: 3,
        questions: 4,
        trails: 2,
        collectiveTemplates: 2,
        evidences: 9,
        exports: 4,
        analytics: 12,
      },
      options: normalizeCloneOptions({
        nodes: true,
        glossary: false,
        trails: true,
        nodeQuestions: false,
        collectiveTemplates: true,
        homeEditorialDefaults: false,
      }),
    });

    expect(preview.copied.nodes).toBe(7);
    expect(preview.copied.glossary).toBe(0);
    expect(preview.copied.nodeQuestions).toBe(0);
    expect(preview.blocked.evidences).toBe(9);
    expect(preview.blocked.userNotes).toBe('never');
  });
});
