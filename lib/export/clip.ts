import 'server-only';

type RenderClipInput = {
  universeTitle: string;
  title: string;
  snippet: string;
  sourceType: 'evidence' | 'thread' | 'doc_cite';
  sourceDocTitle?: string | null;
  pages?: string | null;
  sourceUrl?: string | null;
  createdAt: string;
};

function clipText(text: string, max = 1200) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

export function renderClipMarkdown(input: RenderClipInput) {
  const lines: string[] = [];
  lines.push('# Caderno Vivos — Clip');
  lines.push('');
  lines.push(`- Universo: ${input.universeTitle}`);
  lines.push(`- Data: ${new Date(input.createdAt).toISOString()}`);
  lines.push(`- Origem: ${input.sourceType}`);
  if (input.sourceDocTitle) lines.push(`- Documento: ${input.sourceDocTitle}`);
  if (input.pages) lines.push(`- Paginas: ${input.pages}`);
  if (input.sourceUrl) lines.push(`- Link: ${input.sourceUrl}`);
  lines.push('');
  lines.push(`## ${input.title}`);
  lines.push('');
  lines.push(clipText(input.snippet, 1200));
  lines.push('');
  lines.push('_Carimbo: Cadernos Vivos_');
  lines.push('');
  return lines.join('\n');
}

