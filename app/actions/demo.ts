'use server';

import { getAdminDb } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { validateDemoSources } from '@/lib/demo/validateSources';
import { runDemoImportForUniverse } from '@/lib/demo/importSources';
import { enqueueIngestJob } from '@/lib/ingest/jobs';
import { runIngestWorker } from '@/lib/ingest/worker';
import { enforceAdminWriteLimit, enforceIngestLimit } from '@/lib/ratelimit/enforce';

type DemoActionResult = {
  ok: boolean;
  message: string;
};

export async function validateDemoSourcesAction(universeId: string) {
  await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db || !universeId) return null;

  const { data: nodes } = await db
    .from('nodes')
    .select('slug, title, tags')
    .eq('universe_id', universeId);

  return validateDemoSources({
    nodes: (nodes ?? []).map((node) => ({ slug: node.slug, title: node.title, tags: node.tags ?? [] })),
  });
}

export async function runDemoImportAction(universeId: string): Promise<DemoActionResult> {
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db || !universeId) return { ok: false, message: 'Supabase indisponivel.' };

  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/demo/import`);
  if (!adminRl.ok) return { ok: false, message: `Rate limit de escrita. Tente em ${adminRl.retryAfterSec}s.` };

  const universeQuery = await db.from('universes').select('id, slug').eq('id', universeId).maybeSingle();
  if (!universeQuery.data) return { ok: false, message: 'Universo nao encontrado.' };

  const validation = await validateDemoSourcesAction(universeId);
  if (!validation) return { ok: false, message: 'Nao foi possivel validar sources.json.' };
  if (!validation.ok) {
    return {
      ok: false,
      message: `Validacao falhou com ${validation.stats.errors} erro(s). Corrija o JSON antes de importar.`,
    };
  }

  const importResult = await runDemoImportForUniverse({
    universeId,
    universeSlug: universeQuery.data.slug,
    validation,
  });

  if (!importResult.ok) {
    return {
      ok: false,
      message: `Import concluido com falhas. Consulte reports/demo_poluicao_vr_import.md (${importResult.totals.errors} erro(s)).`,
    };
  }

  return {
    ok: true,
    message: `Import OK: criados ${importResult.totals.created}, atualizados ${importResult.totals.updated}, uploaded ${importResult.totals.uploaded}.`,
  };
}

export async function enqueueDemoIngestAction(
  universeId: string,
  options: { limitDocs?: number } = {},
): Promise<DemoActionResult> {
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db || !universeId) return { ok: false, message: 'Supabase indisponivel.' };

  const ingestRl = await enforceIngestLimit(session.userId);
  if (!ingestRl.ok) return { ok: false, message: `Rate limit ingest. Tente em ${ingestRl.retryAfterSec}s.` };
  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/demo/enqueue`);
  if (!adminRl.ok) return { ok: false, message: `Rate limit de escrita. Tente em ${adminRl.retryAfterSec}s.` };

  const limitDocs = Math.max(1, Math.min(200, options.limitDocs ?? 120));
  const docsQuery = await db
    .from('documents')
    .select('id')
    .eq('universe_id', universeId)
    .eq('status', 'uploaded')
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(limitDocs);

  let queued = 0;
  let skipped = 0;
  for (const doc of docsQuery.data ?? []) {
    const job = await enqueueIngestJob({ universeId, documentId: doc.id, jobKind: 'process' });
    if (job?.status === 'pending' && (job.attempts ?? 0) === 0) queued += 1;
    else skipped += 1;
  }

  return {
    ok: true,
    message: `Ingest enfileirado: ${queued} novo(s), ${skipped} ja existentes.`,
  };
}

export async function runDemoWorkerAction(
  universeId: string,
  options: { limitJobs?: number } = {},
): Promise<DemoActionResult> {
  const session = await requireEditorOrAdmin();
  if (!universeId) return { ok: false, message: 'Universo invalido.' };

  const ingestRl = await enforceIngestLimit(session.userId);
  if (!ingestRl.ok) return { ok: false, message: `Rate limit ingest. Tente em ${ingestRl.retryAfterSec}s.` };
  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/demo/worker`);
  if (!adminRl.ok) return { ok: false, message: `Rate limit de escrita. Tente em ${adminRl.retryAfterSec}s.` };

  const limitJobs = Math.max(1, Math.min(20, options.limitJobs ?? 5));
  const worker = await runIngestWorker({
    limit: limitJobs,
    workerId: `demo:${universeId}:${session.userId}:${Date.now()}`,
    universeId,
  });

  return {
    ok: worker.failed === 0,
    message: `Worker: claimed ${worker.claimed}, done ${worker.done}, failed ${worker.failed}.`,
  };
}
