import 'server-only';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { RATE_LIMITS, isRateLimitEnabled, isUpstashConfigured } from '@/lib/ratelimit/config';
import { isSentryConfigured } from '@/lib/obs/sentry';
import { getWeekKey } from '@/lib/share/week';
import { getGlobalAnalyticsSummary24h } from '@/lib/analytics/dashboard';

type HealthState = 'ok' | 'fail' | 'warn';

type BaseStatus = {
  generatedAt: string;
  db: {
    state: HealthState;
    message: string;
  };
  storage: {
    state: HealthState;
    message: string;
  };
  counts: {
    universes: number | null;
    documents: number | null;
    chunks: number | null;
    ingestPending: number | null;
    ingestRunning: number | null;
    ingestDone: number | null;
    ingestError: number | null;
  };
  rateLimit: {
    enabled: boolean;
    redisConfigured: boolean;
    askAnon: string;
    askAuth: string;
    ingest: string;
    adminWrite: string;
  };
  sentry: {
    configured: boolean;
    environment: string;
  };
};

export type PublicSystemStatus = BaseStatus;

export type AdminSystemStatus = BaseStatus & {
  env: {
    nextPublicSupabaseUrl: boolean;
    nextPublicSupabaseAnonKey: boolean;
    nextPublicSiteUrl: boolean;
    supabaseServiceRoleKey: boolean;
    supabaseProjectRef: boolean;
    supabaseDbPassword: boolean;
    supabaseAccessToken: boolean;
    vercelToken: boolean;
    vercelOrgId: boolean;
    vercelProjectId: boolean;
    upstashUrl: boolean;
    upstashToken: boolean;
    sentryDsn: boolean;
    sentryAuthToken: boolean;
    sentryEnvironment: boolean;
    adminModeEnabled: boolean;
  };
  ops24h: {
    ask: {
      requests: number;
      rateLimitedCount: number;
      rateLimitedPct: number;
      errors5xxCount: number;
      errors5xxPct: number;
      docsDistintosAvg: number;
      latencyAvgMs: number;
      latencyP95Ms: number;
      latencyMaxMs: number;
      confidenceStrong: number;
      confidenceMedium: number;
      confidenceWeak: number;
      divergencePct: number;
    };
    ingest: {
      avgJobLatencyMs: number;
      jobLogsCount: number;
      pending: number;
      running: number;
      error: number;
    };
    exports: {
      generated: number;
      avgLatencyMs: number;
      errors: number;
    };
    quality: {
      avgTextQualityScore: number;
      docsScored: number;
      worstUniverses: Array<{
        universeId: string;
        slug: string;
        title: string;
        avgScore: number;
      }>;
    };
    tutor: {
      messages24h: number;
      insufficientCount: number;
      insufficientPct: number;
      pointsCompleted24h: number;
      summaries24h: number;
      sessionExports24h: number;
    };
    distribution: {
      weekKey: string;
      packsPendingThisWeek: number;
      channelsPendingThisWeek: number;
      latestCronRunAt: string | null;
    };
    evidences: {
      draft: number;
      review: number;
      published24h: number;
    };
    analytics: {
      pageViews24h: number;
      shareViews24h: number;
      shareOpenApp24h: number;
      universesWithShareOpenApp: number;
      topUniversesByShareOpenApp: Array<{ universeId: string; shareOpenAppClicks: number }>;
    };
  };
};

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((acc, item) => acc + item, 0) / values.length);
}

function percentile95(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return Math.round(sorted[index] ?? 0);
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

async function countRows(table: 'universes' | 'documents' | 'chunks') {
  const service = getSupabaseServiceRoleClient();
  const fallback = getSupabaseServerClient();
  const client = service ?? fallback;
  if (!client) return null;

  const query = client.from(table).select('*', { count: 'exact', head: true });
  const tableQuery = table === 'documents' ? query.eq('is_deleted', false) : query;
  const { count, error } = await tableQuery;
  if (error) return null;
  return count ?? 0;
}

async function countIngestByStatus(status: 'pending' | 'running' | 'done' | 'error') {
  const service = getSupabaseServiceRoleClient();
  const fallback = getSupabaseServerClient();
  const client = service ?? fallback;
  if (!client) return null;

  const { count, error } = await client
    .from('ingest_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  if (error) return null;
  return count ?? 0;
}

async function getBaseStatus(): Promise<BaseStatus> {
  const service = getSupabaseServiceRoleClient();
  const fallback = getSupabaseServerClient();
  const dbClient = service ?? fallback;

  let dbState: HealthState = 'fail';
  let dbMessage = 'Supabase nao configurado.';
  if (dbClient) {
    const { error } = await dbClient.from('universes').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) {
      dbState = 'fail';
      dbMessage = 'Falha ao consultar banco.';
    } else {
      dbState = 'ok';
      dbMessage = 'Conexao com banco ativa.';
    }
  }

  let storageState: HealthState = 'warn';
  let storageMessage = 'Sem cliente com permissao para validar storage.';
  if (service) {
    const { error } = await service.storage.from('cv-docs').list('', { limit: 1 });
    if (error) {
      storageState = 'fail';
      storageMessage = 'Falha ao acessar bucket cv-docs.';
    } else {
      storageState = 'ok';
      storageMessage = 'Bucket cv-docs acessivel.';
    }
  } else if (fallback) {
    storageState = 'warn';
    storageMessage = 'Cliente anonimo ativo; cheque de storage parcial.';
  }

  const [universes, documents, chunks, ingestPending, ingestRunning, ingestDone, ingestError] = await Promise.all([
    countRows('universes'),
    countRows('documents'),
    countRows('chunks'),
    countIngestByStatus('pending'),
    countIngestByStatus('running'),
    countIngestByStatus('done'),
    countIngestByStatus('error'),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    db: { state: dbState, message: dbMessage },
    storage: { state: storageState, message: storageMessage },
    counts: { universes, documents, chunks, ingestPending, ingestRunning, ingestDone, ingestError },
    rateLimit: {
      enabled: isRateLimitEnabled(),
      redisConfigured: isUpstashConfigured(),
      askAnon: `${RATE_LIMITS.askAnon.limit}/${RATE_LIMITS.askAnon.windowSec}s`,
      askAuth: `${RATE_LIMITS.askAuth.limit}/${RATE_LIMITS.askAuth.windowSec}s`,
      ingest: `${RATE_LIMITS.ingest.limit}/${RATE_LIMITS.ingest.windowSec}s`,
      adminWrite: `${RATE_LIMITS.adminWrite.limit}/${RATE_LIMITS.adminWrite.windowSec}s`,
    },
    sentry: {
      configured: isSentryConfigured(),
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'unknown',
    },
  };
}

async function getOps24h() {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    return {
      ask: {
        requests: 0,
        rateLimitedCount: 0,
        rateLimitedPct: 0,
        errors5xxCount: 0,
        errors5xxPct: 0,
        docsDistintosAvg: 0,
        latencyAvgMs: 0,
        latencyP95Ms: 0,
        latencyMaxMs: 0,
        confidenceStrong: 0,
        confidenceMedium: 0,
        confidenceWeak: 0,
        divergencePct: 0,
      },
      ingest: {
        avgJobLatencyMs: 0,
        jobLogsCount: 0,
        pending: 0,
        running: 0,
        error: 0,
      },
      exports: {
        generated: 0,
        avgLatencyMs: 0,
        errors: 0,
      },
      quality: {
        avgTextQualityScore: 0,
        docsScored: 0,
        worstUniverses: [],
      },
      tutor: {
        messages24h: 0,
        insufficientCount: 0,
        insufficientPct: 0,
        pointsCompleted24h: 0,
        summaries24h: 0,
        sessionExports24h: 0,
      },
      distribution: {
        weekKey: getWeekKey(new Date(), 'America/Sao_Paulo'),
        packsPendingThisWeek: 0,
        channelsPendingThisWeek: 0,
        latestCronRunAt: null,
      },
      evidences: {
        draft: 0,
        review: 0,
        published24h: 0,
      },
      analytics: {
        pageViews24h: 0,
        shareViews24h: 0,
        shareOpenApp24h: 0,
        universesWithShareOpenApp: 0,
        topUniversesByShareOpenApp: [],
      },
    };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekKey = getWeekKey(new Date(), 'America/Sao_Paulo');
  const [
    { data: qa },
    { data: ingest },
    { data: exports },
    { data: docsQuality },
    { data: universesMeta },
    { count: tutorMessagesCount },
    { data: tutorQaLogs },
    { count: tutorPointsDoneCount },
    { count: tutorSummariesCount },
    { count: tutorSessionExportsCount },
    { data: weekPacksRaw },
    { data: weekPostsRaw },
    { data: latestCronRunRaw },
    { count: evidenceDraftCount },
    { count: evidenceReviewCount },
    { count: evidencePublished24hCount },
    { data: qaThreadsMetricsRaw },
    { data: analytics24hRaw },
    globalAnalyticsSummary,
    pending,
    running,
    error,
  ] = await Promise.all([
    db
      .from('qa_logs')
      .select('status_code, rate_limited, latency_ms, docs_distintos')
      .eq('kind', 'ask')
      .gte('created_at', since)
      .limit(5000),
    db.from('ingest_logs').select('latency_ms, ok, kind').eq('kind', 'ingest_job').gte('created_at', since).limit(5000),
    db.from('export_logs').select('latency_ms, ok, kind').eq('kind', 'export').gte('created_at', since).limit(5000),
    db
      .from('documents')
      .select('universe_id, text_quality_score, is_deleted')
      .eq('is_deleted', false)
      .not('text_quality_score', 'is', null)
      .limit(20000),
    db.from('universes').select('id, slug, title'),
    db.from('tutor_chat_messages').select('*', { count: 'exact', head: true }).gte('created_at', since),
    db
      .from('qa_logs')
      .select('insufficient_reason, evidence_sufficient')
      .eq('kind', 'ask')
      .eq('source', 'tutor_chat')
      .gte('created_at', since)
      .limit(5000),
    db
      .from('tutor_points')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('completed_at', since),
    db.from('tutor_session_summaries').select('*', { count: 'exact', head: true }).gte('created_at', since),
    db.from('exports').select('*', { count: 'exact', head: true }).eq('kind', 'tutor_session').gte('created_at', since),
    db.from('share_packs').select('id').eq('week_key', weekKey).limit(500),
    db.from('share_pack_posts').select('pack_id, status').eq('status', 'pending').limit(2000),
    db
      .from('share_pack_runs')
      .select('created_at')
      .eq('run_kind', 'cron')
      .order('created_at', { ascending: false })
      .limit(1),
    db.from('evidences').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    db.from('evidences').select('*', { count: 'exact', head: true }).eq('status', 'review'),
    db.from('evidences').select('*', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', since),
    db
      .from('qa_threads')
      .select('confidence_label, divergence_flag')
      .gte('created_at', since)
      .limit(5000),
    db
      .from('analytics_events')
      .select('event_name')
      .gte('created_at', since)
      .in('event_name', ['page_view', 'share_view', 'share_open_app'])
      .limit(50_000),
    getGlobalAnalyticsSummary24h(),
    countIngestByStatus('pending'),
    countIngestByStatus('running'),
    countIngestByStatus('error'),
  ]);

  const qaRows = qa ?? [];
  const qaThreadsMetrics = qaThreadsMetricsRaw ?? [];
  const qaLat = qaRows.map((row) => row.latency_ms).filter((n): n is number => typeof n === 'number' && n >= 0);
  const qaDocsDistintos = qaRows
    .map((row) => row.docs_distintos)
    .filter((n): n is number => typeof n === 'number' && n >= 0);
  const qa429 = qaRows.filter((row) => row.rate_limited || row.status_code === 429).length;
  const qa5xx = qaRows.filter((row) => (row.status_code ?? 0) >= 500).length;
  const confidenceStrong = qaThreadsMetrics.filter((row) => row.confidence_label === 'forte').length;
  const confidenceMedium = qaThreadsMetrics.filter((row) => row.confidence_label === 'media').length;
  const confidenceWeak = qaThreadsMetrics.filter((row) => row.confidence_label === 'fraca').length;
  const divergenceCount = qaThreadsMetrics.filter((row) => row.divergence_flag === true).length;

  const ingestRows = ingest ?? [];
  const ingestLat = ingestRows
    .map((row) => row.latency_ms)
    .filter((n): n is number => typeof n === 'number' && n >= 0);

  const exportRows = exports ?? [];
  const exportLat = exportRows
    .map((row) => row.latency_ms)
    .filter((n): n is number => typeof n === 'number' && n >= 0);

  const qualityRows = (docsQuality ?? [])
    .filter(
      (row) =>
        typeof row.universe_id === 'string' &&
        typeof row.text_quality_score === 'number',
    )
    .map((row) => ({
      universe_id: row.universe_id as string,
      text_quality_score: row.text_quality_score as number,
    }));
  const qualityByUniverse = new Map<string, number[]>();
  for (const row of qualityRows) {
    const current = qualityByUniverse.get(row.universe_id) ?? [];
    current.push(row.text_quality_score);
    qualityByUniverse.set(row.universe_id, current);
  }
  const universeMetaById = new Map((universesMeta ?? []).map((u) => [u.id, u]));
  const worstUniverses = Array.from(qualityByUniverse.entries())
    .map(([universeId, scores]) => {
      const meta = universeMetaById.get(universeId);
      return {
        universeId,
        slug: meta?.slug ?? 'n/a',
        title: meta?.title ?? 'Universo',
        avgScore: avg(scores),
      };
    })
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);
  const avgTextQualityScore = qualityRows.length > 0 ? avg(qualityRows.map((row) => row.text_quality_score)) : 0;
  const tutorAskRows = tutorQaLogs ?? [];
  const tutorInsufficientCount = tutorAskRows.filter(
    (row) => row.insufficient_reason !== null || row.evidence_sufficient === false,
  ).length;

  const weekPackIds = new Set((weekPacksRaw ?? []).map((row) => row.id));
  const pendingPostsThisWeek = (weekPostsRaw ?? []).filter((row) => weekPackIds.has(row.pack_id));
  const packsPendingThisWeek = new Set(pendingPostsThisWeek.map((row) => row.pack_id)).size;
  const channelsPendingThisWeek = pendingPostsThisWeek.length;
  const latestCronRunAt = (latestCronRunRaw ?? [])[0]?.created_at ?? null;
  const analytics24h = analytics24hRaw ?? [];
  const pageViews24h = analytics24h.filter((row) => row.event_name === 'page_view').length;
  const shareViews24h = analytics24h.filter((row) => row.event_name === 'share_view').length;
  const shareOpenApp24h = analytics24h.filter((row) => row.event_name === 'share_open_app').length;

  return {
    ask: {
      requests: qaRows.length,
      rateLimitedCount: qa429,
      rateLimitedPct: pct(qa429, qaRows.length),
      errors5xxCount: qa5xx,
      errors5xxPct: pct(qa5xx, qaRows.length),
      docsDistintosAvg: avg(qaDocsDistintos),
      latencyAvgMs: avg(qaLat),
      latencyP95Ms: percentile95(qaLat),
      latencyMaxMs: qaLat.length ? Math.max(...qaLat) : 0,
      confidenceStrong,
      confidenceMedium,
      confidenceWeak,
      divergencePct: pct(divergenceCount, qaThreadsMetrics.length),
    },
    ingest: {
      avgJobLatencyMs: avg(ingestLat),
      jobLogsCount: ingestRows.length,
      pending: pending ?? 0,
      running: running ?? 0,
      error: error ?? 0,
    },
    exports: {
      generated: exportRows.filter((row) => row.ok === true).length,
      avgLatencyMs: avg(exportLat),
      errors: exportRows.filter((row) => row.ok === false).length,
    },
    quality: {
      avgTextQualityScore,
      docsScored: qualityRows.length,
      worstUniverses,
    },
    tutor: {
      messages24h: tutorMessagesCount ?? 0,
      insufficientCount: tutorInsufficientCount,
      insufficientPct: pct(tutorInsufficientCount, tutorAskRows.length),
      pointsCompleted24h: tutorPointsDoneCount ?? 0,
      summaries24h: tutorSummariesCount ?? 0,
      sessionExports24h: tutorSessionExportsCount ?? 0,
    },
    distribution: {
      weekKey,
      packsPendingThisWeek,
      channelsPendingThisWeek,
      latestCronRunAt,
    },
    evidences: {
      draft: evidenceDraftCount ?? 0,
      review: evidenceReviewCount ?? 0,
      published24h: evidencePublished24hCount ?? 0,
    },
    analytics: {
      pageViews24h,
      shareViews24h,
      shareOpenApp24h,
      universesWithShareOpenApp: globalAnalyticsSummary.topUniversesByShareOpenApp.length,
      topUniversesByShareOpenApp: globalAnalyticsSummary.topUniversesByShareOpenApp,
    },
  };
}

export async function getPublicSystemStatus(): Promise<PublicSystemStatus> {
  return getBaseStatus();
}

export async function getAdminSystemStatus(): Promise<AdminSystemStatus> {
  const base = await getBaseStatus();
  const ops24h = await getOps24h();
  return {
    ...base,
    env: {
      nextPublicSupabaseUrl: hasEnv('NEXT_PUBLIC_SUPABASE_URL'),
      nextPublicSupabaseAnonKey: hasEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      nextPublicSiteUrl: hasEnv('NEXT_PUBLIC_SITE_URL'),
      supabaseServiceRoleKey: hasEnv('SUPABASE_SERVICE_ROLE_KEY'),
      supabaseProjectRef: hasEnv('SUPABASE_PROJECT_REF'),
      supabaseDbPassword: hasEnv('SUPABASE_DB_PASSWORD'),
      supabaseAccessToken: hasEnv('SUPABASE_ACCESS_TOKEN'),
      vercelToken: hasEnv('VERCEL_TOKEN'),
      vercelOrgId: hasEnv('VERCEL_ORG_ID'),
      vercelProjectId: hasEnv('VERCEL_PROJECT_ID'),
      upstashUrl: hasEnv('UPSTASH_REDIS_REST_URL'),
      upstashToken: hasEnv('UPSTASH_REDIS_REST_TOKEN'),
      sentryDsn: hasEnv('SENTRY_DSN'),
      sentryAuthToken: hasEnv('SENTRY_AUTH_TOKEN'),
      sentryEnvironment: hasEnv('SENTRY_ENVIRONMENT'),
      adminModeEnabled: process.env.NODE_ENV === 'development' && process.env.DEV_ADMIN_BYPASS === '1',
    },
    ops24h,
  };
}
