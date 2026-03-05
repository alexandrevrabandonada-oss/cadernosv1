import Link from 'next/link';
import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { PortalsRail } from '@/components/portals/PortalsRail';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FocusToggle } from '@/components/ui/FocusToggle';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrailBranches } from '@/components/trilhas/TrailBranches';
import { TrailPlayer } from '@/components/trilhas/TrailPlayer';
import { GenerateExportButton } from '@/components/export/GenerateExportButton';
import { FilterRail } from '@/components/workspace/FilterRail';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { markStepDone } from '@/app/actions/progress';
import { getCurrentSession } from '@/lib/auth/server';
import { getTrilhasV2Data, resolveActiveStep, resolveTrail } from '@/lib/data/trilhas';
import { listDoneStepsForTrail } from '@/lib/progress/server';
import { buildUniverseHref } from '@/lib/universeNav';

type TrilhasPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    trail?: string;
    step?: string;
    mode?: 'list' | 'player';
  }>;
};

function stepHref(basePath: string, trailRef: string, step: number, mode: 'list' | 'player' = 'player') {
  const qs = new URLSearchParams();
  qs.set('mode', mode);
  qs.set('trail', trailRef);
  qs.set('step', String(step));
  return `${basePath}?${qs.toString()}`;
}

export default async function TrilhasPage({ params, searchParams }: TrilhasPageProps) {
  const { slug } = await params;
  const { trail: trailRef, step: stepParam, mode = 'list' } = await searchParams;
  const currentPath = buildUniverseHref(slug, 'trilhas');
  const data = await getTrilhasV2Data(slug);
  const selectedTrail = resolveTrail(data, trailRef);
  const activeStep = resolveActiveStep(selectedTrail, stepParam);
  const activeStepOrder = activeStep?.order ?? 1;

  const session = await getCurrentSession();
  const doneStepIds =
    selectedTrail && data.universeId && session && session.userId !== 'dev-bypass'
      ? await listDoneStepsForTrail(selectedTrail.id)
      : [];

  async function markDoneAction(input: { universeId: string; trailId: string; stepId: string }) {
    'use server';
    return markStepDone(input);
  }

  const listMode = mode !== 'player' || !selectedTrail;
  const tutorReady = selectedTrail
    ? selectedTrail.steps.some((item) => item.requiresQuestion || item.requiredEvidenceIds.length > 0 || Boolean(item.guidedQuestion))
    : false;

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Trilhas' />

      <Card className='stack'>
        <SectionHeader
          title={`Trilhas de ${data.universeTitle}`}
          description='Percursos de investigacao com passos, ramificacoes e atalhos contextuais.'
          tag='Trilhas v2'
        />
        <div className='toolbar-row'>
          <FocusToggle compactLabel />
          <Carimbo>{data.source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
          <Carimbo>{`trilhas:${data.trails.length}`}</Carimbo>
        </div>
      </Card>

      <TrailBranches slug={slug} coreNodes={data.coreNodes} tags={data.tags} />

      {listMode ? (
        <Card className='stack'>
          <SectionHeader title='Catalogo de percursos' description='Escolha uma jornada e entre no modo player com checkpoints.' />
          <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {data.trails.map((trail) => {
              const openHref = stepHref(currentPath, trail.slug, 1, 'player');
              const tutorReadyTrail = trail.hasGuided || trail.hasRequiredEvidence;
              return (
                <article key={trail.id} className='core-node stack'>
                  <strong>{trail.title}</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    {trail.summary}
                  </p>
                  <div className='toolbar-row'>
                    {trail.isQuickStart ? <Carimbo>Comece Aqui</Carimbo> : null}
                    {tutorReadyTrail ? <Carimbo>Tutor-ready</Carimbo> : null}
                    <Carimbo>{`${trail.stepsCount} passos`}</Carimbo>
                    <Carimbo>{`${trail.estimatedMinutes} min`}</Carimbo>
                  </div>
                  {trail.focus.length > 0 ? (
                    <p className='muted' style={{ margin: 0 }}>
                      Foco: {trail.focus.join(' • ')}
                    </p>
                  ) : null}
                  <div className='toolbar-row'>
                    <Link className='ui-button' href={openHref}>
                      Abrir trilha
                    </Link>
                    {tutorReadyTrail ? (
                      <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'tutor')}>
                        Abrir no Tutor
                      </Link>
                    ) : null}
                  </div>
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
      ) : (
        <WorkspaceShell
          slug={slug}
          section='trilhas'
          title={selectedTrail ? `${selectedTrail.title}` : 'Player de trilha'}
          subtitle={selectedTrail?.summary ?? 'Abra um percurso para entrar no modo player.'}
          selectedId={selectedTrail?.id ?? ''}
          detailTitle='Progresso e atalhos'
          filter={
            <FilterRail>
              <div className='stack'>
                <div className='toolbar-row'>
                  <Link className='ui-button' data-variant='ghost' href={`${currentPath}?mode=list`}>
                    Voltar ao catalogo
                  </Link>
                </div>
                <SectionHeader title='Passos' description='Navegue por step via URL.' />
                {selectedTrail?.steps.map((step) => (
                  <Link
                    key={step.id}
                    className='ui-button'
                    data-variant={step.order === activeStepOrder ? undefined : 'ghost'}
                    href={stepHref(currentPath, selectedTrail.slug, step.order)}
                  >
                    {step.order}. {step.title}
                  </Link>
                ))}
              </div>
            </FilterRail>
          }
          detail={
            selectedTrail && activeStep ? (
              <div className='stack'>
                <article className='core-node stack'>
                  <strong>Progresso</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    Passo {activeStep.order}/{selectedTrail.steps.length}
                  </p>
                  {tutorReady ? (
                    <Link className='ui-button' href={buildUniverseHref(slug, 'tutor')}>
                      Abrir no Tutor
                    </Link>
                  ) : null}
                </article>

                <article className='core-node stack'>
                  <strong>Atalhos filtrados</strong>
                  <PrefetchLink
                    className='ui-button'
                    href={`${buildUniverseHref(slug, 'provas')}${activeStep.nodeSlug ? `?node=${encodeURIComponent(activeStep.nodeSlug)}` : ''}`}
                  >
                    Ver Provas do no
                  </PrefetchLink>
                  <PrefetchLink
                    className='ui-button'
                    data-variant='ghost'
                    href={`${buildUniverseHref(slug, 'linha')}${activeStep.nodeSlug ? `?node=${encodeURIComponent(activeStep.nodeSlug)}` : ''}`}
                  >
                    Ver Linha do no
                  </PrefetchLink>
                  <PrefetchLink
                    className='ui-button'
                    data-variant='ghost'
                    href={`${buildUniverseHref(slug, 'debate')}?status=strict_ok${activeStep.nodeSlug ? `&node=${encodeURIComponent(activeStep.nodeSlug)}` : ''}`}
                  >
                    Ver Debate do no
                  </PrefetchLink>
                </article>

                <article className='core-node stack'>
                  <PortalsRail
                    universeSlug={slug}
                    variant='detail'
                    title='Relacionados'
                    context={{
                      type: 'trail',
                      trailId: selectedTrail.id,
                      nodeSlug: activeStep.nodeSlug ?? activeStep.guidedNodeSlug ?? '',
                    }}
                  />
                </article>

                {data.universeId ? (
                  <GenerateExportButton
                    endpoint='/api/admin/export/trail'
                    label='Gerar Caderno de Estudo'
                    payload={{ universeId: data.universeId, trailId: selectedTrail.id, isPublic: false }}
                    shareSlug={slug}
                  />
                ) : null}
              </div>
            ) : null
          }
        >
          <div className='stack'>
            {selectedTrail ? (
              <TrailPlayer
                slug={slug}
                universeId={data.universeId}
                trail={selectedTrail}
                activeStepOrder={activeStepOrder}
                initialDoneStepIds={doneStepIds}
                isLoggedIn={Boolean(session && session.userId !== 'dev-bypass')}
                onMarkDone={markDoneAction}
                backHref={stepHref(currentPath, selectedTrail.slug, activeStepOrder)}
              />
            ) : (
              <p className='muted' style={{ margin: 0 }}>
                Trilha nao encontrada.
              </p>
            )}
          </div>
        </WorkspaceShell>
      )}

      {selectedTrail ? (
        <TrailBranches slug={slug} coreNodes={data.coreNodes} tags={data.tags} />
      ) : null}

      <Card className='stack'>
        <Portais slug={slug} currentPath='trilhas' title='Proximas portas' />
      </Card>
    </div>
  );
}
