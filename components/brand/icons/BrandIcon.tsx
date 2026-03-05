import type { CSSProperties, SVGProps } from 'react';

export type BrandIconName =
  | 'provas'
  | 'linha'
  | 'debate'
  | 'mapa'
  | 'glossario'
  | 'trilhas'
  | 'tutor'
  | 'share'
  | 'export'
  | 'confidence_strong'
  | 'confidence_medium'
  | 'confidence_weak'
  | 'divergence'
  | 'review'
  | 'published'
  | 'showcase';

type BrandIconProps = {
  name: BrandIconName;
  size?: 16 | 20 | 24 | number;
  tone?: 'default' | 'action' | 'editorial' | 'warning';
  title?: string;
  className?: string;
};

const ICONS: Record<BrandIconName, string> = {
  provas: 'M4 5h16M4 10h16M4 15h10M16 15h4M6 3v14',
  linha: 'M4 17h16M6 17V8M12 17V5M18 17v-9',
  debate: 'M4 6h16v9H8l-4 4V6z',
  mapa: 'M4 5l5-2 6 2 5-2v14l-5 2-6-2-5 2V5z',
  glossario: 'M5 4h10a4 4 0 014 4v12H9a4 4 0 00-4 4V4z',
  trilhas: 'M4 5h6v6H4zM14 13h6v6h-6zM10 8l4 4',
  tutor: 'M4 7l8-4 8 4-8 4-8-4zm2 5v4l6 3 6-3v-4',
  share: 'M15 6l5 4-5 4M20 10H8M4 4h4v12H4z',
  export: 'M12 3v11M8 10l4 4 4-4M4 18h16',
  confidence_strong: 'M4 17l4-5 3 3 5-8 4 4',
  confidence_medium: 'M4 14h4l2-3 3 2 3-5 4 2',
  confidence_weak: 'M4 16h16M6 12l4 2 3-3 5 1',
  divergence: 'M4 5h16M12 5v14M6 17l12-12',
  review: 'M5 19l4-1 9-9-3-3-9 9-1 4z',
  published: 'M4 12l5 5 11-11',
  showcase: 'M12 3l3 6 6 .8-4.4 4.2 1 6-5.6-3-5.6 3 1-6L3 9.8 9 9z',
};

function toneStyle(tone: BrandIconProps['tone']): CSSProperties {
  switch (tone) {
    case 'action':
      return { color: 'var(--accent-action)' };
    case 'editorial':
      return { color: 'var(--accent-editorial)' };
    case 'warning':
      return { color: 'var(--status-warning)' };
    default:
      return { color: 'currentColor' };
  }
}

export function BrandIcon({ name, size = 20, tone = 'default', title, className }: BrandIconProps) {
  const d = ICONS[name];
  const style = toneStyle(tone);
  return (
    <svg
      className={['brand-icon', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  );
}

export function BrandIconRaw(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' {...props} />;
}
