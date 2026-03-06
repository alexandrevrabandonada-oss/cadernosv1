'use client';

import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';

export function SoundCuesToggle({ compactLabel = false }: { compactLabel?: boolean }) {
  const prefs = useUiPrefsContext();
  const value = Boolean(prefs?.settings.sound_cues);

  const touchTargetStyle = compactLabel ? { minHeight: 46, height: 46 } : undefined;

  return (
    <div className='toolbar-row' role='group' aria-label='Feedback sonoro' data-testid='sound-toggle'>
      {!compactLabel ? <small className='muted'>Som</small> : null}
      <button
        type='button'
        className='ui-button'
        style={touchTargetStyle}
        data-variant={value ? undefined : 'ghost'}
        onClick={() => prefs?.setSoundCues(true)}
        aria-pressed={value}
      >
        Ligado
      </button>
      <button
        type='button'
        className='ui-button'
        style={touchTargetStyle}
        data-variant={!value ? undefined : 'ghost'}
        onClick={() => prefs?.setSoundCues(false)}
        aria-pressed={!value}
      >
        Desligado
      </button>
    </div>
  );
}
