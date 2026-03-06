import Link from 'next/link';
import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { revalidatePath } from 'next/cache';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { PortalsRail } from '@/components/portals/PortalsRail';
import { EvidenceSeal } from '@/components/brand/EvidenceSeal';
import { CopyCitationButton } from '@/components/provas/CopyCitationButton';
import { ShareButton } from '@/components/share/ShareButton';
import { SaveToNotebookButton } from '@/components/notes/SaveToNotebookButton';
import { AddToSharedNotebookButton } from '@/components/shared-notebooks/AddToSharedNotebookButton';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GenerateExportButton } from '@/components/export/GenerateExportButton';
import { FilterRail } from '@/components/workspace/FilterRail';
import { ListKeyboardNavigator } from '@/components/workspace/ListKeyboardNavigator';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { canWriteAdminContent, requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { addNodeEvidence } from '@/lib/data/nodeLinks';
import { getChunkDetail, getEvidenceDetail, listChunkItems, listEvidenceItems } from '@/lib/data/provas';
import { parseProvasFilters, serializeProvasFilters } from '@/lib/filters/provasFilters';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import { getUniverseMock } from '@/lib/mock/universe';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { buildUniverseHref } from '@/lib/universeNav';

type ProvasPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function clip(text: string, max = 260) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function citationFormat(docTitle: string, year: number | null, pageStart: number | null, pageEnd: number | null, text: string) {
  const yearLabel = year ? String(year) : 's.d.';
  const pageLabel =
    pageStart && pageEnd && pageStart !== pageEnd
      ? `p.${pageStart}-${pageEnd}`
      : `p.${pageStart ?? pageEnd ?? 's/p'}`;
  return `${docTitle} (${yearLabel}), ${pageLabel}: "${clip(text, 320)}"`;
}

function hasRestrictiveFilters(input: {
  q: string;
  node: string;
  tags: string[];
  relatedTo: string;
  yearFrom: number | null;
  yearTo: number | null;
}) {
  return Boolean(input.q || input.node || input.relatedTo || input.tags.length > 0 || input.yearFrom || input.yearTo);
}

function buildTestSeedData(slug: string) {
  const mock = getUniverseMock(slug);
  const universe = { id: `mock-${slug}`, title: mock.title, slug: mock.slug };
  const nodes = mock.coreNodes.map((node) => ({
    id: node.id,
    slug: node.slug ?? node.id,
    title: node.label,
    tags: node.tags ?? [],
    kind: node.type === 'conceito' ? 'core' : node.type,
  }));
  const docs = Array.from({ length: 6 }).map((_, index) => ({
    id: `${slug}-doc-${index + 1}`,
    title: `Documento Demo ${index + 1}`,
    year: 2019 + index,
  }));
  const items = nodes.slice(0, 6).map((node, index) => ({
    id: `${slug}-ev-${index + 1}`,
    kind: 'evidence' as const,
    title: `Evidencia ${index + 1} sobre ${node.title}`,
    snippet: `Trecho de evidencia para ${node.title} com contexto rastreavel e pagina definida.`,
    tags: Array.from(new Set([...(node.tags ?? []), 'seed', index % 2 === 0 ? 'saude' : 'territorio'])),
    year: docs[index % docs.length]?.year ?? null,
    pages: { start: 10 + index, end: 11 + index },
    document: docs[index % docs.length] ?? null,
    nodeIds: [node.id],
    nodeSlugs: [node.slug],
    curated: true,
    editorialStatus: 'published' as const,
  }));
  return { universe, nodes, docs, items };
}

async function saveEvidenceAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const service = getSupabaseServiceRoleClient();
  if (!service) return;

  const slug = String(formData.get('slug') ?? '').trim();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const chunkId = String(formData.get('chunk_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  const docTitle = String(formData.get('doc_title') ?? '').trim();
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  const pageStart = Number(formData.get('page_start') ?? 0) || null;

  if (!slug || !universeId || !chunkId || !documentId || !excerpt) return;
  const rl = await enforceAdminWriteLimit(session.userId, `c/${slug}/provas/save_evidence`);
  if (!rl.ok) return;

  const title = `Evidencia: ${docTitle || 'Documento'} ${pageStart ? `(p.${pageStart})` : ''}`.trim();
  const summary = clip(excerpt, 420);

  const existing = await service
    .from('evidences')
    .select('id')
    .eq('universe_id', universeId)
    .eq('chunk_id', chunkId)
    .maybeSingle();

  let evidenceId: string | null = null;
  if (existing.data?.id) {
    evidenceId = existing.data.id;
    const previous = await service.from('evidences').select('status').eq('id', evidenceId).maybeSingle();
    await service
      .from('evidences')
      .update({ node_id: nodeId || null, document_id: documentId, title, summary, curated: true, status: 'draft' })
      .eq('id', evidenceId);
    await service.from('evidence_audit_logs').insert({
      evidence_id: evidenceId,
      universe_id: universeId,
      action: 'status_change',
      from_status: previous.data?.status ?? null,
      to_status: 'draft',
      note: 'Curada manualmente em Provas',
      changed_by: session.userId,
    });
  } else {
    const inserted = await service
      .from('evidences')
      .insert({
        universe_id: universeId,
        node_id: nodeId || null,
        document_id: documentId,
        chunk_id: chunkId,
        title,
        summary,
        curated: true,
        status: 'draft',
        confidence: 0.6,
      })
      .select('id')
      .maybeSingle();
    evidenceId = inserted.data?.id ?? null;
    if (evidenceId) {
      await service.from('evidence_audit_logs').insert({
        evidence_id: evidenceId,
        universe_id: universeId,
        action: 'create',
        from_status: null,
        to_status: 'draft',
        note: 'Criada manualmente em Provas',
        changed_by: session.userId,
      });
    }
  }
  if (nodeId && evidenceId) {
    await addNodeEvidence({ universeId, nodeId, evidenceId, pinRank: 100 });
  }
  revalidatePath(buildUniverseHref(slug, 'provas'));
}

export default async function ProvasPage({ params, searchParams }: ProvasPageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, 'provas');
  const filters = parseProvasFilters(await searchParams);
  const db = getSupabaseServerClient();
  const testSeed = process.env.TEST_SEED === '1';
  const adminCanWrite = Boolean((await canWriteAdminContent()) && process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!db || testSeed) {
    if (testSeed) {
      const seed = buildTestSeedData(slug);
      const years = Array.from(new Set(seed.docs.map((doc) => doc.year).filter((year): year is number => typeof year === 'number'))).sort(
        (a, b) => b - a,
      );
      const tagPool = Array.from(new Set(seed.nodes.flatMap((node) => node.tags ?? []))).slice(0, 20);
      const selected = seed.items.find((item) => item.id === filters.selected) ?? null;
      const filtered = seed.items.filter((item) => {
        if (filters.q && !`${item.title} ${item.snippet}`.toLowerCase().includes(filters.q.toLowerCase())) return false;
        if (filters.node && !item.nodeSlugs.includes(filters.node)) return false;
        if (filters.tags.length > 0) {
          const lowered = item.tags.map((tag) => tag.toLowerCase());
          if (!filters.tags.some((tag) => lowered.includes(tag))) return false;
        }
        if (typeof filters.yearFrom === 'number' && typeof item.year === 'number' && item.year < filters.yearFrom) return false;
        if (typeof filters.yearTo === 'number' && typeof item.year === 'number' && item.year > filters.yearTo) return false;
        return true;
      });
      const listIds = filtered.map((item) => item.id);
      const makeUrl = (override: Partial<typeof filters>) => {
        const next = {
          ...filters,
          ...override,
        };
        const query = serializeProvasFilters(next);
        return query ? `${currentPath}?${query}` : currentPath;
      };
      return (
        <div className='stack'>
          <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Provas' />
        <WorkspaceShell
          slug={slug}
          section='provas'
          title={`Evidencias de ${seed.universe.title}`}
          subtitle='Sala de evidencias curadas para comparar sinais, fonte e contexto em leitura rastreavel.'
          selectedId={filters.selected}
          detailTitle='Detalhe da evidencia'
          filter={
              <FilterRail title='Eixos de prova'>
                <form method='get' className='stack'>
                  <label>
                    <span>Tipo</span>
                    <select name='type' defaultValue={filters.type} style={{ width: '100%', minHeight: 42 }}>
                      <option value='evidence'>Evidencias</option>
                    </select>
                  </label>
                {adminCanWrite ? (
                  <label>
                    <span>Status editorial</span>
                    <select name='editorial' defaultValue={filters.editorial} style={{ width: '100%', minHeight: 42 }}>
                      <option value='published'>Publicadas</option>
                      <option value='review'>Em revisao</option>
                      <option value='draft'>Rascunhos</option>
                      <option value='rejected'>Rejeitadas</option>
                      <option value='all'>Todas</option>
                    </select>
                  </label>
                ) : null}
                <label>
                  <span>Busca textual</span>
                    <input name='q' defaultValue={filters.q} placeholder='termo, frase, autor...' style={{ width: '100%', minHeight: 42 }} />
                  </label>
                  <label>
                    <span>No</span>
                    <select name='node' defaultValue={filters.node} style={{ width: '100%', minHeight: 42 }}>
                      <option value=''>Todos</option>
                      {seed.nodes.map((node) => (
                        <option key={node.id} value={node.slug}>
                          {node.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Tags (csv)</span>
                    <input name='tags' defaultValue={filters.tags.join(',')} placeholder='ex.: seed,saude' style={{ width: '100%', minHeight: 42 }} />
                  </label>
                  <small className='muted'>Sugestoes: {tagPool.join(', ') || 'n/d'}</small>
                  <input type='hidden' name='selected' value={filters.selected} />
                  <div className='toolbar-row'>
                    <button className='ui-button' type='submit'>
                      Aplicar
                    </button>
                    <Link className='ui-button' data-variant='ghost' href={currentPath}>
                      Limpar
                    </Link>
                  </div>
                  {years.length > 0 ? (
                    <p className='muted' style={{ margin: 0 }}>
                      Anos disponiveis: {years.join(', ')}
                    </p>
                  ) : null}
                </form>
              </FilterRail>
            }
            detail={
              selected ? (
                <div className='stack'>
                  <article className='core-node'>
                    <strong>{selected.title}</strong>
                    <p style={{ margin: 0 }}>{selected.snippet}</p>
                  </article>
                </div>
              ) : null
            }
          >
            <ListKeyboardNavigator ids={listIds} selectedId={filters.selected} />
            <Card className='stack'>
              <SectionHeader title='Colecao de evidencias' description='Selecione um item para abrir contexto, fonte e portas relacionadas.' />
              <div className='core-grid'>
                {filtered.map((item) => (
                  <article key={item.id} className='core-node' data-testid='evidence-card' data-selected={filters.selected === item.id ? 'true' : undefined}>
                    <CardHeader
                      title={item.title}
                      typeLabel='evidence'
                      meta={`${item.document?.title ?? 'Documento n/d'} ${item.year ? `(${item.year})` : ''} | ${item.editorialStatus}`}
                    />
                    <p style={{ margin: 0 }}>{clip(item.snippet, 180)}</p>
                    <div className='toolbar-row'>
                      <Link
                        className='ui-button'
                        data-variant='ghost'
                        data-selected={filters.selected === item.id ? 'true' : undefined}
                        href={makeUrl({ selected: item.id, panel: 'detail' })}
                        data-track-event='evidence_click'
                        data-track-cta='open_detail'
                        data-track-section='provas_list'
                      >
                        Ver detalhe
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
              {filtered.length === 0 ? (
                <EmptyState
                  title='Sem resultados'
                  description='Nenhuma prova cruzou os filtros atuais. Ajuste no, tags ou periodo para retomar a trilha.'
                  variant='no-results'
                  actions={[{ label: 'Limpar filtros', href: currentPath }]}
                />
              ) : null}
            </Card>
          </WorkspaceShell>
        </div>
      );
    }

    return (
      <div className='stack'>
        <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Provas' />
        <Card className='stack'>
          <SectionHeader title='Provas' description='Banco nao configurado.' />
        </Card>
      </div>
    );
  }

  const { data: universe } = await db.from('universes').select('id, title, slug').eq('slug', slug).maybeSingle();
  if (!universe) {
    return (
      <div className='stack'>
        <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Provas' />
        <Card className='stack'>
          <SectionHeader title='Provas' description='Universo nao encontrado.' />
        </Card>
      </div>
    );
  }

  const [nodesRaw, docsRaw] = await Promise.all([
    db.from('nodes').select('id, slug, title, tags, kind').eq('universe_id', universe.id).order('title', { ascending: true }),
    db.from('documents').select('id, title, year').eq('universe_id', universe.id).eq('is_deleted', false),
  ]);
  const nodes = nodesRaw.data ?? [];
  const docs = docsRaw.data ?? [];
  const years = Array.from(new Set(docs.map((doc) => doc.year).filter((year): year is number => typeof year === 'number'))).sort(
    (a, b) => b - a,
  );
  const tagPool = Array.from(new Set(nodes.flatMap((node) => node.tags ?? []))).slice(0, 20);

  const limit = 18;
  const cursor = filters.cursor;
  const evidenceList = await listEvidenceItems({
    universeId: universe.id,
    filters,
    limit,
    cursor,
  });
  const chunkList =
    filters.type === 'chunk'
      ? await listChunkItems({ universeId: universe.id, filters, limit, cursor })
      : { items: [], nextCursor: null, total: 0 };

  const restrictive = hasRestrictiveFilters(filters);
  const shouldShowFallback = filters.type === 'evidence' && !restrictive && evidenceList.items.length < 6;
  const fallbackChunks = shouldShowFallback
    ? await listChunkItems({
        universeId: universe.id,
        filters: { ...filters, type: 'chunk', q: filters.q },
        limit: 8,
        cursor: 0,
      })
    : { items: [], nextCursor: null, total: 0 };

  const selectedDetail = filters.selected
    ? filters.type === 'chunk'
      ? await getChunkDetail(filters.selected)
      : await getEvidenceDetail(filters.selected)
    : null;
  const makeUrl = (override: Partial<typeof filters>) => {
    const next = {
      ...filters,
      ...override,
    };
    const query = serializeProvasFilters(next);
    return query ? `${currentPath}?${query}` : currentPath;
  };
  const currentShareUrl = makeUrl({});

  const selectedNodeId = filters.node ? nodes.find((node) => node.slug === filters.node)?.id ?? '' : '';
  const listItems = filters.type === 'chunk' ? chunkList.items : evidenceList.items;
  const listIds = listItems.map((item) => item.id);

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Provas' />
      <WorkspaceShell
        slug={slug}
        section='provas'
        title={`Evidencias de ${universe.title}`}
        subtitle='Evidencias primeiro: curadoria publica, trechos tecnicos como apoio e continuidade por portais.'
        selectedId={filters.selected}
        detailTitle='Detalhe da evidencia'
        filter={
          <FilterRail title='Eixos de prova'>
            <form method='get' className='stack'>
              <label>
                <span>Tipo</span>
                <select name='type' defaultValue={filters.type} style={{ width: '100%', minHeight: 42 }}>
                  <option value='evidence'>Evidencias</option>
                  <option value='chunk'>Trechos</option>
                </select>
              </label>
              {adminCanWrite ? (
                <label>
                  <span>Status editorial</span>
                  <select name='editorial' defaultValue={filters.editorial} style={{ width: '100%', minHeight: 42 }}>
                    <option value='published'>Publicadas</option>
                    <option value='review'>Em revisao</option>
                    <option value='draft'>Rascunhos</option>
                    <option value='rejected'>Rejeitadas</option>
                    <option value='all'>Todas</option>
                  </select>
                </label>
              ) : null}
              <label>
                <span>Busca textual</span>
                <input name='q' defaultValue={filters.q} placeholder='termo, frase, autor...' style={{ width: '100%', minHeight: 42 }} />
              </label>
              <label>
                <span>No</span>
                <select name='node' defaultValue={filters.node} style={{ width: '100%', minHeight: 42 }}>
                  <option value=''>Todos</option>
                  {nodes
                    .sort((a, b) => {
                      if (a.kind === 'core' && b.kind !== 'core') return -1;
                      if (a.kind !== 'core' && b.kind === 'core') return 1;
                      return a.title.localeCompare(b.title);
                    })
                    .map((node) => (
                      <option key={node.id} value={node.slug}>
                        {node.title}
                      </option>
                    ))}
                </select>
              </label>
              <div className='layout-shell' style={{ gridTemplateColumns: '1fr 1fr' }}>
                <label>
                  <span>De</span>
                  <input name='yearFrom' type='number' min='1900' max='2100' defaultValue={filters.yearFrom ?? ''} style={{ width: '100%', minHeight: 42 }} />
                </label>
                <label>
                  <span>Ate</span>
                  <input name='yearTo' type='number' min='1900' max='2100' defaultValue={filters.yearTo ?? ''} style={{ width: '100%', minHeight: 42 }} />
                </label>
              </div>
              <label>
                <span>Tags (csv)</span>
                <input name='tags' defaultValue={filters.tags.join(',')} placeholder='ex.: core,curada,2024' style={{ width: '100%', minHeight: 42 }} />
              </label>
              <small className='muted'>Sugestoes: {tagPool.join(', ') || 'n/d'}</small>
              <input type='hidden' name='selected' value={filters.selected} />
              <div className='toolbar-row'>
                <button className='ui-button' type='submit'>
                  Aplicar
                </button>
                <Link className='ui-button' data-variant='ghost' href={currentPath}>
                  Limpar
                </Link>
              </div>
              {years.length > 0 ? (
                <p className='muted' style={{ margin: 0 }}>
                  Anos disponiveis: {years.join(', ')}
                </p>
              ) : null}
            </form>
          </FilterRail>
        }
        detail={
          selectedDetail ? (
            <div className='stack'>
              <article className='core-node'>
                <strong>{selectedDetail.title}</strong>
                <p style={{ margin: 0 }}>{selectedDetail.snippet}</p>
                <p className='muted' style={{ margin: 0 }}>
                  {selectedDetail.document?.title ?? 'Documento n/d'} {selectedDetail.year ? `(${selectedDetail.year})` : ''} |{' '}
                  {selectedDetail.pages.start ? `p.${selectedDetail.pages.start}` : 's/p'}
                  {selectedDetail.pages.end && selectedDetail.pages.end !== selectedDetail.pages.start ? `-${selectedDetail.pages.end}` : ''}
                </p>
                <div className='toolbar-row'>
                  {selectedDetail.document?.id ? (
                    <PrefetchLink
                      className='ui-button'
                      href={`/c/${slug}/doc/${selectedDetail.document.id}${selectedDetail.pages.start ? `?p=${selectedDetail.pages.start}` : ''}`}
                    >
                      Ver no Documento
                    </PrefetchLink>
                  ) : null}
                  <CopyCitationButton
                    citation={citationFormat(
                      selectedDetail.document?.title ?? 'Documento',
                      selectedDetail.year,
                      selectedDetail.pages.start,
                      selectedDetail.pages.end,
                      selectedDetail.snippet,
                    )}
                  />
                  {selectedDetail.kind === 'evidence' ? (
                    <ShareButton
                      url={`/c/${slug}/s/evidence/${selectedDetail.id}`}
                      title={selectedDetail.title}
                      text={selectedDetail.snippet}
                    />
                  ) : (
                    <CopyCitationButton citation={currentShareUrl} label='Copiar link' />
                  )}
                  <SaveToNotebookButton
                    universeSlug={slug}
                    kind='highlight'
                    title={selectedDetail.title}
                    text={selectedDetail.snippet}
                    sourceType={selectedDetail.kind === 'evidence' ? 'evidence' : 'chunk'}
                    sourceId={selectedDetail.id}
                    sourceMeta={{
                      docId: selectedDetail.document?.id ?? null,
                      pageStart: selectedDetail.pages.start,
                      pageEnd: selectedDetail.pages.end,
                      nodeSlug: selectedDetail.nodeSlugs[0] ?? null,
                    }}
                    tags={selectedDetail.tags}
                    label='Salvar trecho'
                    compact
                  />
                  <AddToSharedNotebookButton
                    universeSlug={slug}
                    sourceType={selectedDetail.kind === 'evidence' ? 'evidence' : 'chunk'}
                    sourceId={selectedDetail.id}
                    title={selectedDetail.title}
                    text={selectedDetail.snippet}
                    sourceMeta={{
                      docId: selectedDetail.document?.id ?? null,
                      pageStart: selectedDetail.pages.start,
                      pageEnd: selectedDetail.pages.end,
                      nodeSlug: selectedDetail.nodeSlugs[0] ?? null,
                      originalSourceType: selectedDetail.kind === 'evidence' ? 'evidence' : 'chunk',
                      originalSourceId: selectedDetail.id,
                      linkToApp: selectedDetail.document?.id
                        ? `/c/${slug}/doc/${selectedDetail.document.id}${selectedDetail.pages.start ? `?p=${selectedDetail.pages.start}` : ''}`
                        : `/c/${slug}/provas?selected=${selectedDetail.id}&panel=detail`,
                    }}
                    tags={selectedDetail.tags}
                    compact
                  />
                  {adminCanWrite ? (
                    <div className='focus-only'>
                      <GenerateExportButton
                        endpoint='/api/admin/export/clip'
                        label='Exportar trecho'
                        payload={{
                          universeId: universe.id,
                          sourceType: selectedDetail.kind === 'evidence' ? 'evidence' : 'doc_cite',
                          sourceId: selectedDetail.id,
                          title: selectedDetail.title,
                          snippet: selectedDetail.snippet,
                          docId: selectedDetail.document?.id ?? null,
                          pageStart: selectedDetail.pages.start,
                          pageEnd: selectedDetail.pages.end,
                          isPublic: false,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </article>

              <article className='core-node'>
                <strong>Tags</strong>
                <div className='toolbar-row'>
                  {selectedDetail.tags.map((tag) => (
                    <Link key={tag} className='ui-button' data-variant='ghost' href={makeUrl({ tags: [tag], selected: '' })}>
                      {tag}
                    </Link>
                  ))}
                </div>
              </article>

              <article className='core-node stack provas-related-block'>
                <strong>Relacionados</strong>
                {selectedDetail.related.map((item) => (
                  <Link
                    key={item.id}
                    className='ui-button'
                    data-variant='ghost'
                    data-selected={filters.selected === item.id ? 'true' : undefined}
                    href={makeUrl({ selected: item.id, panel: 'detail', type: item.kind })}
                  >
                    {item.title}
                  </Link>
                ))}
                {selectedDetail.related.length === 0 ? <p className='muted' style={{ margin: 0 }}>Sem relacionados por enquanto.</p> : null}
              </article>

              <div className='provas-portals-block'>
                <PortalsRail
                  universeSlug={slug}
                  variant='detail'
                  context={
                    selectedDetail.nodeSlugs[0]
                      ? {
                          type: 'node',
                          nodeSlug: selectedDetail.nodeSlugs[0],
                          tags: selectedDetail.tags,
                          docId: selectedDetail.document?.id ?? '',
                        }
                      : {
                          type: 'tag',
                          tags: selectedDetail.tags,
                          docId: selectedDetail.document?.id ?? '',
                        }
                  }
                />
              </div>
            </div>
          ) : null
        }
      >
        <div className='stack'>
          <ListKeyboardNavigator ids={listIds} selectedId={filters.selected} />
          <Card className='stack'>
            <SectionHeader
              title={filters.type === 'chunk' ? 'Trechos tecnicos' : 'Evidencias curadas'}
              description='Abra um item para ver contexto documental, relacoes e compartilhamento.'
            />
            <div className='toolbar-row'>
              <Carimbo>{`tipo:${filters.type}`}</Carimbo>
              <Carimbo>{`editorial:${filters.editorial}`}</Carimbo>
              <Carimbo>{`itens:${listItems.length}`}</Carimbo>
            </div>
            <div className='core-grid'>
              {listItems.map((item) => (
                <article
                  key={item.id}
                  className='core-node'
                  data-testid='evidence-card'
                  data-selected={filters.selected === item.id ? 'true' : undefined}
                >
                  <CardHeader
                    title={item.title}
                    typeLabel={item.kind === 'evidence' ? 'evidence' : 'chunk'}
                    meta={`${item.document?.title ?? 'Documento n/d'} ${item.year ? `(${item.year})` : ''} | ${
                      item.pages.start ? `p.${item.pages.start}` : 's/p'
                    } | ${item.editorialStatus}`}
                  />
                  {item.kind === 'evidence' ? (
                    <div className='toolbar-row'>
                      <EvidenceSeal kind='proof' />
                      {item.editorialStatus === 'draft' ? <EvidenceSeal kind='draft' /> : null}
                      {item.editorialStatus === 'review' ? <EvidenceSeal kind='review' /> : null}
                      {item.editorialStatus === 'published' ? <EvidenceSeal kind='published' /> : null}
                    </div>
                  ) : null}
                  <p style={{ margin: 0 }}>{clip(item.snippet, 180)}</p>
                  <div className='toolbar-row'>
                    <Link
                      className='ui-button'
                      data-variant='ghost'
                      data-selected={filters.selected === item.id ? 'true' : undefined}
                      href={makeUrl({ selected: item.id, panel: 'detail' })}
                      data-track-event='evidence_click'
                      data-track-cta='open_detail'
                      data-track-section='provas_list'
                    >
                      Ver detalhe
                    </Link>
                    {item.tags.slice(0, 2).map((tag) => (
                      <Link key={`${item.id}-${tag}`} className='ui-button' data-variant='ghost' href={makeUrl({ tags: [tag], selected: '' })}>
                        {tag}
                      </Link>
                    ))}
                    {item.kind === 'chunk' ? (
                      <form action={saveEvidenceAction}>
                        <input type='hidden' name='slug' value={slug} />
                        <input type='hidden' name='universe_id' value={universe.id} />
                        <input type='hidden' name='chunk_id' value={item.id} />
                        <input type='hidden' name='document_id' value={item.document?.id ?? ''} />
                        <input type='hidden' name='node_id' value={selectedNodeId} />
                        <input type='hidden' name='doc_title' value={item.document?.title ?? ''} />
                        <input type='hidden' name='page_start' value={item.pages.start ?? ''} />
                        <input type='hidden' name='page_end' value={item.pages.end ?? ''} />
                        <input type='hidden' name='excerpt' value={item.snippet} />
                        <button className='ui-button' type='submit' disabled={!adminCanWrite}>
                          Curar
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            {listItems.length === 0 ? (
              <EmptyState
                title='Sem resultados'
                description='Nenhuma prova corresponde ao recorte atual. Reabra o filtro ou volte para um no core.'
                variant='no-results'
                actions={[{ label: 'Limpar filtros', href: currentPath }]}
              />
            ) : null}
            {(filters.type === 'chunk' ? chunkList.nextCursor : evidenceList.nextCursor) !== null ? (
              <Link
                className='ui-button'
                href={makeUrl({ cursor: (filters.type === 'chunk' ? chunkList.nextCursor : evidenceList.nextCursor) ?? 0 })}
              >
                Carregar mais
              </Link>
            ) : null}
          </Card>

          {shouldShowFallback ? (
            <Card className='stack'>
              <SectionHeader
                title='Trechos relevantes (fallback)'
                description='Ainda ha baixa curadoria publicada neste recorte; use estes trechos para triagem investigativa.'
              />
              <div className='core-grid'>
                {fallbackChunks.items.map((chunk) => (
                  <article key={chunk.id} className='core-node'>
                    <strong>{chunk.title}</strong>
                    <p style={{ margin: 0 }}>{clip(chunk.snippet, 180)}</p>
                    <Link className='ui-button' data-variant='ghost' href={makeUrl({ selected: chunk.id, panel: 'detail', type: 'chunk' })}>
                      Abrir trecho
                    </Link>
                  </article>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </WorkspaceShell>

      <Card className='stack'>
        <Portais slug={slug} currentPath='provas' title='Proximas portas' />
      </Card>
    </div>
  );
}
