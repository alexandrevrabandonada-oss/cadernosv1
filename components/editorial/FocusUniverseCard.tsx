import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { Badge } from '@/components/ui/Badge';
import { EditorialMediaFrame } from '@/components/brand/EditorialMediaFrame';
import { UniverseSeal } from '@/components/brand/UniverseSeal';

type FocusUniverseCardProps = {
  title: string;
  summary: string;
  href: string;
  metrics: Array<{ label: string; value: string }>;
  seal?: 'showcase' | 'published';
  kicker?: string;
  cta?: string;
};

export function FocusUniverseCard({ title, summary, href, metrics, seal = 'published', kicker = 'Universo em foco', cta = 'Entrar agora' }: FocusUniverseCardProps) {
  return (
    <article className='focus-universe-card surface-plate'>
      <div className='toolbar-row'>
        <small>{kicker}</small>
        <UniverseSeal kind={seal} />
      </div>
      <h2>{title}</h2>
      <p className='muted'>{summary}</p>
      <div className='toolbar-row'>
        {metrics.slice(0, 3).map((item) => (
          <Badge key={item.label}>{`${item.label}:${item.value}`}</Badge>
        ))}
      </div>
      <EditorialMediaFrame title='Recorte ativo' subtitle='Porta editorial em destaque' label='FOCO' accent='editorial' />
      <PrefetchLink className='ui-button' href={href}>
        {cta}
      </PrefetchLink>
    </article>
  );
}
