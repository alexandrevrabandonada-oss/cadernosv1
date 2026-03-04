import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Segmented } from '@/components/ui/Segmented';
import { getAdminDb, getUniverseById, hasAdminWriteAccess, listDocuments, listNodes } from '@/lib/admin/db';
import {
  addNodeEvidence,
  listNodeDocuments,
  listNodeEvidences,
  listNodeQuestions,
  removeNodeDocument,
  removeNodeEvidence,
  removeNodeQuestion,
  upsertNodeDocument,
  upsertNodeQuestion,
} from '@/lib/data/nodeLinks';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

type NodeLinksPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    node?: string;
    q?: string;
    tab?: 'docs' | 'evidencias' | 'perguntas';
    rl?: string;
  }>;
};

function buildHref(universeId: string, nodeId: string, tab: 'docs' | 'evidencias' | 'perguntas', q?: string) {
  const params = new URLSearchParams({ node: nodeId, tab });
  if (q?.trim()) params.set('q', q.trim());
  return `/admin/universes/${universeId}/links?${params.toString()}`;
}

async function saveNodeDocumentAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const weight = Math.max(0, Math.min(1000, Number(formData.get('weight') ?? 100) || 100));
  const tab = String(formData.get('tab') ?? 'docs');
  if (!universeId || !nodeId || !documentId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/links/docs/upsert`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/links?node=${nodeId}&tab=${tab}&rl=${rl.retryAfterSec}`);

  await upsertNodeDocument({ universeId, nodeId, documentId, weight, note });
  revalidatePath(`/admin/universes/${universeId}/links`);
}

async function removeNodeDocumentAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  const tab = String(formData.get('tab') ?? 'docs');
  if (!universeId || !nodeId || !documentId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/links/docs/delete`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/links?node=${nodeId}&tab=${tab}&rl=${rl.retryAfterSec}`);

  await removeNodeDocument(nodeId, documentId);
  revalidatePath(`/admin/universes/${universeId}/links`);
}

async function saveNodeEvidenceAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const evidenceId = String(formData.get('evidence_id') ?? '').trim();
  const pinRank = Math.max(0, Math.min(1000, Number(formData.get('pin_rank') ?? 100) || 100));
  const tab = String(formData.get('tab') ?? 'evidencias');
  if (!universeId || !nodeId || !evidenceId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/links/evidences/upsert`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/links?node=${nodeId}&tab=${tab}&rl=${rl.retryAfterSec}`);

  await addNodeEvidence({ universeId, nodeId, evidenceId, pinRank });
  revalidatePath(`/admin/universes/${universeId}/links`);
}

async function removeNodeEvidenceAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const evidenceId = String(formData.get('evidence_id') ?? '').trim();
  const tab = String(formData.get('tab') ?? 'evidencias');
  if (!universeId || !nodeId || !evidenceId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/links/evidences/delete`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/links?node=${nodeId}&tab=${tab}&rl=${rl.retryAfterSec}`);

  await removeNodeEvidence(nodeId, evidenceId);
  revalidatePath(`/admin/universes/${universeId}/links`);
}

async function saveNodeQuestionAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const question = String(formData.get('question') ?? '').trim();
  const pinRank = Math.max(0, Math.min(1000, Number(formData.get('pin_rank') ?? 100) || 100));
  const tab = String(formData.get('tab') ?? 'perguntas');
  if (!universeId || !nodeId || !question) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/links/questions/upsert`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/links?node=${nodeId}&tab=${tab}&rl=${rl.retryAfterSec}`);

  await upsertNodeQuestion({ universeId, nodeId, question, pinRank });
  revalidatePath(`/admin/universes/${universeId}/links`);
}

async function removeNodeQuestionAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const questionId = String(formData.get('question_id') ?? '').trim();
  const tab = String(formData.get('tab') ?? 'perguntas');
  if (!universeId || !nodeId || !questionId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/links/questions/delete`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/links?node=${nodeId}&tab=${tab}&rl=${rl.retryAfterSec}`);

  await removeNodeQuestion(questionId);
  revalidatePath(`/admin/universes/${universeId}/links`);
}

export default async function AdminUniverseLinksPage({ params, searchParams }: NodeLinksPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  const db = getAdminDb();
  const canWrite = await hasAdminWriteAccess();
  const configured = Boolean(db);
  const search = (sp.q ?? '').trim().toLowerCase();
  const tab = (sp.tab ?? 'docs') as 'docs' | 'evidencias' | 'perguntas';
  const retrySec = Number(sp.rl ?? 0);

  if (!universe) notFound();

  const [nodesRaw, docs, evidencesRaw] = await Promise.all([
    listNodes(id),
    listDocuments(id),
    db
      ? db
          .from('evidences')
          .select('id, title, summary, document_id, created_at')
          .eq('universe_id', id)
          .order('created_at', { ascending: false })
          .limit(250)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; summary: string; document_id: string | null; created_at: string }> }),
  ]);

  const nodes = (nodesRaw ?? []).filter((node) => {
    if (!search) return true;
    return (
      node.title.toLowerCase().includes(search) ||
      node.slug.toLowerCase().includes(search) ||
      (node.tags ?? []).some((tag) => tag.toLowerCase().includes(search))
    );
  });

  const selectedNode = nodes.find((node) => node.id === sp.node) ?? nodes[0] ?? null;
  const selectedNodeId = selectedNode?.id ?? '';
  const evidences = evidencesRaw.data ?? [];
  const docById = new Map(docs.map((doc) => [doc.id, doc]));

  const [linkedDocs, linkedEvidences, linkedQuestions] = selectedNode
    ? await Promise.all([
        listNodeDocuments(selectedNode.id),
        listNodeEvidences(selectedNode.id),
        listNodeQuestions(selectedNode.id),
      ])
    : [[], [], []];

  const docLinkedIds = new Set(linkedDocs.map((item) => item.documentId));
  const evidenceLinkedIds = new Set(linkedEvidences.map((item) => item.evidenceId));

  const tabItems = selectedNode
    ? [
        { href: buildHref(id, selectedNode.id, 'docs', sp.q), label: 'Docs' },
        { href: buildHref(id, selectedNode.id, 'evidencias', sp.q), label: 'Evidencias' },
        { href: buildHref(id, selectedNode.id, 'perguntas', sp.q), label: 'Perguntas' },
      ]
    : [];

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${universe.id}`, label: universe.slug },
            { label: 'Links' },
          ]}
          ariaLabel='Trilha admin links'
        />
        <SectionHeader
          title={`Curadoria de vinculos: ${universe.title}`}
          description='Ligue explicitamente documentos e evidencias aos nos do universo.'
          tag='Node ⇄ Document ⇄ Evidence'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${id}/checklist`}>
            Voltar ao Checklist
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/assistido`}>
            Abrir Curadoria Assistida
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
          <input type='hidden' name='node' value={selectedNodeId} />
          <input type='hidden' name='tab' value={tab} />
          <input
            name='q'
            defaultValue={sp.q ?? ''}
            placeholder='Buscar no por titulo, slug ou tag'
            style={{ minHeight: 40, minWidth: 280 }}
          />
          <button className='ui-button' type='submit'>
            Buscar no
          </button>
        </form>

        <div className='layout-shell' style={{ gridTemplateColumns: 'minmax(220px, 320px) 1fr' }}>
          <aside className='stack'>
            <SectionHeader title='Nos do universo' />
            <div className='stack'>
              {nodes.map((node) => (
                <Link
                  key={node.id}
                  href={buildHref(id, node.id, tab, sp.q)}
                  className='ui-button'
                  data-variant={selectedNodeId === node.id ? 'primary' : 'ghost'}
                >
                  {node.title}
                </Link>
              ))}
              {nodes.length === 0 ? (
                <p className='muted' style={{ margin: 0 }}>
                  Nenhum no encontrado.
                </p>
              ) : null}
            </div>
          </aside>

          <section className='stack'>
            {selectedNode ? (
              <>
                <Card className='stack'>
                  <SectionHeader
                    title={`No selecionado: ${selectedNode.title}`}
                    description={`slug: ${selectedNode.slug} | tipo: ${selectedNode.kind}`}
                  />
                  <p className='muted' style={{ margin: 0 }}>
                    {selectedNode.summary}
                  </p>
                </Card>

                <Segmented
                  label='Tabs de curadoria'
                  items={tabItems}
                  currentPath={buildHref(id, selectedNode.id, tab, sp.q)}
                />

                {tab === 'docs' ? (
                  <Card className='stack'>
                    <SectionHeader title='Documentos vinculados' description='Edite weight/note e remova vinculos.' />
                    <div className='stack'>
                      {linkedDocs.map((item) => (
                        <form key={item.id} action={saveNodeDocumentAction} className='core-node stack'>
                          <input type='hidden' name='universe_id' value={id} />
                          <input type='hidden' name='node_id' value={selectedNode.id} />
                          <input type='hidden' name='document_id' value={item.documentId} />
                          <input type='hidden' name='tab' value='docs' />
                          <strong>{item.document?.title ?? 'Documento removido'}</strong>
                          <p className='muted' style={{ margin: 0 }}>
                            {item.document?.year ? `Ano ${item.document.year}` : 'Ano n/d'} | {item.document?.status ?? 'n/d'}
                          </p>
                          <div className='toolbar-row'>
                            <label>
                              <span>weight</span>
                              <input name='weight' defaultValue={item.weight} type='number' min={0} max={1000} />
                            </label>
                            <label style={{ flex: 1 }}>
                              <span>nota</span>
                              <input name='note' defaultValue={item.note ?? ''} style={{ width: '100%' }} />
                            </label>
                          </div>
                          <div className='toolbar-row'>
                            <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                              Salvar vinculo
                            </button>
                            <button
                              className='ui-button'
                              type='submit'
                              formAction={removeNodeDocumentAction}
                              data-variant='ghost'
                              disabled={!configured || !canWrite}
                            >
                              Remover
                            </button>
                          </div>
                        </form>
                      ))}
                      {linkedDocs.length === 0 ? (
                        <p className='muted' style={{ margin: 0 }}>
                          Nenhum documento vinculado a este no.
                        </p>
                      ) : null}
                    </div>

                    <SectionHeader title='Adicionar documento' />
                    <form action={saveNodeDocumentAction} className='stack'>
                      <input type='hidden' name='universe_id' value={id} />
                      <input type='hidden' name='node_id' value={selectedNode.id} />
                      <input type='hidden' name='tab' value='docs' />
                      <label>
                        <span>Documento</span>
                        <select name='document_id' defaultValue='' style={{ width: '100%', minHeight: 40 }}>
                          <option value='' disabled>
                            Selecione um documento
                          </option>
                          {docs
                            .filter((doc) => !docLinkedIds.has(doc.id))
                            .map((doc) => (
                              <option key={doc.id} value={doc.id}>
                                {doc.title} {doc.year ? `(${doc.year})` : ''}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className='toolbar-row'>
                        <label>
                          <span>weight</span>
                          <input name='weight' type='number' min={0} max={1000} defaultValue={100} />
                        </label>
                        <label style={{ flex: 1 }}>
                          <span>nota</span>
                          <input name='note' placeholder='Justificativa curta de curadoria' style={{ width: '100%' }} />
                        </label>
                      </div>
                      <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                        Vincular documento
                      </button>
                    </form>
                  </Card>
                ) : null}

                {tab === 'evidencias' ? (
                  <Card className='stack'>
                    <SectionHeader title='Evidencias vinculadas' description='Ajuste pin_rank numerico para ordenacao.' />
                    <div className='stack'>
                      {linkedEvidences.map((item) => (
                        <form key={item.id} action={saveNodeEvidenceAction} className='core-node stack'>
                          <input type='hidden' name='universe_id' value={id} />
                          <input type='hidden' name='node_id' value={selectedNode.id} />
                          <input type='hidden' name='evidence_id' value={item.evidenceId} />
                          <input type='hidden' name='tab' value='evidencias' />
                          <strong>{item.evidence?.title ?? 'Evidencia removida'}</strong>
                          <p className='muted' style={{ margin: 0 }}>
                            {item.evidence?.documentTitle ?? 'Sem doc'} {item.evidence?.year ? `(${item.evidence.year})` : ''}
                          </p>
                          <p style={{ margin: 0 }}>{item.evidence?.quote ?? ''}</p>
                          <div className='toolbar-row'>
                            <label>
                              <span>pin_rank</span>
                              <input name='pin_rank' defaultValue={item.pinRank} type='number' min={0} max={1000} />
                            </label>
                          </div>
                          <div className='toolbar-row'>
                            <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                              Salvar rank
                            </button>
                            <button
                              className='ui-button'
                              type='submit'
                              formAction={removeNodeEvidenceAction}
                              data-variant='ghost'
                              disabled={!configured || !canWrite}
                            >
                              Remover
                            </button>
                          </div>
                        </form>
                      ))}
                      {linkedEvidences.length === 0 ? (
                        <p className='muted' style={{ margin: 0 }}>
                          Nenhuma evidencia vinculada a este no.
                        </p>
                      ) : null}
                    </div>

                    <SectionHeader title='Adicionar evidencia' />
                    <form action={saveNodeEvidenceAction} className='stack'>
                      <input type='hidden' name='universe_id' value={id} />
                      <input type='hidden' name='node_id' value={selectedNode.id} />
                      <input type='hidden' name='tab' value='evidencias' />
                      <label>
                        <span>Evidencia</span>
                        <select name='evidence_id' defaultValue='' style={{ width: '100%', minHeight: 40 }}>
                          <option value='' disabled>
                            Selecione uma evidencia
                          </option>
                          {evidences
                            .filter((ev) => !evidenceLinkedIds.has(ev.id))
                            .map((ev) => {
                              const doc = ev.document_id ? docById.get(ev.document_id) : null;
                              return (
                                <option key={ev.id} value={ev.id}>
                                  {ev.title} {doc?.title ? `| ${doc.title}` : ''}
                                </option>
                              );
                            })}
                        </select>
                      </label>
                      <label>
                        <span>pin_rank</span>
                        <input name='pin_rank' type='number' min={0} max={1000} defaultValue={100} />
                      </label>
                      <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                        Vincular evidencia
                      </button>
                    </form>
                  </Card>
                ) : null}

                {tab === 'perguntas' ? (
                  <Card className='stack'>
                    <SectionHeader title='Perguntas sugeridas' description='Curadoria de prompts para Debate e orientacao de estudo.' />
                    <div className='stack'>
                      {linkedQuestions.map((item) => (
                        <form key={item.id} action={saveNodeQuestionAction} className='core-node stack'>
                          <input type='hidden' name='universe_id' value={id} />
                          <input type='hidden' name='node_id' value={selectedNode.id} />
                          <input type='hidden' name='question' value={item.question} />
                          <input type='hidden' name='tab' value='perguntas' />
                          <strong>{item.question}</strong>
                          <div className='toolbar-row'>
                            <label>
                              <span>pin_rank</span>
                              <input name='pin_rank' type='number' min={0} max={1000} defaultValue={item.pinRank} />
                            </label>
                          </div>
                          <div className='toolbar-row'>
                            <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                              Salvar rank
                            </button>
                            <button
                              className='ui-button'
                              type='submit'
                              formAction={removeNodeQuestionAction}
                              data-variant='ghost'
                              disabled={!configured || !canWrite}
                            >
                              Remover
                            </button>
                            <input type='hidden' name='question_id' value={item.id} />
                          </div>
                        </form>
                      ))}
                      {linkedQuestions.length === 0 ? (
                        <p className='muted' style={{ margin: 0 }}>
                          Nenhuma pergunta sugerida vinculada a este no.
                        </p>
                      ) : null}
                    </div>

                    <SectionHeader title='Adicionar pergunta' />
                    <form action={saveNodeQuestionAction} className='stack'>
                      <input type='hidden' name='universe_id' value={id} />
                      <input type='hidden' name='node_id' value={selectedNode.id} />
                      <input type='hidden' name='tab' value='perguntas' />
                      <label>
                        <span>Pergunta</span>
                        <textarea
                          name='question'
                          rows={3}
                          maxLength={300}
                          required
                          placeholder='Ex.: Quais evidencias sustentam a hipotese principal deste no?'
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        <span>pin_rank</span>
                        <input name='pin_rank' type='number' min={0} max={1000} defaultValue={100} />
                      </label>
                      <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                        Salvar pergunta
                      </button>
                    </form>
                  </Card>
                ) : null}
              </>
            ) : (
              <Card className='stack'>
                <SectionHeader title='Sem no selecionado' description='Crie ou selecione um no para iniciar a curadoria de vinculos.' />
                <Link className='ui-button' href={`/admin/universes/${id}/nodes`}>
                  Ir para gerenciamento de nos
                </Link>
              </Card>
            )}
          </section>
        </div>
      </Card>
    </main>
  );
}
