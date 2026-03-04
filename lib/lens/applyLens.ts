import type { DebateLens } from '@/lib/filters/debateFilters';

export type LensSection = {
  title: string;
  lines: string[];
};

type LensInput = {
  lens: DebateLens;
  answer: string;
  citationsCount: number;
};

function parseAnswerSections(answer: string) {
  const lines = answer.split('\n').map((line) => line.trim());
  const sections: LensSection[] = [];
  let current: LensSection | null = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s+/, '').trim(), lines: [] };
      continue;
    }
    if (!current) continue;
    if (line) current.lines.push(line);
  }
  if (current) sections.push(current);
  if (sections.length === 0) {
    return [{ title: 'Resposta', lines: lines.filter(Boolean) }];
  }
  return sections;
}

function findSection(sections: LensSection[], candidates: string[]) {
  for (const section of sections) {
    const key = section.title.toLowerCase();
    if (candidates.some((candidate) => key.includes(candidate))) return section;
  }
  return null;
}

function fallbackSection(title: string, lines: string[]): LensSection {
  return { title, lines: lines.length > 0 ? lines : ['Sem itens adicionais nesta lente.'] };
}

export function applyLens(input: LensInput): LensSection[] {
  const base = parseAnswerSections(input.answer);
  const achados = findSection(base, ['achados', 'resposta']);
  const limitacoes = findSection(base, ['limita', 'lacuna']);
  const citacoes = findSection(base, ['citac']);

  if (input.lens === 'default') return base;

  if (input.lens === 'worker') {
    return [
      fallbackSection('Impacto no trabalho', achados?.lines ?? []),
      fallbackSection('Riscos observados', limitacoes?.lines ?? []),
      fallbackSection('O que falta na base', limitacoes?.lines ?? []),
      fallbackSection('Evidencias', [`Total de citacoes: ${input.citationsCount}`]),
    ];
  }

  if (input.lens === 'resident') {
    return [
      fallbackSection('O que isso muda na vida diaria', achados?.lines ?? []),
      fallbackSection('Riscos e exposicoes', limitacoes?.lines ?? []),
      fallbackSection('Onde aprofundar', [`Veja ${input.citationsCount} evidencia(s) citada(s) e a secao Provas.`]),
    ];
  }

  if (input.lens === 'researcher') {
    return [
      fallbackSection('Metodo e limitacoes', limitacoes?.lines ?? []),
      fallbackSection('Achados observaveis', achados?.lines ?? []),
      fallbackSection('Evidencias e rastreabilidade', citacoes?.lines.length ? citacoes.lines : [`Citacoes: ${input.citationsCount}`]),
    ];
  }

  return [
    fallbackSection('Encaminhamentos e medidas', [
      ...(achados?.lines ?? []).slice(0, 3),
      'Priorize medidas com suporte nas citacoes listadas.',
    ]),
    fallbackSection('Riscos e lacunas', limitacoes?.lines ?? []),
    fallbackSection('Base de evidencia', [`Total de citacoes relevantes: ${input.citationsCount}`]),
  ];
}
