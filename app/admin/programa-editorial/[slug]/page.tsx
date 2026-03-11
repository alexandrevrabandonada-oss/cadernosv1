import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { slugify } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import {
  applySuggestedLanes,
  createEditorialBatch,
  getProgramBoard,
  moveProgramItem,
  refreshProgramSuggestions,
  type EditorialLane,
} from '@/lib/editorial/program';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import { listUniverseBootstrapTemplates, type UniverseBootstrapTemplateId } from '@/lib/universe/bootstrapTemplates';
import { EDITORIAL_PROGRAM_2026, ensureEditorialProgram2026Batch } from '@/lib/editorial/programBatch';

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
  if (!rl.ok) {
    redirect(`/admin/programa-editorial/${slug}?rl=${rl.retryAfterSec}`);
  }

  await moveProgramItem({
    itemId,
    lane,
    priority: Number.isFinite(priority) ? priority : 0,
    note: note || null,
  });
  revalidatePath(`/admin/programa-editorial/${slug}`);
}

async function createBatchAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const programId = String(formData.get('program_id') ?? '').trim();
  const slug = String(formData.get('program_slug') ?? '').trim();
  if (!programId || !slug) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/programa-editorial/${slug}/batch`);
  if (!rl.ok) {
    redirect(`/admin/programa-editorial/${slug}?rl=${rl.retryAfterSec}`);
  }

  const universes = [0, 1, 2].map((index) => {
    const title = String(formData.get(`title_${index}`) ?? '').trim();
    const slugInput = slugify(String(formData.get(`slug_${index}`) ?? '').trim() || title);
    const templateId = String(formData.get(`template_${index}`) ?? 'issue_investigation') as UniverseBootstrapTemplateId;
    const summary = String(formData.get(`summary_${index}`) ?? '').trim();
    const priority = Number(formData.get(`priority_${index}`) ?? 0);
    return { title, slug: slugInput, templateId, summary, priority };
  });

  await createEditorialBatch({
    programId,
    userId: session.userId,
    universes,
  });

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
  if (!rl.ok) {
    redirect(`/admin/programa-editorial/${slug}?rl=${rl.retryAfterSec}`);
  }

  await applySuggestedLanes(slug);
  revalidatePath(`/admin/programa-editorial/${slug}`);
  redirect(`/admin/programa-editorial/${slug}?applied=1`);
}

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ rl?: string; batch?: string; applied?: string }>;
};

export default async function EditorialProgramBoardPage({ params, searchParams }: PageProps) {
  const session = await requireEditorOrAdmin();
  const { slug } = await params;
  if (slug === EDITORIAL_PROGRAM_2026.slug) {
    await ensureEditorialProgram2026Batch(session.userId);
  }
  const sp = await searchParams;
  const board = await getProgramBoard(slug);
  if (!board) notFound();
  const templates = listUniverseBootstrapTemplates();
  const suggestions = await refreshProgramSuggestions(slug);
  const suggestionMap = new Map((suggestions?.suggestions ?? []).map((item) => [item.itemId, item.suggestedLane]));
  const retrySec = Number(sp.rl ?? 0);

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/programa-editorial', label: 'Programa editorial' },
            { label: board.program.title },
          ]}
          ariaLabel='Trilha board editorial'
        />
        <SectionHeader
          title={board.program.title}
          description={board.program.summary ?? 'Board operacional para bootstrap, ingest, quality, sprint, review, highlights e publish.'}
          tag='Board'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/programa-editorial'>
            Voltar aos programas
          </Link>
          <form action={applySuggestionsAction}>
            <input type='hidden' name='program_slug' value={board.program.slug} />
            <button className='ui-button' type='submit'>
              Aplicar sugestoes de lane
            </button>
          </form>
        </div>
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        ) : null}
        {sp.batch === '1' ? <p className='muted' role='status' style={{ margin: 0 }}>Lote editorial criado e adicionado ao board.</p> : null}
        {sp.applied === '1' ? <p className='muted' role='status' style={{ margin: 0 }}>Lanes sugeridas aplicadas ao board.</p> : null}
      </Card>

      <Card className='stack'>
        <SectionHeader title='Criar lote de 3 universos' description='Usa o bootstrap de templates existente e registra os universos diretamente neste programa.' />
        <form action={createBatchAction} className='stack'>
          <input type='hidden' name='program_id' value={board.program.id} />
          <input type='hidden' name='program_slug' value={board.program.slug} />
          {[0, 1, 2].map((index) => (
            <div key={index} className='core-node'>
              <strong>{`Universo ${index + 1}`}</strong>
              <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <label>
                  <span>Titulo</span>
                  <input name={`title_${index}`} style={{ width: '100%', minHeight: 40 }} />
                </label>
                <label>
                  <span>Slug</span>
                  <input name={`slug_${index}`} style={{ width: '100%', minHeight: 40 }} />
                </label>
                <label>
                  <span>Template</span>
                  <select name={`template_${index}`} defaultValue='issue_investigation' style={{ width: '100%', minHeight: 40 }}>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Prioridade</span>
                  <input type='number' min={0} step={1} name={`priority_${index}`} defaultValue={index === 0 ? 3 : 1} style={{ width: '100%', minHeight: 40 }} />
                </label>
              </div>
              <label>
                <span>Resumo</span>
                <textarea name={`summary_${index}`} rows={2} style={{ width: '100%' }} />
              </label>
            </div>
          ))}
          <button className='ui-button' type='submit'>
            Criar lote
          </button>
        </form>
      </Card>

      <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'start' }}>
        {board.columns.map((column) => (
          <Card key={column.lane} className='stack'>
            <SectionHeader
              title={`${column.label} (${board.totals[column.lane]})`}
              description='Lane atual dos universos neste programa.'
            />
            {column.items.length === 0 ? (
              <p className='muted' style={{ margin: 0 }}>
                Nenhum universo nesta lane.
              </p>
            ) : null}
            {column.items.map((card) => (
              <article key={card.item.id} className='core-node'>
                <div className='toolbar-row'>
                  <strong>{card.universe.title}</strong>
                  <span className='badge'>{`prio:${card.item.priority}`}</span>
                  {card.templateLabel ? <span className='badge'>{card.templateLabel}</span> : null}
                </div>
                <p className='muted' style={{ margin: 0 }}>
                  {card.universe.slug}
                </p>
                <p className='muted' style={{ margin: 0 }}>{card.universe.summary}</p>
                <div className='toolbar-row'>
                  <span className='badge'>{`lane:${card.item.lane}`}</span>
                  <span className='badge'>{`sugerida:${suggestionMap.get(card.item.id) ?? card.suggestedLane}`}</span>
                  {card.universe.published ? <span className='badge'>publicado</span> : <span className='badge'>rascunho</span>}
                </div>
                <p className='muted' style={{ margin: 0 }}>
                  Checklist: {card.checklist?.readiness.status ?? 'bootstrap'} · docs {card.checklist?.overview.totalDocs ?? 0} · evidencias publicadas {card.checklist?.overview.publishedEvidencesTotal ?? 0}
                </p>
                {card.suggestedFeaturedAction ? (
                  <p className='muted' style={{ margin: 0 }}>
                    Pronto para sugerir featured/focus no catalogo.
                  </p>
                ) : null}
                <div className='toolbar-row'>
                  <Link className='ui-button' href={`/c/${card.universe.slug}`}>
                    Abrir hub
                  </Link>
                  <Link className='ui-button' href={`/admin/universes/${card.universe.id}/bootstrap`}>
                    Bootstrap
                  </Link>
                  <Link className='ui-button' href={`/admin/universes/${card.universe.id}/review`}>
                    Review
                  </Link>
                  <Link className='ui-button' href={`/admin/universes/${card.universe.id}/checklist`}>
                    Checklist
                  </Link>
                  <Link className='ui-button' href={`/admin/universes/${card.universe.id}/highlights`}>
                    Highlights
                  </Link>
                  <Link className='ui-button' href='/admin/universes/featured'>
                    Featured/focus
                  </Link>
                </div>
                <form action={moveItemAction} className='stack'>
                  <input type='hidden' name='item_id' value={card.item.id} />
                  <input type='hidden' name='program_slug' value={board.program.slug} />
                  <label>
                    <span>Mover para</span>
                    <select name='lane' defaultValue={card.item.lane} style={{ width: '100%', minHeight: 40 }}>
                      {(['bootstrap', 'ingest', 'quality', 'sprint', 'review', 'highlights', 'publish', 'done'] as EditorialLane[]).map((lane) => (
                        <option key={lane} value={lane}>
                          {lane}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Prioridade</span>
                    <input type='number' min={0} step={1} name='priority' defaultValue={card.item.priority} style={{ width: '100%', minHeight: 40 }} />
                  </label>
                  <label>
                    <span>Nota operacional</span>
                    <textarea name='note' rows={2} defaultValue={card.item.note ?? ''} style={{ width: '100%' }} />
                  </label>
                  <button className='ui-button' type='submit'>
                    Atualizar card
                  </button>
                </form>
              </article>
            ))}
          </Card>
        ))}
      </div>
    </main>
  );
}





