import { Wordmark } from '@/components/brand/Wordmark';
import { type BrandIconName } from '@/components/brand/icons/BrandIcon';
import { FocusUniverseCard } from '@/components/editorial/FocusUniverseCard';
import { EditorialSignalRail, type EditorialSignalItem } from '@/components/editorial/EditorialSignalRail';
import { LiveHighlightCard } from '@/components/editorial/LiveHighlightCard';
import { PageReadyMarker } from '@/components/nav/PageReadyMarker';
import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { BigPortalCard } from '@/components/universe/BigPortalCard';
import { HeroPanel } from '@/components/universe/HeroPanel';
import { HighlightsStrip, type HighlightStripItem } from '@/components/universe/HighlightsStrip';
import { MiniPreviewDebate, MiniPreviewLinha, MiniPreviewMapa, MiniPreviewProvas } from '@/components/universe/PortalPreviews';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCurrentSession } from '@/lib/auth/server';
import { getHomeEditorialState, type HomeEditorialSignal } from '@/lib/catalog/homeEditorial';
import { buildUniverseHref } from '@/lib/universeNav';

type HomePageProps = {
  searchParams: Promise<{ q?: string }>;
};

function signalIcon(type: HomeEditorialSignal['type']): BrandIconName {
  if (type === 'event') return 'linha';
  if (type === 'thread') return 'debate';
  if (type === 'term') return 'glossario';
  if (type === 'node') return 'mapa';
  if (type === 'pack') return 'share';
  return 'provas';
}

function signalMeta(type: HomeEditorialSignal['type']) {
  if (type === 'event') return 'marco quente';
  if (type === 'thread') return 'pergunta aberta';
  if (type === 'term') return 'indice vivo';
  if (type === 'node') return 'porta central';
  if (type === 'pack') return 'curadoria semanal';
  return 'prova destacada';
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const [editorial, session] = await Promise.all([getHomeEditorialState(query), getCurrentSession()]);

  const focusUniverse = editorial.focusUniverse;
  const featuredUniverseCard = editorial.featuredUniverses[0] ?? null;
  const secondaryUniverseCards = editorial.featuredUniverses.slice(1, 6);
  const leadSignal = editorial.signals[0] ?? null;
  const railSignals: EditorialSignalItem[] = editorial.signals.slice(1, 5).map((item) => ({
    id: item.id,
    label: item.label,
    title: item.title,
    href: item.href,
    meta: item.meta,
    icon: signalIcon(item.type),
    tone: item.type === 'evidence' ? 'action' : 'editorial',
  }));

  const hotItems: HighlightStripItem[] = editorial.signals.slice(0, 6).map((item) => ({
    id: item.id,
    label: item.label,
    title: item.title,
    description: item.description,
    href: item.href,
  }));

  const targetSlug = focusUniverse?.slug ?? featuredUniverseCard?.slug ?? 'exemplo';

  return (
    <main className='stack stack-editorial'>
      <PageReadyMarker id='home' />
      <HeroPanel
        className='home-hero hero-panel-living hero-panel-live-editorial'
        eyebrow='Portal Publico'
        title='Universos de leitura, prova e disputa'
        subtitle='Entre por um recorte em curso: evidencias rastreaveis, marcos vivos e perguntas acionaveis ja organizadas para leitura guiada.'
        meta={<Wordmark variant='hero' className='hero-wordmark-ghost' />}
        actions={
          <>
            <PrefetchLink className='ui-button' href='#universos' data-variant='primary' smartPrefetch='off'>
              Explorar o catalogo
            </PrefetchLink>
            <PrefetchLink className='ui-button' href={buildUniverseHref(targetSlug, 'tutor')}>
              Comecar com Tutor
            </PrefetchLink>
            <PrefetchLink className='ui-button' data-variant='ghost' href='#como-funciona' smartPrefetch='off'>
              Como ler este universo
            </PrefetchLink>
          </>
        }
        aside={
          focusUniverse ? (
            <div className='hero-live-column'>
              <FocusUniverseCard
                title={focusUniverse.title}
                summary={focusUniverse.focus_note ?? focusUniverse.summary}
                href={buildUniverseHref(focusUniverse.slug, '')}
                metrics={[
                  { label: 'nos', value: String(focusUniverse.nodes) },
                  { label: 'trilhas', value: String(Math.max(focusUniverse.trails, 1)) },
                  { label: 'provas', value: String(focusUniverse.evidences) },
                ]}
                seal={focusUniverse.is_featured ? 'showcase' : 'published'}
                kicker='Universo em destaque'
                cta='Abrir universo'
              />
              {leadSignal ? (
                <LiveHighlightCard
                  label={leadSignal.label}
                  title={leadSignal.title}
                  description={leadSignal.description}
                  href={leadSignal.href}
                  meta={signalMeta(leadSignal.type)}
                  icon={signalIcon(leadSignal.type)}
                  tone={leadSignal.type === 'evidence' ? 'action' : 'editorial'}
                />
              ) : (
                <LiveHighlightCard
                  label='Edicao'
                  title='Trilho editorial em preparacao'
                  description='A curadoria desta vitrine publica esta sendo afinada. Entre no universo em foco para abrir as portas principais.'
                  href={buildUniverseHref(focusUniverse.slug, '')}
                  meta='vitrine viva'
                  icon='showcase'
                  tone='editorial'
                />
              )}
              <EditorialSignalRail items={railSignals} compact />
            </div>
          ) : (
            <div className='hero-live-column'>
              <FocusUniverseCard
                title='Vitrine em preparacao'
                summary={
                  session
                    ? 'Publique um universo para ativar o catalogo vivo da Home e ocupar o foco editorial com conteudo real.'
                    : 'A entrada publica ainda esta sendo montada. Assim que houver um universo publicado, ele aparecera aqui com foco editorial real.'
                }
                href={session ? '/admin/universes/featured' : '/login'}
                metrics={[
                  { label: 'status', value: 'edicao' },
                  { label: 'modo', value: session ? 'admin' : 'publico' },
                ]}
                seal='published'
                kicker='Universo em destaque'
                cta={session ? 'Gerir vitrine' : 'Entrar'}
              />
            </div>
          )
        }
      />

      <section className='portal-composition portal-composition-home' aria-label='Portas de entrada'>
        <div className='portal-composition-main'>
          <BigPortalCard
            href={buildUniverseHref(targetSlug, 'provas')}
            title='Explorar provas'
            description='Entre por evidencias curadas, relacionados e citacoes rastreaveis.'
            cta='Abrir Provas'
            badge='Evidence-first'
            preview={<MiniPreviewProvas />}
            className='is-featured'
          />
          <BigPortalCard
            href={buildUniverseHref(targetSlug, 'debate')}
            title='Abrir debate'
            description='Perguntas com citacoes, confianca e limitacoes em modo estrito.'
            cta='Abrir Debate'
            badge='Perguntas'
            preview={<MiniPreviewDebate />}
          />
        </div>
        <div className='portal-composition-side'>
          <BigPortalCard
            href={buildUniverseHref(targetSlug, 'linha')}
            title='Explorar linha' 
            description='Leia marcos cronologicos e reabra provas relacionadas no mesmo fluxo.'
            cta='Abrir Linha'
            badge='Cronologia'
            preview={<MiniPreviewLinha />}
            className='is-compact'
          />
          <BigPortalCard
            href={buildUniverseHref(targetSlug, 'mapa')}
            title='Explorar mapa'
            description='Veja cobertura por no e lacunas de curadoria no universo.'
            cta='Abrir Mapa'
            badge='Explorer'
            preview={<MiniPreviewMapa />}
            className='is-compact'
          />
        </div>
      </section>

      <Card className='stack surface-panel home-section-card home-featured-section' id='universos'>
        <header className='stack' style={{ gap: '0.35rem' }}>
          <h2 style={{ margin: 0 }}>Universos em destaque</h2>
          <p className='muted' style={{ margin: 0 }}>
            Vitrine viva dos universos publicados, priorizando foco editorial, destaque e sinais reais.
          </p>
        </header>
        {featuredUniverseCard ? (
          <div className='home-universe-layout'>
            <article className='universe-door-card universe-door-card-lead surface-plate'>
              <div className='toolbar-row'>
                <Badge>
                  {featuredUniverseCard.focus_override ? 'foco editorial' : featuredUniverseCard.is_featured ? 'destaque' : 'publicado'}
                </Badge>
                <Badge>{new Date(featuredUniverseCard.published_at ?? '').toLocaleDateString('pt-BR')}</Badge>
              </div>
              <h3>{featuredUniverseCard.title}</h3>
              <p className='muted'>{featuredUniverseCard.focus_note ?? featuredUniverseCard.summary}</p>
              <div className='toolbar-row'>
                <Badge>{`nos:${featuredUniverseCard.nodes}`}</Badge>
                <Badge>{`trilhas:${featuredUniverseCard.trails}`}</Badge>
                <Badge>{`provas:${featuredUniverseCard.evidences}`}</Badge>
              </div>
              <div className='toolbar-row'>
                <PrefetchLink className='ui-button' href={buildUniverseHref(featuredUniverseCard.slug, '')} data-variant='primary' prefetchOnVisible>
                  Entrar no universo
                </PrefetchLink>
                <PrefetchLink className='ui-button' href={buildUniverseHref(featuredUniverseCard.slug, 'tutor')} data-variant='ghost'>
                  Abrir Tutor
                </PrefetchLink>
              </div>
            </article>

            <div className='home-universe-side'>
              {secondaryUniverseCards.map((universe) => (
                <article key={universe.id} className='universe-door-card universe-door-card-compact surface-blade'>
                  <div className='toolbar-row'>
                    <Badge>{universe.is_featured ? 'destaque' : 'publicado'}</Badge>
                    <Badge>{`provas:${universe.evidences}`}</Badge>
                  </div>
                  <h3>{universe.title}</h3>
                  <p className='muted'>{universe.focus_note ?? universe.summary}</p>
                  <PrefetchLink className='ui-button' href={buildUniverseHref(universe.slug, '')} data-variant='ghost'>
                    Entrar
                  </PrefetchLink>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className='home-empty-inline'>
            <EmptyState
              title='Vitrine em preparacao'
              description={
                session
                  ? 'Publique um universo e marque destaque para ativar a vitrine viva da Home.'
                  : 'Ainda nao ha universos publicados. Assim que a vitrine abrir, o foco editorial aparecera aqui.'
              }
              variant='no-data'
              actions={
                session
                  ? [
                      { label: 'Gerir destaque/focus', href: '/admin/universes/featured' },
                      { label: 'Criar universo', href: '/admin/universes' },
                    ]
                  : [{ label: 'Como funciona', href: '#como-funciona' }]
              }
            />
          </div>
        )}
      </Card>

      <section className='home-editorial-grid'>
        <Card className='stack surface-blade home-section-card surface-soft'>
          <HighlightsStrip
            title='Fios quentes'
            description='Sinais editoriais puxados dos universos publicados: provas, marcos, perguntas e portas conceituais.'
            items={hotItems}
            emptyLabel='Ainda nao ha sinais publicados suficientes para compor o trilho editorial.'
          />
        </Card>

        <Card className='stack surface-plate home-section-card home-how-section' id='como-funciona'>
          <header className='stack' style={{ gap: '0.35rem' }}>
            <h2 style={{ margin: 0 }}>Como ler este universo</h2>
            <p className='muted' style={{ margin: 0 }}>
              Fluxo curto para sair da curiosidade e chegar em leitura rastreavel.
            </p>
          </header>
          <div className='how-it-works-grid'>
            <article className='surface-blade'>
              <small>01</small>
              <strong>Entrar no universo</strong>
              <p className='muted'>Comece pelo foco editorial e use o hub para entender o recorte e as perguntas centrais.</p>
            </article>
            <article className='surface-blade'>
              <small>02</small>
              <strong>Explorar com prova</strong>
              <p className='muted'>Cruze Provas, Linha, Mapa e Debate sem perder o contexto publico do universo.</p>
            </article>
            <article className='surface-blade'>
              <small>03</small>
              <strong>Continuar pela trilha</strong>
              <p className='muted'>Use tutor, share pages e trilhas para transformar leitura em percurso recorrente.</p>
            </article>
          </div>
        </Card>
      </section>
    </main>
  );
}


