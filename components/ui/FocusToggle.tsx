'use client';

import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';

export function FocusToggle({ compactLabel = false }: { compactLabel?: boolean }) {
  const prefs = useUiPrefsContext();
  const focusOn = Boolean(prefs?.settings.focus_mode);

  return (
    <div className='toolbar-row' role='group' aria-label='Modo imersao' data-testid='focus-toggle'>
      {!compactLabel ? <small className='muted'>Imersao</small> : null}
      <button
        type='button'
        className='ui-button'
        data-variant={focusOn ? undefined : 'ghost'}
        onClick={() => prefs?.setFocusMode(true)}
        aria-pressed={focusOn}
      >
        Ligado
      </button>
      <button
        type='button'
        className='ui-button'
        data-variant={!focusOn ? undefined : 'ghost'}
        onClick={() => prefs?.setFocusMode(false)}
        aria-pressed={!focusOn}
      >
        Normal
      </button>
    </div>
  );
}
