import Link from 'next/link';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getTrailsData } from '@/lib/data/learning';
import { buildUniverseHref } from '@/lib/universeNav';

type TrilhasPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trail?: string }>;
};

export default async function TrilhasPage({ params, searchParams }: TrilhasPageProps) {
  const { slug } = await params;
  const { trail } = await searchParams;
  const currentPath = buildUniverseHref(slug, 'trilhas');
  const data = await getTrailsData(slug);

  const activeTrail = data.trails.find((item) => item.slug === trail) ?? data.trails[0] ?? null;

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Trilhas' />

      <Card className='stack'>
        <SectionHeader
          title={`Trilhas de ${data.universeTitle}`}
          description='Listagem de trilhas com abertura de percurso e etapas orientadas.'
          tag='Trilhas'
        />
        <div className='toolbar-row'>
          <Carimbo>{data.source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
          <Carimbo>{`trilhas:${data.trails.length}`}</Carimbo>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Catalogo de trilhas' />
        <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {data.trails.map((item) => {
            const href = `${currentPath}?trail=${encodeURIComponent(item.slug)}`;
            return (
              <article key={item.id} className='core-node'>
                <strong>{item.title}</strong>
                <p className='muted' style={{ margin: 0 }}>
                  {item.summary}
                </p>
                <p className='muted' style={{ margin: 0 }}>
                  {item.steps.length} etapa(s)
                </p>
                <Link
                  className='ui-button'
                  href={href}
                  data-variant={activeTrail?.id === item.id ? 'primary' : 'neutral'}
                >
                  {activeTrail?.id === item.id ? 'Trilha aberta' : 'Abrir trilha'}
                </Link>
              </article>
            );
          })}
          {data.trails.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhuma trilha encontrada.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader
          title={activeTrail ? `Trilha ativa: ${activeTrail.title}` : 'Nenhuma trilha selecionada'}
          description={activeTrail?.summary ?? 'Selecione uma trilha no catalogo para abrir o percurso.'}
        />
        <div className='stack'>
          {activeTrail?.steps.map((step) => (
            <article key={step.id} className='core-node'>
              <strong>
                {step.order}. {step.title}
              </strong>
              <p style={{ margin: 0 }}>{step.instruction}</p>
              <p className='muted' style={{ margin: 0 }}>
                {step.nodeTitle ? `No sugerido: ${step.nodeTitle}` : 'No sugerido: n/d'}
              </p>
              <p className='muted' style={{ margin: 0 }}>
                {step.evidenceTitle ? `Evidencia recomendada: ${step.evidenceTitle}` : 'Evidencia recomendada: n/d'}
              </p>
            </article>
          ))}
          {!activeTrail ? (
            <p className='muted' style={{ margin: 0 }}>
              Abra uma trilha para visualizar as etapas.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <Portais slug={slug} currentPath='trilhas' title='Proximas portas' />
      </Card>
    </div>
  );
}
