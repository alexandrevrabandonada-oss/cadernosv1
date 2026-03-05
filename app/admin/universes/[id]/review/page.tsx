import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getUniverseById, listNodes } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { getEvidenceAudit, listEvidenceQueue, type EvidenceEditorialStatus, updateEvidenceStatus } from '@/lib/data/evidenceWorkflow';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

type ReviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string;
    node?: string;
    q?: string;
    cursor?: string;
    selected?: string;
    msg?: string;
  }>;
};

function parseStatus(value: string | undefined): EvidenceEditorialStatus | 'all' {
  if (value === 'draft' || value === 'review' || value === 'published' || value === 'rejected' || value === 'all') {
    return value;
  }
  return 'all';
}

async function updateEvidenceAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const evidenceId = String(formData.get('evidence_id') ?? '').trim();
  const toStatus = String(formData.get('to_status') ?? '').trim() as EvidenceEditorialStatus;
  const q = String(formData.get('q') ?? '').trim();
  const node = String(formData.get('node') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const tagsCsv = String(formData.get('tags') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  if (!universeId || !evidenceId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/review/update`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}/review?msg=${encodeURIComponent(`Rate limit: tente novamente em ${rl.retryAfterSec}s`)}`);
  }

  await updateEvidenceStatus({
    evidenceId,
    toStatus,
    note: note || undefined,
    title: title || undefined,
    summary: summary || undefined,
    tags: tagsCsv
      ? tagsCsv
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : undefined,
    nodeId: nodeId || null,
  });

  revalidatePath(`/admin/universes/${universeId}/review`);
  revalidatePath(`/admin/universes/${universeId}/checklist`);
  revalidatePath('/admin/status');

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (node) params.set('node', node);
  if (status) params.set('status', status);
  params.set('selected', evidenceId);
  params.set('msg', `Evidencia atualizada para ${toStatus}.`);
  redirect(`/admin/universes/${universeId}/review?${params.toString()}`);
}

export default async function UniverseReviewPage({ params, searchParams }: ReviewPageProps) {
  await requireEditorOrAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  if (!universe) notFound();

  const status = parseStatus(sp.status);
  const q = (sp.q ?? '').trim();
  const nodeFilter = (sp.node ?? '').trim();
  const cursor = Math.max(0, Number(sp.cursor ?? 0) || 0);
  const selected = (sp.selected ?? '').trim();

  const [nodes, queue] = await Promise.all([
    listNodes(id),
    listEvidenceQueue({
      universeId: id,
      status,
      q,
      nodeId: nodeFilter || undefined,
      cursor,
      limit: 20,
    }),
  ]);

  const selectedItem = queue.items.find((item) => item.id === selected) ?? queue.items[0] ?? null;
  const audit = selectedItem ? await getEvidenceAudit(selectedItem.id) : [];

  const statuses: Array<{ value: EvidenceEditorialStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'Review' },
    { value: 'published', label: 'Published' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const queryBase = new URLSearchParams();
  if (q) queryBase.set('q', q);
  if (nodeFilter) queryBase.set('node', nodeFilter);
  if (status !== 'all') queryBase.set('status', status);

  const withSelected = (evidenceId: string) => {
    const paramsValue = new URLSearchParams(queryBase.toString());
    paramsValue.set('selected', evidenceId);
    return `/admin/universes/${id}/review?${paramsValue.toString()}`;
  };

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${id}`, label: universe.slug },
            { label: 'Fila de Revisao' },
          ]}
          ariaLabel='Trilha fila de revisao de evidencias'
        />
        <SectionHeader
          title={`Fila de revisao: ${universe.title}`}
          description='Aprove, revise ou rejeite evidencias antes de entrarem no publico.'
          tag='Workflow editorial'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${id}/checklist`}>
            Voltar ao Checklist
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/assistido`}>
            Curadoria Assistida
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/docs/qualidade`}>
            Docs problematicos
          </Link>
        </div>
      </Card>

      {sp.msg ? (
        <Card>
          <p role='status' style={{ margin: 0 }}>
            {sp.msg}
          </p>
        </Card>
      ) : null}

      <Card className='stack'>
        <form method='get' className='toolbar-row'>
          <label>
            <span>Status</span>
            <select name='status' defaultValue={status} style={{ minHeight: 40 }}>
              {statuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>No</span>
            <select name='node' defaultValue={nodeFilter} style={{ minHeight: 40 }}>
              <option value=''>Todos</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Busca</span>
            <input name='q' defaultValue={q} placeholder='titulo/resumo' style={{ minHeight: 40, minWidth: 220 }} />
          </label>
          <button className='ui-button' type='submit'>
            Aplicar
          </button>
        </form>
        <div className='toolbar-row'>
          <Carimbo>{`itens:${queue.items.length}`}</Carimbo>
          <Carimbo>{`status:${status}`}</Carimbo>
        </div>
      </Card>

      <div className='layout-shell' style={{ gridTemplateColumns: 'minmax(280px, 420px) 1fr' }}>
        <Card className='stack'>
          <SectionHeader title='Fila' description='Draft e review devem passar aqui antes do publico.' />
          <div className='stack'>
            {queue.items.map((item) => (
              <article key={item.id} className='core-node' data-selected={selectedItem?.id === item.id ? 'true' : undefined}>
                <div className='toolbar-row'>
                  <strong>{item.title}</strong>
                  <Carimbo>{item.status}</Carimbo>
                </div>
                <p className='muted' style={{ margin: 0 }}>
                  {item.documentTitle ?? 'Documento n/d'} {item.year ? `(${item.year})` : ''} | {item.nodeTitle ?? 'Sem no'}
                </p>
                <p style={{ margin: 0 }}>{item.summary}</p>
                <Link className='ui-button' href={withSelected(item.id)} data-variant='ghost'>
                  Selecionar
                </Link>
              </article>
            ))}
            {queue.items.length === 0 ? (
              <p className='muted' style={{ margin: 0 }}>
                Sem evidencias para os filtros selecionados.
              </p>
            ) : null}
          </div>
          <div className='toolbar-row'>
            {cursor > 0 ? (
              <Link className='ui-button' data-variant='ghost' href={`/admin/universes/${id}/review?${new URLSearchParams({ ...Object.fromEntries(queryBase.entries()), cursor: String(Math.max(0, cursor - 20)) }).toString()}`}>
                Anterior
              </Link>
            ) : null}
            {queue.nextCursor !== null ? (
              <Link className='ui-button' data-variant='ghost' href={`/admin/universes/${id}/review?${new URLSearchParams({ ...Object.fromEntries(queryBase.entries()), cursor: String(queue.nextCursor) }).toString()}`}>
                Proxima
              </Link>
            ) : null}
          </div>
        </Card>

        <Card className='stack'>
          {selectedItem ? (
            <>
              <SectionHeader title='Detalhe e revisao' description='Edite e altere status com trilha de auditoria.' />
              <article className='core-node stack'>
                <strong>{selectedItem.title}</strong>
                <p style={{ margin: 0 }}>{selectedItem.summary}</p>
                <p className='muted' style={{ margin: 0 }}>
                  doc: {selectedItem.documentTitle ?? 'n/d'} | no: {selectedItem.nodeTitle ?? 'n/d'} | paginas:{' '}
                  {selectedItem.pageStart ?? selectedItem.pageEnd ?? 's/p'}
                  {selectedItem.pageEnd && selectedItem.pageStart !== selectedItem.pageEnd ? `-${selectedItem.pageEnd}` : ''}
                </p>
                <div className='toolbar-row'>
                  <Carimbo>{`status:${selectedItem.status}`}</Carimbo>
                  <Carimbo>{`published_at:${selectedItem.publishedAt ? 'sim' : 'nao'}`}</Carimbo>
                </div>
                <div className='toolbar-row'>
                  {selectedItem.documentId ? (
                    <Link className='ui-button' href={`/c/${universe.slug}/doc/${selectedItem.documentId}${selectedItem.pageStart ? `?p=${selectedItem.pageStart}` : ''}`} target='_blank'>
                      Abrir documento
                    </Link>
                  ) : null}
                  <Link className='ui-button' href={`/c/${universe.slug}/provas?selected=${encodeURIComponent(selectedItem.id)}&panel=detail`} target='_blank'>
                    Abrir em Provas
                  </Link>
                  {selectedItem.nodeSlug ? (
                    <Link className='ui-button' href={`/c/${universe.slug}/mapa?node=${encodeURIComponent(selectedItem.nodeSlug)}&panel=detail`} target='_blank'>
                      Abrir no Mapa
                    </Link>
                  ) : null}
                </div>
              </article>

              <form action={updateEvidenceAction} className='stack'>
                <input type='hidden' name='universe_id' value={id} />
                <input type='hidden' name='evidence_id' value={selectedItem.id} />
                <input type='hidden' name='q' value={q} />
                <input type='hidden' name='node' value={nodeFilter} />
                <input type='hidden' name='status' value={status} />
                <label>
                  <span>Titulo</span>
                  <input name='title' defaultValue={selectedItem.title} style={{ minHeight: 40, width: '100%' }} />
                </label>
                <label>
                  <span>Resumo/claim</span>
                  <textarea name='summary' defaultValue={selectedItem.summary} rows={4} style={{ width: '100%' }} />
                </label>
                <label>
                  <span>Tags (csv)</span>
                  <input
                    name='tags'
                    defaultValue={selectedItem.tags.join(',')}
                    placeholder='ex.: saude,ar,monitoramento'
                    style={{ minHeight: 40, width: '100%' }}
                  />
                </label>
                <label>
                  <span>No relacionado</span>
                  <select name='node_id' defaultValue={selectedItem.nodeId ?? ''} style={{ minHeight: 40 }}>
                    <option value=''>Sem no</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Nota editorial</span>
                  <textarea name='note' defaultValue={selectedItem.editorialNote ?? ''} rows={3} style={{ width: '100%' }} />
                </label>
                <div className='toolbar-row'>
                  <button className='ui-button' type='submit' name='to_status' value='published'>
                    Aprovar (published)
                  </button>
                  <button className='ui-button' type='submit' name='to_status' value='review' data-variant='ghost'>
                    Mandar para review
                  </button>
                  <button className='ui-button' type='submit' name='to_status' value='draft' data-variant='ghost'>
                    Voltar para draft
                  </button>
                  <button className='ui-button' type='submit' name='to_status' value='rejected' data-variant='ghost'>
                    Rejeitar
                  </button>
                </div>
              </form>

              <article className='core-node stack'>
                <strong>Auditoria</strong>
                <div className='stack'>
                  {audit.map((item) => (
                    <div key={item.id} className='toolbar-row'>
                      <Carimbo>{item.action}</Carimbo>
                      <span className='muted'>
                        {item.fromStatus ?? '-'} → {item.toStatus ?? '-'} | {new Date(item.createdAt).toLocaleString('pt-BR')}
                      </span>
                      {item.note ? <span className='muted'>{item.note}</span> : null}
                    </div>
                  ))}
                  {audit.length === 0 ? (
                    <p className='muted' style={{ margin: 0 }}>
                      Sem auditoria registrada ainda.
                    </p>
                  ) : null}
                </div>
              </article>
            </>
          ) : (
            <SectionHeader title='Selecione uma evidencia' description='Abra um item da fila para revisar e publicar.' />
          )}
        </Card>
      </div>
    </main>
  );
}
