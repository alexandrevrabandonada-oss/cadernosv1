import { DebatePanel } from '@/components/debate/DebatePanel';
import Link from 'next/link';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { FilterRail } from '@/components/workspace/FilterRail';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getRecentQuestions, getUniverseContextBySlug } from '@/lib/data/debate';
import { getUniverseMock } from '@/lib/mock/universe';
import { buildUniverseHref } from '@/lib/universeNav';

type DebatePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    node?: string;
    back?: string;
    selected?: string;
    panel?: string;
  }>;
};

export default async function DebatePage({ params, searchParams }: DebatePageProps) {
  const { slug } = await params;
  const { q, node, back, selected } = await searchParams;
  const currentPath = buildUniverseHref(slug, 'debate');

  const universe = await getUniverseContextBySlug(slug);
  const fallback = getUniverseMock(slug);
  const title = universe?.title ?? fallback.title;
  const recent = universe ? await getRecentQuestions(universe.id, 8) : [];
  const selectedId = selected ?? '';
  const selectedQuestion = recent.find((item) => item.id === selectedId) ?? null;

  const makeSelectedLink = (id: string, question: string) => {
    const qs = new URLSearchParams();
    qs.set('selected', id);
    qs.set('panel', 'detail');
    qs.set('q', question);
    if (node) qs.set('node', node);
    if (back) qs.set('back', back);
    return `${currentPath}?${qs.toString()}`;
  };

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Debate' />

      <WorkspaceShell
        slug={slug}
        section='debate'
        title={`Debate de ${title}`}
        subtitle='Pergunte, revise evidencias e navegue pelas fontes.'
        selectedId={selectedId}
        detailTitle='Pergunta selecionada'
        filter={
          <FilterRail>
            <div className='stack'>
              <p className='muted' style={{ margin: 0 }}>
                Filtro por no ativo:
              </p>
              <p style={{ margin: 0 }}>
                {node ? <strong>{node}</strong> : 'Sem filtro de no no momento.'}
              </p>
              <Link className='ui-button' href={currentPath} data-variant='ghost'>
                Limpar estado
              </Link>
            </div>
          </FilterRail>
        }
        detail={
          selectedQuestion ? (
            <div className='stack'>
              <article className='core-node'>
                <strong>Pergunta</strong>
                <p style={{ margin: 0 }}>{selectedQuestion.question}</p>
                <p className='muted' style={{ margin: 0 }}>
                  {new Date(selectedQuestion.createdAt).toLocaleString('pt-BR')}
                </p>
              </article>
              <Link className='ui-button' href={makeSelectedLink(selectedQuestion.id, selectedQuestion.question)}>
                Reabrir no debate
              </Link>
            </div>
          ) : null
        }
      >
        <div className='stack'>
          <Card className='stack'>
            <SectionHeader title='Perguntas recentes' description='Clique para abrir no detalhe e usar como pergunta inicial.' />
            <div className='stack'>
              {recent.map((item) => (
                <article key={item.id} className='core-node'>
                  <strong>{item.question}</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </p>
                  <Link className='ui-button' data-variant='ghost' href={makeSelectedLink(item.id, item.question)}>
                    Ver detalhe
                  </Link>
                </article>
              ))}
            </div>
          </Card>

          <DebatePanel
            slug={slug}
            universeId={universe?.id ?? null}
            recent={recent}
            initialQuestion={q ?? ''}
            initialNodeSlug={node ?? ''}
            backUrl={back ?? ''}
            showRecent={false}
          />
        </div>
      </WorkspaceShell>

      <Card className='stack'>
        <Portais slug={slug} currentPath='debate' title='Proximas portas' />
      </Card>
    </div>
  );
}
