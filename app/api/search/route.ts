import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { getUniverseMock } from '@/lib/mock/universe';
import { parseSearchQuery, parseSearchTypes } from '@/lib/search/query';
import { rankSearchResults } from '@/lib/search/rank';
import { type SearchResponse, type SearchResult, type SearchType } from '@/lib/search/types';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { buildUniverseHref } from '@/lib/universeNav';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 20;
const PER_TYPE_LIMIT = 6;

function clip(value: string | null | undefined, max = 160) {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function normalizeTags(tags: unknown) {
  if (!Array.isArray(tags)) return [] as string[];
  return tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean).slice(0, 8);
}

function buildNoteHref(universeSlug: string, note: {
  id: string;
  sourceType: string;
  sourceId: string | null;
  sourceMeta: Record<string, unknown>;
  tags?: string[];
}) {
  if (note.sourceType === 'evidence' && note.sourceId) return `${buildUniverseHref(universeSlug, 'provas')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'thread' && note.sourceId) return `${buildUniverseHref(universeSlug, 'debate')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'event' && note.sourceId) return `${buildUniverseHref(universeSlug, 'linha')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'term' && note.sourceId) return `${buildUniverseHref(universeSlug, 'glossario')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'node') {
    const nodeSlug = typeof note.sourceMeta?.nodeSlug === 'string' ? note.sourceMeta.nodeSlug : '';
    if (nodeSlug) return `${buildUniverseHref(universeSlug, 'mapa')}?node=${encodeURIComponent(nodeSlug)}&panel=detail`;
  }
  if (note.sourceType === 'citation' || note.sourceType === 'doc' || note.sourceType === 'chunk') {
    const docId = typeof note.sourceMeta?.docId === 'string' ? note.sourceMeta.docId : '';
    const pageStart = typeof note.sourceMeta?.pageStart === 'number' ? note.sourceMeta.pageStart : null;
    const pageHint = typeof note.sourceMeta?.pageHint === 'string' ? note.sourceMeta.pageHint : '';
    if (docId) {
      const qs = new URLSearchParams();
      if (pageStart) qs.set('p', String(pageStart));
      if (pageHint && !pageStart) qs.set('p', pageHint.replace(/^p\./, ''));
      qs.set('hl', note.id);
      return `${buildUniverseHref(universeSlug, `doc/${docId}`)}?${qs.toString()}`;
    }
  }

  const qs = new URLSearchParams();
  if (note.tags?.length) qs.set('tags', note.tags.slice(0, 4).join(','));
  qs.set('selected', note.id);
  qs.set('panel', 'detail');
  return `${buildUniverseHref(universeSlug, 'meu-caderno')}?${qs.toString()}`;
}

function mockResults(universeSlug: string, includeNotes: boolean): SearchResult[] {
  const mock = getUniverseMock(universeSlug);
  const baseNode = mock.coreNodes[0];
  const baseDocId = `${universeSlug}-doc-1`;
  const results: SearchResult[] = [
    ...mock.coreNodes.map((node, index) => ({
      type: 'node' as const,
      id: node.id,
      title: node.label,
      subtitle: 'Abrir no mapa',
      snippet: clip(node.summary),
      href: `${buildUniverseHref(universeSlug, 'mapa')}?node=${encodeURIComponent(node.slug ?? node.id)}&panel=detail`,
      badges: index < 3 ? ['core'] : [],
      tags: node.tags ?? [],
    })),
    ...mock.coreNodes.map((node, index) => ({
      type: 'term' as const,
      id: `mock-${universeSlug}-${node.id}`,
      title: node.label,
      subtitle: 'Glossario do universo',
      snippet: clip(node.summary),
      href: `${buildUniverseHref(universeSlug, 'glossario')}?selected=${encodeURIComponent(`mock-${universeSlug}-${node.id}`)}&panel=detail`,
      badges: index < 3 ? ['core'] : [],
      tags: node.tags ?? [],
    })),
    {
      type: 'doc',
      id: baseDocId,
      title: 'Documento Demo',
      subtitle: 'Abrir documento',
      snippet: 'Documento base para highlights reais, citacoes e retorno pelo Meu Caderno.',
      href: buildUniverseHref(universeSlug, `doc/${baseDocId}`),
      badges: ['processado'],
      tags: ['documento'],
    },
    {
      type: 'evidence',
      id: `${universeSlug}-ev-1`,
      title: 'Primeira evidencia validada',
      subtitle: 'Abrir em Provas',
      snippet: 'Trecho curado para validar o fluxo de provas e a busca universal.',
      href: `${buildUniverseHref(universeSlug, 'provas')}?selected=${universeSlug}-ev-1&panel=detail`,
      badges: ['publicada'],
      tags: ['evidencia', 'provas'],
    },
    {
      type: 'event',
      id: `${universeSlug}-timeline-1`,
      title: `${baseNode.label}: marco 1`,
      subtitle: 'Abrir na linha do tempo',
      snippet: 'Marco temporal de exemplo para a busca universal.',
      href: `${buildUniverseHref(universeSlug, 'linha')}?selected=${universeSlug}-timeline-1&panel=detail`,
      badges: ['timeline'],
      tags: ['evento'],
    },
    {
      type: 'thread',
      id: `${universeSlug}-thread-1`,
      title: `O que as evidencias mostram sobre ${baseNode.label}?`,
      subtitle: 'Abrir thread de debate',
      snippet: 'Achados e limitacoes em uma thread seeded para smoke.',
      href: `${buildUniverseHref(universeSlug, 'debate')}?selected=${universeSlug}-thread-1&panel=detail`,
      badges: ['strict_ok'],
      tags: ['debate'],
    },
  ];

  if (includeNotes) {
    results.push({
      type: 'note',
      id: 'mock-note',
      title: 'Nota local demo',
      subtitle: 'Meu Caderno',
      snippet: 'Exemplo de nota privada para o modo logado.',
      href: `${buildUniverseHref(universeSlug, 'meu-caderno')}?selected=mock-note&panel=detail`,
      badges: ['privada'],
      tags: ['demo'],
    });
  }

  return results;
}

async function fetchDbResults(input: {
  universeId: string;
  universeSlug: string;
  query: string;
  tags: string[];
  types: SearchType[];
  includeNotes: boolean;
  privileged: boolean;
  userId: string | null;
}) {
  const db = input.privileged ? getSupabaseServiceRoleClient() : getSupabaseServerClient();
  if (!db) return null;

  const allResults: SearchResult[] = [];

  if (input.types.includes('node')) {
    const { data } = await db
      .from('nodes')
      .select('id, slug, title, summary, tags')
      .eq('universe_id', input.universeId)
      .or(input.query ? `title.ilike.%${input.query}%,summary.ilike.%${input.query}%` : 'title.ilike.%%')
      .limit(12);
    allResults.push(
      ...(data ?? []).map((node, index) => ({
        type: 'node' as const,
        id: node.id,
        title: node.title,
        subtitle: 'Abrir no mapa',
        snippet: clip((node as { summary?: string | null }).summary),
        href: `${buildUniverseHref(input.universeSlug, 'mapa')}?node=${encodeURIComponent(node.slug)}&panel=detail`,
        badges: index < 3 ? ['core'] : [],
        tags: normalizeTags((node as { tags?: unknown }).tags),
      })),
    );
  }

  if (input.types.includes('term')) {
    const { data } = await db
      .from('glossary_terms')
      .select('id, slug, term, short_def, tags')
      .eq('universe_id', input.universeId)
      .or(input.query ? `term.ilike.%${input.query}%,short_def.ilike.%${input.query}%,body.ilike.%${input.query}%` : 'term.ilike.%%')
      .limit(12);
    allResults.push(
      ...(data ?? []).map((term, index) => ({
        type: 'term' as const,
        id: term.id,
        title: term.term,
        subtitle: 'Glossario do universo',
        snippet: clip((term as { short_def?: string | null }).short_def),
        href: `${buildUniverseHref(input.universeSlug, 'glossario')}?selected=${encodeURIComponent(term.id)}&panel=detail`,
        badges: index < 3 ? ['core'] : [],
        tags: normalizeTags((term as { tags?: unknown }).tags),
      })),
    );
  }

  if (input.types.includes('doc')) {
    const { data } = await db
      .from('documents')
      .select('id, title, year, status, source_url, is_deleted')
      .eq('universe_id', input.universeId)
      .eq('is_deleted', false)
      .or(input.query ? `title.ilike.%${input.query}%` : 'title.ilike.%%')
      .limit(12);
    allResults.push(
      ...(data ?? []).map((doc) => ({
        type: 'doc' as const,
        id: doc.id,
        title: doc.title,
        subtitle: doc.year ? `Documento • ${doc.year}` : 'Documento',
        snippet: clip((doc as { source_url?: string | null }).source_url ?? ''),
        href: buildUniverseHref(input.universeSlug, `doc/${doc.id}`),
        badges: [doc.status],
        tags: ['documento'],
      })),
    );
  }

  if (input.types.includes('evidence')) {
    let evidenceQuery = db
      .from('evidences')
      .select('id, title, summary, status, tags, curated')
      .eq('universe_id', input.universeId)
      .or(input.query ? `title.ilike.%${input.query}%,summary.ilike.%${input.query}%` : 'title.ilike.%%')
      .limit(12);
    evidenceQuery = input.privileged ? evidenceQuery.eq('curated', true) : evidenceQuery.eq('status', 'published');
    const { data } = await evidenceQuery;
    allResults.push(
      ...(data ?? []).map((evidence) => ({
        type: 'evidence' as const,
        id: evidence.id,
        title: evidence.title || 'Evidencia',
        subtitle: 'Abrir em Provas',
        snippet: clip((evidence as { summary?: string | null }).summary),
        href: `${buildUniverseHref(input.universeSlug, 'provas')}?selected=${evidence.id}&panel=detail`,
        badges: [evidence.status === 'published' ? 'publicada' : evidence.status],
        tags: normalizeTags((evidence as { tags?: unknown }).tags),
      })),
    );
  }

  if (input.types.includes('event')) {
    const { data } = await db
      .from('events')
      .select('id, title, summary, kind, day, tags')
      .eq('universe_id', input.universeId)
      .or(input.query ? `title.ilike.%${input.query}%,summary.ilike.%${input.query}%` : 'title.ilike.%%')
      .limit(12);
    allResults.push(
      ...(data ?? []).map((event) => ({
        type: 'event' as const,
        id: event.id,
        title: event.title,
        subtitle: event.day ? `Linha • ${event.day}` : 'Linha do tempo',
        snippet: clip((event as { summary?: string | null }).summary),
        href: `${buildUniverseHref(input.universeSlug, 'linha')}?selected=${event.id}&panel=detail`,
        badges: [event.kind ?? 'evento'],
        tags: normalizeTags((event as { tags?: unknown }).tags),
      })),
    );
  }

  if (input.types.includes('thread')) {
    const { data } = await db
      .from('qa_threads')
      .select('id, question, answer, mode, created_at')
      .eq('universe_id', input.universeId)
      .or(input.query ? `question.ilike.%${input.query}%,answer.ilike.%${input.query}%` : 'question.ilike.%%')
      .limit(12);
    allResults.push(
      ...(data ?? []).map((thread) => ({
        type: 'thread' as const,
        id: thread.id,
        title: thread.question,
        subtitle: thread.created_at ? `Debate • ${thread.created_at.slice(0, 10)}` : 'Debate',
        snippet: clip((thread as { answer?: string | null }).answer),
        href: `${buildUniverseHref(input.universeSlug, 'debate')}?selected=${thread.id}&panel=detail`,
        badges: [thread.mode ?? 'strict_ok'],
        tags: ['debate'],
      })),
    );
  }

  if (input.includeNotes && input.userId && input.types.includes('note')) {
    const { data } = await db
      .from('user_notes')
      .select('id, title, text, kind, source_type, source_id, source_meta, tags')
      .eq('universe_id', input.universeId)
      .eq('user_id', input.userId)
      .or(input.query ? `title.ilike.%${input.query}%,text.ilike.%${input.query}%` : 'text.ilike.%%')
      .limit(12);
    allResults.push(
      ...(data ?? []).map((note) => ({
        type: 'note' as const,
        id: note.id,
        title: note.title || (note.kind === 'highlight' ? 'Highlight privado' : 'Nota privada'),
        subtitle: note.kind === 'highlight' ? 'Meu Caderno • highlight' : 'Meu Caderno • nota',
        snippet: clip(note.text),
        href: buildNoteHref(input.universeSlug, {
          id: note.id,
          sourceType: note.source_type,
          sourceId: note.source_id,
          sourceMeta: (note.source_meta ?? {}) as Record<string, unknown>,
          tags: normalizeTags(note.tags),
        }),
        badges: ['privada'],
        tags: normalizeTags(note.tags),
      })),
    );
  }

  return input.tags.length > 0
    ? allResults.filter((item) => item.tags?.some((tag) => input.tags.includes(tag.toLowerCase())))
    : allResults;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const universeSlug = searchParams.get('u')?.trim() ?? searchParams.get('universeSlug')?.trim() ?? '';
  const rawQuery = (searchParams.get('q')?.trim() ?? '').slice(0, 120);
  const limit = Math.max(1, Math.min(20, Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));

  if (!universeSlug) {
    return NextResponse.json({ results: [], meta: { countsByType: {} } } satisfies SearchResponse, { status: 400 });
  }

  const access = await getUniverseAccessBySlug(universeSlug);
  if (!access.universe || (!access.published && !access.canPreview)) {
    return NextResponse.json({ results: [], meta: { countsByType: {} } } satisfies SearchResponse, { status: 404 });
  }

  const session = await getCurrentSession();
  const privileged = Boolean(session && (session.role === 'admin' || session.role === 'editor'));
  const includePrivateNotes = Boolean(session && session.userId !== 'dev-bypass');
  const parsed = parseSearchQuery(rawQuery);
  const types: SearchType[] = parsed.notesOnly ? ['note'] : parseSearchTypes(searchParams.get('types'));

  const dbResults = await fetchDbResults({
    universeId: access.universe.id,
    universeSlug,
    query: parsed.text,
    tags: parsed.tags,
    types,
    includeNotes: includePrivateNotes,
    privileged,
    userId: session?.userId && session.userId !== 'dev-bypass' ? session.userId : null,
  });

  const sourceResults = dbResults ?? mockResults(universeSlug, includePrivateNotes);
  const filteredByType = sourceResults.filter((item) => types.includes(item.type));
  const filteredByText = parsed.normalizedText
    ? filteredByType.filter((item) => `${item.title} ${item.subtitle ?? ''} ${item.snippet ?? ''}`.toLowerCase().includes(parsed.normalizedText))
    : filteredByType;
  const filteredByTags = parsed.tags.length > 0
    ? filteredByText.filter((item) => item.tags?.some((tag) => parsed.tags.includes(tag.toLowerCase())))
    : filteredByText;

  const results = rankSearchResults(filteredByTags, {
    parsed,
    totalLimit: limit,
    perTypeLimit: Math.min(PER_TYPE_LIMIT, limit),
  });

  const countsByType = results.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<SearchType, number>>);

  return NextResponse.json({ results, meta: { countsByType } } satisfies SearchResponse);
}

