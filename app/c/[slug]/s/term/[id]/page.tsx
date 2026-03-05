import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShareButton } from '@/components/share/ShareButton';
import { Wordmark } from '@/components/brand/Wordmark';
import { BrandIcon } from '@/components/brand/icons/BrandIcon';
import { EvidenceSeal } from '@/components/brand/EvidenceSeal';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getShareTerm } from '@/lib/share/content';
import { buildUniverseHref } from '@/lib/universeNav';

type ShareTermPageProps = {
  params: Promise<{ slug: string; id: string }>;
};

function ogPath(slug: string, id: string) {
  return `/api/og?type=term&u=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`;
}

export async function generateMetadata({ params }: ShareTermPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const term = await getShareTerm(slug, id);
  if (!term) return { title: 'Termo nao encontrado' };
  return {
    title: `${term.term} - Termo do Glossario`,
    description: term.snippet,
    openGraph: {
      title: `${term.term} - Termo do Glossario`,
      description: term.snippet,
      images: [ogPath(slug, id)],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${term.term} - Termo do Glossario`,
      description: term.snippet,
      images: [ogPath(slug, id)],
    },
  };
}

export default async function ShareTermPage({ params }: ShareTermPageProps) {
  const { slug, id } = await params;
  const term = await getShareTerm(slug, id);
  if (!term) notFound();

  const canonical = `/c/${slug}/s/term/${id}`;
  const glossarioHref = `${buildUniverseHref(slug, 'glossario')}?selected=${encodeURIComponent(term.id)}&panel=detail`;
  const provasHref = `${buildUniverseHref(slug, 'provas')}${term.nodeSlug ? `?node=${encodeURIComponent(term.nodeSlug)}` : ''}`;
  const debateHref = `${buildUniverseHref(slug, 'debate')}${term.nodeSlug ? `?node=${encodeURIComponent(term.nodeSlug)}&status=strict_ok` : ''}`;
  const linhaHref = `${buildUniverseHref(slug, 'linha')}${term.nodeSlug ? `?node=${encodeURIComponent(term.nodeSlug)}` : ''}`;

  return (
    <main className='stack'>
      <Card className='stack'>
        <div className='toolbar-row'>
          <Wordmark variant='compact' />
          <span className='muted' style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <BrandIcon name='glossario' size={14} tone='editorial' />
            Termo do glossario
          </span>
        </div>
        <SectionHeader title={term.term} description={term.universeTitle} tag='Termo do Glossario' />
        <p style={{ margin: 0 }}>{term.snippet}</p>
        <div className='toolbar-row'>
          {term.tags.map((tag) => (
            <Carimbo key={tag}>{tag}</Carimbo>
          ))}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Evidencias em destaque' description='Evidencias ligadas ao termo.' />
        <div className='stack'>
          {term.evidences.map((item) => (
            <article key={item.id} className='core-node stack'>
              <EvidenceSeal kind='proof' />
              <strong>{item.title}</strong>
              <p style={{ margin: 0 }}>{item.summary}</p>
              <Link className='ui-button' data-variant='ghost' href={`${buildUniverseHref(slug, 'provas')}?selected=${encodeURIComponent(item.id)}&panel=detail`}>
                Ver evidencia
              </Link>
            </article>
          ))}
          {term.evidences.length === 0 ? <p className='muted'>Sem evidencias destacadas.</p> : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Perguntas sugeridas' description='Perguntas para iniciar no Debate.' />
        <div className='toolbar-row'>
          {term.questions.map((question) => (
            <Link key={question} className='ui-button' data-variant='ghost' href={`${buildUniverseHref(slug, 'debate')}?ask=${encodeURIComponent(question)}${term.nodeSlug ? `&node=${encodeURIComponent(term.nodeSlug)}` : ''}`}>
              {question}
            </Link>
          ))}
        </div>
      </Card>

      <Card className='stack'>
        <div className='toolbar-row'>
          <Link
            className='ui-button'
            href={glossarioHref}
            data-track-event='share_open_app'
            data-track-cta='open_app_term'
            data-track-section='share_term'
            data-track-object-type='term'
            data-track-object-id={id}
          >
            Abrir no app
          </Link>
          <Link className='ui-button' data-variant='ghost' href={provasHref}>
            Ver Provas
          </Link>
          <Link className='ui-button' data-variant='ghost' href={debateHref}>
            Ver Debate
          </Link>
          <Link className='ui-button' data-variant='ghost' href={linhaHref}>
            Ver Linha
          </Link>
          <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'tutor')}>
            Abrir no Tutor
          </Link>
          <ShareButton url={canonical} title={term.term} text={term.snippet} />
        </div>
      </Card>
    </main>
  );
}
