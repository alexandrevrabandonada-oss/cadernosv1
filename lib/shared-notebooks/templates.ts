import type { SharedNotebookSourceType, SharedNotebookVisibility } from '@/lib/shared-notebooks/types';

export type SharedNotebookTemplateId = 'blank' | 'weekly_base' | 'clipping' | 'study_group' | 'thematic_core';

export type SharedNotebookTemplateDefinition = {
  id: Exclude<SharedNotebookTemplateId, 'blank'>;
  label: string;
  title: string;
  visibility: SharedNotebookVisibility;
  summary: string;
  suggestedTags: string[];
  preferredSources: SharedNotebookSourceType[];
  microcopy: string;
  createCta: string;
};

export type SharedNotebookTemplateMeta = {
  suggestedTags: string[];
  preferredSources: SharedNotebookSourceType[];
  microcopy: string;
};

const templates: SharedNotebookTemplateDefinition[] = [
  {
    id: 'weekly_base',
    label: 'Base da semana',
    title: 'Base da Semana',
    visibility: 'team',
    summary: 'Selecao semanal de provas, notas e sinais para orientar leitura e acao.',
    suggestedTags: ['semana', 'prioridade', 'base'],
    preferredSources: ['highlight', 'evidence', 'thread', 'event'],
    microcopy: 'Use este coletivo para fechar a leitura da semana, subir sinais para review e consolidar a base editorial.',
    createCta: 'Criar Base da Semana',
  },
  {
    id: 'clipping',
    label: 'Clipping',
    title: 'Clipping',
    visibility: 'team',
    summary: 'Recortes, registros e sinais rapidos para acompanhamento continuo.',
    suggestedTags: ['clipping', 'monitoramento'],
    preferredSources: ['event', 'thread', 'note', 'doc'],
    microcopy: 'Bom para monitoramento continuo, sinais rapidos e itens que ainda nao viraram pauta editorial.',
    createCta: 'Criar Clipping',
  },
  {
    id: 'study_group',
    label: 'Grupo de estudo',
    title: 'Grupo de Estudo',
    visibility: 'team',
    summary: 'Percurso coletivo de leitura, destaques e perguntas.',
    suggestedTags: ['estudo', 'trilha', 'debate'],
    preferredSources: ['highlight', 'note', 'thread', 'term'],
    microcopy: 'Ideal para leitura compartilhada, encontros de estudo e anotacoes que depois podem virar export ou trilha.',
    createCta: 'Criar Grupo de Estudo',
  },
  {
    id: 'thematic_core',
    label: 'Nucleo tematico',
    title: 'Nucleo Tematico',
    visibility: 'team',
    summary: 'Base tematica organizada para curadoria e promocao editorial.',
    suggestedTags: ['tema', 'curadoria', 'evidencias'],
    preferredSources: ['evidence', 'highlight', 'event', 'term', 'node'],
    microcopy: 'Use quando o objetivo ja e curadoria: acumular base, revisar e promover para evidencias, glossario e eventos.',
    createCta: 'Criar Nucleo Tematico',
  },
];

export function listNotebookTemplates() {
  return templates.map((template) => ({ ...template }));
}

export function getNotebookTemplate(templateId?: string | null) {
  if (!templateId || templateId === 'blank') return null;
  return templates.find((template) => template.id === templateId) ?? null;
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'coletivo';
}

export function applyNotebookTemplate(
  template: SharedNotebookTemplateDefinition | null,
  overrides?: {
    title?: string | null;
    slug?: string | null;
    summary?: string | null;
    visibility?: SharedNotebookVisibility | null;
  },
) {
  const title = overrides?.title?.trim() || template?.title || 'Coletivo';
  return {
    title,
    slug: slugify(overrides?.slug?.trim() || title),
    summary: overrides?.summary?.trim() || template?.summary || null,
    visibility: overrides?.visibility || template?.visibility || 'team',
    templateId: template?.id ?? null,
    templateMeta: {
      suggestedTags: [...(template?.suggestedTags ?? [])],
      preferredSources: [...(template?.preferredSources ?? [])],
      microcopy: template?.microcopy ?? '',
    } satisfies SharedNotebookTemplateMeta,
  };
}

