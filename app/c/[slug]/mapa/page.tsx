import Link from 'next/link';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { PortalsRail } from '@/components/portals/PortalsRail';
import { ShareButton } from '@/components/share/ShareButton';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { FilterRail } from '@/components/workspace/FilterRail';
import { ListKeyboardNavigator } from '@/components/workspace/ListKeyboardNavigator';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { getNodeDetail, listNodesForMap } from '@/lib/data/mapa';
import { parseDebateFilters, serializeDebateFilters } from '@/lib/filters/debateFilters';
import { parseMapFilters, serializeMapFilters } from '@/lib/filters/mapFilters';
import { parseProvasFilters, serializeProvasFilters } from '@/lib/filters/provasFilters';
import { parseTimelineFilters, serializeTimelineFilters } from '@/lib/filters/timelineFilters';
import { buildUniverseHref } from '@/lib/universeNav';

type MapaPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const NODE_W = 220;
const NODE_H = 108;
const GAP = 18;

function parseSelectedCluster(selected: string) {
  if (!selected.startsWith('cluster:')) return '';
  return selected.replace(/^cluster:/, '').trim().toLowerCase();
}

export default async function MapaPage({ params, searchParams }: MapaPageProps) {
  const { slug } = await params;
  const filters = parseMapFilters(await searchParams);
  const currentPath = buildUniverseHref(slug, 'mapa');
  const map = await listNodesForMap({ slug, filters, limit: 120 });

  const selectedClusterTag = (filters.cluster || parseSelectedCluster(filters.selected)).trim().toLowerCase();
  const selectedBySlug = filters.node ? map.nodes.find((node) => node.slug === filters.node) : null;
  const selectedById = filters.selected ? map.nodes.find((node) => node.id === filters.selected) : null;
  const selectedNode = selectedBySlug ?? selectedById;
  const selectionDetail =
    selectedClusterTag || selectedNode || filters.node || filters.selected
      ? await getNodeDetail({
          slug,
          nodeId: selectedNode?.id ?? filters.selected,
          nodeSlug: selectedNode?.slug ?? filters.node,
          clusterTag: selectedClusterTag || undefined,
        })
      : null;

  const makeUrl = (override: Partial<typeof filters>) => {
    const next = { ...filters, ...override };
    const query = serializeMapFilters(next);
    return query ? `${currentPath}?${query}` : currentPath;
  };

  const selectedId = selectionDetail
    ? selectionDetail.kind === 'cluster'
      ? selectionDetail.cluster.id
      : selectionDetail.node.id
    : selectedNode?.id ?? filters.selected;

  const columns = 3;
  const positions = new Map<string, { x: number; y: number }>();
  map.nodes.forEach((node, idx) => {
    const row = Math.floor(idx / columns);
    const col = idx % columns;
    positions.set(node.id, {
      x: col * (NODE_W + GAP) + NODE_W / 2,
      y: row * (NODE_H + GAP) + NODE_H / 2,
    });
  });
  const rows = Math.max(1, Math.ceil(map.nodes.length / columns));
  const canvasWidth = columns * NODE_W + (columns - 1) * GAP;
  const canvasHeight = rows * NODE_H + (rows - 1) * GAP;
  const showClusters = filters.view === 'clusters' && !filters.cluster;
  const inCluster = Boolean(filters.cluster);
  const listIds = showClusters ? map.clusters.map((cluster) => cluster.id) : map.nodes.map((node) => node.id);

  const provasHref = () => {
    if (!selectionDetail || selectionDetail.kind !== 'node') return buildUniverseHref(slug, 'provas');
    const base = parseProvasFilters({});
    const query = serializeProvasFilters({
      ...base,
      node: selectionDetail.node.slug,
      selected: '',
      panel: '',
      cursor: 0,
    });
    return query ? `${buildUniverseHref(slug, 'provas')}?${query}` : buildUniverseHref(slug, 'provas');
  };
  const linhaHref = () => {
    if (!selectionDetail || selectionDetail.kind !== 'node') return buildUniverseHref(slug, 'linha');
    const base = parseTimelineFilters({});
    const query = serializeTimelineFilters({
      ...base,
      node: selectionDetail.node.slug,
      selected: '',
      panel: '',
      cursor: 0,
    });
    return query ? `${buildUniverseHref(slug, 'linha')}?${query}` : buildUniverseHref(slug, 'linha');
  };
  const debateHref = () => {
    if (!selectionDetail || selectionDetail.kind !== 'node') return buildUniverseHref(slug, 'debate');
    const base = parseDebateFilters({});
    const query = serializeDebateFilters({
      ...base,
      node: selectionDetail.node.slug,
      status: 'strict_ok',
      selected: '',
      panel: '',
      cursor: 0,
    });
    return query ? `${buildUniverseHref(slug, 'debate')}?${query}` : buildUniverseHref(slug, 'debate');
  };

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Mapa' />
      <WorkspaceShell
        slug={slug}
        section='mapa'
        title={`Explorer de ${map.universeTitle}`}
        subtitle='Camadas visuais: core, clusters e entrada no cluster.'
        selectedId={selectedId}
        detailTitle='Detalhe do mapa'
        filter={
          <FilterRail>
            <form method='get' className='stack'>
              <label>
                <span>Visao</span>
                <select name='view' defaultValue={filters.view} style={{ width: '100%', minHeight: 42 }}>
                  <option value='core'>Core</option>
                  <option value='clusters'>Clusters</option>
                  <option value='all'>Todos</option>
                </select>
              </label>
              <label>
                <span>Busca</span>
                <input name='q' defaultValue={filters.q} placeholder='no, tag, resumo...' style={{ width: '100%', minHeight: 42 }} />
              </label>
              <fieldset className='stack' style={{ border: 'none', margin: 0, padding: 0 }}>
                <legend style={{ marginBottom: 6, fontWeight: 600 }}>Kind</legend>
                <div className='toolbar-row'>
                  {map.kindOptions.map((kind) => (
                    <label key={kind} className='ui-button' data-variant={filters.kind.includes(kind) ? undefined : 'ghost'}>
                      <input type='checkbox' name='kind' value={kind} defaultChecked={filters.kind.includes(kind)} style={{ marginRight: 8 }} />
                      {kind}
                    </label>
                  ))}
                </div>
              </fieldset>
              {filters.view !== 'clusters' ? (
                <label className='toolbar-row'>
                  <input type='checkbox' name='core' value='1' defaultChecked={filters.core} />
                  <span>Somente core</span>
                </label>
              ) : null}
              <label>
                <span>Tags (csv)</span>
                <input name='tags' defaultValue={filters.tags.join(',')} placeholder='ar,solo,agua...' style={{ width: '100%', minHeight: 42 }} />
              </label>
              <label>
                <span>Cobertura</span>
                <select name='coverage' defaultValue={filters.coverage} style={{ width: '100%', minHeight: 42 }}>
                  <option value=''>Todas</option>
                  <option value='low'>Precisa de curadoria</option>
                  <option value='mid'>Media</option>
                  <option value='high'>Alta</option>
                </select>
              </label>
              <input type='hidden' name='node' value={filters.node} />
              <input type='hidden' name='selected' value={filters.selected} />
              <input type='hidden' name='cluster' value={filters.cluster} />
              <div className='toolbar-row'>
                <button className='ui-button' type='submit'>
                  Aplicar
                </button>
                <Link className='ui-button' data-variant='ghost' href={currentPath}>
                  Limpar
                </Link>
                {inCluster ? (
                  <Link className='ui-button' data-variant='ghost' href={makeUrl({ cluster: '', selected: '', panel: '', node: '' })}>
                    Sair do cluster
                  </Link>
                ) : null}
              </div>
            </form>
          </FilterRail>
        }
        detail={
          selectionDetail ? (
            selectionDetail.kind === 'cluster' ? (
              <div className='stack'>
                <article className='core-node stack'>
                  <strong>{`Cluster: ${selectionDetail.cluster.label}`}</strong>
                  <p style={{ margin: 0 }}>
                    {selectionDetail.cluster.count} nos | docs {selectionDetail.cluster.docsTotal} | evidencias {selectionDetail.cluster.evidencesTotal}
                  </p>
                  <div className='toolbar-row'>
                    <Carimbo>{`tag:${selectionDetail.cluster.tag}`}</Carimbo>
                    <Carimbo>{`questions:${selectionDetail.cluster.questionsTotal}`}</Carimbo>
                  </div>
                </article>
                <article className='core-node stack'>
                  <strong>Top nos do cluster</strong>
                  {selectionDetail.cluster.topNodes.map((node) => (
                    <Link
                      key={node.id}
                      className='ui-button'
                      data-variant='ghost'
                      href={makeUrl({ cluster: selectionDetail.cluster.tag, node: node.slug, selected: node.id, panel: 'detail' })}
                    >
                      {node.title}
                    </Link>
                  ))}
                </article>
                <PortalsRail
                  universeSlug={slug}
                  variant='detail'
                  context={{
                    type: 'tag',
                    tags: [selectionDetail.cluster.tag],
                  }}
                />
              </div>
            ) : (
              <div className='stack'>
                <article className='core-node stack'>
                  <strong>{selectionDetail.node.title}</strong>
                  <p style={{ margin: 0 }}>{selectionDetail.node.summary || 'Sem resumo detalhado.'}</p>
                  <div className='toolbar-row'>
                    {selectionDetail.node.isCore ? <Carimbo>core</Carimbo> : null}
                    <Carimbo>{`coverage:${selectionDetail.node.coverageScore}`}</Carimbo>
                    {selectionDetail.node.tags.slice(0, 4).map((tag) => (
                      <Carimbo key={tag}>{tag}</Carimbo>
                    ))}
                  </div>
                </article>

                <article className='core-node stack'>
                  <strong>Cobertura</strong>
                  <div className='toolbar-row'>
                    <Carimbo>{`docs:${selectionDetail.node.docsLinkedCount}`}</Carimbo>
                    <Carimbo>{`evidencias:${selectionDetail.node.evidencesLinkedCount}`}</Carimbo>
                    <Carimbo>{`perguntas:${selectionDetail.node.questionsCount}`}</Carimbo>
                  </div>
                </article>

                <article className='core-node stack'>
                  <strong>Evidencias do no</strong>
                  {selectionDetail.linkedEvidences.slice(0, 5).map((link) => (
                    <div key={link.id} className='stack'>
                      <strong>{link.evidence?.title ?? 'Evidencia'}</strong>
                      <p style={{ margin: 0 }}>{link.evidence?.summary ?? ''}</p>
                    </div>
                  ))}
                  {selectionDetail.linkedEvidences.length === 0 ? <p className='muted' style={{ margin: 0 }}>Sem evidencias vinculadas.</p> : null}
                </article>

                <article className='core-node stack'>
                  <strong>Perguntas sugeridas</strong>
                  <div className='toolbar-row'>
                    {selectionDetail.linkedQuestions.slice(0, 5).map((item) => (
                      <Link
                        key={item.id}
                        className='ui-button'
                        data-variant='ghost'
                        href={`${buildUniverseHref(slug, 'debate')}?ask=${encodeURIComponent(item.question)}&node=${encodeURIComponent(selectionDetail.node.slug)}`}
                      >
                        {item.question}
                      </Link>
                    ))}
                  </div>
                </article>

                <article className='core-node stack'>
                  <strong>Docs vinculados</strong>
                  {selectionDetail.linkedDocs.slice(0, 5).map((doc) => (
                    <div key={doc.id} className='stack'>
                      <p style={{ margin: 0 }}>
                        <strong>{doc.document?.title ?? 'Documento'}</strong> | peso {doc.weight}
                      </p>
                      {doc.document?.id ? (
                        <Link className='ui-button' data-variant='ghost' href={`/c/${slug}/doc/${doc.document.id}`}>
                          Abrir doc
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </article>

                <div className='toolbar-row'>
                  <Link
                    className='ui-button'
                    href={provasHref()}
                    data-track-event='cta_click'
                    data-track-cta='ver_provas'
                    data-track-section='mapa_detail'
                  >
                    Ver Provas
                  </Link>
                  <Link
                    className='ui-button'
                    href={linhaHref()}
                    data-track-event='cta_click'
                    data-track-cta='ver_linha'
                    data-track-section='mapa_detail'
                  >
                    Ver Linha
                  </Link>
                  <Link
                    className='ui-button'
                    href={debateHref()}
                    data-track-event='cta_click'
                    data-track-cta='ver_debate'
                    data-track-section='mapa_detail'
                  >
                    Ver Debate
                  </Link>
                  <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'tutor')}>
                    Abrir no Tutor
                  </Link>
                  <ShareButton
                    url={`/c/${slug}/s/node/${selectionDetail.node.id}`}
                    title={selectionDetail.node.title}
                    text={selectionDetail.node.summary || selectionDetail.node.title}
                    label='Compartilhar no'
                  />
                </div>

                <PortalsRail
                  universeSlug={slug}
                  variant='detail'
                  context={{
                    type: 'node',
                    nodeSlug: selectionDetail.node.slug,
                    nodeTitle: selectionDetail.node.title,
                    tags: selectionDetail.node.tags,
                  }}
                />
              </div>
            )
          ) : null
        }
      >
        <ListKeyboardNavigator ids={listIds} selectedId={selectedId} />
        <Card className='stack'>
          <div className='toolbar-row'>
            <Carimbo>{map.source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
            <Carimbo>{`view:${filters.view}`}</Carimbo>
            {showClusters ? <Carimbo>{`clusters:${map.clusters.length}`}</Carimbo> : <Carimbo>{`nos:${map.nodes.length}`}</Carimbo>}
          </div>
          {map.totalNodes > map.nodeCap ? (
            <p className='muted' style={{ margin: 0 }}>
              Mostrando {map.nodes.length} de {map.totalNodes} nos. Use filtros para foco.
            </p>
          ) : null}
          <SectionHeader
            title='Explorer do grafo'
            description={
              showClusters
                ? 'Camada de clusters por tag/kind. Clique para entrar no cluster.'
                : inCluster
                  ? 'Camada de nos dentro do cluster selecionado.'
                  : 'Camada de nos do mapa. Selecione para abrir detalhe.'
            }
          />
          {showClusters ? (
            map.clusters.length === 0 ? (
              <EmptyState
                title='Sem clusters'
                description='Sem clusters para estes filtros.'
                variant='no-results'
                actions={[{ label: 'Limpar filtros', href: currentPath }]}
              />
            ) : (
              <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {map.clusters.map((cluster) => (
                  <article
                    key={cluster.id}
                    className='core-node stack'
                    data-testid='map-cluster'
                    data-selected={selectedId === cluster.id ? 'true' : undefined}
                  >
                    <strong>{cluster.label}</strong>
                    <p className='muted' style={{ margin: 0 }}>
                      {cluster.count} nos
                    </p>
                    <div className='toolbar-row'>
                      <Carimbo>{`docs:${cluster.docsTotal}`}</Carimbo>
                      <Carimbo>{`ev:${cluster.evidencesTotal}`}</Carimbo>
                    </div>
                    <Link
                      className='ui-button'
                      data-selected={selectedId === cluster.id ? 'true' : undefined}
                      href={makeUrl({
                        view: 'clusters',
                        cluster: cluster.tag,
                        selected: cluster.id,
                        panel: 'detail',
                        node: '',
                      })}
                    >
                      Entrar no cluster
                    </Link>
                  </article>
                ))}
              </div>
            )
          ) : map.nodes.length === 0 ? (
            <EmptyState
              title='Sem nos'
              description='Sem nos para estes filtros.'
              variant='no-results'
              actions={[{ label: 'Limpar filtros', href: currentPath }]}
            />
          ) : (
            <div className='stack' style={{ position: 'relative' }}>
              <svg width={canvasWidth} height={canvasHeight} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden='true'>
                {map.edges.map((edge) => {
                  const from = positions.get(edge.fromNodeId);
                  const to = positions.get(edge.toNodeId);
                  if (!from || !to) return null;
                  const cx = (from.x + to.x) / 2;
                  const d = `M ${from.x} ${from.y} Q ${cx} ${Math.min(from.y, to.y) - 18} ${to.x} ${to.y}`;
                  return <path key={edge.id} d={d} stroke='var(--line-1)' strokeWidth='1.4' fill='none' opacity='0.65' />;
                })}
              </svg>
              <div className='layout-shell' style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, ${NODE_W}px))`, gap: GAP }}>
                {map.nodes.map((node) => (
                  <article
                    key={node.id}
                    className='core-node'
                    style={{ minHeight: NODE_H }}
                    data-testid='map-node'
                    data-selected={selectedId === node.id ? 'true' : undefined}
                  >
                    <strong>{node.title}</strong>
                    <p className='muted' style={{ margin: 0 }}>
                      {node.summary}
                    </p>
                    <div className='toolbar-row'>
                      {node.isCore ? <Carimbo>core</Carimbo> : null}
                      {node.coverageScore < 45 ? <Carimbo>precisa</Carimbo> : null}
                      <Carimbo>{`cov:${node.coverageScore}`}</Carimbo>
                    </div>
                    <div className='toolbar-row'>
                      <Carimbo>{`d:${node.docsLinkedCount}`}</Carimbo>
                      <Carimbo>{`e:${node.evidencesLinkedCount}`}</Carimbo>
                      <Carimbo>{`q:${node.questionsCount}`}</Carimbo>
                    </div>
                    <Link
                      className='ui-button'
                      data-variant='ghost'
                      data-selected={selectedId === node.id ? 'true' : undefined}
                      href={makeUrl({ node: node.slug, selected: node.id, panel: 'detail' })}
                    >
                      Explorar no
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          )}
        </Card>
      </WorkspaceShell>

      <Card className='stack'>
        <Portais slug={slug} currentPath='mapa' title='Proximas portas' />
      </Card>
    </div>
  );
}
