import { Card } from '@/components/ui/Card';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { PortalsRail } from '@/components/portals/PortalsRail';
import { ShareButton } from '@/components/share/ShareButton';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getHubData } from '@/lib/data/universe';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { buildUniverseHref } from '@/lib/universeNav';
import { UniverseVisibilityBadge } from '@/components/universe/UniverseVisibilityBadge';
import { getUserUiSettings } from '@/lib/user/settings';

type UniversoPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function UniversoHubPage({ params }: UniversoPageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, '');
  const access = await getUniverseAccessBySlug(slug);
  const universe = await getHubData(slug);
  const uiPrefs = await getUserUiSettings();

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

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Hub' />

      <Card className='stack'>
        <SectionHeader
          title='Comece Aqui'
          description='Entrada rapida em 20s: entenda o universo, inicie a trilha e faca perguntas guiadas.'
          tag='Quick Start'
        />
        <p className='muted' style={{ margin: 0 }}>
          {universe.summary}
        </p>
        <div className='toolbar-row'>
          <Carimbo>{`docs processados:${universe.quickStart.docsProcessed}`}</Carimbo>
          <Carimbo>{`nos:${universe.quickStart.nodesTotal}`}</Carimbo>
          <Carimbo>{`evidencias:${universe.quickStart.evidencesTotal}`}</Carimbo>
        </div>
        <div className='toolbar-row'>
          <a
            className='ui-button'
            href={buildUniverseHref(slug, `trilhas?trail=${universe.quickStart.trailSlug}`)}
            data-track-event='cta_click'
            data-track-cta='comecar_aqui'
            data-track-section='hub'
          >
            Iniciar trilha &quot;Comece Aqui&quot;
          </a>
          <a
            className='ui-button'
            data-variant='ghost'
            href={buildUniverseHref(slug, 'debate')}
            data-track-event='cta_click'
            data-track-cta='abrir_debate'
            data-track-section='hub'
          >
            Abrir Debate
          </a>
          {uiPrefs.isLoggedIn && lastSection ? (
            <a className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, lastSection)}>
              Continuar de onde parou: {sectionLabels[lastSection] ?? lastSection}
            </a>
          ) : null}
        </div>
        <SectionHeader title='Perguntas prontas' description='Clique para abrir o Debate com contexto ja definido.' />
        <div className='toolbar-row' role='list' aria-label='Perguntas prontas de onboarding'>
          {universe.quickStart.questions.map((item, index) => (
            <a
              key={`${item.question}-${index}`}
              className='ui-button'
              data-variant='ghost'
              href={buildUniverseHref(
                slug,
                `debate?q=${encodeURIComponent(item.question)}${item.nodeSlug ? `&node=${encodeURIComponent(item.nodeSlug)}` : ''}`,
              )}
            >
              {item.label}: {item.question}
            </a>
          ))}
        </div>
      </Card>

      {universe.highlights.enabled ? (
        <Card className='stack' id='destaques'>
          <SectionHeader
            title='Destaques'
            description='Kit de vitrine com evidencias, perguntas e marcos da linha para iniciar a jornada publica.'
            tag='Vitrine'
          />

          <section className='stack'>
            <h3 style={{ margin: 0 }}>Evidencias destacadas</h3>
            <div className='stack'>
              {universe.highlights.evidences.map((item) => (
                <article key={item.id} className='core-node stack'>
                  <strong>{item.title}</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    {item.summary}
                  </p>
                  <div className='toolbar-row'>
                    <a
                      className='ui-button'
                      href={buildUniverseHref(
                        slug,
                        `provas?selected=${encodeURIComponent(item.id)}&panel=detail${item.nodeSlug ? `&node=${encodeURIComponent(item.nodeSlug)}` : ''}`,
                      )}
                      data-track-event='evidence_click'
                      data-track-cta='hub_evidence'
                      data-track-section='hub_highlights'
                    >
                      Abrir evidencia
                    </a>
                    <ShareButton
                      url={`/c/${slug}/s/evidence/${item.id}`}
                      title={item.title}
                      text={item.summary}
                      label='Compartilhar'
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className='stack'>
            <h3 style={{ margin: 0 }}>Perguntas destacadas</h3>
            <div className='toolbar-row'>
              {universe.highlights.questions.map((item, index) => (
                <span key={`${item.question}-${index}`} className='toolbar-row'>
                  <a
                    className='ui-button'
                    data-variant='ghost'
                    href={buildUniverseHref(
                      slug,
                      `debate?q=${encodeURIComponent(item.question)}${item.nodeSlug ? `&node=${encodeURIComponent(item.nodeSlug)}` : ''}`,
                    )}
                  >
                    {item.question}
                  </a>
                  <ShareButton
                    url={`/c/${slug}/s`}
                    title={`Pergunta em destaque - ${slug}`}
                    text={item.question}
                    label='Compartilhar'
                  />
                </span>
              ))}
            </div>
          </section>

          <section className='stack'>
            <h3 style={{ margin: 0 }}>Linha em destaque</h3>
            <div className='stack'>
              {universe.highlights.events.map((item) => (
                <article key={item.id} className='core-node stack'>
                  <strong>{item.title}</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    {item.day ? new Date(item.day).toLocaleDateString('pt-BR') : 's/data'} | {item.kind ?? 'evento'}
                  </p>
                  <div className='toolbar-row'>
                    <a className='ui-button' href={buildUniverseHref(slug, `linha?selected=${encodeURIComponent(item.id)}&panel=detail`)}>
                      Abrir evento
                    </a>
                    <ShareButton
                      url={`/c/${slug}/s/event/${item.id}`}
                      title={item.title}
                      text={`${item.kind ?? 'evento'} em ${item.day ?? 's/data'}`}
                      label='Compartilhar'
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className='toolbar-row'>
            <a
              className='ui-button'
              href={buildUniverseHref(slug, 'provas')}
              data-track-event='cta_click'
              data-track-cta='explorar_provas'
              data-track-section='hub'
            >
              Explorar Provas
            </a>
            <a
              className='ui-button'
              data-variant='ghost'
              href={buildUniverseHref(slug, 'tutor')}
              data-track-event='cta_click'
              data-track-cta='abrir_tutor'
              data-track-section='hub'
            >
              Comecar Tutor
            </a>
            <a className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'linha')}>
              Ver Linha
            </a>
          </div>
        </Card>
      ) : null}

      <Card className='stack'>
        <SectionHeader title={universe.title} description={universe.summary} tag='Hub do Universo' />
        <div className='toolbar-row'>
          <UniverseVisibilityBadge published={Boolean(access.published)} preview={Boolean(access.canPreview)} />
          <p className='muted' style={{ margin: 0 }}>
            Slug tecnico: <strong>{slug}</strong>
          </p>
          <Carimbo>{universe.source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader
          title='Nucleo'
          description='Nucleo com nos para orientar exploracao, investigacao e conexoes.'
          tag='5-9 nos'
        />
        <div className='core-grid'>
          {universe.coreNodes.map((node) => (
            <article className='core-node' key={node.id}>
              <strong>{node.label}</strong>
              <div className='toolbar-row'>
                <Carimbo>{node.type}</Carimbo>
                {typeof node.docsCount === 'number' && node.docsCount > 0 ? <Carimbo>{`docs:${node.docsCount}`}</Carimbo> : null}
                {typeof node.evidencesCount === 'number' && node.evidencesCount > 0 ? (
                  <Carimbo>{`evidencias:${node.evidencesCount}`}</Carimbo>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Trilhas em destaque' description='Entradas sugeridas para iniciar o percurso.' />
        <div className='stack'>
          {universe.featuredTrails.map((trail) => (
            <article key={trail.id} className='core-node'>
              <strong>{trail.title}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {trail.summary}
              </p>
            </article>
          ))}
          {universe.featuredTrails.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Sem trilhas em destaque por enquanto.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Provas recentes' description='Evidencias curadas para leitura inicial.' />
        <div className='stack'>
          {universe.featuredEvidences.map((evidence) => (
            <article key={evidence.id} className='core-node'>
              <strong>{evidence.title}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {evidence.summary}
              </p>
            </article>
          ))}
          {universe.featuredEvidences.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Sem evidencias em destaque por enquanto.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Perguntar ao universo' description='Avance para o Debate e envie sua pergunta com base nas provas.' />
        <div className='toolbar-row'>
          <a className='ui-button' href={buildUniverseHref(slug, 'debate')}>
            Perguntar ao universo
          </a>
        </div>
      </Card>

      <Card className='stack'>
        <PortalsRail universeSlug={slug} context={{ type: 'none' }} variant='footer' title='Proximas portas' />
      </Card>
    </div>
  );
}
