'use client';

import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';

type Texture = 'normal' | 'low';

export function TextureToggle({ compactLabel = false }: { compactLabel?: boolean }) {
  const prefs = useUiPrefsContext();
  const texture: Texture = prefs?.settings.texture === 'low' ? 'low' : 'normal';

  return (
    <div className='toolbar-row' role='group' aria-label='Textura da interface' data-testid='texture-toggle'>
      {!compactLabel ? <small className='muted'>Textura</small> : null}
      <button
        type='button'
        className='ui-button'
        data-variant={texture === 'low' ? undefined : 'ghost'}
        onClick={() => prefs?.setTexture('low')}
      >
        Baixa
      </button>
      <button
        type='button'
        className='ui-button'
        data-variant={texture === 'normal' ? undefined : 'ghost'}
        onClick={() => prefs?.setTexture('normal')}
      >
        Normal
      </button>
    </div>
  );
}

