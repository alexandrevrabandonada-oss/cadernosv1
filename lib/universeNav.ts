export type UniverseNavGroup = 'Exploracao' | 'Estudo' | 'Coletivo';

export const universeSections = [
  { path: '', label: 'Hub', group: 'Exploracao' },
  { path: 'mapa', label: 'Mapa', group: 'Exploracao' },
  { path: 'provas', label: 'Provas', group: 'Exploracao' },
  { path: 'debate', label: 'Debate', group: 'Exploracao' },
  { path: 'linha', label: 'Linha', group: 'Exploracao' },
  { path: 'glossario', label: 'Glossario', group: 'Exploracao' },
  { path: 'trilhas', label: 'Trilhas', group: 'Estudo' },
  { path: 'tutor', label: 'Tutor', group: 'Estudo' },
  { path: 'meu-caderno', label: 'Meu Caderno', group: 'Estudo' },
  { path: 'coletivos', label: 'Coletivos', group: 'Coletivo' },
] as const;

export function buildUniverseHref(slug: string, path: string) {
  return `/c/${slug}${path ? `/${path}` : ''}`;
}
