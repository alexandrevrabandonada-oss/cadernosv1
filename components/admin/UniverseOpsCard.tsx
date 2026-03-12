import { Card } from '@/components/ui/Card';

type UniverseOpsCardProps = React.ComponentPropsWithoutRef<'section'> & {
  title: string;
  summary: string;
  children?: React.ReactNode;
};

export function UniverseOpsCard({ title, summary, children, className = '', ...props }: UniverseOpsCardProps) {
  return (
    <Card className={`universe-ops-card stack ${className}`.trim()} {...props}>
      <div className='stack' style={{ gap: '0.4rem' }}>
        <strong>{title}</strong>
        <p className='muted' style={{ margin: 0 }}>{summary}</p>
      </div>
      {children}
    </Card>
  );
}
