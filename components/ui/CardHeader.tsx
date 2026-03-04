import { Carimbo } from '@/components/ui/Badge';

type CardHeaderProps = {
  title: string;
  typeLabel?: string;
  meta?: string;
};

export function CardHeader({ title, typeLabel, meta }: CardHeaderProps) {
  return (
    <header className='stack' style={{ gap: '0.35rem' }}>
      <div className='toolbar-row'>
        {typeLabel ? <Carimbo>{typeLabel}</Carimbo> : null}
        {meta ? <small className='muted'>{meta}</small> : null}
      </div>
      <strong style={{ lineHeight: 1.25 }}>{title}</strong>
    </header>
  );
}
