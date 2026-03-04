import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Segmented } from '@/components/ui/Segmented';
import { getAdminDb, getUniverseById, hasAdminWriteAccess, listDocuments, listNodes } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { promoteChunkToEvidence } from '@/lib/curation/promoteEvidence';
import {
  generateSuggestionsForNode,
  generateSuggestionsForUniverse,
  listNodeDocumentSuggestions,
  listNodeEvidenceSuggestions,
  listNodeQuestionSuggestions,
} from '@/lib/curation/suggest';
import { listNodeDocuments, listNodeEvidences, listNodeQuestions, upsertNodeDocument, upsertNodeQuestion } from '@/lib/data/nodeLinks';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

type AssistidoPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    node?: string;
    q?: string;
    tab?: 'docs' | 'evidencias' | 'perguntas';
    rl?: string;
    msg?: string;
  }>;
};

function isCoreNode(kind: string, tags: string[]) {
  return kind === 'core' || kind === 'concept' || tags.some((tag) => tag.toLowerCase() === 'core');
}

function buildHref(
  universeId: string,
  nodeId: string,
  tab: 'docs' | 'evidencias' | 'perguntas',
  q?: string,
) {
  const params = new URLSearchParams({ node: nodeId, tab });
  if (q?.trim()) params.set('q', q.trim());
  return `/admin/universes/${universeId}/assistido?${params.toString()}`;
}

async function generateUniverseSuggestionsAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const mode = String(formData.get('mode') ?? 'core').trim();
  if (!universeId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/assistido/generate_${mode}`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/assistido?rl=${rl.retryAfterSec}`);

  const onlyCore = mode !== 'all';
  const result = await generateSuggestionsForUniverse(universeId, { onlyCore });
  const docs = result.reduce((sum, item) => sum + item.docs, 0);
  const evidences = result.reduce((sum, item) => sum + item.evidences, 0);
  const questions = result.reduce((sum, item) => sum + item.questions, 0);

  revalidatePath(`/admin/universes/${universeId}/assistido`);
  redirect(
    `/admin/universes/${universeId}/assistido?msg=${encodeURIComponent(
      `Sugestoes geradas: nos ${result.length}, docs ${docs}, evidencias ${evidences}, perguntas ${questions}.`,
    )}`,
  );
}

async function generateNodeSuggestionsAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const tab = String(formData.get('tab') ?? 'docs').trim();
  if (!universeId || !nodeId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/assistido/generate_node`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/assistido?node=${nodeId}&tab=${tab}&rl=${rl.retryAfterSec}`);

  const generated = await generateSuggestionsForNode(universeId, nodeId);
  revalidatePath(`/admin/universes/${universeId}/assistido`);
  redirect(
    `/admin/universes/${universeId}/assistido?node=${nodeId}&tab=${tab}&msg=${encodeURIComponent(
      `No atualizado: docs ${generated.docs}, evidencias ${generated.evidences}, perguntas ${generated.questions}.`,
    )}`,
  );
}

async function applyDocSuggestionAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  const score = Math.max(0, Math.min(1000, Number(formData.get('score') ?? 100) || 100));
  const suggestionId = String(formData.get('suggestion_id') ?? '').trim();
  const tab = String(formData.get('tab') ?? 'docs').trim();
  if (!universeId || !nodeId || !documentId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/assistido/apply_doc`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/assistido?node=${nodeId}&tab=${tab}&rl=${rl.retryAfterSec}`);

  await upsertNodeDocument({ universeId, nodeId, documentId, weight: score, note: 'assistido' });
  if (db && suggestionId) {
    await db.from('node_document_suggestions').delete().eq('id', suggestionId);
  }
  revalidatePath(`/admin/universes/${universeId}/assistido`);
}

async function applyEvidenceSuggestionAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const chunkId = String(formData.get('chunk_id') ?? '').trim();
  const suggestionId = String(formData.get('suggestion_id') ?? '').trim();
  const score = Math.max(0, Math.min(1000, Number(formData.get('score') ?? 100) || 100));
  const tab = String(formData.get('tab') ?? 'evidencias').trim();
  if (!universeId || !nodeId || !chunkId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/assistido/apply_evidence`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/assistido?node=${nodeId}&tab=${tab}&rl=${rl.retryAfterSec}`);

  await promoteChunkToEvidence({
    universeId,
    chunkId,
    nodeId,
    pinRank: Math.max(0, Math.min(1000, score)),
  });
  if (db && suggestionId) {
    await db.from('node_evidence_suggestions').delete().eq('id', suggestionId);
  }
  revalidatePath(`/admin/universes/${universeId}/assistido`);
}

async function applyQuestionSuggestionAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const question = String(formData.get('question') ?? '').trim();
  const score = Math.max(0, Math.min(1000, Number(formData.get('score') ?? 100) || 100));
  const suggestionId = String(formData.get('suggestion_id') ?? '').trim();
  const tab = String(formData.get('tab') ?? 'perguntas').trim();
  if (!universeId || !nodeId || !question) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/assistido/apply_question`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/assistido?node=${nodeId}&tab=${tab}&rl=${rl.retryAfterSec}`);

  await upsertNodeQuestion({
    universeId,
    nodeId,
    question,
    pinRank: score,
  });
  if (db && suggestionId) {
    await db.from('node_question_suggestions').delete().eq('id', suggestionId);
  }
  revalidatePath(`/admin/universes/${universeId}/assistido`);
}

export default async function AdminUniverseAssistidoPage({ params, searchParams }: AssistidoPageProps) {
  await requireEditorOrAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  const configured = Boolean(getAdminDb());
  const canWrite = await hasAdminWriteAccess();
  const tab = (sp.tab ?? 'docs') as 'docs' | 'evidencias' | 'perguntas';
  const retrySec = Number(sp.rl ?? 0);
  const message = (sp.msg ?? '').trim();
  const search = (sp.q ?? '').trim().toLowerCase();

  if (!universe) notFound();

  const [nodesRaw, docs] = await Promise.all([listNodes(id), listDocuments(id)]);
  const nodes = nodesRaw
    .filter((node) => {
      if (!search) return true;
      return (
        node.title.toLowerCase().includes(search) ||
        node.slug.toLowerCase().includes(search) ||
        (node.tags ?? []).some((tag) => tag.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => {
      const aCore = isCoreNode(a.kind, a.tags ?? []);
      const bCore = isCoreNode(b.kind, b.tags ?? []);
      if (aCore !== bCore) return aCore ? -1 : 1;
      return a.title.localeCompare(b.title);
    });

  const selectedNode = nodes.find((node) => node.id === sp.node) ?? nodes[0] ?? null;
  const selectedNodeId = selectedNode?.id ?? '';

  const [linkedDocs, linkedEvidences, linkedQuestions, docSuggestions, evidenceSuggestions, questionSuggestions] = selectedNode
    ? await Promise.all([
        listNodeDocuments(selectedNode.id),
        listNodeEvidences(selectedNode.id),
        listNodeQuestions(selectedNode.id),
        listNodeDocumentSuggestions(selectedNode.id),
        listNodeEvidenceSuggestions(selectedNode.id),
        listNodeQuestionSuggestions(selectedNode.id),
      ])
    : [[], [], [], [], [], []];

  const linkedDocIds = new Set(linkedDocs.map((item) => item.documentId));
  const linkedQuestionNormalized = new Set(linkedQuestions.map((item) => item.question.trim().toLowerCase()));

  const docById = new Map(docs.map((doc) => [doc.id, doc]));

  const db = getAdminDb();
  const chunkIds = Array.from(new Set(evidenceSuggestions.map((item) => item.chunk_id)));
  const chunkById = new Map<string, { id: string; document_id: string; page_start: number | null; page_end: number | null; text: string }>();
  if (db && chunkIds.length > 0) {
    const { data: chunksRaw } = await db
      .from('chunks')
      .select('id, document_id, page_start, page_end, text')
      .in('id', chunkIds);
    for (const row of chunksRaw ?? []) {
      chunkById.set(row.id, row);
    }
  }

  const tabItems = selectedNode
    ? [
        { href: buildHref(id, selectedNode.id, 'docs', sp.q), label: 'Docs sugeridos' },
        { href: buildHref(id, selectedNode.id, 'evidencias', sp.q), label: 'Evidencias candidatas' },
        { href: buildHref(id, selectedNode.id, 'perguntas', sp.q), label: 'Perguntas sugeridas' },
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
            { href: `/admin/universes/${id}`, label: universe.slug },
            { label: 'Curadoria Assistida' },
          ]}
          ariaLabel='Trilha admin curadoria assistida'
        />
        <SectionHeader
          title={`Curadoria Assistida: ${universe.title}`}
          description='Sugestoes deterministicas de doc↔no, evidencias candidatas e perguntas por no.'
          tag='Assistido'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${id}/checklist`}>
            Voltar ao Checklist
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/links`}>
            Curadoria manual
          </Link>
          <form action={generateUniverseSuggestionsAction}>
            <input type='hidden' name='universe_id' value={id} />
            <input type='hidden' name='mode' value='core' />
            <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
              Gerar sugestoes (nucleo)
            </button>
          </form>
          <form action={generateUniverseSuggestionsAction}>
            <input type='hidden' name='universe_id' value={id} />
            <input type='hidden' name='mode' value='all' />
            <button className='ui-button' type='submit' disabled={!configured || !canWrite} data-variant='ghost'>
              Gerar sugestoes (todos)
            </button>
          </form>
        </div>
      </Card>

      {retrySec > 0 ? (
        <Card>
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        </Card>
      ) : null}
      {message ? (
        <Card>
          <p className='muted' role='status' style={{ margin: 0 }}>
            {message}
          </p>
        </Card>
      ) : null}

      <Card className='stack'>
        <div className='toolbar-row'>
          <form method='get' className='toolbar-row'>
            <input type='hidden' name='node' value={selectedNodeId} />
            <input type='hidden' name='tab' value={tab} />
            <input
              name='q'
              defaultValue={sp.q ?? ''}
              placeholder='Buscar no por titulo/slug/tag'
              style={{ minHeight: 40, minWidth: 280 }}
            />
            <button className='ui-button' type='submit'>
              Filtrar
            </button>
          </form>
          {selectedNode ? (
            <form action={generateNodeSuggestionsAction}>
              <input type='hidden' name='universe_id' value={id} />
              <input type='hidden' name='node_id' value={selectedNode.id} />
              <input type='hidden' name='tab' value={tab} />
              <button className='ui-button' type='submit' data-variant='ghost' disabled={!configured || !canWrite}>
                Gerar deste no
              </button>
            </form>
          ) : null}
        </div>

        <div className='layout-shell' style={{ gridTemplateColumns: 'minmax(220px, 320px) 1fr' }}>
          <aside className='stack'>
            <SectionHeader title='Nos' />
            <div className='stack'>
              {nodes.map((node) => {
                const core = isCoreNode(node.kind, node.tags ?? []);
                return (
                  <Link
                    key={node.id}
                    href={buildHref(id, node.id, tab, sp.q)}
                    className='ui-button'
                    data-variant={selectedNodeId === node.id ? 'primary' : 'ghost'}
                  >
                    {node.title} {core ? '• core' : ''}
                  </Link>
                );
              })}
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
                  <div className='toolbar-row'>
                    <Carimbo>{`docs vinculados: ${linkedDocs.length}`}</Carimbo>
                    <Carimbo>{`evidencias vinculadas: ${linkedEvidences.length}`}</Carimbo>
                    <Carimbo>{`perguntas vinculadas: ${linkedQuestions.length}`}</Carimbo>
                  </div>
                </Card>

                <Segmented
                  label='Tabs da curadoria assistida'
                  items={tabItems}
                  currentPath={buildHref(id, selectedNode.id, tab, sp.q)}
                />

                {tab === 'docs' ? (
                  <Card className='stack'>
                    <SectionHeader title='Docs sugeridos' description='Score 0..1000 por heuristicas + quality score do documento.' />
                    <div className='stack'>
                      {docSuggestions.map((item) => {
                        const doc = docById.get(item.document_id);
                        const linked = linkedDocIds.has(item.document_id);
                        return (
                          <article key={item.id} className='core-node'>
                            <div className='toolbar-row'>
                              <strong>{doc?.title ?? 'Documento nao encontrado'}</strong>
                              <Carimbo>{`score:${item.score}`}</Carimbo>
                              {linked ? <Carimbo>ja vinculado</Carimbo> : null}
                            </div>
                            <p className='muted' style={{ margin: 0 }}>
                              ano: {doc?.year ?? 'n/a'} | status: {doc?.status ?? 'n/a'} | quality: {doc?.text_quality_score ?? 'n/a'}
                            </p>
                            <p className='muted' style={{ margin: 0 }}>
                              motivos: {(item.reasons ?? []).join(', ') || 'n/d'}
                            </p>
                            <div className='toolbar-row'>
                              <form action={applyDocSuggestionAction}>
                                <input type='hidden' name='universe_id' value={id} />
                                <input type='hidden' name='node_id' value={selectedNode.id} />
                                <input type='hidden' name='document_id' value={item.document_id} />
                                <input type='hidden' name='score' value={item.score} />
                                <input type='hidden' name='suggestion_id' value={item.id} />
                                <input type='hidden' name='tab' value='docs' />
                                <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                                  Vincular ao no
                                </button>
                              </form>
                            </div>
                          </article>
                        );
                      })}
                      {docSuggestions.length === 0 ? (
                        <p className='muted' style={{ margin: 0 }}>
                          Sem sugestoes de documentos para este no.
                        </p>
                      ) : null}
                    </div>
                  </Card>
                ) : null}

                {tab === 'evidencias' ? (
                  <Card className='stack'>
                    <SectionHeader title='Evidencias candidatas' description='Trechos de chunk prontos para promocao em evidencia curada.' />
                    <div className='stack'>
                      {evidenceSuggestions.map((item) => {
                        const doc = docById.get(item.document_id);
                        const chunk = chunkById.get(item.chunk_id);
                        const page = item.page_start ? `p.${item.page_start}${item.page_end && item.page_end !== item.page_start ? `-${item.page_end}` : ''}` : 's/p';
                        return (
                          <article key={item.id} className='core-node'>
                            <div className='toolbar-row'>
                              <strong>{doc?.title ?? 'Documento'}</strong>
                              <Carimbo>{`score:${item.score}`}</Carimbo>
                              <Carimbo>{page}</Carimbo>
                            </div>
                            <p style={{ margin: 0 }}>{item.snippet}</p>
                            <div className='toolbar-row'>
                              <form action={applyEvidenceSuggestionAction}>
                                <input type='hidden' name='universe_id' value={id} />
                                <input type='hidden' name='node_id' value={selectedNode.id} />
                                <input type='hidden' name='chunk_id' value={item.chunk_id} />
                                <input type='hidden' name='score' value={item.score} />
                                <input type='hidden' name='suggestion_id' value={item.id} />
                                <input type='hidden' name='tab' value='evidencias' />
                                <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                                  Promover para Evidence + Vincular
                                </button>
                              </form>
                              <Link
                                className='ui-button'
                                data-variant='ghost'
                                href={`/c/${universe.slug}/doc/${item.document_id}?p=${chunk?.page_start ?? item.page_start ?? 1}`}
                                target='_blank'
                              >
                                Abrir chunk
                              </Link>
                            </div>
                          </article>
                        );
                      })}
                      {evidenceSuggestions.length === 0 ? (
                        <p className='muted' style={{ margin: 0 }}>
                          Sem evidencias candidatas para este no.
                        </p>
                      ) : null}
                    </div>
                  </Card>
                ) : null}

                {tab === 'perguntas' ? (
                  <Card className='stack'>
                    <SectionHeader title='Perguntas sugeridas' description='Templates deterministas a partir do no e saude do universo.' />
                    <div className='stack'>
                      {questionSuggestions.map((item) => {
                        const exists = linkedQuestionNormalized.has(item.question.trim().toLowerCase());
                        return (
                          <article key={item.id} className='core-node'>
                            <div className='toolbar-row'>
                              <strong>{item.question}</strong>
                              <Carimbo>{`score:${item.score}`}</Carimbo>
                              {exists ? <Carimbo>ja existe</Carimbo> : null}
                            </div>
                            <div className='toolbar-row'>
                              <form action={applyQuestionSuggestionAction}>
                                <input type='hidden' name='universe_id' value={id} />
                                <input type='hidden' name='node_id' value={selectedNode.id} />
                                <input type='hidden' name='question' value={item.question} />
                                <input type='hidden' name='score' value={item.score} />
                                <input type='hidden' name='suggestion_id' value={item.id} />
                                <input type='hidden' name='tab' value='perguntas' />
                                <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                                  Adicionar ao no
                                </button>
                              </form>
                            </div>
                          </article>
                        );
                      })}
                      {questionSuggestions.length === 0 ? (
                        <p className='muted' style={{ margin: 0 }}>
                          Sem perguntas sugeridas para este no.
                        </p>
                      ) : null}
                    </div>
                  </Card>
                ) : null}
              </>
            ) : (
              <Card className='stack'>
                <SectionHeader title='Sem no selecionado' description='Crie ou selecione um no para iniciar a curadoria assistida.' />
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
