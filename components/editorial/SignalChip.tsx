import { Badge } from '@/components/ui/Badge';

type SignalChipProps = {
  label: string;
  meta?: string;
  tone?: 'default' | 'action' | 'editorial';
};

export function SignalChip({ label, meta, tone = 'default' }: SignalChipProps) {
  return (
    <span className='signal-chip' data-tone={tone}>
      <Badge>{label}</Badge>
      {meta ? <small>{meta}</small> : null}
    </span>
  );
}
