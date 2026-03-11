import type { ReactNode } from 'react';

import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { Badge } from '@/components/ui/Badge';

type BigPortalCardProps = {
  href: string;
  title: string;
  description: string;
  cta?: string;
  badge?: string;
  preview?: ReactNode;
  className?: string;
  track?: {
    event?: string;
    cta?: string;
    section?: string;
  };
};

export function BigPortalCard({ href, title, description, cta = 'Entrar', badge, preview, className, track }: BigPortalCardProps) {
  return (
    <article className={['big-portal-card', 'surface-plate', className].filter(Boolean).join(' ')}>
      <div className='big-portal-topline'>
        <small className='big-portal-label'>porta editorial</small>
        {badge ? <Badge>{badge}</Badge> : null}
      </div>
      <div className='big-portal-copy'>
        <h3>{title}</h3>
        <p className='muted'>{description}</p>
      </div>
      {preview ? <div className='big-portal-preview'>{preview}</div> : null}
      <div className='big-portal-footer'>
        <span className='big-portal-cta-note'>continuar com contexto preservado</span>
        <PrefetchLink
          className='ui-button big-portal-cta'
          href={href}
          prefetchOnVisible
          smartPrefetch='all'
          data-variant='primary'
          data-track-event={track?.event}
          data-track-cta={track?.cta}
          data-track-section={track?.section}
        >
          {cta}
        </PrefetchLink>
      </div>
    </article>
  );
}
