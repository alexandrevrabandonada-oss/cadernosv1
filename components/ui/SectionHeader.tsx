import { Badge } from '@/components/ui/Badge';

type SectionHeaderProps = {
  title: string;
  description?: string;
  tag?: string;
};

export function SectionHeader({ title, description, tag }: SectionHeaderProps) {
  return (
    <header className='stack' style={{ gap: '0.45rem' }}>
      {tag ? <Badge>{tag}</Badge> : null}
      <h1 className='ui-section-title'>{title}</h1>
      {description ? (
        <p className='muted' style={{ margin: 0 }}>
          {description}
        </p>
      ) : null}
    </header>
  );
}
