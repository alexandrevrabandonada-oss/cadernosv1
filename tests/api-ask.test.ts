import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type Candidate = {
  chunk_id: string;
  document_id: string;
  page_start: number | null;
  page_end: number | null;
  text: string;
  score: number;
  source: 'vector' | 'text';
  document_title: string;
  year: number | null;
};

type RateResult = { ok: boolean; remaining: number; resetAt: number };

let mockRateResult: RateResult = { ok: true, remaining: 10, resetAt: Date.now() + 60_000 };
let mockCandidates: Candidate[] = [];
let mockRerankResult: { selected: Candidate[]; distinctDocsAvailable: number; distinctDocsSelected: number } = {
  selected: [],
  distinctDocsAvailable: 0,
  distinctDocsSelected: 0,
};

const dbMock = {
  from(table: string) {
    if (table === 'universes') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: 'u-1', title: 'Universo Teste' } }),
          }),
        }),
      };
    }

    if (table === 'documents') {
      return {
        select: () => ({
          in: async () => ({
            data: [
              { id: 'd1', title: 'Doc A', year: 2021, text_quality_score: 82, method_kind: 'review' },
              { id: 'd2', title: 'Doc B', year: 2023, text_quality_score: 74, method_kind: 'observational' },
            ],
          }),
        }),
      };
    }

    if (table === 'nodes') {
      return {
        select: () => ({
          eq: () => ({
            ilike: () => ({
              limit: async () => ({ data: [{ title: 'Nucleo 1' }, { title: 'Nucleo 2' }] }),
            }),
            order: () => ({
              limit: async () => ({ data: [{ title: 'Nucleo 3' }] }),
            }),
          }),
        }),
      };
    }

    throw new Error(`Tabela nao mockada: ${table}`);
  },
};

const serviceMock = {
  from(table: string) {
    if (table === 'qa_threads') {
      return {
        insert: () => ({
          select: () => ({
            maybeSingle: async () => ({ data: { id: 'thread-1' } }),
          }),
        }),
      };
    }

    if (table === 'citations') {
      return {
        insert: (payload: Array<{ chunk_id: string; quote_start: number | null; quote_end: number | null }>) => ({
          select: async () => ({
            data: payload.map((item, index) => ({
              id: `cite-${index + 1}`,
              chunk_id: item.chunk_id,
              quote: 'q',
              page_start: 1,
              page_end: 1,
              quote_start: item.quote_start,
              quote_end: item.quote_end,
              highlight_token: `h-${index + 1}`,
            })),
          }),
        }),
      };
    }

    if (table === 'qa_logs') {
      return {
        insert: async () => ({ data: null }),
      };
    }

    throw new Error(`Tabela service nao mockada: ${table}`);
  },
};

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(() => dbMock),
  getSupabaseServiceRoleClient: vi.fn(() => serviceMock),
  getSupabaseServerAuthClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  })),
}));

vi.mock('@/lib/search/retrieve', () => ({
  retrieveCandidates: vi.fn(async () => mockCandidates),
}));

vi.mock('@/lib/search/rerank', () => ({
  rerankCandidates: vi.fn(() => mockRerankResult),
}));

vi.mock('@/lib/ratelimit', () => ({
  rateLimit: vi.fn(async () => mockRateResult),
}));

vi.mock('@/lib/obs/sentry', () => ({
  captureException: vi.fn(),
}));

function askRequest(payload: unknown) {
  return new NextRequest('http://localhost:3000/api/ask', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

describe('/api/ask integration leve', () => {
  beforeEach(() => {
    mockRateResult = { ok: true, remaining: 10, resetAt: Date.now() + 60_000 };
    mockCandidates = [];
    mockRerankResult = { selected: [], distinctDocsAvailable: 0, distinctDocsSelected: 0 };
  });

  it('retorna 400 para payload invalido', async () => {
    const { POST } = await import('@/app/api/ask/route');
    const res = await POST(askRequest({ universeSlug: 'x', question: 'curta' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('invalid_payload');
  });

  it('retorna 429 quando rate limit estoura', async () => {
    mockRateResult = { ok: false, remaining: 0, resetAt: Date.now() + 5_000 };
    const { POST } = await import('@/app/api/ask/route');
    const res = await POST(askRequest({ universeSlug: 'universo-a', question: 'Pergunta valida com contexto suficiente' }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe('rate_limited');
    expect(typeof body.retryAfterSec).toBe('number');
  });

  it('retorna insufficient quando faltam evidencias', async () => {
    mockCandidates = [
      {
        chunk_id: 'c1',
        document_id: 'd1',
        page_start: 1,
        page_end: 1,
        text: 'Trecho insuficiente para conclusao robusta.',
        score: 0.8,
        source: 'vector',
        document_title: 'Doc A',
        year: 2022,
      },
    ];
    mockRerankResult = {
      selected: mockCandidates,
      distinctDocsAvailable: 1,
      distinctDocsSelected: 1,
    };

    const { POST } = await import('@/app/api/ask/route');
    const res = await POST(
      askRequest({
        universeSlug: 'universo-a',
        question: 'Qual o efeito observado com base no material enviado?',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.mode).toBe('insufficient');
    expect(body.insufficient).toBe(true);
    expect(body.answer).toContain('## Achados');
    expect(body.answer).toContain('Nao ha base suficiente');
    expect(body.confidence).toBeTruthy();
    expect(body.confidence.label).toBe('fraca');
    expect(Array.isArray(body.limitations)).toBe(true);
    expect(body.divergence).toBeTruthy();
    expect(Array.isArray(body.citations)).toBe(true);
    expect(body.citations.length).toBeLessThanOrEqual(3);
  });

  it('retorna strict_ok com citations e ids persistidos', async () => {
    mockCandidates = [
      {
        chunk_id: 'c1',
        document_id: 'd1',
        page_start: 2,
        page_end: 3,
        text: 'O grupo A apresentou melhora sustentada em quatro semanas.',
        score: 0.91,
        source: 'vector',
        document_title: 'Doc A',
        year: 2021,
      },
      {
        chunk_id: 'c2',
        document_id: 'd2',
        page_start: 4,
        page_end: 4,
        text: 'O grupo B teve resposta parcial em subpopulacoes especificas.',
        score: 0.89,
        source: 'vector',
        document_title: 'Doc B',
        year: 2023,
      },
      {
        chunk_id: 'c3',
        document_id: 'd1',
        page_start: 5,
        page_end: 5,
        text: 'Nao houve aumento relevante de eventos adversos graves.',
        score: 0.86,
        source: 'vector',
        document_title: 'Doc A',
        year: 2021,
      },
    ];
    mockRerankResult = {
      selected: mockCandidates,
      distinctDocsAvailable: 2,
      distinctDocsSelected: 2,
    };

    const { POST } = await import('@/app/api/ask/route');
    const res = await POST(
      askRequest({
        universeSlug: 'universo-a',
        question: 'Quais achados principais com base nas evidencias disponiveis?',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.mode).toBe('strict_ok');
    expect(body.insufficient).toBe(false);
    expect(body.threadId).toBe('thread-1');
    expect(Array.isArray(body.citations)).toBe(true);
    expect(body.citations.length).toBeGreaterThanOrEqual(3);
    expect(body.citations[0].citationId).toBeTruthy();
    expect(body.citations[0].threadId).toBe('thread-1');
    expect(body.citations[0]).toHaveProperty('quoteStart');
    expect(body.citations[0]).toHaveProperty('quoteEnd');
    expect(body.confidence).toBeTruthy();
    expect(typeof body.confidence.score).toBe('number');
    expect(['forte', 'media', 'fraca']).toContain(body.confidence.label);
    expect(Array.isArray(body.limitations)).toBe(true);
    expect(body.divergence).toHaveProperty('flag');
  });
});
