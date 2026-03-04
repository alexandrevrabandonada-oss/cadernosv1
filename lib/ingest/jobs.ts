import 'server-only';
import { getAdminDb } from '@/lib/admin/db';

export type IngestJob = {
  id: number;
  universe_id: string;
  document_id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  job_kind: 'process' | 'reprocess';
  preset: 'default' | 'aggressive_dedupe' | 'no_dedupe' | 'short_chunks' | 'long_chunks' | null;
  attempts: number;
  last_error_safe: string | null;
  locked_at: string | null;
  locked_by: string | null;
  created_at: string;
  updated_at: string;
};

type EnqueueInput = {
  universeId: string;
  documentId: string;
  jobKind?: 'process' | 'reprocess';
  preset?: 'default' | 'aggressive_dedupe' | 'no_dedupe' | 'short_chunks' | 'long_chunks' | null;
};

async function logJobEvent(
  input: {
    universeId: string;
    documentId?: string | null;
    level?: 'info' | 'error';
    message: string;
    details?: Record<string, unknown>;
  },
) {
  const db = getAdminDb();
  if (!db) return;
  await db.from('ingest_logs').insert({
    universe_id: input.universeId,
    document_id: input.documentId ?? null,
    level: input.level ?? 'info',
    message: input.message,
    details: input.details ?? {},
  });
}

export async function enqueueIngestJob({ universeId, documentId, jobKind = 'process', preset = null }: EnqueueInput) {
  const db = getAdminDb();
  if (!db) return null;

  const { data: active } = await db
    .from('ingest_jobs')
    .select('*')
    .eq('document_id', documentId)
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active) return active as IngestJob;

  const { data, error } = await db
    .from('ingest_jobs')
    .insert({
      universe_id: universeId,
      document_id: documentId,
      status: 'pending',
      job_kind: jobKind,
      preset,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    const { data: existing } = await db
      .from('ingest_jobs')
      .select('*')
      .eq('document_id', documentId)
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (existing as IngestJob | null) ?? null;
  }

  await logJobEvent({
    universeId,
    documentId,
    message: 'job_enqueued',
    details: { reason: 'manual_enqueue', jobId: data?.id ?? null, jobKind, preset },
  });

  return (data as IngestJob | null) ?? null;
}

export async function enqueueAllPendingDocuments(universeId: string) {
  const db = getAdminDb();
  if (!db) return { queued: 0, skipped: 0 };

  const { data: docs } = await db
    .from('documents')
    .select('id, status')
    .eq('universe_id', universeId)
    .eq('is_deleted', false)
    .in('status', ['uploaded']);

  let queued = 0;
  let skipped = 0;
  for (const doc of docs ?? []) {
    const job = await enqueueIngestJob({ universeId, documentId: doc.id, jobKind: 'process' });
    if (job?.status === 'pending' && job.attempts === 0) queued += 1;
    else skipped += 1;
  }

  await logJobEvent({
    universeId,
    message: 'job_enqueued_batch',
    details: { reason: 'manual_enqueue_all', queued, skipped },
  });

  return { queued, skipped };
}

export async function claimNextJobs({
  limit,
  workerId,
  universeId,
}: {
  limit: number;
  workerId: string;
  universeId?: string;
}) {
  const db = getAdminDb();
  if (!db) return [];

  const { data } = await db.rpc('claim_ingest_jobs', {
    p_limit: limit,
    p_worker_id: workerId,
    p_universe_id: universeId ?? null,
  });

  const jobs = (data ?? []) as IngestJob[];
  for (const job of jobs) {
    await logJobEvent({
      universeId: job.universe_id,
      documentId: job.document_id,
      message: 'job_claimed',
      details: { reason: 'worker_claim', jobId: job.id, workerId },
    });
  }
  return jobs;
}

export async function finishJob(jobId: number) {
  const db = getAdminDb();
  if (!db) return;

  const { data: job } = await db
    .from('ingest_jobs')
    .update({
      status: 'done',
      last_error_safe: null,
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select('*')
    .maybeSingle();

  if (job) {
    await logJobEvent({
      universeId: job.universe_id,
      documentId: job.document_id,
      message: 'job_done',
      details: { reason: 'worker_finish', jobId: job.id },
    });
  }
}

export async function failJob(jobId: number, errorSafe: string) {
  const db = getAdminDb();
  if (!db) return;

  const safe = errorSafe.slice(0, 320);
  const { data: job } = await db
    .from('ingest_jobs')
    .update({
      status: 'error',
      last_error_safe: safe,
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select('*')
    .maybeSingle();

  if (job) {
    await logJobEvent({
      universeId: job.universe_id,
      documentId: job.document_id,
      level: 'error',
      message: 'job_failed',
      details: { reason: 'worker_fail', jobId: job.id },
    });
  }
}

export async function listLatestJobsByUniverse(universeId: string) {
  const db = getAdminDb();
  if (!db) return [] as IngestJob[];

  const { data } = await db
    .from('ingest_jobs')
    .select('*')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: false })
    .limit(300);

  return (data ?? []) as IngestJob[];
}
