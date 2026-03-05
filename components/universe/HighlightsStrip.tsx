import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

export type HighlightStripItem = {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
};

type HighlightsStripProps = {
  title: string;
  description: string;
  items: HighlightStripItem[];
  emptyLabel?: string;
};

export function HighlightsStrip({ title, description, items, emptyLabel = 'Sem destaques no momento.' }: HighlightsStripProps) {
  return (
    <section className='stack'>
      <header className='stack' style={{ gap: '0.35rem' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p className='muted' style={{ margin: 0 }}>
          {description}
        </p>
      </header>
      {items.length === 0 ? (
        <p className='muted' style={{ margin: 0 }}>
          {emptyLabel}
        </p>
      ) : (
        <div className='hot-strip' role='list' aria-label={title}>
          {items.map((item) => (
            <article key={item.id} className='hot-strip-item surface-blade' role='listitem'>
              <Badge>{item.label}</Badge>
              <strong>{item.title}</strong>
              <p className='muted'>{item.description}</p>
              <Link className='ui-button' data-variant='ghost' href={item.href}>
                Abrir
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
