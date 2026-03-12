import { Badge } from '@/components/ui/Badge';
import type { EditorialLane } from '@/lib/editorial/program';

type LaneHealthBadgeProps = {
  lane: EditorialLane;
  count: number;
  highlight?: boolean;
};

export function LaneHealthBadge({ lane, count, highlight = false }: LaneHealthBadgeProps) {
  const variant = count === 0 ? 'default' : highlight ? 'warning' : count >= 3 ? 'warning' : 'ok';
  return <Badge variant={variant}>{`${lane}:${count}`}</Badge>;
}
