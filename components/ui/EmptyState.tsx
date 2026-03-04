import Link from 'next/link';

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

export function EmptyState({ title, description, variant = 'no-data', actions = [] }: EmptyStateProps) {
  return (
    <section className='empty-state stack' data-variant={variant} aria-live='polite'>
      <strong>{title}</strong>
      <p className='muted' style={{ margin: 0 }}>
        {description}
      </p>
      {actions.length > 0 ? (
        <div className='toolbar-row'>
          {actions.map((action, index) =>
            action.href ? (
              <Link key={`${action.label}-${index}`} className='ui-button' data-variant='ghost' href={action.href}>
                {action.label}
              </Link>
            ) : (
              <button key={`${action.label}-${index}`} className='ui-button' data-variant='ghost' type='button' onClick={action.onClick}>
                {action.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
