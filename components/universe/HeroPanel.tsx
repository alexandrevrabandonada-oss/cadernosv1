import type { ReactNode } from 'react';

type HeroPanelProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  className?: string;
};

export function HeroPanel({ eyebrow, title, subtitle, actions, meta, aside, className }: HeroPanelProps) {
  return (
    <section className={['hero-panel surface-panel', className].filter(Boolean).join(' ')}>
      <div className='hero-panel-main'>
        {eyebrow ? <p className='hero-eyebrow'>{eyebrow}</p> : null}
        <h1 className='hero-title'>{title}</h1>
        <p className='hero-subtitle'>{subtitle}</p>
        {actions ? <div className='hero-actions'>{actions}</div> : null}
        {meta ? <div className='hero-meta'>{meta}</div> : null}
      </div>
      {aside ? <aside className='hero-panel-aside'>{aside}</aside> : null}
    </section>
  );
}
