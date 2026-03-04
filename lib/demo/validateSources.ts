import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

export type DemoSourceKind = 'doi' | 'url' | 'pdf';

export type DemoSource = {
  kind: DemoSourceKind;
  value: string;
  note: string;
  tags: string[];
};

export type DemoSourceValidationIssue = {
  index: number;
  level: 'error' | 'warning';
  code: string;
  message: string;
};

export type DemoSourceValidated = DemoSource & {
  normalizedValue: string;
  placeholder: boolean;
  duplicate: boolean;
  matchedNodeSlugs: string[];
  localPdfExists: boolean;
};

export type DemoSourcesValidationResult = {
  ok: boolean;
  filePath: string;
  stats: {
    total: number;
    placeholders: number;
    duplicates: number;
    missingLocalPdfs: number;
    errors: number;
    warnings: number;
  };
  errors: DemoSourceValidationIssue[];
  warnings: DemoSourceValidationIssue[];
  entries: DemoSourceValidated[];
};

type NodeRef = {
  slug: string;
  title: string;
  tags: string[];
};

const DEMO_SOURCES_FILE = path.resolve(process.cwd(), 'data/demo/poluicao-vr.sources.json');

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function normalizeSourceValue(kind: DemoSourceKind, rawValue: string) {
  const value = normalizeWhitespace(rawValue);
  if (kind === 'doi') {
    return value
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .replace(/^doi:/i, '')
      .toLowerCase();
  }
  if (kind === 'url') {
    try {
      const url = new URL(value);
      url.hash = '';
      if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.slice(0, -1);
      }
      return url.toString();
    } catch {
      return value;
    }
  }
  return value.replace(/\\/g, '/');
}

function isPlaceholderSource(input: { value: string; note: string }) {
  const hay = `${input.value} ${input.note}`.toLowerCase();
  return (
    hay.includes('placeholder') ||
    hay.includes('10.xxxx/') ||
    hay.includes('exemplo.org') ||
    hay.includes('example.com')
  );
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

function buildNodeTagIndex(nodes: NodeRef[]) {
  const index = new Map<string, Set<string>>();
  for (const node of nodes) {
    const tokens = new Set<string>([
      ...tokenize(node.slug),
      ...tokenize(node.title),
      ...(node.tags ?? []).flatMap((tag) => tokenize(tag)),
    ]);
    for (const token of tokens) {
      const list = index.get(token) ?? new Set<string>();
      list.add(node.slug);
      index.set(token, list);
    }
  }
  return index;
}

function matchNodesForTags(tags: string[], nodeIndex: Map<string, Set<string>>) {
  const hits = new Set<string>();
  for (const tag of tags) {
    for (const token of tokenize(tag)) {
      const matched = nodeIndex.get(token);
      if (!matched) continue;
      for (const slug of matched) hits.add(slug);
    }
  }
  return [...hits].slice(0, 6);
}

export function loadDemoSourcesFromFile(filePath = DEMO_SOURCES_FILE): DemoSource[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((row) => {
      const kindRaw = String((row as { kind?: unknown }).kind ?? '')
        .toLowerCase()
        .trim();
      const kind = (['doi', 'url', 'pdf'].includes(kindRaw) ? kindRaw : 'url') as DemoSourceKind;
      const tagsRaw = (row as { tags?: unknown }).tags;
      return {
        kind,
        value: normalizeWhitespace(String((row as { value?: unknown }).value ?? '')),
        note: normalizeWhitespace(String((row as { note?: unknown }).note ?? '')),
        tags: Array.isArray(tagsRaw)
          ? tagsRaw.map((tag) => normalizeWhitespace(String(tag))).filter(Boolean).slice(0, 12)
          : [],
      } satisfies DemoSource;
    })
    .filter((row) => row.value.length > 0);
}

export function validateDemoSources(options: { nodes?: NodeRef[]; filePath?: string } = {}): DemoSourcesValidationResult {
  const filePath = options.filePath ?? DEMO_SOURCES_FILE;
  const nodes = options.nodes ?? [];
  const entriesRaw = loadDemoSourcesFromFile(filePath);
  const nodeIndex = buildNodeTagIndex(nodes);
  const errors: DemoSourceValidationIssue[] = [];
  const warnings: DemoSourceValidationIssue[] = [];
  const dedupe = new Set<string>();
  const entries: DemoSourceValidated[] = [];

  for (let index = 0; index < entriesRaw.length; index += 1) {
    const row = entriesRaw[index];
    const normalizedValue = normalizeSourceValue(row.kind, row.value);
    const dedupeKey = `${row.kind}:${normalizedValue.toLowerCase()}`;
    const duplicate = dedupe.has(dedupeKey);
    if (!duplicate) dedupe.add(dedupeKey);

    const placeholder = isPlaceholderSource({ value: row.value, note: row.note });
    const matchedNodeSlugs = matchNodesForTags(row.tags, nodeIndex);
    const localPdfPath =
      row.kind === 'pdf' ? path.resolve(process.cwd(), normalizedValue.replace(/^\.\/+/, '')) : null;
    const localPdfExists = row.kind === 'pdf' ? fs.existsSync(localPdfPath ?? '') : false;

    if (!row.value) {
      errors.push({ index, level: 'error', code: 'missing_value', message: 'Entrada sem value.' });
    }
    if (row.tags.length === 0) {
      warnings.push({ index, level: 'warning', code: 'missing_tags', message: 'Entrada sem tags; mapeamento para nos ficara fraco.' });
    }
    if (row.kind === 'url' && !safeUrl(row.value)) {
      errors.push({ index, level: 'error', code: 'invalid_url', message: 'URL invalida ou protocolo inseguro (apenas http/https).' });
    }
    if (row.kind === 'doi' && normalizedValue.length < 8) {
      warnings.push({ index, level: 'warning', code: 'weak_doi', message: 'DOI muito curto ou incompleto.' });
    }
    if (row.kind === 'pdf' && !localPdfExists) {
      warnings.push({
        index,
        level: 'warning',
        code: 'pdf_missing',
        message: `PDF local nao encontrado: ${normalizedValue}`,
      });
    }
    if (duplicate) {
      warnings.push({ index, level: 'warning', code: 'duplicate_source', message: 'Entrada duplicada por kind+value normalizado.' });
    }
    if (row.tags.length > 0 && matchedNodeSlugs.length === 0) {
      warnings.push({
        index,
        level: 'warning',
        code: 'tags_without_node_match',
        message: `Tags sem match de no no universo: ${row.tags.join(', ')}`,
      });
    }

    entries.push({
      ...row,
      normalizedValue,
      placeholder,
      duplicate,
      matchedNodeSlugs,
      localPdfExists,
    });
  }

  return {
    ok: errors.length === 0,
    filePath,
    stats: {
      total: entries.length,
      placeholders: entries.filter((entry) => entry.placeholder).length,
      duplicates: entries.filter((entry) => entry.duplicate).length,
      missingLocalPdfs: entries.filter((entry) => entry.kind === 'pdf' && !entry.localPdfExists).length,
      errors: errors.length,
      warnings: warnings.length,
    },
    errors,
    warnings,
    entries,
  };
}

