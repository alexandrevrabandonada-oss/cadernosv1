import { Card } from '@/components/ui/Card';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getHubData } from '@/lib/data/universe';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { buildUniverseHref } from '@/lib/universeNav';
import { UniverseVisibilityBadge } from '@/components/universe/UniverseVisibilityBadge';

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
          <a className='ui-button' href={buildUniverseHref(slug, `trilhas?trail=${universe.quickStart.trailSlug}`)}>
            Iniciar trilha &quot;Comece Aqui&quot;
          </a>
          <a className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'debate')}>
            Abrir Debate
          </a>
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
        <Portais slug={slug} title='Portais do universo' />
      </Card>
    </div>
  );
}
