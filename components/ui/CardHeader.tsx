import { Carimbo } from '@/components/ui/Badge';

type CardHeaderProps = {
  title: string;
  typeLabel?: string;
  meta?: string;
};

export function CardHeader({ title, typeLabel, meta }: CardHeaderProps) {
  return (
    <header className='card-head stack' style={{ gap: '0.35rem' }}>
      <div className='toolbar-row card-head-meta'>
        {typeLabel ? <Carimbo>{typeLabel}</Carimbo> : null}
        {meta ? <small className='muted'>{meta}</small> : null}
      </div>
      <strong className='card-head-title' style={{ lineHeight: 1.25 }}>
        {title}
      </strong>
    </header>
  );
}
