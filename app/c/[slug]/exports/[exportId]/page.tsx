import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { getExportViewBySlug } from '@/lib/export/service';

type ExportPageProps = {
  params: Promise<{
    slug: string;
    exportId: string;
  }>;
};

export default async function ExportDetailPage({ params }: ExportPageProps) {
  const { slug, exportId } = await params;
  const data = await getExportViewBySlug(slug, exportId);
  if (!data) notFound();

  const currentPath = `/c/${slug}/exports/${exportId}`;

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Exports' />
      <Card className='stack'>
        <SectionHeader title='Export do universo' description='Download controlado por visibilidade e publicacao do universo.' tag='Export' />
        <p className='muted' style={{ margin: 0 }}>
          Titulo: {data.item.title}
        </p>
        <p className='muted' style={{ margin: 0 }}>
          tipo: {data.item.kind} | formato: {data.item.format.toUpperCase()} | publico: {data.item.is_public ? 'sim' : 'nao'}
        </p>
        {data.canAccess ? (
          data.signedUrl ? (
            <a className='ui-button' href={data.signedUrl} target='_blank' rel='noreferrer'>
              Baixar arquivo
            </a>
          ) : (
            <p className='muted' style={{ margin: 0 }}>
              Nao foi possivel gerar link assinado para este arquivo.
            </p>
          )
        ) : (
          <p role='alert' className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Export indisponivel: privado ou universo nao publicado.
          </p>
        )}
      </Card>
    </div>
  );
}
