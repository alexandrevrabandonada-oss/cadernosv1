'use client';

import { PreferencesDrawer } from '@/components/ui/PreferencesDrawer';

export function UiPreferencesMenu({ compact = false }: { compact?: boolean }) {
  return <PreferencesDrawer compact={compact} />;
}
