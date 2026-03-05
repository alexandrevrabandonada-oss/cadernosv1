import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShareButton } from '@/components/share/ShareButton';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getShareUniverse } from '@/lib/share/content';
import { buildUniverseHref } from '@/lib/universeNav';

type ShareUniversePageProps = {
  params: Promise<{ slug: string }>;
};

function ogPath(slug: string) {
  return `/api/og?type=universe&u=${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: ShareUniversePageProps): Promise<Metadata> {
  const { slug } = await params;
  const universe = await getShareUniverse(slug);
  if (!universe) return { title: 'Nao encontrado' };
  return {
    title: `${universe.title} - Vitrine`,
    description: universe.summary,
    openGraph: {
      title: `${universe.title} - Vitrine`,
      description: universe.summary,
      images: [ogPath(slug)],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${universe.title} - Vitrine`,
      description: universe.summary,
      images: [ogPath(slug)],
    },
  };
}

export default async function ShareUniversePage({ params }: ShareUniversePageProps) {
  const { slug } = await params;
  const universe = await getShareUniverse(slug);
  if (!universe) notFound();

  const shareUrl = `/c/${slug}/s`;

  return (
    <main className='stack'>
      <Card className='stack'>
        <SectionHeader title={universe.title} description={universe.summary} tag='Vitrine publica' />
        <div className='toolbar-row'>
          <Link
            className='ui-button'
            href={buildUniverseHref(slug, '')}
            data-track-event='share_open_app'
            data-track-cta='open_app_universe'
            data-track-section='share_universe'
          >
            Abrir no app
          </Link>
          <ShareButton url={shareUrl} title={`${universe.title} - Cadernos Vivos`} text={universe.summary} />
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Evidencias destacadas' description='Seis evidencias para entrada rapida no universo.' />
        <div className='stack'>
          {universe.highlights.evidences.slice(0, 6).map((item) => (
            <article key={item.id} className='core-node stack'>
              <strong>{item.title}</strong>
              <p style={{ margin: 0 }}>{item.summary}</p>
              <div className='toolbar-row'>
                <Link className='ui-button' href={`/c/${slug}/s/evidence/${item.id}`}>
                  Preview publico
                </Link>
                <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, `provas?selected=${encodeURIComponent(item.id)}&panel=detail`)}>
                  Abrir em Provas
                </Link>
              </div>
            </article>
          ))}
          {universe.highlights.evidences.length === 0 ? <p className='muted'>Sem evidencias destacadas.</p> : null}
        </div>
      </Card>
    </main>
  );
}
