import { BrandIcon } from '@/components/brand/icons/BrandIcon';

type ConfidenceSealKind = 'forte' | 'media' | 'fraca' | 'divergencia';

type ConfidenceSealProps = {
  kind: ConfidenceSealKind;
};

const ICONS: Record<ConfidenceSealKind, Parameters<typeof BrandIcon>[0]['name']> = {
  forte: 'confidence_strong',
  media: 'confidence_medium',
  fraca: 'confidence_weak',
  divergencia: 'divergence',
};

const LABELS: Record<ConfidenceSealKind, string> = {
  forte: 'Confianca Forte',
  media: 'Confianca Media',
  fraca: 'Confianca Fraca',
  divergencia: 'Divergencia',
};

export function ConfidenceSeal({ kind }: ConfidenceSealProps) {
  const tone = kind === 'forte' ? 'action' : kind === 'media' ? 'editorial' : 'warning';
  return (
    <span className='brand-seal' data-kind={kind}>
      <BrandIcon name={ICONS[kind]} size={14} tone={tone} />
      <span>{LABELS[kind]}</span>
    </span>
  );
}
