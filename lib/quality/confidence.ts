import 'server-only';

export type ConfidenceMode = 'strict_ok' | 'insufficient';
export type ConfidenceLabel = 'forte' | 'media' | 'fraca';

export type ComputeConfidenceInput = {
  mode: ConfidenceMode;
  docsDistinct: number;
  chunksUsed: number;
  citationsCount: number;
  avgDocQuality: number | null;
  methodKinds: Array<string | null | undefined>;
  citationsByDoc?: Map<string, number>;
};

export type ConfidenceResult = {
  score: number;
  label: ConfidenceLabel;
  limitations: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeMethodKind(value: string | null | undefined) {
  const text = (value ?? '').trim().toLowerCase();
  if (!text) return 'unknown';
  if (text.includes('review')) return 'review';
  if (text.includes('technical') || text.includes('relatorio')) return 'technical_report';
  if (text.includes('observational') || text.includes('observacional')) return 'observational';
  return text;
}

function scoreDocsDistinct(docsDistinct: number) {
  if (docsDistinct >= 4) return 30;
  if (docsDistinct === 3) return 24;
  if (docsDistinct === 2) return 16;
  if (docsDistinct === 1) return 8;
  return 0;
}

function scoreCitations(citationsCount: number) {
  if (citationsCount >= 5) return 20;
  if (citationsCount >= 3) return 14;
  if (citationsCount === 2) return 8;
  if (citationsCount === 1) return 4;
  return 0;
}

function scoreDocQuality(avgDocQuality: number | null) {
  if (avgDocQuality === null) return 0;
  if (avgDocQuality >= 80) return 25;
  if (avgDocQuality >= 65) return 18;
  if (avgDocQuality >= 50) return 10;
  return 3;
}

export function computeConfidence(input: ComputeConfidenceInput): ConfidenceResult {
  let score = 0;
  score += scoreDocsDistinct(input.docsDistinct);
  score += scoreCitations(input.citationsCount);
  score += scoreDocQuality(input.avgDocQuality);

  const methods = input.methodKinds.map((item) => normalizeMethodKind(item));
  if (methods.some((method) => method === 'review' || method === 'technical_report')) {
    score += 5;
  }

  if (input.citationsByDoc && input.citationsCount > 0) {
    const maxByDoc = Math.max(...Array.from(input.citationsByDoc.values()));
    if (maxByDoc / input.citationsCount > 0.6) score -= 15;
  }

  if (input.mode === 'insufficient') score -= 25;
  if (input.mode === 'insufficient') score = Math.min(score, 35);

  score = clamp(Math.round(score), 0, 100);
  const label: ConfidenceLabel = score >= 75 ? 'forte' : score >= 45 ? 'media' : 'fraca';

  const limitations: string[] = [];
  if (input.docsDistinct <= 1) limitations.push('Base concentrada em um unico documento.');
  if ((input.avgDocQuality ?? 0) > 0 && (input.avgDocQuality ?? 0) < 60) {
    limitations.push('A qualidade textual/documental da base usada e limitada.');
  }
  if (input.citationsCount < 3) limitations.push('Poucas evidencias diretas sustentam esta resposta.');
  if (methods.length === 0 || methods.every((method) => method === 'unknown')) {
    limitations.push('O tipo de estudo/documento nem sempre esta identificado.');
  }
  if (input.mode === 'insufficient') limitations.push('A base atual nao sustenta uma conclusao forte.');
  if (input.chunksUsed < 3 && !limitations.includes('Poucas evidencias diretas sustentam esta resposta.')) {
    limitations.push('Poucas evidencias diretas sustentam esta resposta.');
  }

  return {
    score,
    label,
    limitations: Array.from(new Set(limitations)).slice(0, 4),
  };
}
