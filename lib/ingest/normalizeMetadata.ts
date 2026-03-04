import 'server-only';

export type RawImportMetadata = {
  title?: string | null;
  authors?: string[] | string | null;
  year?: number | string | null;
  journal?: string | null;
  abstract?: string | null;
  doi?: string | null;
  sourceUrl?: string | null;
  pdfUrl?: string | null;
  importSource?: string | null;
  kind?: 'doi' | 'url';
};

export type NormalizedImportMetadata = {
  title: string;
  authors: string | null;
  year: number | null;
  journal: string | null;
  abstract: string | null;
  doi: string | null;
  sourceUrl: string | null;
  pdfUrl: string | null;
  importSource: string;
  kind: 'doi' | 'url';
};

function cleanText(value: string | null | undefined, max = 400) {
  if (!value) return null;
  const clean = value.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  return clean.slice(0, max);
}

function normalizeAuthors(authors: RawImportMetadata['authors']) {
  if (!authors) return null;
  const list = Array.isArray(authors)
    ? authors
    : String(authors)
        .split(/[;,]/)
        .map((item) => item.trim());

  const unique = Array.from(new Set(list.map((item) => item.replace(/\s+/g, ' ').trim()).filter(Boolean)));
  if (unique.length === 0) return null;
  return unique.slice(0, 20).join('; ').slice(0, 800);
}

function normalizeYear(year: RawImportMetadata['year']) {
  if (typeof year === 'number' && Number.isFinite(year) && year > 1500 && year <= 2100) return year;
  if (typeof year === 'string') {
    const match = year.match(/(19|20)\d{2}/);
    if (match) return Number(match[0]);
  }
  return null;
}

function normalizeDoi(doi: string | null | undefined) {
  if (!doi) return null;
  const d = doi.trim().replace(/^doi:\s*/i, '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
  return d ? d.slice(0, 200) : null;
}

export function normalizeImportMetadata(raw: RawImportMetadata): NormalizedImportMetadata {
  const title = cleanText(raw.title, 300) || 'Documento importado';
  return {
    title,
    authors: normalizeAuthors(raw.authors),
    year: normalizeYear(raw.year),
    journal: cleanText(raw.journal, 300),
    abstract: cleanText(raw.abstract, 4000),
    doi: normalizeDoi(raw.doi),
    sourceUrl: cleanText(raw.sourceUrl, 1200),
    pdfUrl: cleanText(raw.pdfUrl, 1200),
    importSource: cleanText(raw.importSource, 80) || 'manual',
    kind: raw.kind === 'doi' ? 'doi' : 'url',
  };
}
