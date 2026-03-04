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
    <section className='stack' aria-label='Proximas portas contextuais'>
      <SectionHeader
        title={heading}
        description='Navegacao orientada pelo contexto atual para manter fluidez de exploracao.'
        tag='Contextual'
      />
      <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        {items.map((item) => (
          <Card key={item.id} className='stack'>
            <div className='toolbar-row'>
              <strong>{item.label}</strong>
              {item.badge ? <Carimbo>{item.badge}</Carimbo> : null}
            </div>
            <p className='muted' style={{ margin: 0 }}>
              {item.description}
            </p>
            <Link className='ui-button' href={item.href} aria-label={`Abrir portal ${item.label}`}>
              Abrir
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
