import { Card } from '@/components/ui/Card';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { PortalsRail } from '@/components/portals/PortalsRail';
import { PageReadyMarker } from '@/components/nav/PageReadyMarker';
import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { ShareButton } from '@/components/share/ShareButton';
import { Badge, Carimbo } from '@/components/ui/Badge';
import { getHubData } from '@/lib/data/universe';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { buildUniverseHref } from '@/lib/universeNav';
import { UniverseVisibilityBadge } from '@/components/universe/UniverseVisibilityBadge';
import { getUserUiSettings } from '@/lib/user/settings';
import { HeroPanel } from '@/components/universe/HeroPanel';
import { UniverseMetaBar } from '@/components/universe/UniverseMetaBar';
import { BigPortalCard } from '@/components/universe/BigPortalCard';
import { HighlightsStrip } from '@/components/universe/HighlightsStrip';
import { ResumeJourneyCard } from '@/components/universe/ResumeJourneyCard';
import { MiniPreviewDebate, MiniPreviewMapa, MiniPreviewProvas } from '@/components/universe/PortalPreviews';
import { Wordmark } from '@/components/brand/Wordmark';
import { UniverseSeal } from '@/components/brand/UniverseSeal';
import { EditorialMediaFrame } from '@/components/brand/EditorialMediaFrame';
import { BrandIcon } from '@/components/brand/icons/BrandIcon';
import { getStudyWeekSummary } from '@/lib/study/service';

type UniversoPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDaysAgo(isoDate: string | null | undefined) {
  if (!isoDate) return 'sem registro';
  const target = new Date(isoDate);
  const diffMs = Date.now() - target.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return target.toLocaleDateString('pt-BR');
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (days === 0) return 'hoje';
  if (days === 1) return 'ha 1 dia';
  return `ha ${days} dias`;
}

export default async function UniversoHubPage({ params }: UniversoPageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, '');
  const access = await getUniverseAccessBySlug(slug);
  const universe = await getHubData(slug);
  const uiPrefs = await getUserUiSettings();
  const studyWeek = uiPrefs.isLoggedIn ? await getStudyWeekSummary(slug) : null;

  const sectionLabels: Record<string, string> = {
    mapa: 'Mapa',
    provas: 'Provas',
    linha: 'Linha',
    debate: 'Debate',
    glossario: 'Glossario',
    trilhas: 'Trilhas',
    tutor: 'Tutor',
  };
  const lastSection = uiPrefs.settings.last_section;
  const updatedAgo = formatDaysAgo(access.universe?.published_at);
  const isShowcase = universe.highlights.enabled;

  const highlightItems = [
    ...universe.highlights.evidences.map((item) => ({
      id: `ev-${item.id}`,
      label: 'Evidencia',
      title: item.title,
      description: item.summary,
      href: buildUniverseHref(
        slug,
        `provas?selected=${encodeURIComponent(item.id)}&panel=detail${item.nodeSlug ? `&node=${encodeURIComponent(item.nodeSlug)}` : ''}`,
      ),
    })),
    ...universe.highlights.events.map((item) => ({
      id: `event-${item.id}`,
      label: 'Linha',
      title: item.title,
      description: `${item.kind ?? 'evento'}${item.day ? ` - ${new Date(item.day).toLocaleDateString('pt-BR')}` : ''}`,
      href: buildUniverseHref(slug, `linha?selected=${encodeURIComponent(item.id)}&panel=detail`),
    })),
    ...universe.highlights.questions.map((item, index) => ({
      id: `q-${index}`,
      label: 'Debate',
      title: item.question,
      description: 'Pergunta editorial pronta para entrada no debate.',
      href: buildUniverseHref(
        slug,
        `debate?q=${encodeURIComponent(item.question)}${item.nodeSlug ? `&node=${encodeURIComponent(item.nodeSlug)}` : ''}`,
      ),
    })),
  ];

  const primaryHighlight = highlightItems[0] ?? null;
  const secondaryHighlights = highlightItems.slice(1, 7);

  return (
    <div className='stack stack-editorial'>
      <PageReadyMarker id={`hub:${slug}`} />
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Hub' />

      <HeroPanel
        className='hub-hero'
        eyebrow='Entrada de Universo'
        title={universe.title}
        subtitle={universe.summary || 'Leitura viva do territorio com portas de prova, linha, mapa e debate.'}
        actions={
          <>
            <PrefetchLink
              className='ui-button'
              href={buildUniverseHref(slug, `trilhas?trail=${universe.quickStart.trailSlug}`)}
              data-track-event='cta_click'
              data-track-cta='comecar_aqui'
              data-track-section='hub'
            >
              Comecar em 5 minutos
            </PrefetchLink>
            <PrefetchLink
              className='ui-button'
              data-variant='ghost'
              href={buildUniverseHref(slug, 'provas')}
              data-track-event='cta_click'
              data-track-cta='explorar_provas'
              data-track-section='hub'
            >
              Explorar Provas
            </PrefetchLink>
          </>
        }
        meta={
          <div className='stack' style={{ gap: '0.7rem' }}>
            <Wordmark variant='compact' />
            <UniverseMetaBar
              items={[
                { label: 'Atualizado', value: updatedAgo },
                { label: 'Nos', value: String(universe.quickStart.nodesTotal) },
                { label: 'Trilhas', value: String(Math.max(universe.featuredTrails.length, 1)) },
                { label: 'Provas', value: String(universe.quickStart.evidencesTotal) },
              ]}
            />
          </div>
        }
        aside={
          <article className='feature-universe-card surface-plate'>
            <div className='toolbar-row'>
              <UniverseVisibilityBadge published={Boolean(access.published)} preview={Boolean(access.canPreview)} />
              {isShowcase ? <UniverseSeal kind='showcase' /> : <UniverseSeal kind='published' />}
            </div>
            <h2>Estado do universo</h2>
            <p className='muted'>Nucleo editorial pronto para leitura publica com trilha inicial e portas contextuais.</p>
            <div className='toolbar-row'>
              <Carimbo>{`docs:${universe.quickStart.docsProcessed}`}</Carimbo>
              <Carimbo>{`nos:${universe.quickStart.nodesTotal}`}</Carimbo>
              <Carimbo>{`evidencias:${universe.quickStart.evidencesTotal}`}</Carimbo>
            </div>
            <EditorialMediaFrame
              title='Nucleo de leitura'
              subtitle='Portas de prova, mapa e debate'
              label='UNIVERSO'
              accent='editorial'
            />
          </article>
        }
      />

      <section className='big-portal-grid' aria-label='Portas principais do universo'>
        <BigPortalCard
          href={buildUniverseHref(slug, 'provas')}
          title='Provas'
          description='Evidencias curadas com relacionados e links compartilhaveis.'
          cta='Entrar em Provas'
          badge='Porta 1'
          preview={<MiniPreviewProvas />}
          track={{ event: 'cta_click', cta: 'porta_provas', section: 'hub_portas' }}
        />
        <BigPortalCard
          href={buildUniverseHref(slug, 'mapa')}
          title='Mapa'
          description='Veja o nucleo do universo, cobertura por no e conexoes.'
          cta='Entrar no Mapa'
          badge='Porta 2'
          preview={<MiniPreviewMapa />}
          track={{ event: 'cta_click', cta: 'porta_mapa', section: 'hub_portas' }}
        />
        <BigPortalCard
          href={buildUniverseHref(slug, 'debate')}
          title='Debate'
          description='Perguntas rastreaveis com citacoes, confianca e limitacoes.'
          cta='Entrar no Debate'
          badge='Porta 3'
          preview={<MiniPreviewDebate />}
          track={{ event: 'cta_click', cta: 'porta_debate', section: 'hub_portas' }}
        />
      </section>

      <Card className='stack surface-panel quickstart-block'>
        <header className='stack' style={{ gap: '0.35rem' }}>
          <span className='toolbar-row'>
            <Badge variant='warning'>Comece Aqui</Badge>
            <BrandIcon name='trilhas' size={16} tone='editorial' />
          </span>
          <h2 style={{ margin: 0 }}>Comece em 5 minutos</h2>
          <p className='muted' style={{ margin: 0 }}>
            Uma trilha curta para abrir contexto, ler provas-chave e iniciar debate com foco.
          </p>
        </header>
        <div className='toolbar-row'>
          <PrefetchLink className='ui-button' href={buildUniverseHref(slug, `trilhas?trail=${universe.quickStart.trailSlug}`)}>
            Iniciar trilha
          </PrefetchLink>
          <PrefetchLink className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'tutor')}>
            Abrir Tutor
          </PrefetchLink>
        </div>
        <div className='quick-questions-grid'>
          {universe.quickStart.questions.slice(0, 3).map((item, index) => (
            <PrefetchLink
              key={`${item.question}-${index}`}
              className='quick-question-card surface-blade'
              href={buildUniverseHref(
                slug,
                `debate?q=${encodeURIComponent(item.question)}${item.nodeSlug ? `&node=${encodeURIComponent(item.nodeSlug)}` : ''}`,
              )}
            >
              <small>{item.label}</small>
              <BrandIcon name='debate' size={14} tone='editorial' />
              <strong>{item.question}</strong>
            </PrefetchLink>
          ))}
        </div>
      </Card>

      {studyWeek ? (
        <Card className='stack surface-plate'>
          <header className='stack' style={{ gap: '0.35rem' }}>
            <h2 style={{ margin: 0 }}>Seu ritmo nesta semana</h2>
            <p className='muted' style={{ margin: 0 }}>
              Recap leve do que voce realmente estudou neste universo, sem ranking nem comparacao.
            </p>
          </header>
          <div className='toolbar-row'>
            <Carimbo>{`dias ativos:${studyWeek.activeDays}`}</Carimbo>
            <Carimbo>{`minutos:${studyWeek.focusMinutes}`}</Carimbo>
            <Carimbo>{`itens:${studyWeek.itemsStudied}`}</Carimbo>
          </div>
          <PrefetchLink className='ui-button' href={buildUniverseHref(slug, 'meu-caderno/recap')}>
            Abrir Recap
          </PrefetchLink>
        </Card>
      ) : null}

      <Card className='stack surface-plate' id='destaques'>
        <header className='stack' style={{ gap: '0.35rem' }}>
          <h2 style={{ margin: 0 }}>Destaques editoriais</h2>
          <p className='muted' style={{ margin: 0 }}>
            Ponto de entrada com prova principal, marcos e perguntas para aprofundar por sala.
          </p>
        </header>
        <div className='hub-highlights-layout'>
          {primaryHighlight ? (
            <article className='highlight-primary surface-panel'>
              <Badge>{primaryHighlight.label}</Badge>
              <h3>{primaryHighlight.title}</h3>
              <p className='muted'>{primaryHighlight.description}</p>
              <div className='toolbar-row'>
                <PrefetchLink className='ui-button' href={primaryHighlight.href}>
                  Abrir destaque
                </PrefetchLink>
                {primaryHighlight.label === 'Evidencia' ? (
                  <ShareButton
                    url={`/c/${slug}/s/evidence/${primaryHighlight.id.replace('ev-', '')}`}
                    title={primaryHighlight.title}
                    text={primaryHighlight.description}
                    label='Compartilhar'
                  />
                ) : null}
              </div>
            </article>
          ) : (
            <article className='highlight-primary surface-panel'>
              <h3>Painel em atualizacao</h3>
              <p className='muted'>Curadoria de destaques ainda em montagem. Use Provas, Linha e Debate para iniciar.</p>
            </article>
          )}
          <div className='highlight-secondary-grid cv-snap-row cv-scroll-cue'>
            {secondaryHighlights.slice(0, 6).map((item) => (
              <PrefetchLink key={item.id} className='highlight-secondary-item surface-blade cv-motion cv-hover' href={item.href}>
                <Badge>{item.label}</Badge>
                <strong>{item.title}</strong>
              </PrefetchLink>
            ))}
          </div>
        </div>
      </Card>

      <Card className='stack surface-panel'>
        <HighlightsStrip
          title='Proximas portas'
          description='Continue a investigacao com filtros e contexto preservados entre salas.'
          items={highlightItems.slice(0, 4)}
          emptyLabel='Use as portas principais para iniciar e construir destaques.'
        />
        <PortalsRail universeSlug={slug} context={{ type: 'none' }} variant='footer' title='Portais contextuais' />
      </Card>

      {uiPrefs.isLoggedIn && lastSection ? (
        <ResumeJourneyCard
          title={`Continuar no ${sectionLabels[lastSection] ?? lastSection}`}
          description='Retome o ponto onde voce parou com filtros e contexto preservados.'
          href={buildUniverseHref(slug, lastSection)}
          cta='Continuar de onde parei'
        />
      ) : null}
    </div>
  );
}
