import { BrandIcon } from '@/components/brand/icons/BrandIcon';

type EvidenceSealKind = 'proof' | 'curated' | 'draft' | 'review' | 'published';

type EvidenceSealProps = {
  kind: EvidenceSealKind;
};

const LABELS: Record<EvidenceSealKind, string> = {
  proof: 'Prova',
  curated: 'Curada',
  draft: 'Draft',
  review: 'Review',
  published: 'Published',
};

const ICONS: Record<EvidenceSealKind, Parameters<typeof BrandIcon>[0]['name']> = {
  proof: 'provas',
  curated: 'published',
  draft: 'review',
  review: 'review',
  published: 'published',
};

export function EvidenceSeal({ kind }: EvidenceSealProps) {
  const tone = kind === 'draft' || kind === 'review' ? 'warning' : kind === 'published' || kind === 'curated' ? 'action' : 'editorial';
  return (
    <span className='brand-seal' data-kind={kind}>
      <BrandIcon name={ICONS[kind]} size={14} tone={tone} />
      <span>{LABELS[kind]}</span>
    </span>
  );
}
