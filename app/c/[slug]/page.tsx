import { FocusUniverseCard } from '@/components/editorial/FocusUniverseCard';
import { EditorialSignalRail, type EditorialSignalItem } from '@/components/editorial/EditorialSignalRail';
import { LiveHighlightCard } from '@/components/editorial/LiveHighlightCard';
import { PageReadyMarker } from '@/components/nav/PageReadyMarker';
import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { PortalsRail } from '@/components/portals/PortalsRail';
import { ShareButton } from '@/components/share/ShareButton';
import { BrandIcon, type BrandIconName } from '@/components/brand/icons/BrandIcon';
import { UniverseSeal } from '@/components/brand/UniverseSeal';
import { Wordmark } from '@/components/brand/Wordmark';
import { ResumeJourneyCard } from '@/components/universe/ResumeJourneyCard';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { BigPortalCard } from '@/components/universe/BigPortalCard';
import { HeroPanel } from '@/components/universe/HeroPanel';
import { HighlightsStrip } from '@/components/universe/HighlightsStrip';
import { MiniPreviewDebate, MiniPreviewMapa, MiniPreviewProvas } from '@/components/universe/PortalPreviews';
import { UniverseMetaBar } from '@/components/universe/UniverseMetaBar';
import { UniverseVisibilityBadge } from '@/components/universe/UniverseVisibilityBadge';
import { Badge, Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getHubData } from '@/lib/data/universe';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { getStudyWeekSummary } from '@/lib/study/service';
import { buildUniverseHref } from '@/lib/universeNav';
import { getUserUiSettings } from '@/lib/user/settings';

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

function signalIcon(label: string): BrandIconName {
  if (label === 'Linha') return 'linha';
  if (label === 'Debate') return 'debate';
  return 'provas';
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
  const heroSignals: EditorialSignalItem[] = secondaryHighlights.slice(0, 3).map((item) => ({
    id: item.id,
    label: item.label,
    title: item.title,
    href: item.href,
    meta: item.label === 'Linha' ? 'marco' : item.label === 'Debate' ? 'pergunta' : 'prova',
    icon: signalIcon(item.label),
    tone: item.label === 'Evidencia' ? 'action' : 'editorial',
  }));

  return (
    <div className='stack stack-editorial'>
      <PageReadyMarker id={`hub:${slug}`} />
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Hub' />

      <HeroPanel
        className='hub-hero hero-panel-living hero-panel-live-editorial'
        eyebrow='Hub editorial'
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
              Comecar pela trilha
            </PrefetchLink>
            <PrefetchLink
              className='ui-button'
              data-variant='ghost'
              href={buildUniverseHref(slug, 'provas')}
              data-track-event='cta_click'
              data-track-cta='explorar_provas'
              data-track-section='hub'
            >
              Abrir Provas
            </PrefetchLink>
          </>
        }
        meta={
          <div className='stack hero-meta-stack' style={{ gap: '0.7rem' }}>
            <Wordmark variant='compact' className='hero-wordmark-ghost' />
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
          <div className='hero-live-column'>
            <FocusUniverseCard
              title={`${universe.title} em operacao`}
              summary='Entrada editorial do universo, com trilha curta, portas principais e sinais vivos para orientar a leitura.'
              href={buildUniverseHref(slug, '')}
              metrics={[
                { label: 'docs', value: String(universe.quickStart.docsProcessed) },
                { label: 'nos', value: String(universe.quickStart.nodesTotal) },
                { label: 'provas', value: String(universe.quickStart.evidencesTotal) },
              ]}
              seal={isShowcase ? 'showcase' : 'published'}
              kicker='Entrada editorial'
              cta='Voltar ao Hub'
            />

            {primaryHighlight ? (
              <LiveHighlightCard
                label={primaryHighlight.label}
                title={primaryHighlight.title}
                description={primaryHighlight.description}
                href={primaryHighlight.href}
                meta={primaryHighlight.label === 'Linha' ? 'marco quente' : primaryHighlight.label === 'Debate' ? 'pergunta aberta' : 'prova destacada'}
                icon={signalIcon(primaryHighlight.label)}
                tone={primaryHighlight.label === 'Evidencia' ? 'action' : 'editorial'}
              />
            ) : (
              <LiveHighlightCard
                label='Edicao'
                title='Destaque editorial em preparacao'
                description='O universo ja esta acessivel pelas portas principais. A curadoria de sinais quentes segue em atualizacao.'
                href={buildUniverseHref(slug, 'provas')}
                meta='em montagem'
                icon='showcase'
                tone='editorial'
              />
            )}

            <EditorialSignalRail items={heroSignals} compact />
          </div>
        }
      />

      <section className='portal-composition portal-composition-hub' aria-label='Portas principais do universo'>
        <div className='portal-composition-main'>
          <BigPortalCard
            href={buildUniverseHref(slug, 'provas')}
            title='Provas'
            description='Evidencias curadas com relacionados, detalhe rico e links compartilhaveis.'
            cta='Abrir Provas'
            badge='Porta 1'
            preview={<MiniPreviewProvas />}
            className='is-featured'
            track={{ event: 'cta_click', cta: 'porta_provas', section: 'hub_portas' }}
          />
          <BigPortalCard
            href={buildUniverseHref(slug, 'debate')}
            title='Debate'
            description='Perguntas rastreaveis com citacoes, confianca e limitacoes.'
            cta='Abrir Debate'
            badge='Porta 2'
            preview={<MiniPreviewDebate />}
            track={{ event: 'cta_click', cta: 'porta_debate', section: 'hub_portas' }}
          />
        </div>
        <div className='portal-composition-side'>
          <BigPortalCard
            href={buildUniverseHref(slug, 'mapa')}
            title='Mapa'
            description='Veja o nucleo do universo, cobertura por no e conexoes.'
            cta='Abrir Mapa'
            badge='Porta 3'
            preview={<MiniPreviewMapa />}
            className='is-compact'
            track={{ event: 'cta_click', cta: 'porta_mapa', section: 'hub_portas' }}
          />
          <Card className='stack surface-plate hub-rhythm-card'>
            <div className='toolbar-row'>
              <Badge variant='warning'>Comece Aqui</Badge>
              <BrandIcon name='trilhas' size={16} tone='editorial' />
            </div>
            <strong>Entrada guiada em 5 minutos</strong>
            <p className='muted' style={{ margin: 0 }}>Abra a trilha curta para ganhar contexto, reter provas-chave e entrar no debate sem dispersar.</p>
            <div className='toolbar-row'>
              <PrefetchLink className='ui-button' href={buildUniverseHref(slug, `trilhas?trail=${universe.quickStart.trailSlug}`)}>
                Iniciar trilha
              </PrefetchLink>
              <PrefetchLink className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'tutor')}>
                Abrir Tutor
              </PrefetchLink>
            </div>
          </Card>
        </div>
      </section>

      <section className='hub-editorial-grid'>
        <Card className='stack surface-panel quickstart-block hub-section-card'>
          <header className='stack' style={{ gap: '0.35rem' }}>
            <span className='toolbar-row'>
              <Badge variant='warning'>Perguntas de partida</Badge>
              <BrandIcon name='debate' size={16} tone='editorial' />
            </span>
            <h2 style={{ margin: 0 }}>Comece em 5 minutos</h2>
            <p className='muted' style={{ margin: 0 }}>
              Uma trilha curta para abrir contexto, ler provas-chave e iniciar debate com foco.
            </p>
          </header>
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
          <Card className='stack surface-plate hub-section-card hub-rhythm-card'>
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
            <div className='toolbar-row'>
              <UniverseVisibilityBadge published={Boolean(access.published)} preview={Boolean(access.canPreview)} />
              {isShowcase ? <UniverseSeal kind='showcase' /> : <UniverseSeal kind='published' />}
            </div>
            <PrefetchLink className='ui-button' href={buildUniverseHref(slug, 'meu-caderno/recap')}>
              Abrir Recap
            </PrefetchLink>
          </Card>
        ) : null}
      </section>

      <Card className='stack surface-plate hub-section-card' id='destaques'>
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

      <section className='hub-bottom-grid'>
        <Card className='stack surface-panel hub-section-card surface-soft'>
          <HighlightsStrip
            title='Proximas portas'
            description='Continue a investigacao com filtros e contexto preservados entre salas.'
            items={highlightItems.slice(0, 4)}
            emptyLabel='Use as portas principais para iniciar e construir destaques.'
          />
        </Card>

        <Card className='stack surface-plate hub-section-card'>
          <PortalsRail universeSlug={slug} context={{ type: 'none' }} variant='footer' title='Portais contextuais' />
        </Card>
      </section>

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


