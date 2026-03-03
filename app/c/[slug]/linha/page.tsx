import Link from 'next/link';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
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
  }>;
};

function dateLabel(value: string | null) {
  if (!value) return 'Data indefinida';
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

export default async function LinhaPage({ params, searchParams }: LinhaPageProps) {
  const { slug } = await params;
  const { from, to, node } = await searchParams;
  const currentPath = buildUniverseHref(slug, 'linha');
  const data = await getTimelineData(slug, {
    from,
    to,
    nodeId: node,
  });

  const makeFilterLink = () => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (node) qs.set('node', node);
    return `${currentPath}?${qs.toString()}`;
  };

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Linha' />

      <Card className='stack'>
        <SectionHeader
          title={`Linha do tempo de ${data.universeTitle}`}
          description='Timeline de eventos com links para evidencias e documentos associados.'
          tag='Linha'
        />
        <div className='toolbar-row'>
          <Carimbo>{data.source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
          <Carimbo>{`eventos:${data.events.length}`}</Carimbo>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Filtros' />
        <form method='get' className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label>
            <span>De (periodo inicial)</span>
            <input type='date' name='from' defaultValue={from ?? ''} style={{ width: '100%', minHeight: 42 }} />
          </label>
          <label>
            <span>Ate (periodo final)</span>
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
          <div className='toolbar-row' style={{ alignItems: 'end' }}>
            <button className='ui-button' type='submit'>
              Aplicar filtros
            </button>
            <Link className='ui-button' href={currentPath} data-variant='ghost'>
              Limpar
            </Link>
            {(from || to || node) ? (
              <Link className='ui-button' href={makeFilterLink()} data-variant='ghost'>
                Link dos filtros
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Timeline' description='Eventos ordenados por data com conexoes para provas e documentos.' />
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
                  {event.evidenceId ? (
                    <Link
                      className='ui-button'
                      href={`${buildUniverseHref(slug, 'provas')}?node=${encodeURIComponent(event.nodeId ?? '')}`}
                    >
                      Evidencia relacionada
                    </Link>
                  ) : null}
                  {event.documentId ? (
                    <Link className='ui-button' href={`/c/${slug}/doc/${event.documentId}`}>
                      Documento {event.documentYear ? `(${event.documentYear})` : ''}
                    </Link>
                  ) : null}
                  <Link
                    className='ui-button'
                    href={`${buildUniverseHref(slug, 'debate')}?q=${encodeURIComponent(`Como o evento "${event.title}" se conecta com as evidencias?`)}`}
                  >
                    Debater evento
                  </Link>
                </div>
              </div>
            </article>
          ))}
          {data.events.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhum evento encontrado para os filtros atuais.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <Portais slug={slug} currentPath='linha' title='Proximas portas' />
      </Card>
    </div>
  );
}
