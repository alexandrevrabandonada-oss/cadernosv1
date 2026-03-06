import { notFound } from 'next/navigation';
import { AnalyticsBridge } from '@/components/analytics/AnalyticsBridge';
import { QuickNav } from '@/components/QuickNav';
import { CommandPalette } from '@/components/command/CommandPalette';
import { StudyTrackerProvider } from '@/components/study/StudyTrackerProvider';
import { Card } from '@/components/ui/Card';
import { MotionModeSync } from '@/components/ui/MotionModeSync';
import { RestrictedStateCard } from '@/components/ui/state/RestrictedStateCard';
import { UiPrefsProvider } from '@/components/ui/UiPrefsProvider';
import { UniverseVisibilityBadge } from '@/components/universe/UniverseVisibilityBadge';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceContext';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { getUserUiSettings } from '@/lib/user/settings';

type UniversoLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>;

export default async function UniversoLayout({ children, params }: UniversoLayoutProps) {
  const { slug } = await params;
  const access = await getUniverseAccessBySlug(slug);
  const uiPrefs = await getUserUiSettings();
  const snapshotMode = process.env.UI_SNAPSHOT === '1' || process.env.NEXT_PUBLIC_UI_SNAPSHOT === '1';

  if (!access.universe) {
    notFound();
  }

  if (!access.published && !access.canPreview) {
    notFound();
  }

  return (
    <UiPrefsProvider initialSettings={uiPrefs.settings} isLoggedIn={uiPrefs.isLoggedIn}>
      <WorkspaceProvider>
        <StudyTrackerProvider universeSlug={slug}>
          <MotionModeSync />
          <main
            className='split-layout'
            data-density={uiPrefs.settings.density}
            data-texture={uiPrefs.settings.texture}
            data-focus={uiPrefs.settings.focus_mode && !snapshotMode ? 'on' : 'off'}
          >
            <AnalyticsBridge universeSlug={slug} />
            <QuickNav slug={slug} />
            <div className='stack'>
              {!access.published && access.canPreview ? (
                <Card className='stack'>
                  <UniverseVisibilityBadge published={false} preview />
                  <RestrictedStateCard
                    eyebrow='preview editorial'
                    title='Este universo ainda esta em preparacao'
                    description='A leitura publica continua fechada por enquanto. Somente editor e admin podem navegar neste preview para revisar material, estados e publicacao.'
                    primaryAction={{ label: 'Voltar para Home', href: '/' }}
                  />
                </Card>
              ) : null}
              {children}
            </div>
          </main>
          <CommandPalette universeSlug={slug} />
        </StudyTrackerProvider>
      </WorkspaceProvider>
    </UiPrefsProvider>
  );
}
