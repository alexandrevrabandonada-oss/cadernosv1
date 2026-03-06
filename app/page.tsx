import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HeroPanel } from '@/components/universe/HeroPanel';
import { BigPortalCard } from '@/components/universe/BigPortalCard';
import { HighlightsStrip, type HighlightStripItem } from '@/components/universe/HighlightsStrip';
import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { MiniPreviewDebate, MiniPreviewLinha, MiniPreviewMapa, MiniPreviewProvas } from '@/components/universe/PortalPreviews';
import { PageReadyMarker } from '@/components/nav/PageReadyMarker';
import { Wordmark } from '@/components/brand/Wordmark';
import { UniverseSeal } from '@/components/brand/UniverseSeal';
import { EditorialMediaFrame } from '@/components/brand/EditorialMediaFrame';
import { BrandIcon } from '@/components/brand/icons/BrandIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { listPublishedUniverses } from '@/lib/data/universes';
import { getCurrentSession } from '@/lib/auth/server';
import { getHubData } from '@/lib/data/universe';
import { buildUniverseHref } from '@/lib/universeNav';

type HomePageProps = {
  searchParams: Promise<{ q?: string }>;
};

function getFeatureUniverseSlug(universes: Array<{ slug: string; hasHighlights?: boolean }>) {
  const featured = universes.find((item) => item.hasHighlights);
  return featured?.slug ?? universes[0]?.slug ?? null;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const [universes, session] = await Promise.all([listPublishedUniverses({ q: query }), getCurrentSession()]);
  const featuredSlug = getFeatureUniverseSlug(universes);
  const featuredHub = featuredSlug ? await getHubData(featuredSlug) : null;

  const hotItems: HighlightStripItem[] = [];
  if (featuredHub?.highlights.evidences.length) {
    hotItems.push(
      ...featuredHub.highlights.evidences.slice(0, 2).map((item) => ({
        id: `ev-${item.id}`,
        label: 'Evidencia',
        title: item.title,
        description: item.summary,
        href: buildUniverseHref(featuredHub.slug, `provas?selected=${encodeURIComponent(item.id)}&panel=detail`),
      })),
    );
  }
  if (featuredHub?.highlights.events.length) {
    hotItems.push(
      ...featuredHub.highlights.events.slice(0, 2).map((item) => ({
        id: `event-${item.id}`,
        label: 'Linha',
        title: item.title,
        description: `${item.kind ?? 'evento'} ${item.day ? `- ${new Date(item.day).toLocaleDateString('pt-BR')}` : ''}`,
        href: buildUniverseHref(featuredHub.slug, `linha?selected=${encodeURIComponent(item.id)}&panel=detail`),
      })),
    );
  }
  if (featuredHub?.highlights.questions.length) {
    hotItems.push(
      ...featuredHub.highlights.questions.slice(0, 2).map((item, index) => ({
        id: `question-${index}`,
        label: 'Debate',
        title: item.question,
        description: 'Pergunta em destaque para abrir no modo estrito com evidencias.',
        href: buildUniverseHref(
          featuredHub.slug,
          `debate?q=${encodeURIComponent(item.question)}${item.nodeSlug ? `&node=${encodeURIComponent(item.nodeSlug)}` : ''}`,
        ),
      })),
    );
  }

  const universoCards = await Promise.all(
    universes.slice(0, 6).map(async (universe) => {
      const hub = await getHubData(universe.slug);
      return {
        ...universe,
        nodes: hub.quickStart.nodesTotal,
        trails: hub.featuredTrails.length,
        evidences: hub.quickStart.evidencesTotal,
      };
    }),
  );

  const targetSlug = featuredHub?.slug ?? universes[0]?.slug ?? 'exemplo';

  return (
    <main className='stack stack-editorial'>
      <PageReadyMarker id='home' />
      <HeroPanel
        className='home-hero'
        eyebrow='Portal Publico'
        title='Universos de prova, memoria e disputa'
        subtitle='Entre em salas conectadas por evidencias rastreaveis, marcos historicos e perguntas publicas em modo de leitura guiada.'
        meta={<Wordmark variant='hero' className='hero-wordmark-ghost' />}
        actions={
          <>
            <PrefetchLink className='ui-button' href='#universos' data-variant='primary' smartPrefetch='off'>
              Explorar universos
            </PrefetchLink>
            <PrefetchLink className='ui-button' href={buildUniverseHref(targetSlug, 'tutor')}>
              Comecar no Tutor
            </PrefetchLink>
            <PrefetchLink className='ui-button' data-variant='ghost' href='#como-funciona' smartPrefetch='off'>
              Como ler este universo
            </PrefetchLink>
          </>
        }
        aside={
          featuredHub ? (
            <article className='feature-universe-card surface-plate hero-sidecar'>
              <small>Universo em foco</small>
              <h2>{featuredHub.title}</h2>
              <p className='muted'>{featuredHub.summary}</p>
              <div className='toolbar-row'>
                <Badge>{`nos:${featuredHub.quickStart.nodesTotal}`}</Badge>
                <Badge>{`provas:${featuredHub.quickStart.evidencesTotal}`}</Badge>
                <Badge>{`docs:${featuredHub.quickStart.docsProcessed}`}</Badge>
              </div>
              <EditorialMediaFrame
                title='Arquivo ativo'
                subtitle='Leitura orientada por provas, linha e debate'
                label='FOCO'
                accent='editorial'
              />
              <Link className='ui-button' href={buildUniverseHref(featuredHub.slug, '')}>
                Entrar no universo
              </Link>
            </article>
          ) : null
        }
      />

      <section className='big-portal-grid' aria-label='Portas de entrada'>
        <BigPortalCard
          href={buildUniverseHref(targetSlug, 'provas')}
          title='Explorar Provas'
          description='Entre por evidencias curadas, relacionados e citações rastreaveis.'
          cta='Abrir Provas'
          badge='Evidence-first'
          preview={<MiniPreviewProvas />}
        />
        <BigPortalCard
          href={buildUniverseHref(targetSlug, 'linha')}
          title='Seguir a Linha'
          description='Leia marcos cronologicos e abra provas relacionadas no mesmo fluxo.'
          cta='Abrir Linha'
          badge='Cronologia'
          preview={<MiniPreviewLinha />}
        />
        <BigPortalCard
          href={buildUniverseHref(targetSlug, 'debate')}
          title='Abrir Debate'
          description='Perguntas com citacoes, confianca e limitacoes em modo estrito.'
          cta='Abrir Debate'
          badge='Perguntas'
          preview={<MiniPreviewDebate />}
        />
      </section>

      <section className='big-portal-grid' aria-label='Portas complementares'>
        <BigPortalCard
          href={buildUniverseHref(targetSlug, 'mapa')}
          title='Explorar Mapa'
          description='Veja cobertura por no e lacunas de curadoria no universo.'
          cta='Abrir Mapa'
          badge='Explorer'
          preview={<MiniPreviewMapa />}
        />
      </section>

      <Card className='stack surface-panel home-section-card' id='universos'>
        <header className='stack' style={{ gap: '0.35rem' }}>
          <h2 style={{ margin: 0 }}>Universos em destaque</h2>
          <p className='muted' style={{ margin: 0 }}>
            Cada universo abre um recorte territorial com provas, trilhas e perguntas prontas para uso publico.
          </p>
        </header>
        <div className='universe-doors-grid'>
          {universoCards.map((universe, index) => (
            <article key={universe.id} className={['universe-door-card surface-plate', index === 0 && universe.hasHighlights ? 'is-highlighted' : ''].join(' ')}>
              <div className='toolbar-row'>
                {universe.hasHighlights ? <UniverseSeal kind='showcase' /> : <UniverseSeal kind='published' />}
                <Badge>{new Date(universe.published_at ?? '').toLocaleDateString('pt-BR')}</Badge>
              </div>
              <h3>{universe.title}</h3>
              <p className='muted'>{universe.summary}</p>
              <div className='toolbar-row'>
                <Badge>{`nos:${universe.nodes}`}</Badge>
                <Badge>{`trilhas:${universe.trails}`}</Badge>
                <Badge>{`provas:${universe.evidences}`}</Badge>
              </div>
              <PrefetchLink className='ui-button' href={buildUniverseHref(universe.slug, '')} data-variant='primary' prefetchOnVisible={index === 0}>
                Entrar no universo
              </PrefetchLink>
            </article>
          ))}
          {universoCards.length === 0 ? (
            <EmptyState
              title='Catalogo em preparacao'
              description={session ? 'Ative uma vitrine ou abra a demo para revisar a entrada publica do produto.' : 'Nenhum universo publico esta aberto agora. Explore o fluxo guiado ou volte na proxima atualizacao.'}
              variant='no-data'
              actions={session ? [{ label: 'Criar/ativar vitrine', href: '/admin/universes' }, { label: 'Abrir demo em preview', href: '/c/poluicao-vr' }] : [{ label: 'Como funciona', href: '#como-funciona' }, { label: 'Abrir universo vitrine', href: '/c/poluicao-vr' }]}
            />
          ) : null}
        </div>
      </Card>

      <Card className='stack surface-blade home-section-card surface-soft'>
        <HighlightsStrip
          title='Fios quentes'
          description='Sinais editoriais do que merece leitura agora: provas fortes, marcos e perguntas acionaveis.'
          items={hotItems.slice(0, 6).map((item) => ({
            ...item,
            label: item.label === 'Evidencia' ? 'Evidencia' : item.label,
          }))}
          emptyLabel='Sem destaques recentes disponiveis. Abra um universo para explorar as portas principais.'
        />
      </Card>

      <Card className='stack surface-plate home-section-card' id='como-funciona'>
        <header className='stack' style={{ gap: '0.35rem' }}>
          <h2 style={{ margin: 0 }}>Como ler este universo</h2>
          <p className='muted' style={{ margin: 0 }}>
            Fluxo curto para sair da curiosidade e chegar em leitura rastreavel.
          </p>
        </header>
        <div className='how-it-works-grid'>
          <article className='surface-blade'>
            <small>01</small>
            <BrandIcon name='mapa' size={16} tone='editorial' />
            <strong>Entrar no universo</strong>
            <p className='muted'>Comece pelo hub para entender escopo, perguntas e caminhos.</p>
          </article>
          <article className='surface-blade'>
            <small>02</small>
            <BrandIcon name='provas' size={16} tone='action' />
            <strong>Explorar com prova</strong>
            <p className='muted'>Cruze Provas, Linha, Mapa e Debate sem perder contexto.</p>
          </article>
          <article className='surface-blade'>
            <small>03</small>
            <BrandIcon name='share' size={16} tone='editorial' />
            <strong>Compartilhar e continuar</strong>
            <p className='muted'>Use share pages e tutor para consolidar e redistribuir aprendizado.</p>
          </article>
        </div>
      </Card>
    </main>
  );
}


