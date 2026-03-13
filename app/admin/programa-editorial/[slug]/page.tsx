import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LaneHealthBadge } from '@/components/admin/LaneHealthBadge';
import { ProgramBlockerChip } from '@/components/admin/ProgramBlockerChip';
import { UniverseOpsCard } from '@/components/admin/UniverseOpsCard';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import {
  applySuggestedLanes,
  createEditorialBatch,
  describeLaneSuggestion,
  getProgramBlockers,
  getProgramBoard,
  moveProgramItem,
  summarizeProgramBoard,
  laneLabel,
  type EditorialLane,
} from '@/lib/editorial/program';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import { listUniverseBootstrapTemplates, type UniverseBootstrapTemplateId } from '@/lib/universe/bootstrapTemplates';
import { slugify } from '@/lib/admin/db';
import { EDITORIAL_PROGRAM_2026, ensureEditorialProgram2026Batch } from '@/lib/editorial/programBatch';

const LANE_COPY: Record<EditorialLane, string> = {
  bootstrap: 'Ainda em estrutura.',
  ingest: 'Docs entraram, a base ainda esta sendo preparada.',
  quality: 'A base existe, mas a qualidade ainda precisa subir.',
  sprint: 'Hora de ligar docs, provas e cobertura editorial.',
  review: 'Falta revisao humana para reduzir risco operacional.',
  highlights: 'A base existe, mas falta virar leitura forte.',
  publish: 'Pronto para vitrine, faltando decisao editorial final.',
  done: 'Universo consolidado e fora da fila principal.',
};

async function moveItemAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const itemId = String(formData.get('item_id') ?? '').trim();
  const slug = String(formData.get('program_slug') ?? '').trim();
  const lane = String(formData.get('lane') ?? '').trim() as EditorialLane;
  const priority = Number(formData.get('priority') ?? 0);
  const note = String(formData.get('note') ?? '').trim();
  if (!itemId || !slug) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/programa-editorial/${slug}/move`);
  if (!rl.ok) redirect(`/admin/programa-editorial/${slug}?rl=${rl.retryAfterSec}`);

  await moveProgramItem({ itemId, lane, priority: Number.isFinite(priority) ? priority : 0, note: note || null });
  revalidatePath(`/admin/programa-editorial/${slug}`);
}

async function createBatchAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const programId = String(formData.get('program_id') ?? '').trim();
  const slug = String(formData.get('program_slug') ?? '').trim();
  if (!programId || !slug) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/programa-editorial/${slug}/batch`);
  if (!rl.ok) redirect(`/admin/programa-editorial/${slug}?rl=${rl.retryAfterSec}`);

  const universes = [0, 1, 2].map((index) => {
    const title = String(formData.get(`title_${index}`) ?? '').trim();
    const slugInput = slugify(String(formData.get(`slug_${index}`) ?? '').trim() || title);
    const templateId = String(formData.get(`template_${index}`) ?? 'issue_investigation') as UniverseBootstrapTemplateId;
    const summary = String(formData.get(`summary_${index}`) ?? '').trim();
    const priority = Number(formData.get(`priority_${index}`) ?? 0);
    return { title, slug: slugInput, templateId, summary, priority };
  });

  await createEditorialBatch({ programId, userId: session.userId, universes });

  revalidatePath('/admin/universes');
  revalidatePath(`/admin/programa-editorial/${slug}`);
  redirect(`/admin/programa-editorial/${slug}?batch=1`);
}

async function applySuggestionsAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const slug = String(formData.get('program_slug') ?? '').trim();
  if (!slug) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/programa-editorial/${slug}/apply-suggestions`);
  if (!rl.ok) redirect(`/admin/programa-editorial/${slug}?rl=${rl.retryAfterSec}`);

  await applySuggestedLanes(slug);
  revalidatePath(`/admin/programa-editorial/${slug}`);
  redirect(`/admin/programa-editorial/${slug}?applied=1`);
}

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ rl?: string; batch?: string; applied?: string; ignore?: string }>;
};

export default async function EditorialProgramBoardPage({ params, searchParams }: PageProps) {
  const session = await requireEditorOrAdmin();
  const { slug } = await params;
  if (slug === EDITORIAL_PROGRAM_2026.slug) await ensureEditorialProgram2026Batch(session.userId);
  const sp = await searchParams;
  const board = await getProgramBoard(slug);
  if (!board) notFound();
  const programBoard = board;
  const templates = listUniverseBootstrapTemplates();
  const summary = summarizeProgramBoard(programBoard);
  const ignored = new Set(String(sp.ignore ?? '').split(',').filter(Boolean));
  const moveCandidates = programBoard.columns.flatMap((column) => column.items).filter((card) => card.item.lane !== card.suggestedLane);
  const retrySec = Number(sp.rl ?? 0);

  function ignoreHref(itemId: string) {
    const next = new Set(ignored);
    next.add(itemId);
    const params = new URLSearchParams();
    if (sp.batch) params.set('batch', sp.batch);
    if (sp.applied) params.set('applied', sp.applied);
    if (next.size > 0) params.set('ignore', Array.from(next).join(','));
    return `/admin/programa-editorial/${programBoard.program.slug}?${params.toString()}`;
  }

  return (
    <main className='stack stack-editorial'>
      <Card className='stack board-hero-card'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/programa-editorial', label: 'Programa editorial' },
            { label: programBoard.program.title },
          ]}
          ariaLabel='Trilha board editorial'
        />
        <SectionHeader
          title={programBoard.program.title}
          description={programBoard.program.summary ?? 'Central de operacao para tocar varios universos sem perder a leitura das lanes e dos gargalos.'}
          tag='Operacao editorial'
        />
        <div className='program-hero-metrics'>
          <article className='core-node'><small>Universos totais</small><strong>{summary.totalUniverses}</strong></article>
          <article className='core-node'><small>Em revisao</small><strong>{summary.inReview}</strong></article>
          <article className='core-node'><small>Prontos para publicar</small><strong>{summary.readyToPublish}</strong></article>
          <article className='core-node'><small>Concluidos</small><strong>{summary.done}</strong></article>
        </div>
        <div className='toolbar-row'>
          <Link className='ui-button' href='#novo-lote'>Criar lote</Link>
          <Link className='ui-button' href={`/admin/programa-editorial/${board.program.slug}`}>Atualizar board</Link>
          {summary.suggestionCount > 0 ? (
            <form action={applySuggestionsAction}>
              <input type='hidden' name='program_slug' value={programBoard.program.slug} />
              <button className='ui-button' type='submit'>Aplicar sugestoes de etapa</button>
            </form>
          ) : null}
        </div>
        {retrySec > 0 ? <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.</p> : null}
        {sp.batch === '1' ? <p className='muted' role='status' style={{ margin: 0 }}>Lote editorial criado e adicionado ao board.</p> : null}
        {sp.applied === '1' ? <p className='muted' role='status' style={{ margin: 0 }}>Etapas sugeridas aplicadas ao board.</p> : null}
      </Card>

      <Card className='stack'>
        <SectionHeader title='Saude do board' description='Bata o olho e veja onde esta concentrado o trabalho, quem esta mais parado e o que merece atencao agora.' />
        <div className='toolbar-row'>
          {Object.entries(programBoard.totals).map(([lane, count]) => (
            <LaneHealthBadge key={lane} lane={lane as EditorialLane} count={count} highlight={summary.bottleneckLane?.lane === lane} />
          ))}
        </div>
        <div className='program-health-grid'>
          <article className='core-node'>
            <small>Onde esta travado</small>
            <strong>{summary.bottleneckLane ? `${summary.bottleneckLane.label} (${summary.bottleneckLane.count})` : 'Sem gargalo forte'}</strong>
            <p className='muted' style={{ margin: 0 }}>Etapa mais congestionada da fila atual.</p>
          </article>
          <article className='core-node'>
            <small>Maior atraso</small>
            <strong>{summary.stalestUniverse ? summary.stalestUniverse.title : 'Sem atraso relevante'}</strong>
            <p className='muted' style={{ margin: 0 }}>{summary.stalestUniverse ? `${summary.stalestUniverse.daysIdle} dia(s) sem movimento.` : 'Nenhum card antigo acima do limite.'}</p>
          </article>
          <article className='core-node'>
            <small>Sem movimento recente</small>
            <strong>{summary.staleItemsCount}</strong>
            <p className='muted' style={{ margin: 0 }}>Cards com 3 dias ou mais sem atualizacao.</p>
          </article>
        </div>
      </Card>

      <div className='program-board-layout'>
        <section className='stack'>
          <Card className='stack' id='novo-lote'>
            <SectionHeader title='Criar lote' description='Abra ate 3 universos de uma vez e jogue cada um direto na operacao principal.' />
            <form action={createBatchAction} className='stack'>
              <input type='hidden' name='program_id' value={programBoard.program.id} />
              <input type='hidden' name='program_slug' value={programBoard.program.slug} />
              {[0, 1, 2].map((index) => (
                <div key={index} className='core-node'>
                  <strong>{`Universo ${index + 1}`}</strong>
                  <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <label><span>Titulo</span><input name={`title_${index}`} style={{ width: '100%' }} /></label>
                    <label><span>Slug</span><input name={`slug_${index}`} style={{ width: '100%' }} /></label>
                    <label>
                      <span>Template</span>
                      <select name={`template_${index}`} defaultValue='issue_investigation' style={{ width: '100%' }}>
                        {templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
                      </select>
                    </label>
                    <label><span>Prioridade</span><input type='number' min={0} step={1} name={`priority_${index}`} defaultValue={index === 0 ? 3 : 1} style={{ width: '100%' }} /></label>
                  </div>
                  <label><span>Resumo</span><textarea name={`summary_${index}`} rows={2} style={{ width: '100%' }} /></label>
                </div>
              ))}
              <button className='ui-button' type='submit'>Criar lote</button>
            </form>
          </Card>

          <div className='board-columns-grid'>
            {programBoard.columns.map((column) => (
              <Card key={column.lane} className='stack board-lane-card'>
                <SectionHeader title={`${column.label} (${board.totals[column.lane]})`} description={LANE_COPY[column.lane]} />
                {column.items.length === 0 ? <p className='muted' style={{ margin: 0 }}>Nenhum universo nesta etapa.</p> : null}
                {column.items.map((card) => {
                  const blockers = getProgramBlockers(card);
                  const suggestionReason = describeLaneSuggestion(card);
                  const suggestionHidden = ignored.has(card.item.id);
                  return (
                    <UniverseOpsCard key={card.item.id} data-testid='program-universe-card' data-universe={card.universe.title} title={card.universe.title} summary={card.universe.summary || 'Sem resumo editorial.'}>
                      <div className='toolbar-row'>
                        <span className='ui-badge'>{`prio:${card.item.priority}`}</span>
                        <span className='ui-badge'>{`etapa:${column.label}`}</span>
                        {card.templateLabel ? <span className='ui-badge'>{card.templateLabel}</span> : null}
                        {card.universe.published ? <span className='ui-badge' data-variant='ok'>publicado</span> : null}
                        {card.universe.isFeatured ? <span className='ui-badge'>destaque</span> : null}
                        {card.universe.focusOverride ? <span className='ui-badge'>foco editorial</span> : null}
                      </div>
                      <div className='toolbar-row'>
                        {blockers.map((blocker) => <ProgramBlockerChip key={blocker.label} label={blocker.label} tone={blocker.tone} />)}
                      </div>
                      <div className='program-card-metrics'>
                        <span className='muted'>{`docs ${card.checklist?.overview.totalDocs ?? 0}`}</span>
                        <span className='muted'>{`processed ${card.checklist?.overview.docsByStatus.processed ?? 0}`}</span>
                        <span className='muted'>{`draft ${card.checklist?.overview.draftEvidencesTotal ?? 0}`}</span>
                        <span className='muted'>{`published ${card.checklist?.overview.publishedEvidencesTotal ?? 0}`}</span>
                        <span className='muted'>{`readiness ${card.checklist?.readiness.status ?? 'warn'}`}</span>
                      </div>
                      {!suggestionHidden ? (
                        <Card className='stack board-suggestion-box' surface='plate'>
                          <div className='toolbar-row'>
                            <strong>{`Etapa sugerida: ${laneLabel(card.suggestedLane)}`}</strong>
                            <span className='muted'>{`Atual: ${column.label}`}</span>
                          </div>
                          <p className='muted' style={{ margin: 0 }}>{suggestionReason}</p>
                          {card.item.lane !== card.suggestedLane ? (
                            <div className='toolbar-row'>
                              <form action={moveItemAction}>
                                <input type='hidden' name='item_id' value={card.item.id} />
                                <input type='hidden' name='program_slug' value={programBoard.program.slug} />
                                <input type='hidden' name='lane' value={card.suggestedLane} />
                                <input type='hidden' name='priority' value={card.item.priority} />
                                <input type='hidden' name='note' value={suggestionReason} />
                                <button className='ui-button' type='submit'>Mover agora</button>
                              </form>
                              <Link className='ui-button' data-variant='ghost' href={ignoreHref(card.item.id)}>Ignorar sugestao</Link>
                            </div>
                          ) : null}
                        </Card>
                      ) : null}
                      <div className='toolbar-row'>
                        <Link className='ui-button' href={`/c/${card.universe.slug}`}>Abrir Hub preview</Link>
                        <Link className='ui-button' href={card.item.lane === 'ingest' ? '/admin/universes/inbox' : `/admin/universes/${card.universe.id}/docs`}>{card.item.lane === 'ingest' ? 'Abrir inbox documental' : 'Abrir docs'}</Link>
                        <Link className='ui-button' href={`/admin/universes/${card.universe.id}/checklist`}>Abrir Checklist</Link>
                        <Link className='ui-button' href={`/admin/universes/${card.universe.id}/review`}>Abrir revisao</Link>
                        <Link className='ui-button' href={`/admin/universes/${card.universe.id}/highlights`}>Abrir vitrine</Link>
                        <Link className='ui-button' href='/admin/universes/featured'>Vitrine editorial</Link>
                        {card.universe.published ? <Link className='ui-button' href={`/admin/universes/${card.universe.id}/share-pack`}>Abrir share pack</Link> : null}
                      </div>
                      <form action={moveItemAction} className='stack'>
                        <input type='hidden' name='item_id' value={card.item.id} />
                        <input type='hidden' name='program_slug' value={programBoard.program.slug} />
                        <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                          <label>
                            <span>Mover etapa</span>
                            <select name='lane' defaultValue={card.item.lane} style={{ width: '100%' }}>
                              {(['bootstrap', 'ingest', 'quality', 'sprint', 'review', 'highlights', 'publish', 'done'] as EditorialLane[]).map((lane) => <option key={lane} value={lane}>{laneLabel(lane)}</option>)}
                            </select>
                          </label>
                          <label><span>Prioridade</span><input type='number' min={0} step={1} name='priority' defaultValue={card.item.priority} style={{ width: '100%' }} /></label>
                        </div>
                        <label><span>Nota operacional</span><textarea name='note' rows={2} defaultValue={card.item.note ?? ''} style={{ width: '100%' }} /></label>
                        <button className='ui-button' type='submit'>Atualizar card</button>
                      </form>
                    </UniverseOpsCard>
                  );
                })}
              </Card>
            ))}
          </div>
        </section>

        <aside className='stack'>
          <Card className='stack'>
            <SectionHeader title='Recomendados agora' description='Os 3 movimentos com maior impacto operacional neste momento.' />
            {summary.recommendedNow.map((entry) => (
              <article key={entry.itemId} className='core-node'>
                <strong>{entry.title}</strong>
                <p className='muted' style={{ margin: 0 }}>{`etapa atual ${laneLabel(entry.lane)} -> sugerida ${laneLabel(entry.suggestedLane)}`}</p>
                <p className='muted' style={{ margin: 0 }}>{entry.reason}</p>
              </article>
            ))}
          </Card>

          <Card className='stack'>
            <SectionHeader title='Proximos movimentos' description='Atalhos rapidos para destravar a fila editorial principal.' />
            <div className='toolbar-row'>
              <Link className='ui-button' href='/admin/universes/inbox'>Inbox documental</Link>
              <Link className='ui-button' href='/admin/universes'>Criar universo</Link>
              <Link className='ui-button' href='/admin/universes/featured'>Vitrine editorial</Link>
            </div>
            {moveCandidates.length > 0 ? (
              <p className='muted' style={{ margin: 0 }}>{`${moveCandidates.length} card(s) estao com etapa sugerida diferente da atual.`}</p>
            ) : (
              <p className='muted' style={{ margin: 0 }}>Sem divergencias relevantes entre a leitura automatica e a fila atual.</p>
            )}
          </Card>
        </aside>
      </div>
    </main>
  );
}











