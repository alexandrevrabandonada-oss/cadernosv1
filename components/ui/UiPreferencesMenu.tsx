'use client';

import { DensityToggle } from '@/components/ui/DensityToggle';
import { TextureToggle } from '@/components/ui/TextureToggle';

export function UiPreferencesMenu({ compact = false }: { compact?: boolean }) {
  return (
    <div className='ui-prefs stack' data-testid='ui-preferences'>
      <small className='muted' style={{ margin: 0 }}>
        Preferencias
      </small>
      <DensityToggle compactLabel={compact} />
      <TextureToggle compactLabel={compact} />
    </div>
  );
}

