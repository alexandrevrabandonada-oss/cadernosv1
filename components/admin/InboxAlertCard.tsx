import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

type InboxAlertCardProps = {
  title: string;
  body: string;
  tone?: 'alert' | 'warning' | 'ok';
};

export function InboxAlertCard({ title, body, tone = 'warning' }: InboxAlertCardProps) {
  return (
    <Card className='inbox-alert-card stack'>
      <div className='toolbar-row' style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{title}</strong>
        <Badge variant={tone}>{tone === 'ok' ? 'sinal ok' : tone === 'alert' ? 'alerta' : 'atencao'}</Badge>
      </div>
      <p className='muted' style={{ margin: 0 }}>{body}</p>
    </Card>
  );
}
