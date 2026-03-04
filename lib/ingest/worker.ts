import 'server-only';
import { getAdminDb } from '@/lib/admin/db';
import { claimNextJobs, failJob, finishJob } from '@/lib/ingest/jobs';
import { captureException } from '@/lib/obs/sentry';
import { processDocument } from '@/lib/ingest/process';

type WorkerResult = {
  claimed: number;
  done: number;
  failed: number;
  errors: string[];
};

export async function runIngestWorker({
  limit = 5,
  workerId = `worker-${Date.now()}`,
  universeId,
}: {
  limit?: number;
  workerId?: string;
  universeId?: string;
}): Promise<WorkerResult> {
  const db = getAdminDb();
  const jobs = await claimNextJobs({ limit, workerId, universeId });
  let done = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const job of jobs) {
    const startedAt = Date.now();
    try {
      const result = await processDocument(job.universe_id, job.document_id, {
        preset: job.preset ?? undefined,
        jobKind: job.job_kind ?? 'process',
      });
      const latencyMs = Date.now() - startedAt;
      if (result.ok) {
        await finishJob(job.id);
        if (db) {
          await db.from('ingest_logs').insert({
            universe_id: job.universe_id,
            document_id: job.document_id,
            level: 'info',
            message: 'ingest_job_result',
            details: {
              reason: 'ingest_job',
              workerId,
              preset: result.presetUsed,
              qualityScore: result.qualityScore,
              qualityFlags: result.flags,
            },
            kind: 'ingest_job',
            job_id: job.id,
            ok: true,
            latency_ms: latencyMs,
            attempts: job.attempts ?? 0,
          });
        }
        done += 1;
      } else {
        const msg = result.error || 'process_failed';
        await failJob(job.id, msg);
        if (db) {
          await db.from('ingest_logs').insert({
            universe_id: job.universe_id,
            document_id: job.document_id,
            level: 'error',
            message: 'ingest_job_result',
            details: {
              reason: 'ingest_job',
              workerId,
              preset: result.presetUsed,
              qualityScore: result.qualityScore,
              qualityFlags: result.flags,
            },
            kind: 'ingest_job',
            job_id: job.id,
            ok: false,
            latency_ms: latencyMs,
            attempts: job.attempts ?? 0,
          });
        }
        captureException(new Error(msg), {
          route: 'ingest_worker',
          job_id: job.id,
          document_id: job.document_id,
          universe_id: job.universe_id,
          attempts: job.attempts ?? 0,
          latency_ms: latencyMs,
        });
        failed += 1;
        errors.push(`${job.id}:${msg}`);
      }
    } catch (error) {
      const msg = 'worker_unexpected_error';
      await failJob(job.id, msg);
      const latencyMs = Date.now() - startedAt;
      if (db) {
        await db.from('ingest_logs').insert({
          universe_id: job.universe_id,
          document_id: job.document_id,
          level: 'error',
          message: 'ingest_job_result',
          details: { reason: 'ingest_job', workerId },
          kind: 'ingest_job',
          job_id: job.id,
          ok: false,
          latency_ms: latencyMs,
          attempts: job.attempts ?? 0,
        });
      }
      captureException(error, {
        route: 'ingest_worker',
        job_id: job.id,
        document_id: job.document_id,
        universe_id: job.universe_id,
        attempts: job.attempts ?? 0,
        latency_ms: latencyMs,
      });
      failed += 1;
      errors.push(`${job.id}:${msg}`);
    }
  }

  return { claimed: jobs.length, done, failed, errors };
}
