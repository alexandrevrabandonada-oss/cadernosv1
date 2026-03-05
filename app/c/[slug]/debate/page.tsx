import Link from 'next/link';
import { DebatePanel } from '@/components/debate/DebatePanel';
import { ThreadDetailActions } from '@/components/debate/ThreadDetailActions';
import { PortalsRail } from '@/components/portals/PortalsRail';
import { ConfidenceSeal } from '@/components/brand/ConfidenceSeal';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { FilterRail } from '@/components/workspace/FilterRail';
import { ListKeyboardNavigator } from '@/components/workspace/ListKeyboardNavigator';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { getThreadDetail, listThreads } from '@/lib/data/debate';
import { parseDebateFilters, serializeDebateFilters } from '@/lib/filters/debateFilters';
import { parseProvasFilters, serializeProvasFilters } from '@/lib/filters/provasFilters';
import { applyLens } from '@/lib/lens/applyLens';
import { buildUniverseHref } from '@/lib/universeNav';

type DebatePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function dateLabel(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

export default async function DebatePage({ params, searchParams }: DebatePageProps) {
  const { slug } = await params;
  const rawSearch = await searchParams;
  const filters = parseDebateFilters(rawSearch);
  const askFromParam = Array.isArray(rawSearch.ask) ? rawSearch.ask[0] ?? '' : (rawSearch.ask ?? '');
  const currentPath = buildUniverseHref(slug, 'debate');

  const list = await listThreads({
    slug,
    filters,
    limit: 14,
    cursor: filters.cursor,
  });

  if (!list) {
    return (
      <div className='stack'>
        <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Debate' />
        <Card className='stack'>
          <SectionHeader title='Debate' description='Universo indisponivel para debate no momento.' />
        </Card>
      </div>
    );
  }

  const selectedDetail = filters.selected ? await getThreadDetail(slug, filters.selected) : null;
  const lensSections = selectedDetail
    ? applyLens({
        lens: filters.lens,
        answer: selectedDetail.thread.answer,
        citationsCount: selectedDetail.citations.length,
      })
    : [];

  const makeUrl = (override: Partial<typeof filters>) => {
    const next = { ...filters, ...override };
    const query = serializeDebateFilters(next);
    return query ? `${currentPath}?${query}` : currentPath;
  };

  const getProvasHref = () => {
    const provasPath = buildUniverseHref(slug, 'provas');
    if (!selectedDetail) return provasPath;
    const provasFilters = parseProvasFilters({});
    const year = Number(selectedDetail.thread.createdAt.slice(0, 4));
    const query = serializeProvasFilters({
      ...provasFilters,
      type: 'evidence',
      node: selectedDetail.thread.node?.slug ?? '',
      relatedTo: selectedDetail.dominantDocumentId ?? '',
      yearFrom: Number.isFinite(year) ? year : null,
      yearTo: Number.isFinite(year) ? year : null,
      selected: '',
      panel: '',
      cursor: 0,
    });
    return query ? `${provasPath}?${query}` : provasPath;
  };

  const firstCitation = selectedDetail?.citations[0] ?? null;
  const firstEvidenceHref =
    firstCitation && selectedDetail
      ? `/c/${slug}/doc/${firstCitation.docId}?p=${firstCitation.pageStart ?? firstCitation.pageEnd ?? ''}&thread=${selectedDetail.thread.id}&cite=${firstCitation.citationId}`
      : null;

  const currentShareUrl = makeUrl({});
  const legacyQuickAsk =
    !askFromParam &&
    !filters.selected &&
    filters.cursor === 0 &&
    filters.kind === 'all' &&
    filters.status === 'all' &&
    filters.yearFrom === null &&
    filters.yearTo === null &&
    filters.q.length >= 8;
  const initialQuestion = askFromParam || (legacyQuickAsk ? filters.q : '');
  const threadIds = list.items.map((item) => item.id);

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Debate' />
      <WorkspaceShell
        slug={slug}
        section='debate'
        title={`Debate de ${list.universeTitle}`}
        subtitle='Perguntas vivas, conflito de interpretacoes e resposta com lastro documental.'
        selectedId={filters.selected}
        detailTitle='Detalhe da thread'
        filter={
          <FilterRail title='Lentes e recortes'>
            <form method='get' className='stack'>
              <label>
                <span>Lente</span>
                <select name='lens' defaultValue={filters.lens} style={{ width: '100%', minHeight: 42 }} data-testid='lens-toggle'>
                  <option value='default'>Default</option>
                  <option value='worker'>Trabalhador</option>
                  <option value='resident'>Morador</option>
                  <option value='researcher'>Pesquisa</option>
                  <option value='policy'>Politica</option>
                </select>
              </label>
              <label>
                <span>No</span>
                <select name='node' defaultValue={filters.node} style={{ width: '100%', minHeight: 42 }}>
                  <option value=''>Todos</option>
                  {list.nodes
                    .slice()
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
              <label>
                <span>Status</span>
                <select name='status' defaultValue={filters.status} style={{ width: '100%', minHeight: 42 }}>
                  <option value='all'>Todos</option>
                  <option value='strict_ok'>Conclusivo</option>
                  <option value='insufficient'>Insuficiente</option>
                </select>
              </label>
              <label>
                <span>Confianca</span>
                <select name='confidence' defaultValue={filters.confidence} style={{ width: '100%', minHeight: 42 }}>
                  <option value='all'>Todas</option>
                  <option value='forte'>Forte</option>
                  <option value='media'>Media</option>
                  <option value='fraca'>Fraca</option>
                </select>
              </label>
              <label>
                <span>Tipo</span>
                <select name='kind' defaultValue={filters.kind} style={{ width: '100%', minHeight: 42 }}>
                  <option value='all'>Todos</option>
                  <option value='default'>Perguntas</option>
                  <option value='guided'>Guiadas</option>
                  <option value='tutor_chat'>Tutor chat</option>
                </select>
              </label>
              <label>
                <span>Busca</span>
                <input name='q' defaultValue={filters.q} placeholder='termo da pergunta ou resposta...' style={{ width: '100%', minHeight: 42 }} />
              </label>
              <div className='layout-shell' style={{ gridTemplateColumns: '1fr 1fr' }}>
                <label>
                  <span>De (ano)</span>
                  <input name='yearFrom' type='number' min='1900' max='2100' defaultValue={filters.yearFrom ?? ''} style={{ width: '100%', minHeight: 42 }} />
                </label>
                <label>
                  <span>Ate (ano)</span>
                  <input name='yearTo' type='number' min='1900' max='2100' defaultValue={filters.yearTo ?? ''} style={{ width: '100%', minHeight: 42 }} />
                </label>
              </div>
              <input type='hidden' name='selected' value={filters.selected} />
              <div className='toolbar-row'>
                <button className='ui-button' type='submit'>
                  Aplicar
                </button>
                <Link className='ui-button' data-variant='ghost' href={currentPath}>
                  Limpar
                </Link>
              </div>
            </form>
          </FilterRail>
        }
        detail={
          selectedDetail ? (
            <div className='stack'>
              <article className='core-node stack'>
                <strong>{selectedDetail.thread.question}</strong>
                <p className='muted' style={{ margin: 0 }}>
                  {dateLabel(selectedDetail.thread.createdAt)} | {selectedDetail.thread.source} | {selectedDetail.thread.mode}
                </p>
                <div className='toolbar-row'>
                  {selectedDetail.thread.confidenceLabel ? (
                    <>
                      <Carimbo>{`confianca:${selectedDetail.thread.confidenceLabel}`}</Carimbo>
                      <ConfidenceSeal kind={selectedDetail.thread.confidenceLabel as 'forte' | 'media' | 'fraca'} />
                    </>
                  ) : (
                    <Carimbo>{`confianca:n/d`}</Carimbo>
                  )}
                  {typeof selectedDetail.thread.confidenceScore === 'number' ? (
                    <Carimbo>{`${selectedDetail.thread.confidenceScore}/100`}</Carimbo>
                  ) : null}
                  <Carimbo>{`docs:${selectedDetail.thread.docsDistinct ?? selectedDetail.thread.docsUsed ?? 0}`}</Carimbo>
                  <Carimbo>{`citacoes:${selectedDetail.citations.length}`}</Carimbo>
                </div>
                {selectedDetail.thread.node ? (
                  <div className='toolbar-row'>
                    <p className='muted' style={{ margin: 0 }}>
                      No: {selectedDetail.thread.node.title}
                    </p>
                    <Link
                      className='ui-button'
                      data-variant='ghost'
                      href={`${buildUniverseHref(slug, 'mapa')}?node=${encodeURIComponent(selectedDetail.thread.node.slug)}&panel=detail`}
                    >
                      Ver no mapa
                    </Link>
                  </div>
                ) : null}
              </article>

              <article className='core-node stack'>
                <strong>Resposta ({filters.lens})</strong>
                {lensSections.map((section) => (
                  <div key={section.title} className='stack'>
                    <strong>{section.title}</strong>
                    {section.lines.map((line, index) => (
                      <p key={`${section.title}-${index}`} style={{ margin: 0 }}>
                        {line}
                      </p>
                    ))}
                  </div>
                ))}
                {selectedDetail.thread.insufficientReason ? (
                  <p className='muted' style={{ margin: 0 }}>
                    Limite: {selectedDetail.thread.insufficientReason}
                  </p>
                ) : null}
              </article>

              {selectedDetail.thread.limitations.length > 0 ? (
                <article className='core-node stack'>
                  <strong>Limitacoes</strong>
                  {selectedDetail.thread.limitations.slice(0, 4).map((item, index) => (
                    <p key={`thread-limit-${index}`} className='muted' style={{ margin: 0 }}>
                      - {item}
                    </p>
                  ))}
                </article>
              ) : null}

              {selectedDetail.thread.divergenceFlag ? (
                <article className='core-node stack'>
                  <strong>Possivel divergencia entre fontes</strong>
                  <ConfidenceSeal kind='divergencia' />
                  <p className='muted' style={{ margin: 0 }}>
                    {selectedDetail.thread.divergenceSummary ??
                      'Ha sinais de resultados divergentes ou inconclusivos entre os documentos usados.'}
                  </p>
                </article>
              ) : null}

              <article className='core-node stack'>
                <strong>Evidencias ({selectedDetail.citations.length})</strong>
                {selectedDetail.citations.slice(0, 5).map((citation) => (
                  <div key={citation.citationId} className='stack'>
                    <p style={{ margin: 0 }}>
                      <strong>
                        {citation.docTitle} {citation.year ? `(${citation.year})` : ''}
                      </strong>
                    </p>
                    <p className='muted' style={{ margin: 0 }}>
                      p.{citation.pageStart ?? citation.pageEnd ?? 's/p'}
                      {citation.pageEnd && citation.pageEnd !== citation.pageStart ? `-${citation.pageEnd}` : ''}
                    </p>
                    <p style={{ margin: 0 }}>{citation.quote}</p>
                  </div>
                ))}
                {selectedDetail.citations.length === 0 ? (
                  <p className='muted' style={{ margin: 0 }}>
                    Thread sem citacoes persistidas.
                  </p>
                ) : null}
              </article>

              <ThreadDetailActions
                slug={slug}
                universeId={list.universeId}
                threadId={selectedDetail.thread.id}
                nodeSlug={selectedDetail.thread.node?.slug ?? ''}
                provasHref={getProvasHref()}
                firstEvidenceHref={firstEvidenceHref}
                citations={selectedDetail.citations}
                currentUrl={currentShareUrl}
                shareUrl={`/c/${slug}/s/thread/${selectedDetail.thread.id}`}
              />

              <PortalsRail
                universeSlug={slug}
                variant='detail'
                context={{
                  type: 'thread',
                  nodeSlug: selectedDetail.thread.node?.slug ?? '',
                  docId: selectedDetail.dominantDocumentId ?? '',
                  threadId: selectedDetail.thread.id,
                }}
              />

              <article className='core-node stack'>
                <strong>Relacionadas</strong>
                {selectedDetail.related.map((item) => (
                  <Link key={item.id} className='ui-button' data-variant='ghost' href={makeUrl({ selected: item.id, panel: 'detail' })}>
                    {item.question}
                  </Link>
                ))}
                {selectedDetail.related.length === 0 ? <p className='muted' style={{ margin: 0 }}>Sem relacionadas por enquanto.</p> : null}
              </article>
            </div>
          ) : null
        }
      >
        <div className='stack'>
          <ListKeyboardNavigator ids={threadIds} selectedId={filters.selected} />
          <Card className='stack'>
            <div className='toolbar-row'>
              <Carimbo>{`threads:${list.items.length}`}</Carimbo>
              <Carimbo>{`lente:${filters.lens}`}</Carimbo>
            </div>
            <SectionHeader title='Inbox de QAs' description='Selecione uma thread para abrir detalhes, evidencias e acoes.' />
            <div className='core-grid'>
              {list.items.map((item) => (
                <article
                  key={item.id}
                  className='core-node stack'
                  data-testid='thread-item'
                  data-selected={filters.selected === item.id ? 'true' : undefined}
                >
                  <CardHeader title={item.question} typeLabel={item.mode} meta={dateLabel(item.createdAt)} />
                  <p style={{ margin: 0 }}>{item.answerPreview}</p>
                  <div className='toolbar-row'>
                    <Carimbo>{item.mode}</Carimbo>
                    <Carimbo>{item.source}</Carimbo>
                    {typeof item.docsUsed === 'number' ? <Carimbo>{`docs:${item.docsUsed}`}</Carimbo> : null}
                    {typeof item.chunksUsed === 'number' ? <Carimbo>{`chunks:${item.chunksUsed}`}</Carimbo> : null}
                    {item.confidenceLabel ? <Carimbo>{`conf:${item.confidenceLabel}`}</Carimbo> : null}
                    {item.confidenceLabel ? <ConfidenceSeal kind={item.confidenceLabel as 'forte' | 'media' | 'fraca'} /> : null}
                    {item.divergenceFlag ? <Carimbo variant='alert'>divergencia</Carimbo> : null}
                  </div>
                  <Link
                    className='ui-button'
                    data-variant='ghost'
                    data-selected={filters.selected === item.id ? 'true' : undefined}
                    href={makeUrl({ selected: item.id, panel: 'detail' })}
                  >
                    Ver detalhe
                  </Link>
                </article>
              ))}
            </div>
            {list.items.length === 0 ? (
              <EmptyState
                title='Sem threads'
                description='Nenhuma conversa apareceu neste recorte. Tente ampliar periodo, lente ou no.'
                variant='no-results'
                actions={[{ label: 'Limpar filtros', href: currentPath }]}
              />
            ) : null}
            {list.nextCursor !== null ? (
              <Link className='ui-button' href={makeUrl({ cursor: list.nextCursor })}>
                Carregar mais
              </Link>
            ) : null}
          </Card>

          <DebatePanel
            slug={slug}
            universeId={list.universeId}
            recent={list.items.map((item) => ({ id: item.id, question: item.question, createdAt: item.createdAt }))}
            initialQuestion={initialQuestion}
            initialNodeSlug={filters.node}
            showRecent={false}
          />
        </div>
      </WorkspaceShell>

      <Card className='stack'>
        <Portais slug={slug} currentPath='debate' title='Proximas portas' />
      </Card>
    </div>
  );
}
