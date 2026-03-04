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
import { getGlossaryDetail, listGlossaryTerms } from '@/lib/data/glossario';
import { parseDebateFilters, serializeDebateFilters } from '@/lib/filters/debateFilters';
import { parseGlossarioFilters, serializeGlossarioFilters } from '@/lib/filters/glossarioFilters';
import { parseProvasFilters, serializeProvasFilters } from '@/lib/filters/provasFilters';
import { parseTimelineFilters, serializeTimelineFilters } from '@/lib/filters/timelineFilters';
import { buildUniverseHref } from '@/lib/universeNav';

type GlossarioPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default async function GlossarioPage({ params, searchParams }: GlossarioPageProps) {
  const { slug } = await params;
  const filters = parseGlossarioFilters(await searchParams);
  const currentPath = buildUniverseHref(slug, 'glossario');
  const list = await listGlossaryTerms({ slug, filters, limit: 20, cursor: filters.cursor });
  const selectedDetail = filters.selected ? await getGlossaryDetail({ slug, termId: filters.selected }) : null;

  const makeUrl = (override: Partial<typeof filters>) => {
    const next = { ...filters, ...override };
    const query = serializeGlossarioFilters(next);
    return query ? `${currentPath}?${query}` : currentPath;
  };

  const provasHref = () => {
    if (!selectedDetail) return buildUniverseHref(slug, 'provas');
    const base = parseProvasFilters({});
    const query = serializeProvasFilters({
      ...base,
      node: selectedDetail.node?.slug ?? '',
      tags: selectedDetail.tags.map((tag) => tag.toLowerCase()).slice(0, 4),
      selected: '',
      panel: '',
      cursor: 0,
    });
    return query ? `${buildUniverseHref(slug, 'provas')}?${query}` : buildUniverseHref(slug, 'provas');
  };

  const debateHref = () => {
    if (!selectedDetail) return buildUniverseHref(slug, 'debate');
    const base = parseDebateFilters({});
    const query = serializeDebateFilters({
      ...base,
      node: selectedDetail.node?.slug ?? '',
      status: 'strict_ok',
      selected: '',
      panel: '',
      cursor: 0,
    });
    return query ? `${buildUniverseHref(slug, 'debate')}?${query}` : buildUniverseHref(slug, 'debate');
  };

  const linhaHref = () => {
    if (!selectedDetail) return buildUniverseHref(slug, 'linha');
    const base = parseTimelineFilters({});
    const query = serializeTimelineFilters({
      ...base,
      node: selectedDetail.node?.slug ?? '',
      tags: selectedDetail.tags.map((tag) => tag.toLowerCase()).slice(0, 4),
      selected: '',
      panel: '',
      cursor: 0,
    });
    return query ? `${buildUniverseHref(slug, 'linha')}?${query}` : buildUniverseHref(slug, 'linha');
  };
  const termIds = list.items.map((item) => item.id);

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Glossario' />

      <WorkspaceShell
        slug={slug}
        section='glossario'
        title={`Glossario de ${list.universeTitle}`}
        subtitle='Indice de conceitos, entidades e siglas conectados ao universo.'
        selectedId={filters.selected}
        detailTitle='Detalhe do termo'
        filter={
          <FilterRail>
            <form method='get' className='stack'>
              <label>
                <span>Busca</span>
                <input name='q' defaultValue={filters.q} placeholder='termo, sigla, entidade...' style={{ width: '100%', minHeight: 42 }} />
              </label>
              <label>
                <span>Letra</span>
                <div className='toolbar-row'>
                  {LETTERS.map((letter) => (
                    <Link key={letter} className='ui-button' data-variant={filters.letter === letter ? undefined : 'ghost'} href={makeUrl({ letter, cursor: 0, selected: '' })}>
                      {letter}
                    </Link>
                  ))}
                </div>
              </label>
              <label>
                <span>Tags (csv)</span>
                <input name='tags' defaultValue={filters.tags.join(',')} placeholder='ex.: saude,agua,solo' style={{ width: '100%', minHeight: 42 }} />
              </label>
              {list.tagOptions.length > 0 ? (
                <p className='muted' style={{ margin: 0 }}>
                  Sugestoes: {list.tagOptions.slice(0, 12).join(', ')}
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
                <strong>{selectedDetail.term}</strong>
                <p style={{ margin: 0 }}>{selectedDetail.shortDef || selectedDetail.body}</p>
                <div className='toolbar-row'>
                  {selectedDetail.tags.map((tag) => (
                    <Link key={tag} className='ui-button' data-variant='ghost' href={makeUrl({ tags: [tag.toLowerCase()], selected: '', cursor: 0 })}>
                      {tag}
                    </Link>
                  ))}
                </div>
              </article>

              <article className='core-node stack'>
                <strong>Nos relacionados</strong>
                {selectedDetail.relatedNodes.map((node) => (
                  <Link
                    key={node.id}
                    className='ui-button'
                    data-variant='ghost'
                    href={`${buildUniverseHref(slug, 'mapa')}?node=${encodeURIComponent(node.slug)}&panel=detail`}
                  >
                    {node.title}
                  </Link>
                ))}
                {selectedDetail.relatedNodes.length === 0 ? <p className='muted' style={{ margin: 0 }}>Sem nos relacionados.</p> : null}
              </article>

              <article className='core-node stack'>
                <strong>Evidencias em destaque</strong>
                {selectedDetail.evidences.slice(0, 5).map((evidence) => (
                  <div key={evidence.id} className='stack'>
                    <strong>{evidence.title}</strong>
                    <p className='muted' style={{ margin: 0 }}>
                      {evidence.documentTitle ?? 'Documento n/d'} {evidence.year ? `(${evidence.year})` : ''}
                    </p>
                    <p style={{ margin: 0 }}>{evidence.summary}</p>
                  </div>
                ))}
                {selectedDetail.evidences.length === 0 ? <p className='muted' style={{ margin: 0 }}>Sem evidencias destacadas.</p> : null}
              </article>

              <article className='core-node stack'>
                <strong>Perguntas sugeridas</strong>
                <div className='toolbar-row'>
                  {selectedDetail.questionPrompts.map((prompt) => (
                    <Link
                      key={prompt}
                      className='ui-button'
                      data-variant='ghost'
                      href={`${buildUniverseHref(slug, 'debate')}?ask=${encodeURIComponent(prompt)}${
                        selectedDetail.node?.slug ? `&node=${encodeURIComponent(selectedDetail.node.slug)}` : ''
                      }`}
                    >
                      {prompt}
                    </Link>
                  ))}
                </div>
              </article>

              <div className='toolbar-row'>
                <Link className='ui-button' href={provasHref()}>
                  Ver Provas
                </Link>
                <Link className='ui-button' href={debateHref()}>
                  Ver Debate
                </Link>
                <Link className='ui-button' data-variant='ghost' href={linhaHref()}>
                  Ver Linha
                </Link>
                {selectedDetail.node ? (
                  <Link
                    className='ui-button'
                    data-variant='ghost'
                    href={`${buildUniverseHref(slug, 'mapa')}?node=${encodeURIComponent(selectedDetail.node.slug)}&panel=detail`}
                  >
                    Ir para No
                  </Link>
                ) : null}
                <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'tutor')}>
                  Abrir no Tutor
                </Link>
                <ShareButton
                  url={`/c/${slug}/s/term/${selectedDetail.id}`}
                  title={selectedDetail.term}
                  text={selectedDetail.shortDef || selectedDetail.body}
                  label='Compartilhar termo'
                />
              </div>

              <PortalsRail
                universeSlug={slug}
                variant='detail'
                context={{
                  type: 'term',
                  termSlug: selectedDetail.slug,
                  nodeSlug: selectedDetail.node?.slug ?? '',
                  nodeTitle: selectedDetail.node?.title ?? selectedDetail.term,
                  tags: selectedDetail.tags,
                }}
              />
            </div>
          ) : null
        }
      >
        <ListKeyboardNavigator ids={termIds} selectedId={filters.selected} />
        <Card className='stack'>
          <div className='toolbar-row'>
            <Carimbo>{list.source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
            <Carimbo>{`termos:${list.items.length}`}</Carimbo>
          </div>
          <SectionHeader title='Termos do universo' description='Selecione um termo para abrir relacoes e portas do universo.' />
          <div className='core-grid'>
            {list.items.map((item) => (
              <article
                key={item.id}
                className='core-node stack'
                data-testid='term-item'
                data-selected={filters.selected === item.id ? 'true' : undefined}
              >
                <strong>{item.term}</strong>
                <p className='muted' style={{ margin: 0 }}>
                  {item.shortDef}
                </p>
                <div className='toolbar-row'>
                  {item.tags.slice(0, 3).map((tag) => (
                    <Carimbo key={`${item.id}-${tag}`}>{tag}</Carimbo>
                  ))}
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
              title='Sem termos'
              description='Sem termos para estes filtros.'
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
      </WorkspaceShell>

      <Card className='stack'>
        <Portais slug={slug} currentPath='glossario' title='Proximas portas' />
      </Card>
    </div>
  );
}
