'use client';

import { useState } from 'react';
import { DensityToggle } from '@/components/ui/DensityToggle';
import { FocusToggle } from '@/components/ui/FocusToggle';
import { HapticsToggle } from '@/components/ui/HapticsToggle';
import { SoundCuesToggle } from '@/components/ui/SoundCuesToggle';
import { TextureToggle } from '@/components/ui/TextureToggle';

export function PreferencesDrawer({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type='button'
        className='ui-button'
        data-variant={compact ? 'ghost' : undefined}
        onClick={() => setOpen(true)}
        aria-haspopup='dialog'
        aria-expanded={open}
      >
        Preferencias
      </button>

      <div className={`workspace-drawer-overlay cv-panel-exit ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden='true' />
      <aside className={`preferences-drawer surface-panel cv-panel-enter ${open ? 'is-open' : ''}`} role='dialog' aria-modal='true' aria-label='Preferencias da interface'>
        <header className='workspace-detail-head'>
          <div className='stack' style={{ gap: '0.2rem' }}>
            <strong>Preferencias</strong>
            <p className='muted' style={{ margin: 0 }}>Motion, densidade, textura e foco fora do conteudo principal.</p>
          </div>
          <button type='button' className='ui-button' data-variant='ghost' onClick={() => setOpen(false)}>
            Fechar
          </button>
        </header>
        <div className='workspace-detail-body stack'>
          <FocusToggle />
          <DensityToggle />
          <TextureToggle />
          <HapticsToggle />
          <SoundCuesToggle />
        </div>
      </aside>
    </>
  );
}
