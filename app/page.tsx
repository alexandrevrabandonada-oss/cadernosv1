import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HeroPanel } from '@/components/universe/HeroPanel';
import { BigPortalCard } from '@/components/universe/BigPortalCard';
import { HighlightsStrip, type HighlightStripItem } from '@/components/universe/HighlightsStrip';
import { Wordmark } from '@/components/brand/Wordmark';
import { UniverseSeal } from '@/components/brand/UniverseSeal';
import { EditorialMediaFrame } from '@/components/brand/EditorialMediaFrame';
import { BrandIcon } from '@/components/brand/icons/BrandIcon';
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
    <main className='stack'>
      <HeroPanel
        className='home-hero'
        eyebrow='Portal Publico'
        title='Universos de prova, memoria e disputa'
        subtitle='Cadernos Vivos organiza evidencias, linha do tempo, mapa e debate em percursos editoriais para leitura publica.'
        meta={<Wordmark variant='hero' />}
        actions={
          <>
            <a className='ui-button' href='#universos'>
              Explorar universos
            </a>
            <a className='ui-button' data-variant='ghost' href='#como-funciona'>
              Entender como funciona
            </a>
          </>
        }
        aside={
          featuredHub ? (
            <article className='feature-universe-card surface-plate'>
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
                subtitle='Entrada editorial para leitura rapida'
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
          preview={<EditorialMediaFrame title='Provas' subtitle='Trechos, citacoes e rastreio' label='SALA' accent='action' />}
        />
        <BigPortalCard
          href={buildUniverseHref(targetSlug, 'trilhas')}
          title='Seguir uma Trilha'
          description='Percursos guiados para leitura progressiva do acervo.'
          cta='Abrir Trilhas'
          badge='Curadoria'
          preview={<EditorialMediaFrame title='Trilhas' subtitle='Percursos por investigacao' label='SALA' accent='editorial' />}
        />
        <BigPortalCard
          href={buildUniverseHref(targetSlug, 'tutor')}
          title='Entrar no Tutor'
          description='Sessões por pontos de conhecimento com checkpoint e evidencias obrigatorias.'
          cta='Abrir Tutor'
          badge='Tutor Mode'
          preview={<EditorialMediaFrame title='Tutor' subtitle='Sessao guiada por pontos' label='SALA' accent='editorial' />}
        />
      </section>

      <Card className='stack surface-panel' id='universos'>
        <header className='stack' style={{ gap: '0.35rem' }}>
          <h2 style={{ margin: 0 }}>Universos em destaque</h2>
          <p className='muted' style={{ margin: 0 }}>
            Entradas publicas para explorar dados, provas e narrativas em cada territorio.
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
              <Link className='ui-button' href={buildUniverseHref(universe.slug, '')} data-variant='primary'>
                Entrar no universo
              </Link>
            </article>
          ))}
          {universoCards.length === 0 ? (
            <article className='universe-door-card surface-blade'>
              <h3>Nenhum universo publicado</h3>
              <p className='muted'>O catalogo publico esta em preparacao. Volte em breve.</p>
              {session ? (
                <Link className='ui-button' href='/admin/universes'>
                  Ir para /admin
                </Link>
              ) : null}
            </article>
          ) : null}
        </div>
      </Card>

      <Card className='stack surface-blade'>
        <HighlightsStrip
          title='Fios quentes'
          description='Sinalizacao editorial do que esta mais ativo no universo em foco.'
          items={hotItems.slice(0, 6).map((item) => ({
            ...item,
            label: item.label === 'Evidencia' ? 'Evidencia' : item.label,
          }))}
          emptyLabel='Sem destaques recentes disponiveis. Abra um universo para explorar as portas principais.'
        />
      </Card>

      <Card className='stack surface-plate' id='como-funciona'>
        <header className='stack' style={{ gap: '0.35rem' }}>
          <h2 style={{ margin: 0 }}>Como funciona</h2>
          <p className='muted' style={{ margin: 0 }}>
            Leitura publica orientada por prova, contexto e continuidade.
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
