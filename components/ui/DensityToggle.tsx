'use client';

import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';

type Density = 'normal' | 'compact';

export function DensityToggle({ compactLabel = false }: { compactLabel?: boolean }) {
  const prefs = useUiPrefsContext();
  const density: Density = prefs?.settings.density === 'compact' ? 'compact' : 'normal';

  return (
    <div className='toolbar-row' role='group' aria-label='Densidade da interface' data-testid='density-toggle'>
      {!compactLabel ? <small className='muted'>Densidade</small> : null}
      <button
        type='button'
        className='ui-button'
        data-variant={density === 'compact' ? undefined : 'ghost'}
        onClick={() => {
          prefs?.setDensity('compact');
        }}
      >
        Compacto
      </button>
      <button
        type='button'
        className='ui-button'
        data-variant={density === 'normal' ? undefined : 'ghost'}
        onClick={() => {
          prefs?.setDensity('normal');
        }}
      >
        Normal
      </button>
    </div>
  );
}
