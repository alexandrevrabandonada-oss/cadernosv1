import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { SignalChip } from '@/components/editorial/SignalChip';
import { BrandIcon, type BrandIconName } from '@/components/brand/icons/BrandIcon';

type EditorialSignalItem = {
  id: string;
  label: string;
  title: string;
  href: string;
  meta?: string;
  icon?: BrandIconName;
  tone?: 'default' | 'action' | 'editorial';
};

type EditorialSignalRailProps = {
  title?: string;
  items: EditorialSignalItem[];
  compact?: boolean;
};

export function EditorialSignalRail({ title = 'Sinais quentes', items, compact = false }: EditorialSignalRailProps) {
  return (
    <section className={['editorial-signal-rail', compact ? 'is-compact' : ''].join(' ')} aria-label={title}>
      {items.map((item) => (
        <PrefetchLink key={item.id} className='editorial-signal-item surface-blade' href={item.href}>
          <div className='editorial-signal-head'>
            <SignalChip label={item.label} meta={item.meta} tone={item.tone ?? 'editorial'} />
            {item.icon ? <BrandIcon name={item.icon} size={14} tone={item.tone === 'action' ? 'action' : 'editorial'} /> : null}
          </div>
          <strong>{item.title}</strong>
        </PrefetchLink>
      ))}
    </section>
  );
}

export type { EditorialSignalItem };
