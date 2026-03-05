import 'server-only';

type DivergenceChunk = {
  documentId: string;
  text: string;
};

export type DetectDivergenceInput = {
  question: string;
  docsDistinct: number;
  mode: 'strict_ok' | 'insufficient';
  chunks: DivergenceChunk[];
  limitations: string[];
};

export type DetectDivergenceResult = {
  flag: boolean;
  summary: string | null;
};

const NEGATIVE_MARKERS = [
  'nao houve associacao',
  'sem evidencia',
  'inconclusivo',
  'divergent',
  'contradit',
  'however',
  'no significant',
  'not associated',
  'entretanto',
  'porem',
];

const POSITIVE_MARKERS = [
  'houve associacao',
  'associacao significativa',
  'evidencia de',
  'significant association',
  'correlacao',
  'aumento de',
  'reducao de',
];

function norm(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function hasAny(text: string, markers: string[]) {
  return markers.some((marker) => text.includes(marker));
}

export function detectDivergence(input: DetectDivergenceInput): DetectDivergenceResult {
  if (input.docsDistinct < 2 || input.chunks.length < 2) {
    return { flag: false, summary: null };
  }

  let docsWithPositive = 0;
  let docsWithNegative = 0;
  const signalByDoc = new Map<string, { pos: boolean; neg: boolean }>();

  for (const chunk of input.chunks) {
    const text = norm(chunk.text);
    const pos = hasAny(text, POSITIVE_MARKERS);
    const neg = hasAny(text, NEGATIVE_MARKERS);
    if (!pos && !neg) continue;
    const current = signalByDoc.get(chunk.documentId) ?? { pos: false, neg: false };
    current.pos = current.pos || pos;
    current.neg = current.neg || neg;
    signalByDoc.set(chunk.documentId, current);
  }

  for (const signals of signalByDoc.values()) {
    if (signals.pos) docsWithPositive += 1;
    if (signals.neg) docsWithNegative += 1;
  }

  const mixedSignals = docsWithPositive > 0 && docsWithNegative > 0;
  const borderlineStrict =
    input.mode === 'strict_ok' &&
    input.limitations.some((item) => /poucas evidencias|base concentrada|qualidade textual/i.test(item));

  if (!mixedSignals && !borderlineStrict) {
    return { flag: false, summary: null };
  }

  if (mixedSignals) {
    return {
      flag: true,
      summary: 'Ha sinais de resultados divergentes ou inconclusivos entre os documentos usados.',
    };
  }

  return {
    flag: true,
    summary: 'Ha sinais de incerteza entre fontes e a conclusao deve ser lida com cautela.',
  };
}
