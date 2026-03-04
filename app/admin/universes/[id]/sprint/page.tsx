import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { dryRunSprintAction, runSprintAction } from '@/app/actions/sprint';
import { getUniverseById } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { listRecentSprintRuns, listSprintDashboardNodes, type SprintOptions } from '@/lib/curation/sprint';

type SprintPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    mode?: 'core' | 'all';
    td?: string;
    te?: string;
    tq?: string;
    max?: string;
    msg?: string;
    level?: 'ok' | 'error';
  }>;
};

function readOptions(sp: Awaited<SprintPageProps['searchParams']>): SprintOptions {
  return {
    mode: sp.mode === 'all' ? 'all' : 'core',
    targetDocsPerNode: Math.max(1, Math.min(10, Number(sp.td ?? 3) || 3)),
    targetEvidencesPerNode: Math.max(1, Math.min(10, Number(sp.te ?? 3) || 3)),
    targetQuestionsPerNode: Math.max(1, Math.min(10, Number(sp.tq ?? 3) || 3)),
    maxNodes: Math.max(1, Math.min(20, Number(sp.max ?? 8) || 8)),
  };
}

function qs(options: SprintOptions) {
  const params = new URLSearchParams();
  params.set('mode', options.mode === 'all' ? 'all' : 'core');
  params.set('td', String(options.targetDocsPerNode ?? 3));
  params.set('te', String(options.targetEvidencesPerNode ?? 3));
  params.set('tq', String(options.targetQuestionsPerNode ?? 3));
  params.set('max', String(options.maxNodes ?? 8));
  return params.toString();
}

async function runSprintFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;
  const options: SprintOptions = {
    mode: String(formData.get('mode') ?? 'core') === 'all' ? 'all' : 'core',
    targetDocsPerNode: Number(formData.get('target_docs') ?? 3) || 3,
    targetEvidencesPerNode: Number(formData.get('target_evidences') ?? 3) || 3,
    targetQuestionsPerNode: Number(formData.get('target_questions') ?? 3) || 3,
    maxNodes: Number(formData.get('max_nodes') ?? 8) || 8,
  };
  const result = await runSprintAction(universeId, options);
  revalidatePath(`/admin/universes/${universeId}/sprint`);
  revalidatePath(`/admin/universes/${universeId}/checklist`);
  revalidatePath(`/admin/universes/${universeId}/assistido`);
  const optionsQs = qs(options);
  redirect(
    `/admin/universes/${universeId}/sprint?${optionsQs}&level=${result?.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(
      result?.message ?? 'Falha ao executar sprint.',
    )}`,
  );
}

async function dryRunSprintFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;
  const options: SprintOptions = {
    mode: String(formData.get('mode') ?? 'core') === 'all' ? 'all' : 'core',
    targetDocsPerNode: Number(formData.get('target_docs') ?? 3) || 3,
    targetEvidencesPerNode: Number(formData.get('target_evidences') ?? 3) || 3,
    targetQuestionsPerNode: Number(formData.get('target_questions') ?? 3) || 3,
    maxNodes: Number(formData.get('max_nodes') ?? 8) || 8,
  };
  const result = await dryRunSprintAction(universeId, options);
  const optionsQs = qs(options);
  redirect(
    `/admin/universes/${universeId}/sprint?${optionsQs}&level=${result?.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(
      result?.message ?? 'Falha ao executar dry-run.',
    )}`,
  );
}

export default async function AdminUniverseSprintPage({ params, searchParams }: SprintPageProps) {
  await requireEditorOrAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  if (!universe) notFound();

  const options = readOptions(sp);
  const [rows, runs] = await Promise.all([
    listSprintDashboardNodes(id, options.mode === 'all' ? 'all' : 'core'),
    listRecentSprintRuns(id, 8),
  ]);

  const alertMsg = String(sp.msg ?? '').trim();
  const alertLevel = sp.level === 'ok' ? 'ok' : 'error';
  const failCount = rows.filter((row) => row.status === 'FAIL').length;
  const warnCount = rows.filter((row) => row.status === 'WARN').length;
  const passCount = rows.filter((row) => row.status === 'PASS').length;

  const latest = runs[0]?.result as
    | {
        nodesProcessed?: number;
        actions?: { linksAdded?: number; evidencesPromoted?: number; questionsAdded?: number };
        beforeTotals?: { docs?: number; evidences?: number; questions?: number };
        afterTotals?: { docs?: number; evidences?: number; questions?: number };
      }
    | undefined;

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${id}`, label: universe.slug },
            { label: 'Sprint de Curadoria' },
          ]}
          ariaLabel='Trilha sprint de curadoria'
        />
        <SectionHeader
          title={`Sprint de Curadoria: ${universe.title}`}
          description='Auto-aplica sugestoes para fechar cobertura dos nos core com meta operacional.'
          tag='Sprint'
        />
        <div className='toolbar-row'>
          <Carimbo>{`PASS:${passCount}`}</Carimbo>
          <Carimbo>{`WARN:${warnCount}`}</Carimbo>
          <Carimbo>{`FAIL:${failCount}`}</Carimbo>
          <Link className='ui-button' href={`/admin/universes/${id}/checklist`}>
            Voltar ao Checklist
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
        <SectionHeader title='Meta da rodada' description='Ajuste metas e rode dry-run ou execucao real.' />
        <div className='toolbar-row'>
          <Carimbo>{`modo:${options.mode}`}</Carimbo>
          <Carimbo>{`docs:${options.targetDocsPerNode}`}</Carimbo>
          <Carimbo>{`evidencias:${options.targetEvidencesPerNode}`}</Carimbo>
          <Carimbo>{`perguntas:${options.targetQuestionsPerNode}`}</Carimbo>
          <Carimbo>{`max_nos:${options.maxNodes}`}</Carimbo>
        </div>
        <form className='toolbar-row' action={dryRunSprintFormAction}>
          <input type='hidden' name='universe_id' value={id} />
          <label>
            <span>Modo</span>
            <select name='mode' defaultValue={options.mode} style={{ minHeight: 36 }}>
              <option value='core'>core</option>
              <option value='all'>all</option>
            </select>
          </label>
          <label>
            <span>Docs/no</span>
            <input name='target_docs' type='number' min={1} max={10} defaultValue={options.targetDocsPerNode} style={{ width: 90, minHeight: 36 }} />
          </label>
          <label>
            <span>Evid/no</span>
            <input
              name='target_evidences'
              type='number'
              min={1}
              max={10}
              defaultValue={options.targetEvidencesPerNode}
              style={{ width: 90, minHeight: 36 }}
            />
          </label>
          <label>
            <span>Perg/no</span>
            <input
              name='target_questions'
              type='number'
              min={1}
              max={10}
              defaultValue={options.targetQuestionsPerNode}
              style={{ width: 90, minHeight: 36 }}
            />
          </label>
          <label>
            <span>Max nos</span>
            <input name='max_nodes' type='number' min={1} max={20} defaultValue={options.maxNodes} style={{ width: 90, minHeight: 36 }} />
          </label>
          <button className='ui-button' type='submit' data-variant='ghost'>
            Dry run
          </button>
        </form>
        <form className='toolbar-row' action={runSprintFormAction}>
          <input type='hidden' name='universe_id' value={id} />
          <input type='hidden' name='mode' value={options.mode} />
          <input type='hidden' name='target_docs' value={options.targetDocsPerNode} />
          <input type='hidden' name='target_evidences' value={options.targetEvidencesPerNode} />
          <input type='hidden' name='target_questions' value={options.targetQuestionsPerNode} />
          <input type='hidden' name='max_nodes' value={options.maxNodes} />
          <button className='ui-button' type='submit'>
            Rodar Sprint ({options.mode})
          </button>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Antes/Depois (ultima execucao)' />
        {latest ? (
          <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <article className='core-node'>
              <strong>Nos processados</strong>
              <p style={{ margin: 0 }}>{latest.nodesProcessed ?? 0}</p>
            </article>
            <article className='core-node'>
              <strong>Acoes aplicadas</strong>
              <p style={{ margin: 0 }}>
                docs +{latest.actions?.linksAdded ?? 0} | evidencias +{latest.actions?.evidencesPromoted ?? 0} | perguntas +
                {latest.actions?.questionsAdded ?? 0}
              </p>
            </article>
            <article className='core-node'>
              <strong>Totais (docs)</strong>
              <p style={{ margin: 0 }}>
                {latest.beforeTotals?.docs ?? 0} → {latest.afterTotals?.docs ?? 0}
              </p>
            </article>
            <article className='core-node'>
              <strong>Totais (evidencias)</strong>
              <p style={{ margin: 0 }}>
                {latest.beforeTotals?.evidences ?? 0} → {latest.afterTotals?.evidences ?? 0}
              </p>
            </article>
            <article className='core-node'>
              <strong>Totais (perguntas)</strong>
              <p style={{ margin: 0 }}>
                {latest.beforeTotals?.questions ?? 0} → {latest.afterTotals?.questions ?? 0}
              </p>
            </article>
          </div>
        ) : (
          <p className='muted' style={{ margin: 0 }}>
            Ainda sem execucao registrada de sprint.
          </p>
        )}
      </Card>

      <Card className='stack'>
        <SectionHeader title='Core nodes (pior primeiro)' />
        <div className='stack'>
          {rows.map((row) => (
            <article key={row.nodeId} className='core-node'>
              <div className='toolbar-row'>
                <strong>{row.title}</strong>
                <Carimbo>{row.status}</Carimbo>
                <Carimbo>{`score:${row.coverageScore}`}</Carimbo>
                {row.core ? <Carimbo>core</Carimbo> : null}
              </div>
              <p className='muted' style={{ margin: 0 }}>
                docs {row.docs} | evidencias {row.evidences} | perguntas {row.questions}
              </p>
              <p className='muted' style={{ margin: 0 }}>
                sugestoes: docs {row.docSuggestions} | evidencias {row.evidenceSuggestions} | perguntas {row.questionSuggestions} | quality media{' '}
                {row.avgDocQuality}
              </p>
              <div className='toolbar-row'>
                <Link className='ui-button' href={`/admin/universes/${id}/assistido?node=${row.nodeId}`}>
                  Abrir Assistido
                </Link>
                <Link className='ui-button' href={`/c/${universe.slug}/provas?node=${row.slug}`} target='_blank'>
                  Ver Provas do no
                </Link>
                <Link className='ui-button' href={`/c/${universe.slug}/mapa?node=${row.slug}&panel=detail`} target='_blank'>
                  Ver no Mapa
                </Link>
              </div>
            </article>
          ))}
          {rows.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhum no encontrado para o modo selecionado.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}

