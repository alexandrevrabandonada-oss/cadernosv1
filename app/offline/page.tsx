import Link from 'next/link';

import { Wordmark } from '@/components/brand/Wordmark';
import { Card } from '@/components/ui/Card';
import { EmptyStateCard } from '@/components/ui/state/EmptyStateCard';
import { PartialDataNotice } from '@/components/ui/state/PartialDataNotice';
import { getPublicOfflineSeed } from '@/lib/offline/seed';

type OfflinePageProps = {
  searchParams: Promise<{ from?: string }>;
};

function normalizeFrom(value: string | undefined) {
  if (!value) return '';
  if (!value.startsWith('/')) return '';
  if (value.startsWith('/admin')) return '';
  if (value.startsWith('/api')) return '';
  return value;
}

export default async function OfflinePage({ searchParams }: OfflinePageProps) {
  const params = await searchParams;
  const from = normalizeFrom(params.from);
  const seed = await getPublicOfflineSeed();
  const slugs = seed.universeSlugs.slice(0, 3);
  const sharePages = seed.sharePages.slice(0, 6);

  return (
    <main className='stack stack-editorial'>
      <Card className='stack surface-panel' style={{ maxWidth: 760 }}>
        <Wordmark variant='hero' />
        <PartialDataNotice
          eyebrow='navegacao parcial'
          title='Voce esta offline'
          description='O shell do app foi carregado, mas esta pagina precisa de conexao para atualizar dados ao vivo. O que ja foi salvo em cache continua acessivel.'
          primaryAction={{ label: 'Tentar novamente', href: '' }}
          secondaryAction={{ label: 'Voltar para Home', href: '/' }}
          details={
            from ? (
              <span>Ultima rota tentada: <code>{from}</code></span>
            ) : (
              <span>Se uma rota nao estiver em cache, o app mostra apenas as superfices que ja estavam disponiveis localmente.</span>
            )
          }
        />
      </Card>

      <Card className='stack surface-plate' style={{ maxWidth: 760 }}>
        <h2 style={{ margin: 0 }}>O que pode abrir agora</h2>
        <p className='muted' style={{ margin: 0 }}>Universos e paginas publicas visitadas recentemente podem continuar acessiveis enquanto a conexao nao volta.</p>
        <div className='toolbar-row'>
          <Link href='/' className='ui-button'>
            Abrir Home
          </Link>
          {slugs.map((slug) => (
            <Link key={slug} href={`/c/${slug}`} className='ui-button' data-variant='ghost'>
              {`Universo ${slug}`}
            </Link>
          ))}
        </div>
        {sharePages.length > 0 ? (
          <div className='stack' style={{ gap: '0.6rem' }}>
            <strong>Paginas publicas salvas</strong>
            <div className='toolbar-row'>
              {sharePages.map((href) => (
                <Link key={href} href={href} className='ui-button' data-variant='ghost'>
                  {href}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <EmptyStateCard
            eyebrow='sem cache publico'
            title='Nenhuma pagina publica foi salva ainda'
            description='Abra um universo publicado quando a conexao voltar para deixar uma base minima pronta para leitura offline.'
            primaryAction={{ label: 'Voltar para Home', href: '/' }}
          />
        )}
      </Card>
    </main>
  );
}
