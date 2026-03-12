import { Badge } from '@/components/ui/Badge';

type ProgramBlockerChipProps = {
  label: string;
  tone: 'alert' | 'warning' | 'ok';
};

export function ProgramBlockerChip({ label, tone }: ProgramBlockerChipProps) {
  return <Badge variant={tone}>{label}</Badge>;
}
