import { describe, expect, it, vi } from 'vitest';

type EvidenceRow = {
  id: string;
  title: string;
  summary: string;
  document_id: string | null;
  chunk_id: string | null;
  node_id: string | null;
  source_url?: string | null;
  created_at: string;
  curated: boolean;
  status: 'draft' | 'review' | 'published' | 'rejected';
};

function makeQuery(rows: EvidenceRow[], eqCalls: Array<{ column: string; value: unknown }>) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn((column: string, value: unknown) => {
        eqCalls.push({ column, value });
        return {
          eq: vi.fn((column2: string, value2: unknown) => {
            eqCalls.push({ column: column2, value: value2 });
            return {
              order: vi.fn(() => ({
                range: vi.fn(async () => ({ data: rows })),
              })),
            };
          }),
          order: vi.fn(() => ({
            range: vi.fn(async () => ({ data: rows })),
          })),
        };
      }),
      order: vi.fn(() => ({
        range: vi.fn(async () => ({ data: rows })),
      })),
    })),
  };
}

describe('workflow editorial de evidencias', () => {
  it('promoteChunkToEvidence cria/atualiza com status draft', async () => {
    const addNodeEvidence = vi.fn(async () => undefined);
    const service = {
      from(table: string) {
        if (table === 'chunks') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'chunk-1',
                      universe_id: 'u-1',
                      document_id: 'doc-1',
                      page_start: 2,
                      page_end: 2,
                      text: 'Trecho base para promover evidencia.',
                    },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: 'doc-1', title: 'Doc 1', source_url: null } }),
              }),
            }),
          };
        }
        if (table === 'nodes') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: 'node-1', title: 'Ar' } }),
                }),
              }),
            }),
          };
        }
        if (table === 'evidences') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                maybeSingle: async () => {
                  expect(payload.status).toBe('draft');
                  expect(payload.curated).toBe(true);
                  return { data: { id: 'ev-1' } };
                },
              }),
            }),
          };
        }
        if (table === 'evidence_audit_logs' || table === 'ingest_logs') {
          return {
            insert: async () => ({ data: null }),
          };
        }
        throw new Error(`Tabela nao mockada: ${table}`);
      },
    };

    vi.doMock('@/lib/auth/requireRole', () => ({
      requireEditorOrAdmin: vi.fn(async () => ({ userId: 'user-1', role: 'editor' })),
    }));
    vi.doMock('@/lib/data/nodeLinks', () => ({
      addNodeEvidence,
    }));
    vi.doMock('@/lib/supabase/server', () => ({
      getSupabaseServiceRoleClient: vi.fn(() => service),
    }));

    const { promoteChunkToEvidence } = await import('@/lib/curation/promoteEvidence');
    const result = await promoteChunkToEvidence({
      universeId: 'u-1',
      chunkId: 'chunk-1',
      nodeId: 'node-1',
    });

    expect(result?.evidenceId).toBe('ev-1');
    expect(addNodeEvidence).toHaveBeenCalled();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('listEvidenceItems aplica published para publico e permite all para admin', async () => {
    const publicEqCalls: Array<{ column: string; value: unknown }> = [];
    const adminEqCalls: Array<{ column: string; value: unknown }> = [];
    const rows: EvidenceRow[] = [
      {
        id: 'ev-1',
        title: 'Evidencia 1',
        summary: 'Resumo',
        document_id: null,
        chunk_id: null,
        node_id: null,
        created_at: new Date().toISOString(),
        curated: true,
        status: 'published',
      },
    ];

    const publicDb = {
      from(table: string) {
        if (table === 'evidences') return makeQuery(rows, publicEqCalls);
        throw new Error(`Tabela nao mockada publico: ${table}`);
      },
    };
    const adminDb = {
      from(table: string) {
        if (table === 'evidences') return makeQuery(rows, adminEqCalls);
        throw new Error(`Tabela nao mockada admin: ${table}`);
      },
    };

    vi.doMock('@/lib/auth/requireRole', () => ({
      canWriteAdminContent: vi.fn(async () => false),
    }));
    vi.doMock('@/lib/supabase/server', () => ({
      getSupabaseServerClient: vi.fn(() => publicDb),
      getSupabaseServiceRoleClient: vi.fn(() => null),
    }));

    let mod = await import('@/lib/data/provas');
    await mod.listEvidenceItems({
      universeId: 'u-1',
      filters: {
        type: 'evidence',
        editorial: 'all',
        yearFrom: null,
        yearTo: null,
        tags: [],
        node: '',
        q: '',
        relatedTo: '',
        selected: '',
        panel: '',
        cursor: 0,
      },
      limit: 8,
      cursor: 0,
    });
    expect(publicEqCalls.some((call) => call.column === 'status' && call.value === 'published')).toBe(true);

    vi.resetModules();
    vi.clearAllMocks();

    vi.doMock('@/lib/auth/requireRole', () => ({
      canWriteAdminContent: vi.fn(async () => true),
    }));
    vi.doMock('@/lib/supabase/server', () => ({
      getSupabaseServerClient: vi.fn(() => null),
      getSupabaseServiceRoleClient: vi.fn(() => adminDb),
    }));

    mod = await import('@/lib/data/provas');
    await mod.listEvidenceItems({
      universeId: 'u-1',
      filters: {
        type: 'evidence',
        editorial: 'all',
        yearFrom: null,
        yearTo: null,
        tags: [],
        node: '',
        q: '',
        relatedTo: '',
        selected: '',
        panel: '',
        cursor: 0,
      },
      limit: 8,
      cursor: 0,
    });
    expect(adminEqCalls.some((call) => call.column === 'status')).toBe(false);

    vi.resetModules();
    vi.clearAllMocks();
  });
});
