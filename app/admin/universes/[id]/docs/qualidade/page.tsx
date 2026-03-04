import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, getUniverseById, hasAdminWriteAccess, listDocuments } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enqueueIngestJob } from '@/lib/ingest/jobs';
import { ingestPresetOptions, resolveIngestPreset } from '@/lib/ingest/presets';
import { enforceAdminWriteLimit, enforceIngestLimit } from '@/lib/ratelimit/enforce';

type DocsQualityPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ maxScore?: string; flag?: string; status?: string; rl?: string }>;
};

async function reprocessBatchAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const preset = resolveIngestPreset(String(formData.get('preset') ?? 'aggressive_dedupe')).name;
  const selected = formData.getAll('doc_ids').map((item) => String(item)).filter(Boolean);
  if (!universeId || selected.length === 0) return;

  const ingestRl = await enforceIngestLimit(session.userId);
  if (!ingestRl.ok) {
    redirect(`/admin/universes/${universeId}/docs/qualidade?rl=${ingestRl.retryAfterSec}`);
  }

  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/docs/quality_batch`);
  if (!adminRl.ok) {
    redirect(`/admin/universes/${universeId}/docs/qualidade?rl=${adminRl.retryAfterSec}`);
  }

  for (const documentId of selected) {
    await enqueueIngestJob({
      universeId,
      documentId,
      jobKind: 'reprocess',
      preset,
    });
  }

  revalidatePath(`/admin/universes/${universeId}/docs`);
  revalidatePath(`/admin/universes/${universeId}/docs/qualidade`);
}

export default async function DocsQualityPage({ params, searchParams }: DocsQualityPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  const canWrite = await hasAdminWriteAccess();
  const configured = Boolean(getAdminDb());
  if (!universe) notFound();

  const maxScore = Number(sp.maxScore ?? 60) || 60;
  const filterFlag = (sp.flag ?? '').trim();
  const filterStatus = (sp.status ?? '').trim();
  const retrySec = Number(sp.rl ?? 0);

  const docs = await listDocuments(id);
  const problematic = docs.filter((doc) => {
    if (doc.status === 'link_only') return false;
    const score = doc.text_quality_score ?? 0;
    const flags = doc.text_quality_flags ?? [];
    const emptyRatio =
      (doc.pages_count ?? 0) > 0 ? ((doc.empty_pages_count ?? 0) / Math.max(1, doc.pages_count ?? 0)) * 100 : 0;
    const baseProblem = score < maxScore || emptyRatio >= 25 || flags.length > 0;
    if (!baseProblem) return false;
    if (filterStatus && doc.status !== filterStatus) return false;
    if (filterFlag && !flags.includes(filterFlag)) return false;
    return true;
  });

  const allFlags = Array.from(new Set(problematic.flatMap((doc) => doc.text_quality_flags ?? []))).sort();

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${universe.id}`, label: universe.slug },
            { href: `/admin/universes/${universe.id}/docs`, label: 'Docs' },
            { label: 'Qualidade' },
          ]}
          ariaLabel='Trilha docs qualidade'
        />
        <SectionHeader
          title={`Docs problematicos: ${universe.title}`}
          description='Filtre documentos com baixa qualidade de texto e dispare reprocessamento por preset.'
          tag='Quality Pass'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/docs`}>
            Voltar para Docs
          </Link>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/checklist`}>
            Voltar ao Checklist
          </Link>
        </div>
      </Card>

      <Card className='stack'>
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        ) : null}
        <form method='get' className='toolbar-row'>
          <label>
            score max
            <input name='maxScore' type='number' min={1} max={100} defaultValue={maxScore} />
          </label>
          <label>
            flag
            <select name='flag' defaultValue={filterFlag}>
              <option value=''>todas</option>
              {allFlags.map((flag) => (
                <option key={flag} value={flag}>
                  {flag}
                </option>
              ))}
            </select>
          </label>
          <label>
            status
            <select name='status' defaultValue={filterStatus}>
              <option value=''>todos</option>
              <option value='uploaded'>uploaded</option>
              <option value='processed'>processed</option>
              <option value='error'>error</option>
            </select>
          </label>
          <button className='ui-button' type='submit'>
            Filtrar
          </button>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Reprocessar em lote' description='Selecione os documentos e escolha o preset.' />
        <form action={reprocessBatchAction} className='stack'>
          <input type='hidden' name='universe_id' value={universe.id} />
          <label>
            preset
            <select name='preset' defaultValue='aggressive_dedupe'>
              {ingestPresetOptions.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </label>

          <div className='stack'>
            {problematic.map((doc) => {
              const emptyPages = doc.empty_pages_count ?? 0;
              const totalPages = doc.pages_count ?? 0;
              const emptyRatio = totalPages > 0 ? Math.round((emptyPages / totalPages) * 100) : 0;
              return (
                <label key={doc.id} className='core-node' style={{ display: 'grid', gap: 8 }}>
                  <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                    <input name='doc_ids' type='checkbox' value={doc.id} />
                    <strong>{doc.title}</strong>
                  </span>
                  <span className='muted'>
                    score {doc.text_quality_score ?? 'n/a'} | vazias {emptyPages}/{totalPages} ({emptyRatio}%) | preset{' '}
                    {doc.ingest_preset}
                  </span>
                  <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                    {(doc.text_quality_flags ?? []).map((flag) => (
                      <Carimbo key={`${doc.id}-${flag}`}>{flag}</Carimbo>
                    ))}
                  </span>
                </label>
              );
            })}
            {problematic.length === 0 ? (
              <p className='muted' style={{ margin: 0 }}>
                Nenhum documento problematico para os filtros selecionados.
              </p>
            ) : null}
          </div>

          <button className='ui-button' type='submit' disabled={!configured || !canWrite || problematic.length === 0}>
            Enfileirar reprocessamento em lote
          </button>
        </form>
      </Card>
    </main>
  );
}
