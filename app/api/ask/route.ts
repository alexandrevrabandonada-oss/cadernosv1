import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { semanticSearchChunks } from '@/lib/search/semantic';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type AskPayload = {
  universeSlug: string;
  question: string;
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
};

type RateEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const STRICT_MODE = true;

type QaLogStatus = 'ok' | 'invalid_payload' | 'rate_limited' | 'error';
type QaLogInput = {
  universeId?: string | null;
  status: QaLogStatus;
  questionLength: number;
  citationsCount: number;
  evidenceSufficient: boolean;
  latencyMs: number;
  requesterHash: string;
};

const rateStore = globalThis as typeof globalThis & {
  __cvAskRateMap?: Map<string, RateEntry>;
};

function getRateMap() {
  if (!rateStore.__cvAskRateMap) {
    rateStore.__cvAskRateMap = new Map<string, RateEntry>();
  }
  return rateStore.__cvAskRateMap;
}

function getIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function hitRateLimit(ip: string) {
  const now = Date.now();
  const map = getRateMap();
  const current = map.get(ip);
  if (!current || current.resetAt <= now) {
    map.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  map.set(ip, current);
  return current.count > RATE_LIMIT_MAX;
}

function hashRequester(ip: string) {
  return createHash('sha256').update(ip).digest('hex').slice(0, 24);
}

function isValidPayload(payload: unknown): payload is AskPayload {
  if (!payload || typeof payload !== 'object') return false;
  const maybe = payload as Partial<AskPayload>;
  if (typeof maybe.universeSlug !== 'string' || typeof maybe.question !== 'string') return false;

  const universeSlug = maybe.universeSlug.trim();
  const question = maybe.question.trim();
  return universeSlug.length >= 2 && universeSlug.length <= 120 && question.length >= 8 && question.length <= 3000;
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

async function suggestTerms(universeId: string, question: string) {
  const db = getSupabaseServerClient();
  if (!db) return ['refine sua pergunta com termos mais específicos'];

  const keywords = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 4)
    .slice(0, 6);

  const suggestions = new Set<string>();
  for (const keyword of keywords) {
    const { data } = await db
      .from('nodes')
      .select('title')
      .eq('universe_id', universeId)
      .ilike('title', `%${keyword}%`)
      .limit(3);
    for (const node of data ?? []) {
      suggestions.add(node.title);
    }
  }

  if (suggestions.size < 3) {
    const { data } = await db
      .from('nodes')
      .select('title')
      .eq('universe_id', universeId)
      .order('created_at', { ascending: true })
      .limit(5);
    for (const node of data ?? []) suggestions.add(node.title);
  }

  return Array.from(suggestions).slice(0, 5);
}

function hasEnoughEvidence(
  matches: Awaited<ReturnType<typeof semanticSearchChunks>>,
  citations: AskCitation[],
) {
  if (matches.length < 2 || citations.length < 2) return false;
  const hasVectorStrong = matches.some((m) => m.source === 'vector' && m.similarity >= 0.12);
  const hasTextLength = citations.some((c) => c.quote.length >= 80);
  return hasVectorStrong || hasTextLength;
}

async function persistQaThread(
  universeId: string,
  question: string,
  answer: string,
  citations: AskCitation[],
) {
  const service = getSupabaseServiceRoleClient();
  if (!service) return;

  const { data: thread } = await service
    .from('qa_threads')
    .insert({
      universe_id: universeId,
      question,
      answer,
    })
    .select('id')
    .maybeSingle();

  if (!thread) return;

  if (citations.length > 0) {
    const extractPageRange = (pages: string) => {
      const numbers = (pages.match(/\d+/g) ?? []).map((n) => Number(n)).filter((n) => Number.isFinite(n));
      if (numbers.length === 0) return { page_start: null, page_end: null };
      if (numbers.length === 1) return { page_start: numbers[0], page_end: numbers[0] };
      return { page_start: numbers[0], page_end: numbers[numbers.length - 1] };
    };

    await service.from('citations').insert(
      citations.map((citation) => ({
        ...extractPageRange(citation.pages),
        qa_thread_id: thread.id,
        chunk_id: citation.chunkId,
        quote: citation.quote,
      })),
    );
  }
}

async function logQaAttempt(input: QaLogInput) {
  const service = getSupabaseServiceRoleClient();
  if (!service) return;

  await service.from('qa_logs').insert({
    universe_id: input.universeId ?? null,
    status: input.status,
    strict_mode: STRICT_MODE,
    question_length: input.questionLength,
    citations_count: input.citationsCount,
    evidence_sufficient: input.evidenceSufficient,
    latency_ms: input.latencyMs,
    requester_hash: input.requesterHash,
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const ip = getIp(request);
  const requesterHash = hashRequester(ip);

  if (hitRateLimit(ip)) {
    await logQaAttempt({
      status: 'rate_limited',
      questionLength: 0,
      citationsCount: 0,
      evidenceSufficient: false,
      latencyMs: Date.now() - startedAt,
      requesterHash,
    });
    return NextResponse.json(
      { error: 'rate_limited', message: 'Muitas requisicoes. Tente novamente em alguns segundos.' },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    await logQaAttempt({
      status: 'invalid_payload',
      questionLength: 0,
      citationsCount: 0,
      evidenceSufficient: false,
      latencyMs: Date.now() - startedAt,
      requesterHash,
    });
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    await logQaAttempt({
      status: 'invalid_payload',
      questionLength:
        payload && typeof payload === 'object' && typeof (payload as { question?: unknown }).question === 'string'
          ? (payload as { question: string }).question.trim().length
          : 0,
      citationsCount: 0,
      evidenceSufficient: false,
      latencyMs: Date.now() - startedAt,
      requesterHash,
    });
    return NextResponse.json(
      {
        error: 'invalid_payload',
        message: 'Payload esperado: { universeSlug: string, question: string }',
      },
      { status: 400 },
    );
  }

  const universeSlug = payload.universeSlug.trim();
  const question = payload.question.trim();
  const db = getSupabaseServerClient();
  if (!db) {
    await logQaAttempt({
      status: 'error',
      questionLength: question.length,
      citationsCount: 0,
      evidenceSufficient: false,
      latencyMs: Date.now() - startedAt,
      requesterHash,
    });
    return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  }

  try {
    const { data: universe } = await db
      .from('universes')
      .select('id, title')
      .eq('slug', universeSlug)
      .maybeSingle();

    if (!universe) {
      await logQaAttempt({
        status: 'error',
        questionLength: question.length,
        citationsCount: 0,
        evidenceSufficient: false,
        latencyMs: Date.now() - startedAt,
        requesterHash,
      });
      return NextResponse.json({ error: 'universe_not_found' }, { status: 404 });
    }

    const matches = await semanticSearchChunks({
      universeId: universe.id,
      query: question,
      topK: 6,
    });

    const docIds = Array.from(new Set(matches.map((m) => m.document_id)));
    const { data: docs } =
      docIds.length > 0
        ? await db
            .from('documents')
            .select('id, title, year')
            .in('id', docIds)
        : { data: [] as Array<{ id: string; title: string; year: number | null }> };

    const docById = new Map((docs ?? []).map((d) => [d.id, d]));

    const citations = uniqueByChunk(
      matches.map((match) => {
        const doc = docById.get(match.document_id);
        return {
          chunkId: match.chunk_id,
          documentId: match.document_id,
          documentTitle: doc?.title ?? 'Documento sem titulo',
          year: doc?.year ?? null,
          pages: pageLabel(match.page_start, match.page_end),
          pageStart: match.page_start,
          pageEnd: match.page_end,
          quote: normalizeQuote(match.text),
        } satisfies AskCitation;
      }),
    ).slice(0, 5);

    const evidenceSufficient = hasEnoughEvidence(matches, citations);
    const strictViolation = STRICT_MODE && citations.length === 0;

    let answer: string;
    if (strictViolation || !evidenceSufficient) {
      const suggestions = await suggestTerms(universe.id, question);
      answer = [
        'nao encontrei evidencia suficiente na base enviada.',
        strictViolation ? 'Modo estrito: sem citacao nao ha conclusao.' : '',
        `Sugestoes para refinar: ${suggestions.join('; ')}.`,
      ]
        .filter(Boolean)
        .join(' ');
    } else {
      const highlights = citations
        .slice(0, 3)
        .map((c) => `- ${c.quote}`)
        .join('\n');
      answer = [
        `Com base nos trechos recuperados do universo "${universe.title}", ha evidencias parciais para responder:`,
        '',
        highlights,
        '',
        'A interpretacao acima deve ser lida como sintese cautelosa dos trechos citados.',
      ].join('\n');
    }

    await persistQaThread(universe.id, question, answer, citations);
    await logQaAttempt({
      universeId: universe.id,
      status: 'ok',
      questionLength: question.length,
      citationsCount: citations.length,
      evidenceSufficient: evidenceSufficient && !strictViolation,
      latencyMs: Date.now() - startedAt,
      requesterHash,
    });

    return NextResponse.json({
      answer,
      citations: citations.map((citation) => ({
        docId: citation.documentId,
        chunkId: citation.chunkId,
        doc: citation.documentTitle,
        year: citation.year,
        pages: citation.pages,
        pageStart: citation.pageStart,
        pageEnd: citation.pageEnd,
        quote: citation.quote,
      })),
    });
  } catch {
    await logQaAttempt({
      status: 'error',
      questionLength: question.length,
      citationsCount: 0,
      evidenceSufficient: false,
      latencyMs: Date.now() - startedAt,
      requesterHash,
    });
    return NextResponse.json({ error: 'ask_failed' }, { status: 500 });
  }
}
