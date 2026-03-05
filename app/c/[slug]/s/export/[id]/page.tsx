import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShareButton } from '@/components/share/ShareButton';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getShareExport } from '@/lib/share/content';

type ShareExportPageProps = {
  params: Promise<{ slug: string; id: string }>;
};

function ogPath(slug: string, id: string) {
  return `/api/og?type=export&u=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`;
}

export async function generateMetadata({ params }: ShareExportPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const exportItem = await getShareExport(slug, id);
  if (!exportItem) return { title: 'Export nao encontrado' };
  return {
    title: `${exportItem.title} - Export`,
    description: exportItem.snippet,
    openGraph: {
      title: `${exportItem.title} - Export`,
      description: exportItem.snippet,
      images: [ogPath(slug, id)],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${exportItem.title} - Export`,
      description: exportItem.snippet,
      images: [ogPath(slug, id)],
    },
  };
}

export default async function ShareExportPage({ params }: ShareExportPageProps) {
  const { slug, id } = await params;
  const exportItem = await getShareExport(slug, id);
  if (!exportItem) notFound();

  const shareUrl = `/c/${slug}/s/export/${id}`;
  const createdAtLabel = new Date(exportItem.createdAt).toLocaleString('pt-BR');

  return (
    <main className='stack'>
      <Card className='stack'>
        <SectionHeader title={exportItem.title} description={exportItem.universeTitle} tag='Export Share' />
        <p className='muted' style={{ margin: 0 }}>
          {exportItem.subtitle}
        </p>
        <p style={{ margin: 0 }}>{exportItem.snippet}</p>
        <p className='muted' style={{ margin: 0 }}>
          tipo: {exportItem.kind} | formato: {exportItem.format.toUpperCase()} | gerado em: {createdAtLabel}
        </p>

        <div className='toolbar-row'>
          {exportItem.downloadUrl ? (
            <a
              className='ui-button'
              href={exportItem.downloadUrl}
              target='_blank'
              rel='noreferrer'
              data-track-event='download_click'
              data-track-cta='download_export_pdf'
              data-track-section='share_export'
              data-track-object-type='export'
              data-track-object-id={id}
            >
              Baixar PDF
            </a>
          ) : (
            <span className='muted'>Download indisponivel</span>
          )}
          {exportItem.appHref ? (
            <Link
              className='ui-button'
              data-variant='ghost'
              href={exportItem.appHref}
              data-track-event='share_open_app'
              data-track-cta='open_app_export'
              data-track-section='share_export'
              data-track-object-type='export'
              data-track-object-id={id}
            >
              Abrir no app
            </Link>
          ) : null}
          <ShareButton url={shareUrl} title={exportItem.title} text={exportItem.snippet} />
        </div>
      </Card>
    </main>
  );
}
