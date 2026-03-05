import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';

type BigPortalCardProps = {
  href: string;
  title: string;
  description: string;
  cta?: string;
  badge?: string;
  preview?: ReactNode;
  track?: {
    event?: string;
    cta?: string;
    section?: string;
  };
};

export function BigPortalCard({ href, title, description, cta = 'Entrar', badge, preview, track }: BigPortalCardProps) {
  return (
    <article className='big-portal-card surface-plate'>
      {badge ? <Badge>{badge}</Badge> : null}
      <h3>{title}</h3>
      <p className='muted'>{description}</p>
      {preview ? <div className='big-portal-preview'>{preview}</div> : null}
      <Link
        className='ui-button'
        href={href}
        data-variant='primary'
        data-track-event={track?.event}
        data-track-cta={track?.cta}
        data-track-section={track?.section}
      >
        {cta}
      </Link>
    </article>
  );
}
