import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ImportByDoiUrl } from '@/components/admin/ImportByDoiUrl';
import { getAdminDb, getUniverseById, hasAdminWriteAccess, listDocuments, slugify } from '@/lib/admin/db';
import { isDevAdminBypass, requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enqueueAllPendingDocuments, enqueueIngestJob, listLatestJobsByUniverse } from '@/lib/ingest/jobs';
import { processAllDocuments, processDocument } from '@/lib/ingest/process';
import { ingestPresetOptions, type IngestPresetName, resolveIngestPreset } from '@/lib/ingest/presets';
import { runIngestWorker } from '@/lib/ingest/worker';
import { enforceAdminWriteLimit, enforceIngestLimit } from '@/lib/ratelimit/enforce';

type AdminUniverseDocsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    rl?: string;
    wc?: string;
    wd?: string;
    wf?: string;
  }>;
};

async function logRateLimitIngest(input: {
  universeId: string;
  documentId?: string | null;
  scope: string;
  retryAfterSec: number;
}) {
  const db = getAdminDb();
  if (!db) return;
  await db.from('ingest_logs').insert({
    universe_id: input.universeId,
    document_id: input.documentId ?? null,
    level: 'error',
    message: 'rate_limited',
    details: { reason: 'rate_limited', retryAfterSec: input.retryAfterSec, scope: input.scope },
  });
}

async function ensureDocsBucket() {
  const db = getAdminDb();
  if (!db) return null;

  const { data: bucket } = await db.storage.getBucket('cv-docs');
  if (bucket) return db;

  await db.storage.createBucket('cv-docs', {
    public: false,
    fileSizeLimit: '50MB',
    allowedMimeTypes: ['application/pdf'],
  });

  return db;
}

async function uploadDocumentAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = await ensureDocsBucket();
  if (!db) return;

  const universeId = String(formData.get('universe_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  const titleInput = String(formData.get('title') ?? '').trim();
  const file = formData.get('pdf_file');

  if (!universeId || !(file instanceof File) || file.size === 0) return;
  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/docs/upload`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}/docs?rl=${rl.retryAfterSec}`);
  }
  const fileName = file.name || 'documento.pdf';
  if (!fileName.toLowerCase().endsWith('.pdf')) return;

  const baseTitle = titleInput || fileName.replace(/\.pdf$/i, '');
  const safeTitle = baseTitle.slice(0, 140);
  const safeSlug = slugify(baseTitle || 'documento');
  const storagePath = `${universeId}/${Date.now()}-${safeSlug || 'documento'}.pdf`;

  const { error: uploadError } = await db.storage.from('cv-docs').upload(storagePath, file, {
    contentType: 'application/pdf',
    upsert: false,
  });

  if (uploadError) return;

  if (documentId) {
    await db
      .from('documents')
      .update({
        title: safeTitle,
        storage_path: storagePath,
        status: 'uploaded',
        is_deleted: false,
      })
      .eq('id', documentId)
      .eq('universe_id', universeId);
  } else {
    await db.from('documents').insert({
      universe_id: universeId,
      title: safeTitle,
      storage_path: storagePath,
      status: 'uploaded',
      is_deleted: false,
    });
  }

  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function removeDocumentAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;

  const universeId = String(formData.get('universe_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  if (!universeId || !documentId) return;
  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/docs/remove`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}/docs?rl=${rl.retryAfterSec}`);
  }

  await db
    .from('documents')
    .update({ is_deleted: true })
    .eq('id', documentId)
    .eq('universe_id', universeId);

  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function processDocumentAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  if (!universeId || !documentId) return;
  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/docs/process_direct`);
  if (!adminRl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId,
      scope: 'process_direct_admin',
      retryAfterSec: adminRl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${adminRl.retryAfterSec}`);
  }
  const rl = await enforceIngestLimit(session.userId);
  if (!rl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId,
      scope: 'process_direct',
      retryAfterSec: rl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${rl.retryAfterSec}`);
  }

  await processDocument(universeId, documentId);
  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function processAllAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;
  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/docs/process_all_direct`);
  if (!adminRl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId: null,
      scope: 'process_all_direct_admin',
      retryAfterSec: adminRl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${adminRl.retryAfterSec}`);
  }
  const rl = await enforceIngestLimit(session.userId);
  if (!rl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId: null,
      scope: 'process_all_direct',
      retryAfterSec: rl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${rl.retryAfterSec}`);
  }

  await processAllDocuments(universeId);
  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function enqueueDocumentAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  if (!universeId || !documentId) return;

  const ingestRl = await enforceIngestLimit(session.userId);
  if (!ingestRl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId,
      scope: 'enqueue_document_ingest',
      retryAfterSec: ingestRl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${ingestRl.retryAfterSec}`);
  }

  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/docs/enqueue`);
  if (!adminRl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId,
      scope: 'enqueue_document_admin',
      retryAfterSec: adminRl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${adminRl.retryAfterSec}`);
  }

  await enqueueIngestJob({ universeId, documentId });
  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function setDocumentPresetAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  const presetRaw = String(formData.get('preset') ?? 'default').trim() as IngestPresetName;
  if (!universeId || !documentId) return;

  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/docs/set_preset`);
  if (!adminRl.ok) {
    redirect(`/admin/universes/${universeId}/docs?rl=${adminRl.retryAfterSec}`);
  }

  await db
    .from('documents')
    .update({ ingest_preset: resolveIngestPreset(presetRaw).name })
    .eq('id', documentId)
    .eq('universe_id', universeId);
  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function reprocessDocumentAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  const presetRaw = String(formData.get('preset') ?? 'default').trim() as IngestPresetName;
  if (!universeId || !documentId) return;

  const ingestRl = await enforceIngestLimit(session.userId);
  if (!ingestRl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId,
      scope: 'reprocess_document_ingest',
      retryAfterSec: ingestRl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${ingestRl.retryAfterSec}`);
  }

  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/docs/reprocess`);
  if (!adminRl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId,
      scope: 'reprocess_document_admin',
      retryAfterSec: adminRl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${adminRl.retryAfterSec}`);
  }

  await enqueueIngestJob({
    universeId,
    documentId,
    jobKind: 'reprocess',
    preset: resolveIngestPreset(presetRaw).name,
  });
  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function enqueueAllAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;

  const ingestRl = await enforceIngestLimit(session.userId);
  if (!ingestRl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId: null,
      scope: 'enqueue_all_ingest',
      retryAfterSec: ingestRl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${ingestRl.retryAfterSec}`);
  }

  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/docs/enqueue_all`);
  if (!adminRl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId: null,
      scope: 'enqueue_all_admin',
      retryAfterSec: adminRl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${adminRl.retryAfterSec}`);
  }

  await enqueueAllPendingDocuments(universeId);
  revalidatePath(`/admin/universes/${universeId}/docs`);
}

async function runWorkerAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;

  const ingestRl = await enforceIngestLimit(session.userId);
  if (!ingestRl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId: null,
      scope: 'run_worker_ingest',
      retryAfterSec: ingestRl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${ingestRl.retryAfterSec}`);
  }

  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/docs/run_worker`);
  if (!adminRl.ok) {
    await logRateLimitIngest({
      universeId,
      documentId: null,
      scope: 'run_worker_admin',
      retryAfterSec: adminRl.retryAfterSec,
    });
    redirect(`/admin/universes/${universeId}/docs?rl=${adminRl.retryAfterSec}`);
  }

  const result = await runIngestWorker({ limit: 5, workerId: `admin:${session.userId}:${Date.now()}` });
  revalidatePath(`/admin/universes/${universeId}/docs`);
  redirect(`/admin/universes/${universeId}/docs?wc=${result.claimed}&wd=${result.done}&wf=${result.failed}`);
}

export default async function AdminUniverseDocsPage({ params, searchParams }: AdminUniverseDocsPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  const canWrite = await hasAdminWriteAccess();
  const configured = Boolean(getAdminDb());
  const retrySec = Number(sp.rl ?? 0);
  const workerClaimed = Number(sp.wc ?? 0);
  const workerDone = Number(sp.wd ?? 0);
  const workerFailed = Number(sp.wf ?? 0);
  const canDirectProcess = process.env.NODE_ENV === 'development' && isDevAdminBypass();

  if (!universe) {
    notFound();
  }

  const documents = await listDocuments(universe.id);
  const jobs = await listLatestJobsByUniverse(universe.id);
  const jobByDocumentId = new Map<string, (typeof jobs)[number]>();
  for (const job of jobs) {
    if (!jobByDocumentId.has(job.document_id)) {
      jobByDocumentId.set(job.document_id, job);
    }
  }

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${universe.id}`, label: universe.slug },
            { label: 'Docs' },
          ]}
          ariaLabel='Trilha admin docs'
        />
        <SectionHeader
          title={`Documentos de ${universe.title}`}
          description='Upload de PDF, enfileiramento de ingestao e execucao controlada por worker.'
          tag='Docs'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/checklist`}>
            Voltar ao Checklist
          </Link>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/docs/qualidade`}>
            Docs problematicos
          </Link>
        </div>
      </Card>

      <Card className='stack'>
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        ) : null}
        {workerClaimed || workerDone || workerFailed ? (
          <p className='muted' role='status' style={{ margin: 0 }}>
            Worker executado: claimed {workerClaimed}, done {workerDone}, failed {workerFailed}.
          </p>
        ) : null}
        <SectionHeader title='Upload PDF' />
        <form action={uploadDocumentAction} className='stack'>
          <input type='hidden' name='universe_id' value={universe.id} />
          <label>
            <span>Titulo (opcional)</span>
            <input name='title' style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Arquivo PDF</span>
            <input name='pdf_file' type='file' accept='application/pdf,.pdf' required />
          </label>
          <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
            Enviar PDF
          </button>
        </form>
        <div className='toolbar-row'>
          <form action={enqueueAllAction}>
            <input type='hidden' name='universe_id' value={universe.id} />
            <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
              Enfileirar tudo
            </button>
          </form>
          <form action={runWorkerAction}>
            <input type='hidden' name='universe_id' value={universe.id} />
            <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
              Rodar worker agora
            </button>
          </form>
          {canDirectProcess ? (
            <form action={processAllAction}>
              <input type='hidden' name='universe_id' value={universe.id} />
              <button className='ui-button' type='submit' disabled={!configured || !canWrite} data-variant='ghost'>
                Processar direto (dev)
              </button>
            </form>
          ) : null}
        </div>
      </Card>

      <ImportByDoiUrl universeId={universe.id} configured={configured} canWrite={canWrite} />

      <Card className='stack'>
        <SectionHeader title='Documentos cadastrados' description='Status documental + status da fila de ingestao.' />
        <div className='stack'>
          {documents.map((doc) => (
            <article key={doc.id} className='core-node'>
              <strong>{doc.title}</strong>
              <p className='muted' style={{ margin: 0 }}>
                status: {doc.status} | criado em: {new Date(doc.created_at).toLocaleString('pt-BR')}
              </p>
              <p className='muted' style={{ margin: 0 }}>
                qualidade: {doc.text_quality_score ?? 'n/a'} | pages: {doc.empty_pages_count ?? 0}/{doc.pages_count ?? 0}{' '}
                vazias | preset: {doc.ingest_preset}
              </p>
              <div className='toolbar-row'>
                {(doc.text_quality_flags ?? []).map((flag) => (
                  <Carimbo key={`${doc.id}-${flag}`}>{flag}</Carimbo>
                ))}
              </div>
              <p className='muted' style={{ margin: 0 }}>
                tipo: {doc.kind} | doi: {doc.doi ?? 'n/a'} | ano: {doc.year ?? 'n/a'}
              </p>
              <p className='muted' style={{ margin: 0 }}>
                storage: {doc.storage_path ?? 'sem arquivo'}
              </p>
              <p className='muted' style={{ margin: 0 }}>
                origem: {doc.source_url ?? 'n/a'}
              </p>
              {doc.status === 'link_only' ? (
                <p className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>
                  Link-only: envie PDF manual para habilitar ingestao.
                </p>
              ) : null}
              {jobByDocumentId.get(doc.id) ? (
                <p className='muted' style={{ margin: 0 }}>
                  job: <Carimbo>{jobByDocumentId.get(doc.id)?.status ?? 'n/a'}</Carimbo> tentativas:{' '}
                  {jobByDocumentId.get(doc.id)?.attempts ?? 0}
                  {jobByDocumentId.get(doc.id)?.last_error_safe
                    ? ` | erro: ${jobByDocumentId.get(doc.id)?.last_error_safe}`
                    : ''}
                </p>
              ) : (
                <p className='muted' style={{ margin: 0 }}>
                  job: sem job
                </p>
              )}
              <div className='toolbar-row'>
                <form action={enqueueDocumentAction}>
                  <input type='hidden' name='document_id' value={doc.id} />
                  <input type='hidden' name='universe_id' value={universe.id} />
                  <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                    Enfileirar
                  </button>
                </form>
                {canDirectProcess ? (
                  <form action={processDocumentAction}>
                    <input type='hidden' name='document_id' value={doc.id} />
                    <input type='hidden' name='universe_id' value={universe.id} />
                    <button className='ui-button' type='submit' disabled={!configured || !canWrite} data-variant='ghost'>
                      Processar direto (dev)
                    </button>
                  </form>
                ) : null}
                {doc.status !== 'link_only' ? (
                  <>
                    <form action={setDocumentPresetAction} className='toolbar-row'>
                      <input type='hidden' name='document_id' value={doc.id} />
                      <input type='hidden' name='universe_id' value={universe.id} />
                      <select name='preset' defaultValue={doc.ingest_preset} style={{ minHeight: 36 }}>
                        {ingestPresetOptions.map((preset) => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                      </select>
                      <button className='ui-button' type='submit' disabled={!configured || !canWrite} data-variant='ghost'>
                        Salvar preset
                      </button>
                    </form>
                    <form action={reprocessDocumentAction}>
                      <input type='hidden' name='document_id' value={doc.id} />
                      <input type='hidden' name='universe_id' value={universe.id} />
                      <input type='hidden' name='preset' value={doc.ingest_preset} />
                      <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                        Reprocessar
                      </button>
                    </form>
                  </>
                ) : null}
                <form action={removeDocumentAction}>
                  <input type='hidden' name='document_id' value={doc.id} />
                  <input type='hidden' name='universe_id' value={universe.id} />
                  <button className='ui-button' type='submit' disabled={!configured || !canWrite} data-variant='ghost'>
                    Remover (soft delete)
                  </button>
                </form>
              </div>
            </article>
          ))}
          {documents.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhum documento encontrado.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
