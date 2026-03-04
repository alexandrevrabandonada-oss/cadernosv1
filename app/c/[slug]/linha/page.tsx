import Link from 'next/link';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { FilterRail } from '@/components/workspace/FilterRail';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getTimelineData } from '@/lib/data/timeline';
import { buildUniverseHref } from '@/lib/universeNav';

type LinhaPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
    node?: string;
    selected?: string;
    panel?: string;
  }>;
};

function dateLabel(value: string | null) {
  if (!value) return 'Data indefinida';
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

export default async function LinhaPage({ params, searchParams }: LinhaPageProps) {
  const { slug } = await params;
  const { from, to, node, selected } = await searchParams;
  const currentPath = buildUniverseHref(slug, 'linha');
  const data = await getTimelineData(slug, {
    from,
    to,
    nodeId: node,
  });

  const selectedEventId = selected ?? '';
  const selectedEvent = data.events.find((event) => event.id === selectedEventId) ?? null;

  const makeFilterLink = () => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (node) qs.set('node', node);
    if (selectedEventId) qs.set('selected', selectedEventId);
    return `${currentPath}?${qs.toString()}`;
  };

  const makeSelectedLink = (eventId: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (node) qs.set('node', node);
    qs.set('selected', eventId);
    qs.set('panel', 'detail');
    return `${currentPath}?${qs.toString()}`;
  };

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Linha' />

      <WorkspaceShell
        slug={slug}
        section='linha'
        title={`Linha do tempo de ${data.universeTitle}`}
        subtitle='Eventos ordenados com conexoes para provas e documentos.'
        selectedId={selectedEventId}
        detailTitle='Detalhe do evento'
        filter={
          <FilterRail>
            <form method='get' className='stack'>
              <label>
                <span>De</span>
                <input type='date' name='from' defaultValue={from ?? ''} style={{ width: '100%', minHeight: 42 }} />
              </label>
              <label>
                <span>Ate</span>
                <input type='date' name='to' defaultValue={to ?? ''} style={{ width: '100%', minHeight: 42 }} />
              </label>
              <label>
                <span>No</span>
                <select name='node' defaultValue={node ?? ''} style={{ width: '100%', minHeight: 42 }}>
                  <option value=''>Todos</option>
                  {data.nodes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className='toolbar-row'>
                <button className='ui-button' type='submit'>
                  Aplicar
                </button>
                <Link className='ui-button' href={currentPath} data-variant='ghost'>
                  Limpar
                </Link>
                {(from || to || node) ? (
                  <Link className='ui-button' href={makeFilterLink()} data-variant='ghost'>
                    Link filtros
                  </Link>
                ) : null}
              </div>
            </form>
          </FilterRail>
        }
        detail={
          selectedEvent ? (
            <div className='stack'>
              <article className='core-node'>
                <strong>{selectedEvent.title}</strong>
                <p className='muted' style={{ margin: 0 }}>
                  {dateLabel(selectedEvent.eventDate)}
                  {selectedEvent.periodLabel ? ` | ${selectedEvent.periodLabel}` : ''}
                </p>
                <p style={{ margin: 0 }}>{selectedEvent.summary}</p>
              </article>
              <div className='toolbar-row'>
                {selectedEvent.evidenceId ? (
                  <Link
                    className='ui-button'
                    href={`${buildUniverseHref(slug, 'provas')}?node=${encodeURIComponent(selectedEvent.nodeId ?? '')}`}
                  >
                    Ver provas
                  </Link>
                ) : null}
                {selectedEvent.documentId ? (
                  <Link className='ui-button' href={`/c/${slug}/doc/${selectedEvent.documentId}`}>
                    Documento
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        <Card className='stack'>
          <div className='toolbar-row'>
            <Carimbo>{data.source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
            <Carimbo>{`eventos:${data.events.length}`}</Carimbo>
          </div>
          <SectionHeader title='Timeline' description='Clique em um evento para abrir o painel de detalhe.' />
          <div className='timeline-list'>
            {data.events.map((event) => (
              <article key={event.id} className='timeline-item'>
                <div className='timeline-dot' aria-hidden='true' />
                <div className='timeline-card'>
                  <strong>{event.title}</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    {dateLabel(event.eventDate)}
                    {event.periodLabel ? ` | ${event.periodLabel}` : ''}
                    {event.nodeTitle ? ` | No: ${event.nodeTitle}` : ''}
                  </p>
                  <p style={{ margin: 0 }}>{event.summary}</p>
                  <div className='toolbar-row'>
                    <Link className='ui-button' data-variant='ghost' href={makeSelectedLink(event.id)}>
                      Ver detalhe
                    </Link>
                    <Link
                      className='ui-button'
                      href={`${buildUniverseHref(slug, 'debate')}?q=${encodeURIComponent(`Como o evento "${event.title}" se conecta com as evidencias?`)}`}
                    >
                      Debater
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </WorkspaceShell>

      <Card className='stack'>
        <Portais slug={slug} currentPath='linha' title='Proximas portas' />
      </Card>
    </div>
  );
}
