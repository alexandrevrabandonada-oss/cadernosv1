import { createHash } from 'crypto';
import { RATE_LIMITS } from '@/lib/ratelimit/config';
import { rateLimit } from '@/lib/ratelimit';
import { composeAnswer } from '@/lib/answer/compose';
import { captureException } from '@/lib/obs/sentry';
import { buildAskRateKey } from '@/lib/ratelimit/keys';
import { rerankCandidates } from '@/lib/search/rerank';
import { retrieveCandidates } from '@/lib/search/retrieve';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type AskScope = {
  requiredEvidenceIds?: string[];
  documentIds?: string[];
  mode?: 'tutor' | 'default';
};

export type AskPayload = {
  universeSlug: string;
  question: string;
  nodeSlug?: string;
  source?: 'guided' | 'default' | 'tutor_chat';
  scope?: AskScope;
};

export type AskRunContext = {
  userId: string | null;
  ip: string;
  requesterHashHint?: string;
};

export type AskRunResult = {
  status: number;
  body: Record<string, unknown>;
};

type AskCitation = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  year: number | null;
  pages: string;
  pageStart: number | null;
  pageEnd: number | null;
  quote: string;
  quoteStart: number | null;
  quoteEnd: number | null;
};

type QaLogStatus = 'ok' | 'invalid_payload' | 'rate_limited' | 'error';
type QaLogInput = {
  kind?: 'ask';
  universeId?: string | null;
  threadId?: string | null;
  ok?: boolean;
  statusCode?: number;
  status: QaLogStatus;
  questionLength: number;
  citationsCount: number;
  chunksUsed?: number;
  docsUsed?: number;
  docsDistintos?: number;
  chunksUsados?: number;
  rateLimited?: boolean;
  insufficientReason?: string | null;
  mode?: 'strict_ok' | 'insufficient';
  evidenceSufficient: boolean;
  latencyMs: number;
  requesterHash: string;
  userPresent?: boolean;
  scope?: string;
  source?: 'guided' | 'default' | 'tutor_chat';
  scopedDocsCount?: number;
  scopedUsed?: boolean;
};

type PersistedCitation = {
  id: string;
  chunk_id: string;
  quote_start: number | null;
  quote_end: number | null;
  highlight_token: string | null;
};

const STRICT_MODE = true;

export function isValidScope(scope: unknown) {
  if (scope === undefined) return true;
  if (!scope || typeof scope !== 'object') return false;
  const maybe = scope as AskScope;
  if (maybe.mode !== undefined && maybe.mode !== 'tutor' && maybe.mode !== 'default') return false;
  if (maybe.requiredEvidenceIds !== undefined) {
    if (!Array.isArray(maybe.requiredEvidenceIds)) return false;
    if (maybe.requiredEvidenceIds.some((item) => typeof item !== 'string' || item.trim().length < 8)) return false;
  }
  if (maybe.documentIds !== undefined) {
    if (!Array.isArray(maybe.documentIds)) return false;
    if (maybe.documentIds.some((item) => typeof item !== 'string' || item.trim().length < 8)) return false;
  }
  return true;
}

export function isValidPayload(payload: unknown): payload is AskPayload {
  if (!payload || typeof payload !== 'object') return false;
  const maybe = payload as Partial<AskPayload>;
  if (typeof maybe.universeSlug !== 'string' || typeof maybe.question !== 'string') return false;
  if (maybe.nodeSlug !== undefined && typeof maybe.nodeSlug !== 'string') return false;
  if (maybe.source !== undefined && !['guided', 'default', 'tutor_chat'].includes(maybe.source)) return false;
  if (!isValidScope(maybe.scope)) return false;
  const universeSlug = maybe.universeSlug.trim();
  const question = maybe.question.trim();
  const nodeSlug = maybe.nodeSlug?.trim();
  const isNodeValid = nodeSlug === undefined || nodeSlug.length === 0 || (nodeSlug.length >= 2 && nodeSlug.length <= 120);
  return universeSlug.length >= 2 && universeSlug.length <= 120 && question.length >= 8 && question.length <= 3000 && isNodeValid;
}

function hashRequester(ip: string) {
  return createHash('sha256').update(ip).digest('hex').slice(0, 24);
}

function normalizeQuote(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 360);
}

function pageLabel(start: number | null, end: number | null) {
  if (!start && !end) return 's/p';
  if (start && end && start !== end) return `p.${start}-${end}`;
  return `p.${start ?? end}`;
}

function uniqueByChunk<T extends { chunkId: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.chunkId)) return false;
    seen.add(item.chunkId);
    return true;
  });
}

function normalizeWithMap(text: string) {
  let normalized = '';
  const map: number[] = [];
  let pendingSpace = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      pendingSpace = normalized.length > 0;
      continue;
    }
    if (pendingSpace) {
      normalized += ' ';
      map.push(i - 1);
      pendingSpace = false;
    }
    normalized += ch;
    map.push(i);
  }
  return { normalized, map };
}

function findQuoteOffsets(chunkText: string, quote: string) {
  if (!chunkText || !quote) return { quoteStart: null, quoteEnd: null };
  const direct = chunkText.indexOf(quote);
  if (direct >= 0) return { quoteStart: direct, quoteEnd: direct + quote.length };
  const lowerDirect = chunkText.toLowerCase().indexOf(quote.toLowerCase());
  if (lowerDirect >= 0) return { quoteStart: lowerDirect, quoteEnd: lowerDirect + quote.length };
  const chunkNorm = normalizeWithMap(chunkText);
  const quoteNorm = normalizeWithMap(quote).normalized;
  const idx = chunkNorm.normalized.toLowerCase().indexOf(quoteNorm.toLowerCase());
  if (idx < 0) return { quoteStart: null, quoteEnd: null };
  const start = chunkNorm.map[idx];
  const endChar = chunkNorm.map[idx + quoteNorm.length - 1];
  if (typeof start !== 'number' || typeof endChar !== 'number') return { quoteStart: null, quoteEnd: null };
  return { quoteStart: start, quoteEnd: endChar + 1 };
}

function buildHighlightToken(threadId: string, chunkId: string, quoteStart: number | null) {
  return createHash('sha256').update(`${threadId}:${chunkId}:${quoteStart ?? 'na'}`).digest('hex').slice(0, 18);
}

async function suggestTerms(universeId: string, question: string) {
  const db = getSupabaseServerClient();
  if (!db) return ['refine sua pergunta com termos mais específicos'];
  const keywords = question.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').split(/\s+/).filter((t) => t.length >= 4).slice(0, 6);
  const suggestions = new Set<string>();
  for (const keyword of keywords) {
    const { data } = await db.from('nodes').select('title').eq('universe_id', universeId).ilike('title', `%${keyword}%`).limit(3);
    for (const node of data ?? []) suggestions.add(node.title);
  }
  if (suggestions.size < 3) {
    const { data } = await db.from('nodes').select('title').eq('universe_id', universeId).order('created_at', { ascending: true }).limit(5);
    for (const node of data ?? []) suggestions.add(node.title);
  }
  return Array.from(suggestions).slice(0, 5);
}

async function persistQaThread(
  universeId: string,
  question: string,
  answer: string,
  citations: AskCitation[],
  nodeId: string | null,
  source: 'guided' | 'default' | 'tutor_chat',
  meta: { mode: 'strict_ok' | 'insufficient'; docsUsed: number; chunksUsed: number; insufficientReason: string | null },
) {
  const service = getSupabaseServiceRoleClient();
  if (!service) return null;
  const { data: thread } = await service
    .from('qa_threads')
    .insert({
      universe_id: universeId,
      node_id: nodeId,
      source,
      question,
      answer,
      mode: meta.mode,
      docs_used: meta.docsUsed,
      chunks_used: meta.chunksUsed,
      insufficient_reason: meta.insufficientReason,
    })
    .select('id')
    .maybeSingle();
  if (!thread) return null;

  const inserted = citations.length
    ? await service
        .from('citations')
        .insert(
          citations.map((citation, index) => ({
            qa_thread_id: thread.id,
            chunk_id: citation.chunkId,
            quote: citation.quote,
            page_start: citation.pageStart,
            page_end: citation.pageEnd,
            quote_start: citation.quoteStart,
            quote_end: citation.quoteEnd,
            ord: index + 1,
            highlight_token: buildHighlightToken(thread.id, citation.chunkId, citation.quoteStart),
          })),
        )
        .select('id, chunk_id, quote_start, quote_end, highlight_token')
    : { data: [] as PersistedCitation[] };

  return { threadId: thread.id, citations: (inserted.data ?? []) as PersistedCitation[] };
}

function applyCandidateBoost<T extends { chunk_id: string; document_id: string; score: number }>(
  candidates: T[],
  nodeDocWeights: Map<string, number>,
  scopedDocIds: Set<string>,
  scopedChunkIds: Set<string>,
) {
  return candidates.map((candidate) => {
    let score = candidate.score ?? 0;
    const nodeWeight = nodeDocWeights.get(candidate.document_id);
    if (nodeWeight) {
      score += Math.min(0.3, 0.05 + (Math.max(0, Math.min(1000, nodeWeight)) / 1000) * 0.25);
    }
    if (scopedDocIds.has(candidate.document_id)) score += 0.22;
    if (scopedChunkIds.has(candidate.chunk_id)) score += 0.55;
    return { ...candidate, score };
  });
}

async function resolveScopeSets(universeId: string, scope: AskScope | undefined) {
  const scopedDocIds = new Set<string>();
  const scopedChunkIds = new Set<string>();
  if (!scope) return { scopedDocIds, scopedChunkIds, scopedUsed: false };
  const db = getSupabaseServerClient();
  if (!db) return { scopedDocIds, scopedChunkIds, scopedUsed: false };
  for (const docId of scope.documentIds ?? []) {
    if (docId) scopedDocIds.add(docId);
  }
  const requiredEvidenceIds = (scope.requiredEvidenceIds ?? []).filter(Boolean);
  if (requiredEvidenceIds.length > 0) {
    const { data } = await db
      .from('evidences')
      .select('document_id, chunk_id')
      .eq('universe_id', universeId)
      .in('id', requiredEvidenceIds);
    for (const row of data ?? []) {
      if (row.document_id) scopedDocIds.add(row.document_id);
      if (row.chunk_id) scopedChunkIds.add(row.chunk_id);
    }
  }
  return { scopedDocIds, scopedChunkIds, scopedUsed: scopedDocIds.size > 0 || scopedChunkIds.size > 0 };
}

async function logQaAttempt(input: QaLogInput) {
  const service = getSupabaseServiceRoleClient();
  if (!service) return;
  await service.from('qa_logs').insert({
    kind: input.kind ?? 'ask',
    universe_id: input.universeId ?? null,
    thread_id: input.threadId ?? null,
    ok: input.ok ?? input.status === 'ok',
    status_code: input.statusCode ?? null,
    status: input.status,
    strict_mode: STRICT_MODE,
    question_length: input.questionLength,
    citations_count: input.citationsCount,
    chunks_used: input.chunksUsed ?? null,
    docs_used: input.docsUsed ?? null,
    docs_distintos: input.docsDistintos ?? input.docsUsed ?? null,
    chunks_usados: input.chunksUsados ?? input.chunksUsed ?? null,
    insufficient_reason: input.insufficientReason ?? null,
    rate_limited: input.rateLimited ?? input.status === 'rate_limited',
    evidence_sufficient: input.evidenceSufficient,
    latency_ms: input.latencyMs,
    requester_hash: input.requesterHash,
    user_present: input.userPresent ?? false,
    scope: input.scope ?? 'ask',
    source: input.source ?? 'default',
    scoped_docs_count: input.scopedDocsCount ?? null,
    scoped_used: input.scopedUsed ?? false,
  });
}

export async function askUniverse(payload: AskPayload, context: AskRunContext): Promise<AskRunResult> {
  const startedAt = Date.now();
  const requesterHash = context.requesterHashHint ?? hashRequester(context.ip || 'unknown');
  const source: 'guided' | 'default' | 'tutor_chat' = payload.source ?? 'default';
  const universeSlug = payload.universeSlug.trim();
  const nodeSlug = payload.nodeSlug?.trim() || null;
  const question = payload.question.trim();
  const db = getSupabaseServerClient();
  if (!db) {
    await logQaAttempt({
      status: 'error',
      statusCode: 503,
      questionLength: question.length,
      citationsCount: 0,
      chunksUsed: 0,
      docsUsed: 0,
      evidenceSufficient: false,
      latencyMs: Date.now() - startedAt,
      requesterHash,
      userPresent: Boolean(context.userId),
      source,
      scope: payload.scope?.mode ?? 'ask',
    });
    return { status: 503, body: { error: 'db_not_configured' } };
  }

  try {
    const { data: universe } = await db.from('universes').select('id').eq('slug', universeSlug).maybeSingle();
    if (!universe) {
      await logQaAttempt({
        status: 'error',
        statusCode: 404,
        questionLength: question.length,
        citationsCount: 0,
        chunksUsed: 0,
        docsUsed: 0,
        evidenceSufficient: false,
        latencyMs: Date.now() - startedAt,
        requesterHash,
        userPresent: Boolean(context.userId),
        source,
      });
      return { status: 404, body: { error: 'universe_not_found' } };
    }

    const askLimit = context.userId ? RATE_LIMITS.askAuth : RATE_LIMITS.askAnon;
    const rateResult = await rateLimit(
      buildAskRateKey({
        universeId: universe.id,
        userId: context.userId,
        ip: context.ip,
        windowSec: askLimit.windowSec,
      }),
      { limit: askLimit.limit, windowSec: askLimit.windowSec, prefix: 'cv:ask' },
    );
    if (!rateResult.ok) {
      const retryAfterSec = Math.max(1, Math.ceil((rateResult.resetAt - Date.now()) / 1000));
      await logQaAttempt({
        universeId: universe.id,
        status: 'rate_limited',
        statusCode: 429,
        questionLength: question.length,
        citationsCount: 0,
        chunksUsed: 0,
        docsUsed: 0,
        rateLimited: true,
        evidenceSufficient: false,
        latencyMs: Date.now() - startedAt,
        requesterHash,
        userPresent: Boolean(context.userId),
        source,
        scope: payload.scope?.mode ?? 'ask',
      });
      return {
        status: 429,
        body: { error: 'rate_limited', retryAfterSec, message: `Muitas requisicoes. Tente novamente em ${retryAfterSec}s.` },
      };
    }

    let nodeId: string | null = null;
    let nodeDocWeights = new Map<string, number>();
    if (nodeSlug) {
      const { data: node } = await db.from('nodes').select('id').eq('universe_id', universe.id).eq('slug', nodeSlug).maybeSingle();
      if (node?.id) {
        nodeId = node.id;
        const { data: linksRaw } = await db
          .from('node_documents')
          .select('document_id, weight')
          .eq('universe_id', universe.id)
          .eq('node_id', node.id)
          .limit(200);
        nodeDocWeights = new Map((linksRaw ?? []).filter((item) => item.document_id).map((item) => [item.document_id, item.weight ?? 100]));
      }
    }

    const { scopedDocIds, scopedChunkIds, scopedUsed } = await resolveScopeSets(universe.id, payload.scope);
    const rawCandidates = await retrieveCandidates(universe.id, question, { k: 20 });
    const candidates = applyCandidateBoost(rawCandidates, nodeDocWeights, scopedDocIds, scopedChunkIds);
    const reranked = rerankCandidates(candidates, { k: 8, maxPerDoc: 3, minDistinctDocs: 2, focusTop: 6 });
    const selected = reranked.selected;
    const docsUsed = reranked.distinctDocsSelected;
    const chunksUsed = selected.length;

    const docIds = Array.from(new Set(selected.map((item) => item.document_id)));
    const { data: docs } = docIds.length
      ? await db.from('documents').select('id, title, year').in('id', docIds)
      : { data: [] as Array<{ id: string; title: string; year: number | null }> };
    const docById = new Map((docs ?? []).map((d) => [d.id, d]));

    const citations = uniqueByChunk(
      selected.map((match) => {
        const doc = docById.get(match.document_id);
        const quote = normalizeQuote(match.text);
        const offsets = findQuoteOffsets(match.text, quote);
        return {
          chunkId: match.chunk_id,
          documentId: match.document_id,
          documentTitle: doc?.title ?? 'Documento sem titulo',
          year: doc?.year ?? null,
          pages: pageLabel(match.page_start, match.page_end),
          pageStart: match.page_start,
          pageEnd: match.page_end,
          quote,
          quoteStart: offsets.quoteStart,
          quoteEnd: offsets.quoteEnd,
        } satisfies AskCitation;
      }),
    ).slice(0, 8);

    const requiresMultiDoc = reranked.distinctDocsAvailable >= 2;
    const insufficientBySize = citations.length < 3;
    const insufficientByDiversity = requiresMultiDoc && docsUsed < 2;
    const insufficient = STRICT_MODE && (insufficientBySize || insufficientByDiversity);
    const insufficientReason = insufficientBySize
      ? 'poucos_trechos_relevantes'
      : insufficientByDiversity
        ? 'baixa_diversidade_documental'
        : null;
    const suggestions = insufficient ? await suggestTerms(universe.id, question) : [];

    const answer = composeAnswer({
      question,
      candidates: selected,
      insufficient,
      suggestions,
      insufficientReason: insufficientReason ?? undefined,
    });
    const mode: 'strict_ok' | 'insufficient' = insufficient ? 'insufficient' : 'strict_ok';

    const persisted = await persistQaThread(universe.id, question, answer, citations, nodeId, source, {
      mode,
      docsUsed,
      chunksUsed,
      insufficientReason,
    });
    const citationByChunk = new Map((persisted?.citations ?? []).map((c) => [c.chunk_id, c]));

    await logQaAttempt({
      universeId: universe.id,
      threadId: persisted?.threadId ?? null,
      status: 'ok',
      statusCode: 200,
      ok: true,
      mode,
      insufficientReason,
      questionLength: question.length,
      citationsCount: citations.length,
      chunksUsed,
      chunksUsados: chunksUsed,
      docsUsed,
      docsDistintos: docsUsed,
      evidenceSufficient: !insufficient,
      latencyMs: Date.now() - startedAt,
      requesterHash,
      userPresent: Boolean(context.userId),
      source,
      scope: payload.scope?.mode ?? 'ask',
      scopedDocsCount: scopedDocIds.size,
      scopedUsed,
    });

    return {
      status: 200,
      body: {
        answer,
        mode,
        insufficient,
        insufficientReason,
        suggestions: insufficient ? suggestions : [],
        threadId: persisted?.threadId ?? null,
        citations: citations.map((citation, ord) => {
          const saved = citationByChunk.get(citation.chunkId);
          return {
            ord: ord + 1,
            citationId: saved?.id ?? null,
            threadId: persisted?.threadId ?? null,
            docId: citation.documentId,
            chunkId: citation.chunkId,
            doc: citation.documentTitle,
            year: citation.year,
            pages: citation.pages,
            pageStart: citation.pageStart,
            pageEnd: citation.pageEnd,
            quote: citation.quote,
            quoteStart: saved?.quote_start ?? citation.quoteStart,
            quoteEnd: saved?.quote_end ?? citation.quoteEnd,
            highlightToken: saved?.highlight_token ?? null,
          };
        }),
      },
    };
  } catch (error) {
    captureException(error, {
      route: '/api/ask',
      latency_ms: Date.now() - startedAt,
      requester_hash: requesterHash,
    });
    await logQaAttempt({
      status: 'error',
      statusCode: 500,
      questionLength: question.length,
      citationsCount: 0,
      chunksUsed: 0,
      docsUsed: 0,
      evidenceSufficient: false,
      latencyMs: Date.now() - startedAt,
      requesterHash,
      userPresent: Boolean(context.userId),
      source,
      scope: payload.scope?.mode ?? 'ask',
    });
    return { status: 500, body: { error: 'ask_failed' } };
  }
}
