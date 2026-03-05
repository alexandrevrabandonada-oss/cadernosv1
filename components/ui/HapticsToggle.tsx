'use client';

import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';

export function HapticsToggle({ compactLabel = false }: { compactLabel?: boolean }) {
  const prefs = useUiPrefsContext();
  const value = Boolean(prefs?.settings.haptics);

  return (
    <div className='toolbar-row' role='group' aria-label='Feedback haptico' data-testid='haptics-toggle'>
      {!compactLabel ? <small className='muted'>Haptics</small> : null}
      <button
        type='button'
        className='ui-button'
        data-variant={value ? undefined : 'ghost'}
        onClick={() => prefs?.setHaptics(true)}
        aria-pressed={value}
      >
        Ligado
      </button>
      <button
        type='button'
        className='ui-button'
        data-variant={!value ? undefined : 'ghost'}
        onClick={() => prefs?.setHaptics(false)}
        aria-pressed={!value}
      >
        Desligado
      </button>
    </div>
  );
}
