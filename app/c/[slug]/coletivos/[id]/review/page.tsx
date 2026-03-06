import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { buildUniverseHref } from '@/lib/universeNav';
import {
  getSharedItemAudit,
  getSharedNotebookReview,
  listReviewQueue,
  listSharedNotebookReviewNodes,
  promoteSharedItem,
  updateReviewStatus,
} from '@/lib/shared-notebooks/review';
import type { SharedNotebookPromotedType, SharedNotebookReviewStatus } from '@/lib/shared-notebooks/types';

type Props = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{
    status?: string;
    sourceType?: string;
    q?: string;
    cursor?: string;
    selected?: string;
    msg?: string;
  }>;
};

function parseStatus(value?: string): SharedNotebookReviewStatus | 'all' {
  if (value === 'draft' || value === 'review' || value === 'approved' || value === 'rejected' || value === 'all') return value;
  return 'all';
}

function parsePromotedType(value?: string): SharedNotebookPromotedType {
  if (value === 'node_question' || value === 'glossary_term' || value === 'event' || value === 'trail_step') return value;
  return 'evidence';
}

async function updateReviewAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') ?? '').trim();
  const notebookId = String(formData.get('notebook_id') ?? '').trim();
  const itemId = String(formData.get('item_id') ?? '').trim();
  const toStatus = parseStatus(String(formData.get('to_status') ?? '').trim()) as SharedNotebookReviewStatus;
  const note = String(formData.get('note') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const sourceType = String(formData.get('sourceType') ?? '').trim();
  const q = String(formData.get('q') ?? '').trim();
  if (!slug || !notebookId || !itemId) return;
  await updateReviewStatus({ universeSlug: slug, notebookId, itemId, toStatus, note: note || null });
  revalidatePath(buildUniverseHref(slug, `coletivos/${notebookId}/review`));
  revalidatePath(buildUniverseHref(slug, `coletivos/${notebookId}`));
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (sourceType) params.set('sourceType', sourceType);
  if (q) params.set('q', q);
  params.set('selected', itemId);
  params.set('msg', `Item atualizado para ${toStatus}.`);
  redirect(`${buildUniverseHref(slug, `coletivos/${notebookId}/review`)}?${params.toString()}`);
}

async function promoteItemAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') ?? '').trim();
  const notebookId = String(formData.get('notebook_id') ?? '').trim();
  const itemId = String(formData.get('item_id') ?? '').trim();
  const targetType = parsePromotedType(String(formData.get('target_type') ?? '').trim());
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const eventDate = String(formData.get('event_date') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const sourceType = String(formData.get('sourceType') ?? '').trim();
  const q = String(formData.get('q') ?? '').trim();
  if (!slug || !notebookId || !itemId) return;
  await promoteSharedItem({
    universeSlug: slug,
    notebookId,
    itemId,
    targetType,
    nodeId: nodeId || null,
    title: title || null,
    summary: summary || null,
    note: note || null,
    eventDate: eventDate || null,
  });
  revalidatePath(buildUniverseHref(slug, `coletivos/${notebookId}/review`));
  revalidatePath(buildUniverseHref(slug, `coletivos/${notebookId}`));
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (sourceType) params.set('sourceType', sourceType);
  if (q) params.set('q', q);
  params.set('selected', itemId);
  params.set('msg', `Item promovido para ${targetType}.`);
  redirect(`${buildUniverseHref(slug, `coletivos/${notebookId}/review`)}?${params.toString()}`);
}

export default async function SharedNotebookReviewPage({ params, searchParams }: Props) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const review = await getSharedNotebookReview({ universeSlug: slug, notebookIdOrSlug: id });
  if (!review) notFound();

  const status = parseStatus(sp.status);
  const sourceType = (sp.sourceType ?? '').trim();
  const q = (sp.q ?? '').trim();
  const cursor = Math.max(0, Number(sp.cursor ?? 0) || 0);
  const queue = await listReviewQueue({ universeSlug: slug, notebookId: review.id, status, sourceType: sourceType || undefined, q, limit: 24, cursor });
  const selected = queue.items.find((item) => item.id === (sp.selected ?? '').trim()) ?? queue.items[0] ?? null;
  const audit = selected ? await getSharedItemAudit({ universeSlug: slug, notebookId: review.id, itemId: selected.id }) : [];
  const nodes = await listSharedNotebookReviewNodes({ universeSlug: slug, notebookId: review.id });
  const queryBase = new URLSearchParams();
  if (status !== 'all') queryBase.set('status', status);
  if (sourceType) queryBase.set('sourceType', sourceType);
  if (q) queryBase.set('q', q);

  const selectedHref = (itemId: string) => {
    const next = new URLSearchParams(queryBase.toString());
    next.set('selected', itemId);
    return `${buildUniverseHref(slug, `coletivos/${review.slug}/review`)}?${next.toString()}`;
  };

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: buildUniverseHref(slug, ''), label: slug },
            { href: buildUniverseHref(slug, 'coletivos'), label: 'Coletivos' },
            { href: buildUniverseHref(slug, `coletivos/${review.slug}`), label: review.title },
            { label: 'Review' },
          ]}
          ariaLabel='Trilha review do coletivo'
        />
        <SectionHeader title={`Fila coletiva: ${review.title}`} description='Triagem editorial do coletivo antes de promover itens para o produto.' tag='Review' />
        <div className='toolbar-row'>
          <Carimbo>{`vis:${review.visibility}`}</Carimbo>
          <Carimbo>{`itens:${review.itemCount}`}</Carimbo>
          <Carimbo>{`role:${review.memberRole ?? 'viewer'}`}</Carimbo>
          <Link className='ui-button' href={buildUniverseHref(slug, `coletivos/${review.slug}`)}>
            Voltar ao coletivo
          </Link>
        </div>
      </Card>

      {sp.msg ? (
        <Card>
          <p role='status' style={{ margin: 0 }}>{sp.msg}</p>
        </Card>
      ) : null}

      <Card className='stack'>
        <form method='get' className='toolbar-row'>
          <label>
            <span>Status</span>
            <select name='status' defaultValue={status} style={{ minHeight: 40 }}>
              <option value='all'>Todos</option>
              <option value='draft'>Draft</option>
              <option value='review'>Review</option>
              <option value='approved'>Approved</option>
              <option value='rejected'>Rejected</option>
            </select>
          </label>
          <label>
            <span>Tipo</span>
            <select name='sourceType' defaultValue={sourceType} style={{ minHeight: 40 }}>
              <option value=''>Todos</option>
              <option value='highlight'>Highlight</option>
              <option value='note'>Note</option>
              <option value='evidence'>Evidence</option>
              <option value='thread'>Thread</option>
              <option value='doc'>Doc</option>
            </select>
          </label>
          <label>
            <span>Busca</span>
            <input name='q' defaultValue={q} style={{ minHeight: 40, minWidth: 220 }} placeholder='trecho, tags, nota' />
          </label>
          <button className='ui-button' type='submit'>Aplicar</button>
        </form>
      </Card>

      <div className='layout-shell' style={{ gridTemplateColumns: 'minmax(320px, 430px) 1fr' }}>
        <Card className='stack'>
          <SectionHeader title='Fila' description='Draft e review viram insumos editoriais; nada vai direto para publico.' />
          <div className='stack'>
            {queue.items.map((item) => (
              <article key={item.id} className='core-node stack' data-selected={selected?.id === item.id ? 'true' : undefined}>
                <div className='toolbar-row'>
                  <strong>{item.title ?? 'Item coletivo'}</strong>
                  <Carimbo>{item.reviewStatus}</Carimbo>
                </div>
                <p className='muted' style={{ margin: 0 }}>{item.sourceType} | {item.addedByLabel}</p>
                <p style={{ margin: 0 }}>{item.text}</p>
                <div className='toolbar-row'>
                  {item.promotedType ? <Carimbo>{`promovido:${item.promotedType}`}</Carimbo> : null}
                  <Link className='ui-button' data-variant='ghost' href={selectedHref(item.id)}>Selecionar</Link>
                </div>
              </article>
            ))}
            {queue.items.length === 0 ? <p className='muted' style={{ margin: 0 }}>Sem itens na fila para esse filtro.</p> : null}
          </div>
        </Card>

        <Card className='stack'>
          {selected ? (
            <>
              <SectionHeader title='Detalhe editorial' description='Revise, anote, aprove/rejeite ou promova para um objeto do produto.' />
              <article className='core-node stack'>
                <strong>{selected.title ?? 'Item coletivo'}</strong>
                <p className='muted' style={{ margin: 0 }}>{selected.sourceType} | adicionado por {selected.addedByLabel}</p>
                <p style={{ margin: 0 }}>{selected.text}</p>
                {selected.note ? <p className='muted' style={{ margin: 0 }}>Nota coletiva: {selected.note}</p> : null}
                <div className='toolbar-row'>
                  <Carimbo>{`status:${selected.reviewStatus}`}</Carimbo>
                  {selected.promotedType ? <Carimbo>{`promovido:${selected.promotedType}`}</Carimbo> : null}
                  {selected.reviewedAt ? <Carimbo>{`revisado:${new Date(selected.reviewedAt).toLocaleDateString('pt-BR')}`}</Carimbo> : null}
                </div>
                <div className='toolbar-row'>
                  <Link className='ui-button' href={buildUniverseHref(slug, `coletivos/${review.slug}`)}>Voltar ao detalhe</Link>
                  {selected.promotedType === 'evidence' && selected.promotedId ? (
                    <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, `provas?selected=${selected.promotedId}&panel=detail`)}>
                      Abrir evidencia criada
                    </Link>
                  ) : null}
                  {selected.promotedType === 'event' && selected.promotedId ? (
                    <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, `linha?selected=${selected.promotedId}&panel=detail`)}>
                      Abrir evento criado
                    </Link>
                  ) : null}
                </div>
              </article>

              <form action={updateReviewAction} className='stack'>
                <input type='hidden' name='slug' value={slug} />
                <input type='hidden' name='notebook_id' value={review.id} />
                <input type='hidden' name='item_id' value={selected.id} />
                <input type='hidden' name='status' value={status} />
                <input type='hidden' name='sourceType' value={sourceType} />
                <input type='hidden' name='q' value={q} />
                <label>
                  <span>Nota editorial</span>
                  <textarea name='note' defaultValue={selected.editorialNote ?? ''} rows={4} style={{ width: '100%' }} />
                </label>
                <div className='toolbar-row'>
                  <button className='ui-button' type='submit' name='to_status' value='review'>Mover para review</button>
                  <button className='ui-button' type='submit' name='to_status' value='approved' data-variant='ghost'>Aprovar</button>
                  <button className='ui-button' type='submit' name='to_status' value='rejected' data-variant='ghost'>Rejeitar</button>
                  <button className='ui-button' type='submit' name='to_status' value='draft' data-variant='ghost'>Voltar draft</button>
                </div>
              </form>

              <form action={promoteItemAction} className='stack'>
                <input type='hidden' name='slug' value={slug} />
                <input type='hidden' name='notebook_id' value={review.id} />
                <input type='hidden' name='item_id' value={selected.id} />
                <input type='hidden' name='status' value={status} />
                <input type='hidden' name='sourceType' value={sourceType} />
                <input type='hidden' name='q' value={q} />
                <SectionHeader title='Promover para...' description='A promoção cria um objeto editorial em draft ou equivalente e deixa trilha de auditoria.' />
                <label>
                  <span>Destino</span>
                  <select name='target_type' defaultValue='evidence' style={{ minHeight: 40 }}>
                    <option value='evidence'>Evidence</option>
                    <option value='node_question'>Node question</option>
                    <option value='glossary_term'>Glossary term</option>
                    <option value='event'>Event</option>
                  </select>
                </label>
                <label>
                  <span>Titulo</span>
                  <input name='title' defaultValue={selected.title ?? selected.text.slice(0, 80)} style={{ minHeight: 40, width: '100%' }} />
                </label>
                <label>
                  <span>Resumo / pergunta / definicao</span>
                  <textarea name='summary' defaultValue={selected.note ?? selected.text} rows={4} style={{ width: '100%' }} />
                </label>
                <label>
                  <span>No relacionado</span>
                  <select name='node_id' defaultValue={typeof selected.sourceMeta.nodeId === 'string' ? selected.sourceMeta.nodeId : ''} style={{ minHeight: 40 }}>
                    <option value=''>Sem no definido</option>
                    {nodes.map((node) => (
                      <option key={node.id || node.slug} value={node.id}>{node.title}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Data do evento (opcional)</span>
                  <input name='event_date' type='date' style={{ minHeight: 40 }} />
                </label>
                <label>
                  <span>Nota editorial final</span>
                  <textarea name='note' defaultValue={selected.editorialNote ?? ''} rows={3} style={{ width: '100%' }} />
                </label>
                <div className='toolbar-row'>
                  <button className='ui-button' type='submit'>Promover item</button>
                </div>
              </form>

              <article className='core-node stack'>
                <strong>Auditoria</strong>
                <div className='stack'>
                  {audit.map((entry) => (
                    <div key={entry.id} className='toolbar-row'>
                      <Carimbo>{entry.action}</Carimbo>
                      <span className='muted'>
                        {entry.fromStatus ?? '-'} → {entry.toStatus ?? '-'} | {new Date(entry.createdAt).toLocaleString('pt-BR')}
                      </span>
                      {entry.note ? <span className='muted'>{entry.note}</span> : null}
                    </div>
                  ))}
                  {audit.length === 0 ? <p className='muted' style={{ margin: 0 }}>Sem logs ainda.</p> : null}
                </div>
              </article>
            </>
          ) : (
            <SectionHeader title='Selecione um item' description='Abra um item da fila para revisar, aprovar ou promover.' />
          )}
        </Card>
      </div>
    </main>
  );
}
