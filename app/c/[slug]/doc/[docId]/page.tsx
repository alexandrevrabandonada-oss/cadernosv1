import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getDocumentViewData } from '@/lib/data/debate';
import { buildUniverseHref } from '@/lib/universeNav';

type DocPageProps = {
  params: Promise<{
    slug: string;
    docId: string;
  }>;
  searchParams: Promise<{
    p?: string;
  }>;
};

export default async function UniverseDocPage({ params, searchParams }: DocPageProps) {
  const { slug, docId } = await params;
  const { p } = await searchParams;
  const currentPath = buildUniverseHref(slug, '');
  const doc = await getDocumentViewData(slug, docId);

  if (!doc) {
    notFound();
  }

  const pageHint = p ? `p.${p}` : 'sem pagina definida';

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Documento' />

      <Card className='stack'>
        <SectionHeader
          title={doc.title}
          description='Visualizacao simples do documento referenciado nas evidencias.'
          tag='Documento'
        />
        <p className='muted' style={{ margin: 0 }}>
          Status: {doc.status} | Pagina sugerida: {pageHint}
        </p>
        <p className='muted' style={{ margin: 0 }}>
          Autor(es): {doc.authors || 'n/d'} {doc.year ? `| Ano: ${doc.year}` : ''}
        </p>
        <div className='toolbar-row'>
          {doc.signedUrl ? (
            <Link className='ui-button' href={doc.signedUrl} target='_blank' rel='noreferrer'>
              Abrir PDF no Storage
            </Link>
          ) : null}
          {doc.sourceUrl ? (
            <Link className='ui-button' href={doc.sourceUrl} target='_blank' rel='noreferrer'>
              Abrir fonte original
            </Link>
          ) : null}
          <Link className='ui-button' href={buildUniverseHref(slug, 'debate')}>
            Voltar ao debate
          </Link>
        </div>
      </Card>
    </div>
  );
}
