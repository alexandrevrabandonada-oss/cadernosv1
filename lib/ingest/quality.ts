import type { PdfPageText } from '@/lib/ingest/pdf';

type DedupeMode = 'normal' | 'aggressive' | 'none';

export type PageQualityRow = {
  pageNumber: number;
  charCount: number;
  wordCount: number;
  isEmpty: boolean;
  repeatSignature: string | null;
};

export type IngestQualityMetrics = {
  pagesCount: number;
  emptyPagesCount: number;
  repeatedLinesTop: string[];
  repeatedLinePagesRatio: number;
  lowDensity: boolean;
  densityAvg: number;
  flags: string[];
  pageRows: PageQualityRow[];
};

function normalizeLine(line: string) {
  return line
    .replace(/\u00a0/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function lineLooksNoise(line: string) {
  if (!line) return true;
  if (line.length < 3) return true;
  if (/^\W+$/.test(line)) return true;
  return false;
}

export function analyzePages(pages: PdfPageText[]) {
  const rows: PageQualityRow[] = [];
  const headerFooterFrequency = new Map<string, number>();
  const totalPages = pages.length;
  const candidatesByPage: string[][] = [];

  for (const page of pages) {
    const lines = page.text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const words = page.text.trim() ? page.text.trim().split(/\s+/).filter(Boolean).length : 0;
    const chars = page.text.trim().length;
    const isEmpty = chars < 60 || words < 10;

    const topLines = lines.slice(0, 4);
    const bottomLines = lines.slice(Math.max(0, lines.length - 4));
    const candidates = [...topLines, ...bottomLines]
      .map(normalizeLine)
      .filter((line) => !lineLooksNoise(line));
    candidatesByPage.push(candidates);

    const unique = Array.from(new Set(candidates));
    for (const line of unique) {
      headerFooterFrequency.set(line, (headerFooterFrequency.get(line) ?? 0) + 1);
    }

    rows.push({
      pageNumber: page.page,
      charCount: chars,
      wordCount: words,
      isEmpty,
      repeatSignature: null,
    });
  }

  const repeatedThreshold = Math.max(2, Math.ceil(totalPages * 0.3));
  const repeatedLines = Array.from(headerFooterFrequency.entries())
    .filter(([, freq]) => freq >= repeatedThreshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([line]) => line.slice(0, 120));

  let repeatedPagesCount = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const pageCandidates = candidatesByPage[i] ?? [];
    const firstRepeated = repeatedLines.find((line) => pageCandidates.includes(line)) ?? null;
    rows[i].repeatSignature = firstRepeated;
    if (firstRepeated) repeatedPagesCount += 1;
  }

  const emptyPagesCount = rows.filter((row) => row.isEmpty).length;
  const densityAvg = rows.length > 0 ? rows.reduce((sum, row) => sum + row.wordCount, 0) / rows.length : 0;
  const lowDensity = densityAvg < 120;
  const flags: string[] = [];
  if (emptyPagesCount > Math.ceil(totalPages * 0.2)) flags.push('many_empty_pages');
  if (repeatedLines.length > 0) flags.push('repeated_headers');
  if (lowDensity) flags.push('low_density');

  return {
    pagesCount: totalPages,
    emptyPagesCount,
    repeatedLinesTop: repeatedLines,
    repeatedLinePagesRatio: totalPages > 0 ? repeatedPagesCount / totalPages : 0,
    lowDensity,
    densityAvg,
    flags,
    pageRows: rows,
  } satisfies IngestQualityMetrics;
}

export function dedupeRepeatedLines(pages: PdfPageText[], repeatedLines: string[], mode: DedupeMode): PdfPageText[] {
  if (mode === 'none') return pages;
  const aggressive = mode === 'aggressive';
  const repeatedSet = new Set(repeatedLines.map((line) => normalizeLine(line)));
  if (aggressive) {
    const freq = new Map<string, number>();
    const threshold = Math.max(2, Math.ceil(pages.length * 0.15));
    for (const page of pages) {
      const lines = page.text.split('\n').map((line) => normalizeLine(line)).filter(Boolean);
      const unique = new Set(lines.slice(0, 5).concat(lines.slice(Math.max(0, lines.length - 5))));
      for (const line of unique) {
        freq.set(line, (freq.get(line) ?? 0) + 1);
      }
    }
    for (const [line, count] of freq.entries()) {
      if (count >= threshold) repeatedSet.add(line);
    }
  }

  return pages.map((page) => {
    const lines = page.text.split('\n');
    const out: string[] = [];
    for (const raw of lines) {
      const normalized = normalizeLine(raw);
      const shouldDropRepeated = repeatedSet.has(normalized);
      const looksPageNoise = aggressive && /(page|pág|p\.)\s*\d+|^\d+\s*\/\s*\d+$/i.test(raw);
      if (shouldDropRepeated || looksPageNoise) continue;
      out.push(raw);
    }
    return {
      page: page.page,
      text: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    };
  });
}

export function scoreQuality(metrics: IngestQualityMetrics) {
  if (metrics.pagesCount === 0) return 0;
  const emptyRatio = metrics.emptyPagesCount / metrics.pagesCount;
  const repeatedPenalty = metrics.repeatedLinePagesRatio * 30;
  const emptyPenalty = emptyRatio * 60;
  const densityPenalty = metrics.lowDensity ? 20 : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - emptyPenalty - repeatedPenalty - densityPenalty)));
  return score;
}
