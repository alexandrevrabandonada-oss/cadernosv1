import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Wordmark } from '@/components/brand/Wordmark';
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
        <h1 style={{ margin: 0 }}>Voce esta offline</h1>
        <p className='muted' style={{ margin: 0 }}>
          O app shell foi carregado, mas esta pagina precisa de conexao para atualizar os dados.
        </p>
        <div className='toolbar-row'>
          <a href='' className='ui-button'>
            Tentar novamente
          </a>
          <Link href='/' className='ui-button' data-variant='ghost'>
            Voltar para Home
          </Link>
        </div>
        {from ? (
          <p className='muted' style={{ margin: 0 }}>
            Ultima rota: <code>{from}</code>
          </p>
        ) : null}
      </Card>

      <Card className='stack surface-plate' style={{ maxWidth: 760 }}>
        <h2 style={{ margin: 0 }}>O que pode abrir agora</h2>
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
            <strong>Share pages recentes salvas</strong>
            <div className='toolbar-row'>
              {sharePages.map((href) => (
                <Link key={href} href={href} className='ui-button' data-variant='ghost'>
                  {href}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </main>
  );
}
