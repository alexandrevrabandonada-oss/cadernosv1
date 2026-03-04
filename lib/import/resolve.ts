import 'server-only';
import net from 'node:net';

type ResolvedUrl = {
  ok: boolean;
  finalUrl: string | null;
  error?: string;
};

type DoiMetadata = {
  title?: string | null;
  authors?: string[] | null;
  year?: number | null;
  journal?: string | null;
  abstract?: string | null;
  doi?: string | null;
  sourceUrl?: string | null;
  resolvedUrl?: string | null;
  pdfDetected?: boolean;
};

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
];

const PRIVATE_HOSTNAMES = ['localhost', '0.0.0.0', '::1'];

export function isSafeHttpUrl(input: string) {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    const host = url.hostname.toLowerCase();
    if (!host || PRIVATE_HOSTNAMES.includes(host)) return false;
    if (!host.includes('.')) return false;
    if (host.endsWith('.local') || host.endsWith('.internal')) return false;

    const ipType = net.isIP(host);
    if (ipType) {
      if (ipType === 4 && PRIVATE_IP_PATTERNS.some((re) => re.test(host))) return false;
      if (ipType === 6 && (host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd'))) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function normalizeDoi(input: string) {
  return input
    .trim()
    .replace(/^doi:\s*/i, '')
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .trim();
}

export async function resolveDoiToUrl(doi: string): Promise<ResolvedUrl> {
  const cleanDoi = normalizeDoi(doi);
  if (!cleanDoi) return { ok: false, finalUrl: null, error: 'invalid_doi' };

  const doiUrl = `https://doi.org/${encodeURIComponent(cleanDoi)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(doiUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/html,application/pdf,*/*' },
      cache: 'no-store',
    });
    const finalUrl = response.url || doiUrl;
    if (!isSafeHttpUrl(finalUrl)) return { ok: false, finalUrl: null, error: 'unsafe_resolved_url' };
    return { ok: true, finalUrl };
  } catch {
    return { ok: false, finalUrl: null, error: 'resolve_failed' };
  } finally {
    clearTimeout(timeout);
  }
}

function parseCrossrefAuthors(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const author = item as { given?: string; family?: string; name?: string };
      const full = [author.given, author.family].filter(Boolean).join(' ').trim();
      return (full || author.name || '').trim();
    })
    .filter((name): name is string => Boolean(name));
}

export async function fetchMetadataFromDoi(doi: string): Promise<DoiMetadata> {
  const cleanDoi = normalizeDoi(doi);
  const resolved = await resolveDoiToUrl(cleanDoi);

  const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(crossrefUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      return {
        doi: cleanDoi,
        sourceUrl: resolved.finalUrl ?? `https://doi.org/${cleanDoi}`,
        resolvedUrl: resolved.finalUrl ?? null,
      };
    }

    const json = (await response.json()) as {
      message?: {
        title?: string[];
        author?: unknown;
        published?: { 'date-parts'?: number[][] };
        issued?: { 'date-parts'?: number[][] };
        'container-title'?: string[];
        abstract?: string;
        DOI?: string;
        URL?: string;
      };
    };

    const msg = json.message ?? {};
    const dateParts = msg.published?.['date-parts']?.[0] ?? msg.issued?.['date-parts']?.[0] ?? [];
    const year = typeof dateParts?.[0] === 'number' ? dateParts[0] : null;

    return {
      title: msg.title?.[0] ?? null,
      authors: parseCrossrefAuthors(msg.author),
      year,
      journal: msg['container-title']?.[0] ?? null,
      abstract: msg.abstract ?? null,
      doi: msg.DOI ?? cleanDoi,
      sourceUrl: msg.URL ?? resolved.finalUrl ?? `https://doi.org/${cleanDoi}`,
      resolvedUrl: resolved.finalUrl ?? msg.URL ?? null,
    };
  } catch {
    return {
      doi: cleanDoi,
      sourceUrl: resolved.finalUrl ?? `https://doi.org/${cleanDoi}`,
      resolvedUrl: resolved.finalUrl ?? null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function detectPdfUrl(inputUrl: string | null) {
  if (!inputUrl || !isSafeHttpUrl(inputUrl)) {
    return { isPdf: false, finalUrl: null as string | null };
  }

  if (inputUrl.toLowerCase().includes('.pdf')) {
    return { isPdf: true, finalUrl: inputUrl };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(inputUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
    });
    const finalUrl = response.url || inputUrl;
    const contentType = response.headers.get('content-type') || '';
    const isPdf = contentType.toLowerCase().includes('application/pdf') || finalUrl.toLowerCase().includes('.pdf');
    return { isPdf, finalUrl };
  } catch {
    return { isPdf: false, finalUrl: inputUrl };
  } finally {
    clearTimeout(timeout);
  }
}
