import Link from 'next/link';
import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { PortalsRail } from '@/components/portals/PortalsRail';
import { ShareButton } from '@/components/share/ShareButton';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { FilterRail } from '@/components/workspace/FilterRail';
import { ListKeyboardNavigator } from '@/components/workspace/ListKeyboardNavigator';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { getTimelineDetail, listTimelineItems } from '@/lib/data/timeline';
import { parseProvasFilters, serializeProvasFilters } from '@/lib/filters/provasFilters';
import { parseTimelineFilters, serializeTimelineFilters } from '@/lib/filters/timelineFilters';
import { buildUniverseHref } from '@/lib/universeNav';

type LinhaPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DEFAULT_KINDS = ['event', 'law', 'report', 'news', 'other'];

function dateLabel(value: string | null) {
  if (!value) return 'Sem data';
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

export default async function LinhaPage({ params, searchParams }: LinhaPageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, 'linha');
  const filters = parseTimelineFilters(await searchParams);
  const limit = 16;
  const timeline = await listTimelineItems({
    slug,
    filters,
    limit,
    cursor: filters.cursor,
  });

  const selectedFromList = timeline.items.find((event) => event.id === filters.selected) ?? null;
  const selectedDetail = selectedFromList ?? (filters.selected ? await getTimelineDetail(filters.selected) : null);

  const makeUrl = (override: Partial<typeof filters>) => {
    const next = { ...filters, ...override };
    const query = serializeTimelineFilters(next);
    return query ? `${currentPath}?${query}` : currentPath;
  };

  const provasPath = buildUniverseHref(slug, 'provas');
  const buildProvasHref = () => {
    if (!selectedDetail) return provasPath;
    const year = selectedDetail.day ? Number(selectedDetail.day.slice(0, 4)) : null;
    const provasFilters = parseProvasFilters({});
    const query = serializeProvasFilters({
      ...provasFilters,
      type: 'evidence',
      node: selectedDetail.node?.slug ?? '',
      tags: selectedDetail.tags.slice(0, 3).map((tag) => tag.toLowerCase()),
      yearFrom: typeof year === 'number' ? year : null,
      yearTo: typeof year === 'number' ? year : null,
      relatedTo: selectedDetail.document?.id ?? '',
      selected: '',
      panel: '',
      cursor: 0,
    });
    return query ? `${provasPath}?${query}` : provasPath;
  };

  const kindOptions = Array.from(new Set([...DEFAULT_KINDS, ...timeline.kindOptions])).sort();
  const tagOptions = timeline.tagOptions.slice(0, 24);
  const itemIds = timeline.items.map((item) => item.id);

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Linha' />
      <WorkspaceShell
        slug={slug}
        section='linha'
        title={`Linha do tempo de ${timeline.universeTitle}`}
        subtitle='Cronologia de marcos, disputas e viradas do universo.'
        selectedId={filters.selected}
        detailTitle='Detalhe do item'
        filter={
          <FilterRail title='Recortes cronologicos'>
            <form method='get' className='stack'>
              <fieldset className='stack' style={{ margin: 0, border: 'none', padding: 0 }}>
                <legend style={{ marginBottom: 6, fontWeight: 600 }}>Tipo</legend>
                <div className='toolbar-row'>
                  {kindOptions.map((kind) => {
                    const active = filters.kind.includes(kind);
                    return (
                      <label key={kind} className='ui-button' data-variant={active ? undefined : 'ghost'}>
                        <input
                          type='checkbox'
                          name='kind'
                          value={kind}
                          defaultChecked={active}
                          style={{ marginRight: 8 }}
                        />
                        {kind}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label>
                <span>Busca textual</span>
                <input name='q' defaultValue={filters.q} placeholder='termo, evento, politica...' style={{ width: '100%', minHeight: 42 }} />
              </label>

              <label>
                <span>No</span>
                <select name='node' defaultValue={filters.node} style={{ width: '100%', minHeight: 42 }}>
                  <option value=''>Todos</option>
                  {timeline.nodes
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

              <label>
                <span>Tags</span>
                <div className='toolbar-row'>
                  {tagOptions.slice(0, 12).map((tag) => {
                    const active = filters.tags.includes(tag.toLowerCase());
                    return (
                      <label key={tag} className='ui-button' data-variant={active ? undefined : 'ghost'}>
                        <input type='checkbox' name='tag' value={tag} defaultChecked={active} style={{ marginRight: 8 }} />
                        {tag}
                      </label>
                    );
                  })}
                </div>
              </label>
              {tagOptions.length > 12 ? (
                <p className='muted' style={{ margin: 0 }}>
                  Mais tags disponiveis: {tagOptions.slice(12, 24).join(', ')}
                </p>
              ) : null}
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
                <strong>{selectedDetail.title}</strong>
                <p className='muted' style={{ margin: 0 }}>
                  {dateLabel(selectedDetail.day)} | {selectedDetail.kind}
                </p>
                <p style={{ margin: 0 }}>{selectedDetail.body ?? selectedDetail.summary}</p>
                <div className='toolbar-row'>
                  <Carimbo>{selectedDetail.kind}</Carimbo>
                  {selectedDetail.tags.slice(0, 4).map((tag) => (
                    <Link key={tag} className='ui-button' data-variant='ghost' href={makeUrl({ tags: [tag], selected: '' })}>
                      {tag}
                    </Link>
                  ))}
                </div>
              </article>

              <article className='core-node stack'>
                <strong>Relacionados</strong>
                {selectedDetail.node ? (
                  <p style={{ margin: 0 }}>
                    No: <Link href={makeUrl({ node: selectedDetail.node.slug, selected: '' })}>{selectedDetail.node.title}</Link>
                  </p>
                ) : null}
                {selectedDetail.document ? (
                  <p style={{ margin: 0 }}>
                    Documento:{' '}
                    <Link href={`/c/${slug}/doc/${selectedDetail.document.id}`}>
                      {selectedDetail.document.title}
                      {selectedDetail.document.year ? ` (${selectedDetail.document.year})` : ''}
                    </Link>
                  </p>
                ) : null}
                {selectedDetail.sourceUrl ? (
                  <p style={{ margin: 0 }}>
                    Fonte:{' '}
                    <a href={selectedDetail.sourceUrl} target='_blank' rel='noreferrer'>
                      abrir link
                    </a>
                  </p>
                ) : null}
                {!selectedDetail.node && !selectedDetail.document && !selectedDetail.sourceUrl ? (
                  <p className='muted' style={{ margin: 0 }}>
                    Sem relacionamentos extras neste item.
                  </p>
                ) : null}
              </article>

              <div className='toolbar-row'>
                <PrefetchLink
                  className='ui-button'
                  href={buildProvasHref()}
                  data-track-event='cta_click'
                  data-track-cta='ver_provas'
                  data-track-section='linha_detail'
                >
                  Ver Provas
                </PrefetchLink>
                <ShareButton
                  url={`/c/${slug}/s/event/${selectedDetail.id}`}
                  title={selectedDetail.title}
                  text={selectedDetail.summary}
                />
                {selectedDetail.node ? (
                  <PrefetchLink
                    className='ui-button'
                    data-variant='ghost'
                    href={`${buildUniverseHref(slug, 'mapa')}?node=${encodeURIComponent(selectedDetail.node.slug)}&panel=detail`}
                  >
                    Ver no mapa
                  </PrefetchLink>
                ) : null}
                {selectedDetail.document ? (
                  <PrefetchLink className='ui-button' data-variant='ghost' href={`/c/${slug}/doc/${selectedDetail.document.id}`}>
                    Abrir documento
                  </PrefetchLink>
                ) : null}
              </div>

              <PortalsRail
                universeSlug={slug}
                variant='detail'
                context={{
                  type: 'event',
                  nodeSlug: selectedDetail.node?.slug ?? '',
                  tags: selectedDetail.tags,
                  docId: selectedDetail.document?.id ?? '',
                  year: selectedDetail.day ? Number(selectedDetail.day.slice(0, 4)) : null,
                }}
              />
            </div>
          ) : null
        }
      >
        <ListKeyboardNavigator ids={itemIds} selectedId={filters.selected} />
        <Card className='stack'>
          <div className='toolbar-row'>
            <Carimbo>{timeline.source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
            <Carimbo>{`itens:${timeline.items.length}`}</Carimbo>
            {filters.kind.length > 0 ? <Carimbo>{`kind:${filters.kind.join('|')}`}</Carimbo> : null}
          </div>

          <SectionHeader title='Timeline vertical' description='Selecione um item para abrir detalhe e navegar para Provas com contexto.' />
          <div className='timeline-list'>
            {timeline.items.map((item) => (
              <article
                key={item.id}
                className='timeline-item'
                data-testid='timeline-item'
                data-selected={filters.selected === item.id ? 'true' : undefined}
              >
                <div className='timeline-dot' aria-hidden='true' />
                <div className='timeline-card' data-selected={filters.selected === item.id ? 'true' : undefined}>
                  <div className='toolbar-row'>
                    <Carimbo>{dateLabel(item.day)}</Carimbo>
                    <Carimbo>{item.kind}</Carimbo>
                  </div>
                  <CardHeader title={item.title} typeLabel={item.kind} meta={item.day ? dateLabel(item.day) : 'Sem data'} />
                  <p style={{ margin: 0 }}>{item.summary}</p>
                  <div className='toolbar-row'>
                    {item.tags.slice(0, 3).map((tag) => (
                      <Link key={`${item.id}-${tag}`} className='ui-button' data-variant='ghost' href={makeUrl({ tags: [tag], selected: '' })}>
                        {tag}
                      </Link>
                    ))}
                  </div>
                  <div className='toolbar-row'>
                    <Link className='ui-button' data-variant='ghost' href={makeUrl({ selected: item.id, panel: 'detail' })}>
                      Ver detalhe
                    </Link>
                    <Link
                      className='ui-button'
                      href={`${buildUniverseHref(slug, 'debate')}?q=${encodeURIComponent(`Quais evidencias sustentam o item da linha: ${item.title}?`)}${
                        item.node?.slug ? `&node=${encodeURIComponent(item.node.slug)}` : ''
                      }`}
                    >
                      Debater
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {timeline.items.length === 0 ? (
            <EmptyState
              title='Sem itens'
              description='Nenhum marco apareceu nesse recorte. Amplie periodo ou remova filtros de tipo/no.'
              variant='no-results'
              actions={[{ label: 'Limpar filtros', href: currentPath }]}
            />
          ) : null}

          {timeline.nextCursor !== null ? (
            <Link className='ui-button' href={makeUrl({ cursor: timeline.nextCursor })}>
              Carregar mais
            </Link>
          ) : null}
        </Card>
      </WorkspaceShell>

      <Card className='stack'>
        <Portais slug={slug} currentPath='linha' title='Proximas portas' />
      </Card>
    </div>
  );
}
