import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type AdminNoticeProps = {
  title: string;
  description: string;
  docsHref?: string;
  docsLabel?: string;
  collapsible?: boolean;
};

export function AdminNotice({ title, description, docsHref, docsLabel = 'Abrir docs', collapsible = true }: AdminNoticeProps) {
  const body = (
    <div className='stack'>
      <div className='toolbar-row'>
        <Badge variant='warning'>Admin warning</Badge>
      </div>
      <strong>{title}</strong>
      <p className='muted' style={{ margin: 0 }}>{description}</p>
      {docsHref ? (
        <div className='toolbar-row'>
          <Link className='ui-button' data-variant='ghost' href={docsHref}>{docsLabel}</Link>
        </div>
      ) : null}
    </div>
  );

  if (!collapsible) {
    return <Card className='stack'>{body}</Card>;
  }

  return (
    <Card className='stack'>
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Aviso tecnico do admin</summary>
        <div style={{ marginTop: 12 }}>{body}</div>
      </details>
    </Card>
  );
}
