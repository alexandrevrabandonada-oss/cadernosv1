import Link from 'next/link';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrailLab } from '@/components/trilhas/TrailLab';
import { markStepDone } from '@/app/actions/progress';
import { getCurrentSession } from '@/lib/auth/server';
import { listDoneStepsForTrail } from '@/lib/progress/server';
import { GenerateExportButton } from '@/components/export/GenerateExportButton';
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
  const session = await getCurrentSession();
  const doneStepIds =
    activeTrail && data.universeId && session && session.userId !== 'dev-bypass'
      ? await listDoneStepsForTrail(activeTrail.id)
      : [];

  async function markDoneAction(input: { universeId: string; trailId: string; stepId: string }) {
    'use server';
    return markStepDone(input);
  }

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
        {activeTrail && data.universeId ? (
          <GenerateExportButton
            endpoint='/api/admin/export/trail'
            label='Gerar Caderno de Estudo (MD+PDF)'
            payload={{ universeId: data.universeId, trailId: activeTrail.id, isPublic: false }}
          />
        ) : null}
        {activeTrail ? (
          <TrailLab
            slug={slug}
            universeId={data.universeId}
            trail={activeTrail}
            initialDoneStepIds={doneStepIds}
            isLoggedIn={Boolean(session && session.userId !== 'dev-bypass')}
            onMarkDone={markDoneAction}
          />
        ) : (
          <p className='muted' style={{ margin: 0 }}>
            Abra uma trilha para visualizar as etapas.
          </p>
        )}
      </Card>

      <Card className='stack'>
        <Portais slug={slug} currentPath='trilhas' title='Proximas portas' />
      </Card>
    </div>
  );
}
