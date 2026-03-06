import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { StudyRecapClient } from '@/components/study/StudyRecapClient';
import { getHubData } from '@/lib/data/universe';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { buildUniverseHref } from '@/lib/universeNav';
import { getUserUiSettings } from '@/lib/user/settings';

type MeuCadernoRecapPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function MeuCadernoRecapPage({ params }: MeuCadernoRecapPageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, 'meu-caderno/recap');
  const access = await getUniverseAccessBySlug(slug);
  if (!access.universe) notFound();
  if (!access.published && !access.canPreview) notFound();

  const [hub, uiPrefs] = await Promise.all([getHubData(slug), getUserUiSettings()]);
  const recommendationSeed = {
    nodes: hub.coreNodes.slice(0, 8).map((node) => ({
      id: node.id,
      slug: node.slug ?? node.id,
      title: node.label,
      summary: node.summary ?? null,
      tags: node.tags ?? [],
    })),
    evidences: (hub.highlights.evidences.length > 0 ? hub.highlights.evidences : hub.featuredEvidences)
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary ?? null,
        href: `${buildUniverseHref(slug, 'provas')}?selected=${item.id}&panel=detail`,
        nodeSlug: 'nodeSlug' in item && typeof item.nodeSlug === 'string' ? item.nodeSlug : null,
        tags: [],
      })),
  };

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Seu Recap' />
      <StudyRecapClient
        slug={slug}
        title={access.universe.title}
        isLoggedIn={uiPrefs.isLoggedIn}
        lastSection={uiPrefs.settings.last_section}
        recommendationSeed={recommendationSeed}
      />
      <Card className='stack'>
        <Portais slug={slug} currentPath='meu-caderno' title='Proximas portas' />
      </Card>
    </div>
  );
}

