import Link from 'next/link';
import fs from 'node:fs/promises';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  enqueueDemoIngestAction,
  runDemoImportAction,
  runDemoWorkerAction,
} from '@/app/actions/demo';
import { getAdminDb, getUniverseById } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { validateDemoSources } from '@/lib/demo/validateSources';
import { listLatestJobsByUniverse } from '@/lib/ingest/jobs';

type AdminUniverseDemoPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; level?: string; limitDocs?: string; limitJobs?: string }>;
};

async function importNowFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;
  const result = await runDemoImportAction(universeId);
  revalidatePath(`/admin/universes/${universeId}/demo`);
  redirect(
    `/admin/universes/${universeId}/demo?level=${result.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(result.message)}`,
  );
}

async function enqueueIngestFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const limitDocs = Math.max(1, Math.min(200, Number(formData.get('limit_docs') ?? 120) || 120));
  if (!universeId) return;
  const result = await enqueueDemoIngestAction(universeId, { limitDocs });
  revalidatePath(`/admin/universes/${universeId}/demo`);
  redirect(
    `/admin/universes/${universeId}/demo?level=${result.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(result.message)}`,
  );
}

async function runWorkerFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const limitJobs = Math.max(1, Math.min(20, Number(formData.get('limit_jobs') ?? 5) || 5));
  if (!universeId) return;
  const result = await runDemoWorkerAction(universeId, { limitJobs });
  revalidatePath(`/admin/universes/${universeId}/demo`);
  redirect(
    `/admin/universes/${universeId}/demo?level=${result.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(result.message)}`,
  );
}

export default async function AdminUniverseDemoPage({ params, searchParams }: AdminUniverseDemoPageProps) {
  await requireEditorOrAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const db = getAdminDb();
  const universe = await getUniverseById(id);
  if (!db || !universe) notFound();

  const [nodesQuery, docsQuery, jobs, logsQuery] = await Promise.all([
    db.from('nodes').select('slug, title, tags').eq('universe_id', id),
    db
      .from('documents')
      .select('id, status, text_quality_score')
      .eq('universe_id', id)
      .eq('is_deleted', false),
    listLatestJobsByUniverse(id),
    db
      .from('ingest_logs')
      .select('created_at, message, level, details')
      .eq('universe_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  const validation = validateDemoSources({
    nodes: (nodesQuery.data ?? []).map((node) => ({
      slug: node.slug,
      title: node.title,
      tags: node.tags ?? [],
    })),
  });
  let reportContent = '';
  let reportOk = false;
  try {
    reportContent = await fs.readFile('reports/demo_poluicao_vr_import.md', 'utf8');
    reportOk = true;
  } catch {
    reportContent = '';
    reportOk = false;
  }

  const docs = docsQuery.data ?? [];
  const docsByStatus = {
    link_only: docs.filter((doc) => doc.status === 'link_only').length,
    uploaded: docs.filter((doc) => doc.status === 'uploaded').length,
    processed: docs.filter((doc) => doc.status === 'processed').length,
    error: docs.filter((doc) => doc.status === 'error').length,
  };
  const qualityValues = docs
    .map((doc) => doc.text_quality_score)
    .filter((value): value is number => typeof value === 'number');
  const qualityAvg =
    qualityValues.length > 0
      ? Math.round(qualityValues.reduce((sum, value) => sum + value, 0) / qualityValues.length)
      : 0;

  const jobsByStatus = {
    pending: jobs.filter((job) => job.status === 'pending').length,
    running: jobs.filter((job) => job.status === 'running').length,
    done: jobs.filter((job) => job.status === 'done').length,
    error: jobs.filter((job) => job.status === 'error').length,
  };

  const alertMsg = String(sp.msg ?? '').trim();
  const alertLevel = String(sp.level ?? '').trim() === 'ok' ? 'ok' : 'error';
  const limitDocs = Math.max(1, Math.min(200, Number(sp.limitDocs ?? 120) || 120));
  const limitJobs = Math.max(1, Math.min(20, Number(sp.limitJobs ?? 5) || 5));
  const issues = validation ? [...validation.errors, ...validation.warnings].slice(0, 20) : [];

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${id}`, label: universe.slug },
            { label: 'Console DEMO' },
          ]}
          ariaLabel='Trilha console demo'
        />
        <SectionHeader
          title={`Console da Demo: ${universe.title}`}
          description='Operacao guiada para transformar placeholders em universo publicado com ingestao rastreavel.'
          tag='Demo'
        />
        <div className='toolbar-row'>
          <Carimbo>{`slug:${universe.slug}`}</Carimbo>
          <Carimbo>{universe.published_at ? 'Published' : 'Preview'}</Carimbo>
          <Link className='ui-button' href={`/admin/universes/${id}`}>
            Voltar ao universo
          </Link>
        </div>
      </Card>

      {alertMsg ? (
        <Card>
          <p role='status' style={{ margin: 0, color: alertLevel === 'ok' ? 'var(--ok-0)' : 'var(--alert-0)' }}>
            {alertMsg}
          </p>
        </Card>
      ) : null}

      <Card className='stack'>
        <SectionHeader title='Sources.json' description='Valida entradas, placeholders, duplicatas e PDFs locais.' />
        {validation ? (
          <>
            <div className='toolbar-row'>
              <Carimbo>{`total:${validation.stats.total}`}</Carimbo>
              <Carimbo>{`placeholders:${validation.stats.placeholders}`}</Carimbo>
              <Carimbo>{`duplicados:${validation.stats.duplicates}`}</Carimbo>
              <Carimbo>{`pdf_missing:${validation.stats.missingLocalPdfs}`}</Carimbo>
              <Carimbo>{`erros:${validation.stats.errors}`}</Carimbo>
              <Carimbo>{`avisos:${validation.stats.warnings}`}</Carimbo>
            </div>
            <p className='muted' style={{ margin: 0 }}>
              Arquivo: {validation.filePath}
            </p>
            <div className='stack'>
              {issues.length === 0 ? (
                <p className='muted' style={{ margin: 0 }}>
                  Sem erros/avisos de validacao.
                </p>
              ) : (
                issues.map((issue) => (
                  <article key={`${issue.level}-${issue.code}-${issue.index}`} className='core-node'>
                    <div className='toolbar-row'>
                      <Carimbo>{issue.level.toUpperCase()}</Carimbo>
                      <strong>
                        #{issue.index + 1} {issue.code}
                      </strong>
                    </div>
                    <p className='muted' style={{ margin: 0 }}>
                      {issue.message}
                    </p>
                  </article>
                ))
              )}
            </div>
          </>
        ) : (
          <p className='muted' style={{ margin: 0 }}>
            Nao foi possivel carregar validacao do sources.json.
          </p>
        )}
      </Card>

      <Card className='stack'>
        <SectionHeader title='Import' description='Roda import em lote de DOI/URL/PDF local com dedupe e relatorio.' />
        <form action={importNowFormAction} className='toolbar-row'>
          <input type='hidden' name='universe_id' value={id} />
          <button className='ui-button' type='submit'>
            Importar fontes agora
          </button>
        </form>
        <p className='muted' style={{ margin: 0 }}>
          Relatorio: <code>reports/demo_poluicao_vr_import.md</code>
        </p>
        {reportOk ? (
          <details>
            <summary>Ver ultimo relatorio (trecho)</summary>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{reportContent.slice(0, 4000)}</pre>
          </details>
        ) : (
          <p className='muted' style={{ margin: 0 }}>
            Nenhum relatorio encontrado ainda.
          </p>
        )}
      </Card>

      <Card className='stack'>
        <SectionHeader title='Ingest do lote' description='Enfileira documentos uploaded e executa worker em rodadas curtas.' />
        <form action={enqueueIngestFormAction} className='toolbar-row'>
          <input type='hidden' name='universe_id' value={id} />
          <label>
            <span>Limite docs</span>
            <input name='limit_docs' type='number' min={1} max={200} defaultValue={limitDocs} style={{ minHeight: 36, width: 120 }} />
          </label>
          <button className='ui-button' type='submit'>
            Enfileirar ingest do lote
          </button>
        </form>
        <form action={runWorkerFormAction} className='toolbar-row'>
          <input type='hidden' name='universe_id' value={id} />
          <label>
            <span>Limite jobs</span>
            <input name='limit_jobs' type='number' min={1} max={20} defaultValue={limitJobs} style={{ minHeight: 36, width: 120 }} />
          </label>
          <button className='ui-button' type='submit'>
            Rodar worker agora
          </button>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Progresso' description='Visao operacional do lote demo: documentos, jobs e qualidade.' />
        <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
          <article className='core-node'>
            <strong>Documentos</strong>
            <p style={{ margin: 0 }}>
              total {docs.length} | link_only {docsByStatus.link_only} | uploaded {docsByStatus.uploaded} | processed{' '}
              {docsByStatus.processed}
            </p>
          </article>
          <article className='core-node'>
            <strong>Ingest jobs</strong>
            <p style={{ margin: 0 }}>
              pending {jobsByStatus.pending} | running {jobsByStatus.running} | done {jobsByStatus.done} | error {jobsByStatus.error}
            </p>
          </article>
          <article className='core-node'>
            <strong>Qualidade media</strong>
            <p style={{ margin: 0 }}>
              score {qualityAvg} | docs erro {docsByStatus.error}
            </p>
          </article>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Atalhos de curadoria' description='Proximos passos apos import e ingest.' />
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${id}/assistido`}>
            Abrir Assistido
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/sprint`}>
            Rodar Sprint
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/checklist`}>
            Abrir Checklist
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/docs/qualidade`}>
            Ver Docs Problematicos
          </Link>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Logs recentes' description='Ultimos eventos do ingest para diagnostico rapido.' />
        <div className='stack'>
          {(logsQuery.data ?? []).map((log, index) => (
            <article key={`${log.created_at}-${log.message}-${index}`} className='core-node'>
              <div className='toolbar-row'>
                <Carimbo>{log.level?.toUpperCase() ?? 'INFO'}</Carimbo>
                <strong>{log.message}</strong>
                <span className='muted'>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.details ?? {}, null, 2)}</pre>
            </article>
          ))}
          {(logsQuery.data ?? []).length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Sem logs recentes para este universo.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
