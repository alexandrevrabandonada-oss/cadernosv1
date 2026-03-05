import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShareButton } from '@/components/share/ShareButton';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getShareEvidence } from '@/lib/share/content';
import { buildUniverseHref } from '@/lib/universeNav';

type ShareEvidencePageProps = {
  params: Promise<{ slug: string; id: string }>;
};

function ogPath(slug: string, id: string) {
  return `/api/og?type=evidence&u=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`;
}

export async function generateMetadata({ params }: ShareEvidencePageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const evidence = await getShareEvidence(slug, id);
  if (!evidence) return { title: 'Evidencia nao encontrada' };
  const description = evidence.snippet;
  return {
    title: `${evidence.title} - Evidencia`,
    description,
    openGraph: {
      title: `${evidence.title} - Evidencia`,
      description,
      images: [ogPath(slug, id)],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${evidence.title} - Evidencia`,
      description,
      images: [ogPath(slug, id)],
    },
  };
}

export default async function ShareEvidencePage({ params }: ShareEvidencePageProps) {
  const { slug, id } = await params;
  const evidence = await getShareEvidence(slug, id);
  if (!evidence) notFound();

  const appHref = buildUniverseHref(slug, `provas?selected=${encodeURIComponent(id)}&panel=detail${evidence.nodeSlug ? `&node=${encodeURIComponent(evidence.nodeSlug)}` : ''}`);
  const shareUrl = `/c/${slug}/s/evidence/${id}`;
  const pageLabel =
    evidence.pageStart && evidence.pageEnd && evidence.pageStart !== evidence.pageEnd
      ? `p.${evidence.pageStart}-${evidence.pageEnd}`
      : `p.${evidence.pageStart ?? evidence.pageEnd ?? 's/p'}`;

  return (
    <main className='stack'>
      <Card className='stack'>
        <SectionHeader title={evidence.title} description={evidence.universeTitle} tag='Evidence Share' />
        <p style={{ margin: 0 }}>{evidence.snippet}</p>
        <p className='muted' style={{ margin: 0 }}>
          {evidence.docTitle ?? 'Documento'} {evidence.year ? `(${evidence.year})` : ''} | {pageLabel}
        </p>
        <div className='toolbar-row'>
          <Link
            className='ui-button'
            href={appHref}
            data-track-event='share_open_app'
            data-track-cta='open_app_evidence'
            data-track-section='share_evidence'
            data-track-object-type='evidence'
            data-track-object-id={id}
          >
            Abrir no app
          </Link>
          <ShareButton url={shareUrl} title={evidence.title} text={evidence.snippet} />
        </div>
      </Card>
    </main>
  );
}
