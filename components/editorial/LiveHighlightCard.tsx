import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { SignalChip } from '@/components/editorial/SignalChip';
import { BrandIcon, type BrandIconName } from '@/components/brand/icons/BrandIcon';

type LiveHighlightCardProps = {
  label: string;
  title: string;
  description: string;
  href: string;
  meta?: string;
  icon?: BrandIconName;
  tone?: 'default' | 'action' | 'editorial';
  compact?: boolean;
};

export function LiveHighlightCard({ label, title, description, href, meta, icon = 'showcase', tone = 'editorial', compact = false }: LiveHighlightCardProps) {
  return (
    <PrefetchLink className={['live-highlight-card', 'surface-plate', compact ? 'is-compact' : ''].join(' ')} href={href}>
      <div className='live-highlight-head'>
        <SignalChip label={label} meta={meta} tone={tone} />
        <BrandIcon name={icon} size={16} tone={tone === 'action' ? 'action' : 'editorial'} />
      </div>
      <strong>{title}</strong>
      <p className='muted'>{description}</p>
    </PrefetchLink>
  );
}
