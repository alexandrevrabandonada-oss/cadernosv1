import Link from 'next/link';
import { Card, Placa } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Carimbo } from '@/components/ui/Badge';
import { listPublishedUniverses } from '@/lib/data/universes';
import { getCurrentSession } from '@/lib/auth/server';

type HomePageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const [universes, session] = await Promise.all([
    listPublishedUniverses({ q: query }),
    getCurrentSession(),
  ]);

  return (
    <main className='stack'>
      <Placa className='stack'>
        <SectionHeader
          title='Cadernos Vivos'
          description='Catalogo publico de universos publicados para exploracao, prova e debate.'
          tag='Catalogo'
        />
        <form method='get' className='toolbar-row' role='search' aria-label='Busca de universos publicados'>
          <input
            type='search'
            name='q'
            defaultValue={query}
            placeholder='Buscar por titulo ou resumo'
            style={{ minHeight: 42, minWidth: 260 }}
          />
          <button className='ui-button' type='submit'>
            Buscar
          </button>
          {query ? (
            <Link className='ui-button' href='/' data-variant='ghost'>
              Limpar
            </Link>
          ) : null}
        </form>
      </Placa>

      <Card className='stack'>
        <SectionHeader title='Universos publicados' description='Somente universos publicados ficam visiveis no catalogo publico.' />
        <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {universes.map((universe) => (
            <article key={universe.id} className='core-node'>
              <strong>{universe.title}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {universe.summary}
              </p>
              <div className='toolbar-row'>
                <Carimbo>{new Date(universe.published_at ?? '').toLocaleDateString('pt-BR')}</Carimbo>
                {universe.tags.slice(0, 3).map((tag) => (
                  <Carimbo key={`${universe.id}-${tag}`}>{tag}</Carimbo>
                ))}
              </div>
              <Link className='ui-button' href={`/c/${universe.slug}`} data-variant='primary'>
                Explorar universo
              </Link>
            </article>
          ))}
          {universes.length === 0 ? (
            <article className='core-node'>
              <strong>Nenhum universo publicado</strong>
              <p className='muted' style={{ margin: 0 }}>
                O catalogo ainda esta em construcao. Volte em breve para novas publicacoes.
              </p>
              {session ? (
                <Link className='ui-button' href='/admin/universes'>
                  Ir para /admin
                </Link>
              ) : null}
            </article>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
