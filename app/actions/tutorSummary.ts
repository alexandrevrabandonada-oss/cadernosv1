'use server';

import { getCurrentSession } from '@/lib/auth/server';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import {
  buildTutorSessionSummary,
  upsertTutorSessionSummary,
  type TutorSessionSummaryData,
} from '@/lib/tutor/summary';

type StoredSummaryRow = {
  id: string;
  session_id: string;
  universe_id: string;
  user_id: string | null;
  covered_points: unknown;
  key_findings: unknown;
  limitations: unknown;
  next_steps: unknown;
  created_at: string;
  updated_at: string;
};

export type TutorSessionSummaryView = {
  id: string;
  sessionId: string;
  universeId: string;
  coveredPoints: TutorSessionSummaryData['coveredPoints'];
  keyFindings: TutorSessionSummaryData['keyFindings'];
  limitations: TutorSessionSummaryData['limitations'];
  nextSteps: TutorSessionSummaryData['nextSteps'];
  createdAt: string;
  updatedAt: string;
};

function normalizeSummary(row: StoredSummaryRow): TutorSessionSummaryView {
  return {
    id: row.id,
    sessionId: row.session_id,
    universeId: row.universe_id,
    coveredPoints: Array.isArray(row.covered_points)
      ? (row.covered_points as TutorSessionSummaryData['coveredPoints'])
      : [],
    keyFindings: Array.isArray(row.key_findings)
      ? (row.key_findings as TutorSessionSummaryData['keyFindings'])
      : [],
    limitations: Array.isArray(row.limitations)
      ? (row.limitations as TutorSessionSummaryData['limitations'])
      : [],
    nextSteps:
      row.next_steps && typeof row.next_steps === 'object'
        ? (row.next_steps as TutorSessionSummaryData['nextSteps'])
        : { nodes: [], trails: [], evidences: [] },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function logSummaryMetric(input: {
  universeId: string;
  ok: boolean;
  latencyMs: number;
  statusCode: number;
  sessionId: string;
  summaryId?: string | null;
}) {
  const service = getSupabaseServiceRoleClient();
  if (!service) return;
  await service.from('export_logs').insert({
    export_id: null,
    universe_id: input.universeId,
    kind: 'summary',
    format: 'both',
    ok: input.ok,
    latency_ms: input.latencyMs,
    status_code: input.statusCode,
    details: {
      session_id: input.sessionId,
      summary_id: input.summaryId ?? null,
      source: 'tutor_session_summary',
    },
  });
}

async function requireOwnerSession(sessionId: string) {
  const session = await getCurrentSession();
  if (!session) return null;

  const authDb = await getSupabaseServerAuthClient();
  const service = getSupabaseServiceRoleClient();
  if (!service) return null;

  if (session.userId === 'dev-bypass') {
    const { data } = await service
      .from('tutor_sessions')
      .select('id, user_id, universe_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (!data) return null;
    return { session, userId: data.user_id, universeId: data.universe_id };
  }

  if (!authDb) return null;
  const { data } = await authDb
    .from('tutor_sessions')
    .select('id, user_id, universe_id')
    .eq('id', sessionId)
    .eq('user_id', session.userId)
    .maybeSingle();
  if (!data) return null;
  return { session, userId: data.user_id, universeId: data.universe_id };
}

export async function getOrCreateTutorSummary(sessionId: string): Promise<TutorSessionSummaryView | null> {
  const startedAt = Date.now();
  const owner = await requireOwnerSession(sessionId);
  if (!owner) return null;
  const service = getSupabaseServiceRoleClient();
  if (!service) return null;

  const { data: existing } = await service
    .from('tutor_session_summaries')
    .select('id, session_id, universe_id, user_id, covered_points, key_findings, limitations, next_steps, created_at, updated_at')
    .eq('session_id', sessionId)
    .eq('user_id', owner.userId)
    .maybeSingle();
  if (existing) {
    const view = normalizeSummary(existing as StoredSummaryRow);
    await logSummaryMetric({
      universeId: owner.universeId,
      ok: true,
      latencyMs: Date.now() - startedAt,
      statusCode: 200,
      sessionId,
      summaryId: view.id,
    });
    return view;
  }

  const built = await buildTutorSessionSummary(sessionId);
  if (!built) {
    await logSummaryMetric({
      universeId: owner.universeId,
      ok: false,
      latencyMs: Date.now() - startedAt,
      statusCode: 500,
      sessionId,
    });
    return null;
  }
  const persisted = await upsertTutorSessionSummary({
    ...built,
    userId: owner.userId ?? built.userId ?? null,
  });
  if (!persisted) {
    await logSummaryMetric({
      universeId: owner.universeId,
      ok: false,
      latencyMs: Date.now() - startedAt,
      statusCode: 500,
      sessionId,
    });
    return null;
  }
  const view = normalizeSummary(persisted as StoredSummaryRow);
  await logSummaryMetric({
    universeId: owner.universeId,
    ok: true,
    latencyMs: Date.now() - startedAt,
    statusCode: 200,
    sessionId,
    summaryId: view.id,
  });
  return view;
}

export async function regenerateTutorSummary(sessionId: string): Promise<TutorSessionSummaryView | null> {
  const startedAt = Date.now();
  const owner = await requireOwnerSession(sessionId);
  if (!owner) return null;
  const built = await buildTutorSessionSummary(sessionId);
  if (!built) {
    await logSummaryMetric({
      universeId: owner.universeId,
      ok: false,
      latencyMs: Date.now() - startedAt,
      statusCode: 500,
      sessionId,
    });
    return null;
  }
  const persisted = await upsertTutorSessionSummary({
    ...built,
    userId: owner.userId ?? built.userId ?? null,
  });
  if (!persisted) {
    await logSummaryMetric({
      universeId: owner.universeId,
      ok: false,
      latencyMs: Date.now() - startedAt,
      statusCode: 500,
      sessionId,
    });
    return null;
  }
  const view = normalizeSummary(persisted as StoredSummaryRow);
  await logSummaryMetric({
    universeId: owner.universeId,
    ok: true,
    latencyMs: Date.now() - startedAt,
    statusCode: 200,
    sessionId,
    summaryId: view.id,
  });
  return view;
}
