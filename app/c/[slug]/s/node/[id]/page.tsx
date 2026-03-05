import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShareButton } from '@/components/share/ShareButton';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getShareNode } from '@/lib/share/content';
import { buildUniverseHref } from '@/lib/universeNav';

type ShareNodePageProps = {
  params: Promise<{ slug: string; id: string }>;
};

function ogPath(slug: string, id: string) {
  return `/api/og?type=node&u=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`;
}

export async function generateMetadata({ params }: ShareNodePageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const node = await getShareNode(slug, id);
  if (!node) return { title: 'No nao encontrado' };
  return {
    title: `${node.title} - No do Mapa`,
    description: node.snippet,
    openGraph: {
      title: `${node.title} - No do Mapa`,
      description: node.snippet,
      images: [ogPath(slug, id)],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${node.title} - No do Mapa`,
      description: node.snippet,
      images: [ogPath(slug, id)],
    },
  };
}

export default async function ShareNodePage({ params }: ShareNodePageProps) {
  const { slug, id } = await params;
  const node = await getShareNode(slug, id);
  if (!node) notFound();

  const canonical = `/c/${slug}/s/node/${id}`;
  const mapHref = `${buildUniverseHref(slug, 'mapa')}?node=${encodeURIComponent(node.nodeSlug)}&panel=detail`;
  const provasHref = `${buildUniverseHref(slug, 'provas')}?node=${encodeURIComponent(node.nodeSlug)}`;
  const debateHref = `${buildUniverseHref(slug, 'debate')}?node=${encodeURIComponent(node.nodeSlug)}&status=strict_ok`;
  const linhaHref = `${buildUniverseHref(slug, 'linha')}?node=${encodeURIComponent(node.nodeSlug)}`;

  return (
    <main className='stack'>
      <Card className='stack'>
        <SectionHeader title={node.title} description={node.universeTitle} tag='No do Mapa' />
        <p style={{ margin: 0 }}>{node.snippet}</p>
        <div className='toolbar-row'>
          {node.tags.map((tag) => (
            <Carimbo key={tag}>{tag}</Carimbo>
          ))}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Evidencias em destaque' description='Trechos curados ligados ao no.' />
        <div className='stack'>
          {node.evidences.map((item) => (
            <article key={item.id} className='core-node stack'>
              <strong>{item.title}</strong>
              <p style={{ margin: 0 }}>{item.summary}</p>
              <Link className='ui-button' data-variant='ghost' href={`${buildUniverseHref(slug, 'provas')}?selected=${encodeURIComponent(item.id)}&panel=detail&node=${encodeURIComponent(node.nodeSlug)}`}>
                Ver evidencia
              </Link>
            </article>
          ))}
          {node.evidences.length === 0 ? <p className='muted'>Sem evidencias destacadas.</p> : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Perguntas sugeridas' description='Use como ponto de partida no Debate.' />
        <div className='toolbar-row'>
          {node.questions.map((question) => (
            <Link key={question} className='ui-button' data-variant='ghost' href={`${buildUniverseHref(slug, 'debate')}?ask=${encodeURIComponent(question)}&node=${encodeURIComponent(node.nodeSlug)}`}>
              {question}
            </Link>
          ))}
        </div>
      </Card>

      <Card className='stack'>
        <div className='toolbar-row'>
          <Link
            className='ui-button'
            href={mapHref}
            data-track-event='share_open_app'
            data-track-cta='open_app_node'
            data-track-section='share_node'
            data-track-object-type='node'
            data-track-object-id={id}
          >
            Abrir no app
          </Link>
          <Link className='ui-button' data-variant='ghost' href={provasHref}>
            Ver Provas
          </Link>
          <Link className='ui-button' data-variant='ghost' href={debateHref}>
            Ver Debate
          </Link>
          <Link className='ui-button' data-variant='ghost' href={linhaHref}>
            Ver Linha
          </Link>
          <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'tutor')}>
            Abrir no Tutor
          </Link>
          <ShareButton url={canonical} title={node.title} text={node.snippet} />
        </div>
      </Card>
    </main>
  );
}
