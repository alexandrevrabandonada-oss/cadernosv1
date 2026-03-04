export const universeSections = [
  { path: '', label: 'Hub' },
  { path: 'mapa', label: 'Mapa' },
  { path: 'provas', label: 'Provas' },
  { path: 'linha', label: 'Linha' },
  { path: 'trilhas', label: 'Trilhas' },
  { path: 'debate', label: 'Debate' },
  { path: 'tutor', label: 'Tutor' },
  { path: 'tutoria', label: 'Tutoria' },
];

export function buildUniverseHref(slug: string, path: string) {
  return `/c/${slug}${path ? `/${path}` : ''}`;
}
