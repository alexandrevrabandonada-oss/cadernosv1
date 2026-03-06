import { EmptyStateCard } from '@/components/ui/state/EmptyStateCard';

type EmptyAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type EmptyStateProps = {
  title: string;
  description: string;
  variant?: 'no-results' | 'no-data' | 'not-published' | 'needs-curation';
  actions?: EmptyAction[];
};

const eyebrowByVariant: Record<NonNullable<EmptyStateProps['variant']>, string> = {
  'no-results': 'busca sem resultado',
  'no-data': 'ainda sem material',
  'not-published': 'publicacao pendente',
  'needs-curation': 'curadoria pendente',
};

export function EmptyState({ title, description, variant = 'no-data', actions = [] }: EmptyStateProps) {
  return (
    <EmptyStateCard
      className='empty-state'
      eyebrow={eyebrowByVariant[variant]}
      title={title}
      description={description}
      primaryAction={actions[0]}
      secondaryAction={actions[1]}
    />
  );
}
