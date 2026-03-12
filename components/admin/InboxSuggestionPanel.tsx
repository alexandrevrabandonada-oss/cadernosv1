import { Card } from '@/components/ui/Card';

type InboxSuggestionPanelProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function InboxSuggestionPanel({ eyebrow, title, description, children }: InboxSuggestionPanelProps) {
  return (
    <Card className='inbox-suggestion-panel stack'>
      <div className='stack' style={{ gap: '0.45rem' }}>
        <small className='ui-eyebrow'>{eyebrow}</small>
        <strong>{title}</strong>
        {description ? <p className='muted' style={{ margin: 0 }}>{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}
