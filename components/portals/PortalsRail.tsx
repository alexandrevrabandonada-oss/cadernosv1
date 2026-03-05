import Link from 'next/link';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { buildPortals, type PortalContext } from '@/lib/portals/buildPortals';

type PortalsRailProps = {
  universeSlug: string;
  context: PortalContext;
  variant?: 'inline' | 'detail' | 'footer';
  title?: string;
};

export function PortalsRail({
  universeSlug,
  context,
  variant = 'inline',
  title,
}: PortalsRailProps) {
  const items = buildPortals({ universeSlug, context });
  const heading =
    title ??
    (variant === 'detail'
      ? 'Proximas portas'
      : variant === 'footer'
        ? 'Portais contextuais'
        : 'Portais');

  if (items.length === 0) return null;

  return (
    <section className='stack portals-rail' aria-label='Proximas portas contextuais'>
      <SectionHeader
        title={heading}
        description='Portas de continuidade para manter contexto e ritmo de investigacao.'
        tag='Contextual'
      />
      <div className='layout-shell portals-grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        {items.map((item) => (
          <Card key={item.id} className='stack portal-tile' surface='plate'>
            <div className='toolbar-row portal-tile-head'>
              <strong>{item.label}</strong>
              {item.badge ? <Carimbo>{item.badge}</Carimbo> : null}
            </div>
            <p className='muted portal-tile-reason' style={{ margin: 0 }}>
              {item.description}
            </p>
            <Link className='ui-button portal-tile-cta' href={item.href} aria-label={`Abrir portal ${item.label}`}>
              Abrir porta
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
