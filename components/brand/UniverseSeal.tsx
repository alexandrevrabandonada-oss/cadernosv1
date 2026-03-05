import { BrandIcon } from '@/components/brand/icons/BrandIcon';

type UniverseSealKind = 'showcase' | 'published' | 'review';

type UniverseSealProps = {
  kind: UniverseSealKind;
};

const LABELS: Record<UniverseSealKind, string> = {
  showcase: 'Vitrine',
  published: 'Publicado',
  review: 'Em revisao',
};

const ICONS: Record<UniverseSealKind, Parameters<typeof BrandIcon>[0]['name']> = {
  showcase: 'showcase',
  published: 'published',
  review: 'review',
};

export function UniverseSeal({ kind }: UniverseSealProps) {
  return (
    <span className='brand-seal' data-kind={kind}>
      <BrandIcon name={ICONS[kind]} size={14} tone={kind === 'review' ? 'warning' : kind === 'showcase' ? 'editorial' : 'action'} />
      <span>{LABELS[kind]}</span>
    </span>
  );
}
