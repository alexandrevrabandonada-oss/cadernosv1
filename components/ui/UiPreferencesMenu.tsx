'use client';

import { DensityToggle } from '@/components/ui/DensityToggle';
import { FocusToggle } from '@/components/ui/FocusToggle';
import { HapticsToggle } from '@/components/ui/HapticsToggle';
import { SoundCuesToggle } from '@/components/ui/SoundCuesToggle';
import { TextureToggle } from '@/components/ui/TextureToggle';

export function UiPreferencesMenu({ compact = false }: { compact?: boolean }) {
  return (
    <div className='ui-prefs stack' data-testid='ui-preferences'>
      <small className='muted' style={{ margin: 0 }}>
        Preferencias
      </small>
      <FocusToggle compactLabel={compact} />
      <DensityToggle compactLabel={compact} />
      <TextureToggle compactLabel={compact} />
      <HapticsToggle compactLabel={compact} />
      <SoundCuesToggle compactLabel={compact} />
    </div>
  );
}
