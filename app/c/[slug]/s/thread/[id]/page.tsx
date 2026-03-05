import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShareButton } from '@/components/share/ShareButton';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getShareThread } from '@/lib/share/content';
import { buildUniverseHref } from '@/lib/universeNav';

type ShareThreadPageProps = {
  params: Promise<{ slug: string; id: string }>;
};

function ogPath(slug: string, id: string) {
  return `/api/og?type=thread&u=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`;
}

export async function generateMetadata({ params }: ShareThreadPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const thread = await getShareThread(slug, id);
  if (!thread) return { title: 'Thread nao encontrada' };
  return {
    title: `Debate: ${thread.question}`,
    description: thread.answer,
    openGraph: {
      title: `Debate: ${thread.question}`,
      description: thread.answer,
      images: [ogPath(slug, id)],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Debate: ${thread.question}`,
      description: thread.answer,
      images: [ogPath(slug, id)],
    },
  };
}

export default async function ShareThreadPage({ params }: ShareThreadPageProps) {
  const { slug, id } = await params;
  const thread = await getShareThread(slug, id);
  if (!thread) notFound();

  const appHref = buildUniverseHref(slug, `debate?selected=${encodeURIComponent(id)}&panel=detail${thread.nodeSlug ? `&node=${encodeURIComponent(thread.nodeSlug)}` : ''}`);
  const shareUrl = `/c/${slug}/s/thread/${id}`;

  return (
    <main className='stack'>
      <Card className='stack'>
        <SectionHeader title={thread.question} description={thread.universeTitle} tag='Thread Share' />
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{thread.answer}</p>
        <p className='muted' style={{ margin: 0 }}>
          modo: {thread.mode}
          {thread.dominantDocTitle ? ` | doc: ${thread.dominantDocTitle}${thread.dominantDocYear ? ` (${thread.dominantDocYear})` : ''}` : ''}
        </p>
        <div className='toolbar-row'>
          <Link
            className='ui-button'
            href={appHref}
            data-track-event='share_open_app'
            data-track-cta='open_app_thread'
            data-track-section='share_thread'
            data-track-object-type='thread'
            data-track-object-id={id}
          >
            Abrir no app
          </Link>
          <ShareButton url={shareUrl} title={thread.question} text={thread.answer} />
        </div>
      </Card>
    </main>
  );
}
