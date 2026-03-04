import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, getUniverseById } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { countSuggestionRowsForUniverse, generateSuggestionsForUniverse } from '@/lib/curation/suggest';
import { validateDemoSources } from '@/lib/demo/validateSources';
import { getUniverseChecklist } from '@/lib/ops/universeChecklist';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

type UniverseChecklistPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; actionMsg?: string }>;
};

async function publishFromChecklistAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;

  const universeId = String(formData.get('universe_id') ?? '').trim();
  const failCount = Number(formData.get('fail_count') ?? 0) || 0;
  const confirmed = String(formData.get('confirm_publish') ?? '') === 'on';
  if (!universeId) return;

  if (failCount > 0 && !confirmed) {
    redirect(`/admin/universes/${universeId}/checklist?actionMsg=Confirme+publicacao+com+falhas`);
  }

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/checklist/publish`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}/checklist?actionMsg=Rate+limit:+tente+novamente+em+${rl.retryAfterSec}s`);
  }

  await db.from('universes').update({ published_at: new Date().toISOString(), published: true }).eq('id', universeId);
  revalidatePath(`/admin/universes/${universeId}`);
  revalidatePath(`/admin/universes/${universeId}/checklist`);
  revalidatePath('/');
}

async function unpublishFromChecklistAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;

  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/checklist/unpublish`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}/checklist?actionMsg=Rate+limit:+tente+novamente+em+${rl.retryAfterSec}s`);
  }

  await db.from('universes').update({ published_at: null, published: false }).eq('id', universeId);
  revalidatePath(`/admin/universes/${universeId}`);
  revalidatePath(`/admin/universes/${universeId}/checklist`);
  revalidatePath('/');
}

async function generateCoreSuggestionsFromChecklistAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/checklist/generate_suggestions_core`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}/checklist?actionMsg=Rate+limit:+tente+novamente+em+${rl.retryAfterSec}s`);
  }

  const result = await generateSuggestionsForUniverse(universeId, { onlyCore: true });
  const docs = result.reduce((sum, item) => sum + item.docs, 0);
  const evidences = result.reduce((sum, item) => sum + item.evidences, 0);
  const questions = result.reduce((sum, item) => sum + item.questions, 0);
  revalidatePath(`/admin/universes/${universeId}/checklist`);
  redirect(
    `/admin/universes/${universeId}/checklist?actionMsg=${encodeURIComponent(
      `Sugestoes (nucleo) geradas: nos ${result.length}, docs ${docs}, evidencias ${evidences}, perguntas ${questions}.`,
    )}`,
  );
}

export default async function UniverseChecklistPage({ params, searchParams }: UniverseChecklistPageProps) {
  await requireEditorOrAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  const checklist = await getUniverseChecklist(id);
  const suggestionCounts = await countSuggestionRowsForUniverse(id);

  if (!universe || !checklist) notFound();

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 20;
  const coverageStart = (page - 1) * pageSize;
  const coverageRows = checklist.coverage.rows.slice(coverageStart, coverageStart + pageSize);
  const totalPages = Math.max(1, Math.ceil(checklist.coverage.total / pageSize));
  const actionMsg = (sp.actionMsg ?? '').trim();

  const statusLabel =
    checklist.readiness.status === 'pass' ? 'PASS' : checklist.readiness.status === 'warn' ? 'WARN' : 'FAIL';
  const needsCoverageHelp = checklist.checks.some(
    (check) =>
      (check.id === 'core_evidence_coverage' || check.id === 'core_questions_coverage' || check.id === 'core_nodes') &&
      check.status !== 'pass',
  );
  const db = getAdminDb();
  const demoNodesQuery =
    checklist.overview.slug === 'poluicao-vr' && db
      ? await db.from('nodes').select('slug, title, tags').eq('universe_id', id)
      : null;
  const demoValidation =
    checklist.overview.slug === 'poluicao-vr'
      ? validateDemoSources({
          nodes: (demoNodesQuery?.data ?? []).map((node) => ({
            slug: node.slug,
            title: node.title,
            tags: node.tags ?? [],
          })),
        })
      : null;

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${universe.id}`, label: universe.slug },
            { label: 'Checklist' },
          ]}
          ariaLabel='Trilha checklist universo'
        />
        <SectionHeader
          title={`Checklist do Universo: ${checklist.overview.title}`}
          description='Modo operador para avaliar completude, cobertura por no e saude operacional.'
          tag='Operacoes'
        />
        <div className='toolbar-row'>
          <Carimbo>{checklist.overview.publishedAt ? 'Published' : 'Preview'}</Carimbo>
          <Carimbo>{`status:${statusLabel}`}</Carimbo>
          <Carimbo>{`fail:${checklist.readiness.failCount}`}</Carimbo>
          <Carimbo>{`warn:${checklist.readiness.warnCount}`}</Carimbo>
          <Link className='ui-button' href={`/admin/universes/${id}`}>
            Voltar ao universo
          </Link>
        </div>
      </Card>

      {actionMsg ? (
        <Card>
          <p role='status' style={{ margin: 0, color: 'var(--alert-0)' }}>
            {actionMsg}
          </p>
        </Card>
      ) : null}

      <Card className='stack'>
        <SectionHeader title='Pronto para publicar?' />
        <div className='toolbar-row'>
          <Carimbo>{statusLabel}</Carimbo>
          {checklist.readiness.topIssues.map((issue) => (
            <Carimbo key={issue.id}>{issue.label}</Carimbo>
          ))}
        </div>
        <div className='stack'>
          {checklist.readiness.topIssues.map((issue) => (
            <article key={issue.id} className='core-node'>
              <strong>{issue.label}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {issue.value} | meta {issue.target}
              </p>
              <Link className='ui-button' href={issue.actionLink}>
                Corrigir agora
              </Link>
            </article>
          ))}
          {checklist.readiness.topIssues.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Sem bloqueios no checklist atual.
            </p>
          ) : null}
        </div>
        <div className='toolbar-row'>
          {checklist.overview.publishedAt ? (
            <form action={unpublishFromChecklistAction}>
              <input type='hidden' name='universe_id' value={id} />
              <button className='ui-button' type='submit' data-variant='ghost'>
                Despublicar
              </button>
            </form>
          ) : (
            <form action={publishFromChecklistAction} className='stack'>
              <input type='hidden' name='universe_id' value={id} />
              <input type='hidden' name='fail_count' value={checklist.readiness.failCount} />
              {checklist.readiness.failCount > 0 ? (
                <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <input type='checkbox' name='confirm_publish' />
                  Confirmo publicacao mesmo com checks FAIL
                </label>
              ) : null}
              <button className='ui-button' type='submit'>
                Publicar
              </button>
            </form>
          )}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Metricas principais' />
        <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <article className='core-node'>
            <strong>Nodes</strong>
            <p style={{ margin: 0 }}>{checklist.overview.totalNodes}</p>
          </article>
          <article className='core-node'>
            <strong>Core nodes</strong>
            <p style={{ margin: 0 }}>{checklist.overview.coreNodesCount}</p>
          </article>
          <article className='core-node'>
            <strong>Docs</strong>
            <p style={{ margin: 0 }}>
              total {checklist.overview.totalDocs} | processed {checklist.overview.docsByStatus.processed} | link_only{' '}
              {checklist.overview.docsByStatus.link_only}
            </p>
          </article>
          <article className='core-node'>
            <strong>Qualidade docs</strong>
            <p style={{ margin: 0 }}>
              score medio {checklist.overview.quality.avgTextQualityScore} | ruins {checklist.overview.quality.badDocsCount} (
              {checklist.overview.quality.badDocsRatePct}%)
            </p>
          </article>
          <article className='core-node'>
            <strong>Paginas vazias</strong>
            <p style={{ margin: 0 }}>{checklist.overview.quality.emptyPagesTotal}</p>
          </article>
          <article className='core-node'>
            <strong>Evidencias</strong>
            <p style={{ margin: 0 }}>{checklist.overview.totalEvidences}</p>
          </article>
          <article className='core-node'>
            <strong>Ask 24h</strong>
            <p style={{ margin: 0 }}>
              total {checklist.operational24h.askTotal24h} | insufficient {checklist.operational24h.askInsufficientRate}%
            </p>
          </article>
          <article className='core-node'>
            <strong>Ingest pending</strong>
            <p style={{ margin: 0 }}>{checklist.operational24h.ingestJobs.pending}</p>
          </article>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Checklist de gates' />
        <div className='stack'>
          {checklist.checks.map((item) => (
            <article key={item.id} className='core-node'>
              <div className='toolbar-row'>
                <strong>{item.label}</strong>
                <Carimbo>{item.status.toUpperCase()}</Carimbo>
              </div>
              <p className='muted' style={{ margin: 0 }}>
                valor: {item.value} | meta: {item.target}
              </p>
              <Link className='ui-button' href={item.actionLink}>
                Ir para acao
              </Link>
            </article>
          ))}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader
          title='Curadoria Assistida'
          description='Atalho operacional quando faltam links/evidencias/perguntas em nos core.'
        />
        <div className='toolbar-row'>
          <Carimbo>{`docs sugestoes: ${suggestionCounts.docSuggestions}`}</Carimbo>
          <Carimbo>{`evidencias sugestoes: ${suggestionCounts.evidenceSuggestions}`}</Carimbo>
          <Carimbo>{`perguntas sugestoes: ${suggestionCounts.questionSuggestions}`}</Carimbo>
        </div>
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${id}/assistido`}>
            Abrir Curadoria Assistida
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/sprint`}>
            Rodar Sprint
          </Link>
          <form action={generateCoreSuggestionsFromChecklistAction}>
            <input type='hidden' name='universe_id' value={id} />
            <button className='ui-button' type='submit'>
              Gerar sugestoes do nucleo
            </button>
          </form>
          {needsCoverageHelp ? (
            <p className='muted' style={{ margin: 0 }}>
              Cobertura core com lacunas: rode o Sprint de Curadoria (core) e depois revise no Assistido.
            </p>
          ) : null}
        </div>
      </Card>

      {demoValidation ? (
        <Card className='stack'>
          <SectionHeader
            title='DEMO pipeline (poluicao-vr)'
            description='Estado rapido do sources.json para operar import + ingest sem friccao.'
          />
          <div className='toolbar-row'>
            <Carimbo>{`placeholders:${demoValidation.stats.placeholders}`}</Carimbo>
            <Carimbo>{`duplicados:${demoValidation.stats.duplicates}`}</Carimbo>
            <Carimbo>{`pdf_missing:${demoValidation.stats.missingLocalPdfs}`}</Carimbo>
            <Carimbo>{`erros:${demoValidation.stats.errors}`}</Carimbo>
          </div>
          <div className='toolbar-row'>
            <Link className='ui-button' href={`/admin/universes/${id}/demo`}>
              Abrir Console da Demo
            </Link>
            <Link className='ui-button' href={`/admin/universes/${id}/assistido`}>
              Abrir Assistido
            </Link>
          </div>
        </Card>
      ) : null}

      <Card className='stack'>
        <SectionHeader title='Cobertura por no' description='Ordenado do pior score para o melhor.' />
        <div className='stack'>
          {coverageRows.map((row) => (
            <article key={row.nodeId} className='core-node'>
              <div className='toolbar-row'>
                <strong>{row.title}</strong>
                <Carimbo>{`score:${row.coverageScore}`}</Carimbo>
                {row.core ? <Carimbo>core</Carimbo> : null}
              </div>
              <p className='muted' style={{ margin: 0 }}>
                kind: {row.kind} | tags: {row.tags.join(', ') || 'n/d'}
              </p>
              <p className='muted' style={{ margin: 0 }}>
                docs:{row.docsLinkedCount} | evidencias:{row.evidencesLinkedCount} | perguntas:{row.questionsCount}
              </p>
              <Link className='ui-button' href={`/admin/universes/${id}/links?node=${row.nodeId}`}>
                Abrir vinculos
              </Link>
              <Link className='ui-button' href={`/admin/universes/${id}/assistido?node=${row.nodeId}`} data-variant='ghost'>
                Abrir assistido
              </Link>
            </article>
          ))}
        </div>
        <div className='toolbar-row'>
          <Link className='ui-button' data-variant='ghost' href={`/admin/universes/${id}/checklist?page=${Math.max(1, page - 1)}`}>
            Anterior
          </Link>
          <Carimbo>
            pagina {page} / {totalPages}
          </Carimbo>
          <Link className='ui-button' data-variant='ghost' href={`/admin/universes/${id}/checklist?page=${Math.min(totalPages, page + 1)}`}>
            Proxima
          </Link>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Acoes recomendadas' />
        <div className='stack'>
          {checklist.nextActions.map((action) => (
            <article key={action.id} className='core-node'>
              <div className='toolbar-row'>
                <Carimbo>{action.status.toUpperCase()}</Carimbo>
                <strong>{action.text}</strong>
              </div>
              <Link className='ui-button' href={action.link}>
                Executar acao
              </Link>
            </article>
          ))}
          {checklist.nextActions.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhuma acao pendente. Universo com cobertura adequada para operacao.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
