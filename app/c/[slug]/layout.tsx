import { notFound } from 'next/navigation';
import { QuickNav } from '@/components/QuickNav';
import { Card } from '@/components/ui/Card';
import { UniverseVisibilityBadge } from '@/components/universe/UniverseVisibilityBadge';
import { getUniverseAccessBySlug } from '@/lib/data/universes';

type UniversoLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>;

export default async function UniversoLayout({ children, params }: UniversoLayoutProps) {
  const { slug } = await params;
  const access = await getUniverseAccessBySlug(slug);

  if (!access.universe) {
    notFound();
  }

  if (!access.published && !access.canPreview) {
    notFound();
  }

  return (
    <main className='split-layout'>
      <QuickNav slug={slug} />
      <div className='stack'>
        {!access.published && access.canPreview ? (
          <Card className='stack'>
            <UniverseVisibilityBadge published={false} preview />
            <p className='muted' style={{ margin: 0 }}>
              Este universo ainda nao esta publicado. Somente editor/admin pode ver este preview.
            </p>
          </Card>
        ) : null}
        {children}
      </div>
    </main>
  );
}
