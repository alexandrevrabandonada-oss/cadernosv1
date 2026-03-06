import { notFound } from 'next/navigation';

import { RestrictedStateCard } from '@/components/ui/state/RestrictedStateCard';
import { ErrorStateCard } from '@/components/ui/state/ErrorStateCard';
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
            <ErrorStateCard
              eyebrow='link temporario indisponivel'
              title='Nao foi possivel gerar o download agora'
              description='O export existe, mas o link assinado nao foi emitido nesta tentativa. Tente novamente em alguns instantes.'
              primaryAction={{ label: 'Voltar aos exports', href: `/c/${slug}/meu-caderno` }}
            />
          )
        ) : (
          <RestrictedStateCard
            title='Este export nao esta liberado aqui'
            description='O arquivo continua privado ou o universo ainda nao foi publicado para leitura externa. Somente pessoas com acesso editorial podem abrir este link.'
            primaryAction={{ label: 'Voltar ao universo', href: `/c/${slug}` }}
            secondaryAction={{ label: 'Abrir Meu Caderno', href: `/c/${slug}/meu-caderno` }}
          />
        )}
      </Card>
    </div>
  );
}
