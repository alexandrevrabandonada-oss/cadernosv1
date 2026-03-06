import { describe, expect, it } from 'vitest';
import { applyNotebookTemplate, getNotebookTemplate, listNotebookTemplates } from '@/lib/shared-notebooks/templates';

describe('shared notebook templates', () => {
  it('lists expected templates', () => {
    const templates = listNotebookTemplates();
    expect(templates.map((item) => item.id)).toEqual(['weekly_base', 'clipping', 'study_group', 'thematic_core']);
    expect(templates[0]?.preferredSources).toContain('evidence');
  });

  it('applies weekly_base defaults with slug and meta', () => {
    const template = getNotebookTemplate('weekly_base');
    const applied = applyNotebookTemplate(template, {});
    expect(applied.title).toBe('Base da Semana');
    expect(applied.slug).toBe('base-da-semana');
    expect(applied.visibility).toBe('team');
    expect(applied.templateMeta.suggestedTags).toContain('semana');
    expect(applied.templateMeta.preferredSources[0]).toBe('highlight');
  });

  it('respects overrides while preserving template meta', () => {
    const template = getNotebookTemplate('study_group');
    const applied = applyNotebookTemplate(template, {
      title: 'Grupo de Estudo TAC',
      summary: 'Resumo proprio',
      visibility: 'private',
    });
    expect(applied.title).toBe('Grupo de Estudo TAC');
    expect(applied.slug).toBe('grupo-de-estudo-tac');
    expect(applied.summary).toBe('Resumo proprio');
    expect(applied.visibility).toBe('private');
    expect(applied.templateMeta.preferredSources).toContain('thread');
  });
});
