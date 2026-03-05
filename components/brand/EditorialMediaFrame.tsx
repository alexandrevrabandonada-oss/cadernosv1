import type { ReactNode } from 'react';

type EditorialMediaFrameProps = {
  title: string;
  subtitle?: string;
  label?: string;
  accent?: 'none' | 'action' | 'editorial';
  children?: ReactNode;
  className?: string;
};

export function EditorialMediaFrame({
  title,
  subtitle,
  label,
  accent = 'none',
  children,
  className,
}: EditorialMediaFrameProps) {
  return (
    <figure className={['editorial-media-frame', className].filter(Boolean).join(' ')} data-accent={accent}>
      <div className='editorial-media-surface'>{children ?? <div className='editorial-media-fallback' aria-hidden='true' />}</div>
      <figcaption className='editorial-media-meta'>
        {label ? <small>{label}</small> : null}
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </figcaption>
    </figure>
  );
}
