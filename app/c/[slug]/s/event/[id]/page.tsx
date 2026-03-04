import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShareButton } from '@/components/share/ShareButton';
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
        <SectionHeader title={event.title} description={event.universeTitle} tag='Event Share' />
        <p style={{ margin: 0 }}>{event.summary}</p>
        <p className='muted' style={{ margin: 0 }}>
          {event.kind} | {dayLabel}
        </p>
        <div className='toolbar-row'>
          <Link className='ui-button' href={appHref}>
            Abrir no app
          </Link>
          <ShareButton url={shareUrl} title={event.title} text={event.summary} />
        </div>
      </Card>
    </main>
  );
}
