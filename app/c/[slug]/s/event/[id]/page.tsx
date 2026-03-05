import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShareButton } from '@/components/share/ShareButton';
import { Wordmark } from '@/components/brand/Wordmark';
import { BrandIcon } from '@/components/brand/icons/BrandIcon';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getShareEvent } from '@/lib/share/content';
import { buildUniverseHref } from '@/lib/universeNav';

type ShareEventPageProps = {
  params: Promise<{ slug: string; id: string }>;
};

function ogPath(slug: string, id: string) {
  return `/api/og?type=event&u=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`;
}

export async function generateMetadata({ params }: ShareEventPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const event = await getShareEvent(slug, id);
  if (!event) return { title: 'Evento nao encontrado' };
  return {
    title: `${event.title} - Linha`,
    description: event.summary,
    openGraph: {
      title: `${event.title} - Linha`,
      description: event.summary,
      images: [ogPath(slug, id)],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.title} - Linha`,
      description: event.summary,
      images: [ogPath(slug, id)],
    },
  };
}

export default async function ShareEventPage({ params }: ShareEventPageProps) {
  const { slug, id } = await params;
  const event = await getShareEvent(slug, id);
  if (!event) notFound();

  const appHref = buildUniverseHref(slug, `linha?selected=${encodeURIComponent(id)}&panel=detail${event.nodeSlug ? `&node=${encodeURIComponent(event.nodeSlug)}` : ''}`);
  const shareUrl = `/c/${slug}/s/event/${id}`;
  const dayLabel = event.day ? new Date(`${event.day}T00:00:00`).toLocaleDateString('pt-BR') : 's/data';

  return (
    <main className='stack'>
      <Card className='stack'>
        <div className='toolbar-row'>
          <Wordmark variant='compact' />
          <span className='muted' style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <BrandIcon name='linha' size={14} tone='editorial' />
            Cartao de linha
          </span>
        </div>
        <SectionHeader title={event.title} description={event.universeTitle} tag='Event Share' />
        <p style={{ margin: 0 }}>{event.summary}</p>
        <p className='muted' style={{ margin: 0 }}>
          {event.kind} | {dayLabel}
        </p>
        <div className='toolbar-row'>
          <Link
            className='ui-button'
            href={appHref}
            data-track-event='share_open_app'
            data-track-cta='open_app_event'
            data-track-section='share_event'
            data-track-object-type='event'
            data-track-object-id={id}
          >
            Abrir no app
          </Link>
          <ShareButton url={shareUrl} title={event.title} text={event.summary} />
        </div>
      </Card>
    </main>
  );
}
