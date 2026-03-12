import { Badge } from '@/components/ui/Badge';

type SuggestionConfidenceBadgeProps = {
  confidence: number;
};

export function SuggestionConfidenceBadge({ confidence }: SuggestionConfidenceBadgeProps) {
  const label = confidence >= 0.8 ? 'Forte' : confidence >= 0.55 ? 'Media' : 'Fraca';
  const variant = confidence >= 0.8 ? 'ok' : confidence >= 0.55 ? 'warning' : 'alert';

  return <Badge variant={variant}>{`Confianca ${label}`}</Badge>;
}
