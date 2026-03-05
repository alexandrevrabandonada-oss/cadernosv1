import { BrandIcon } from '@/components/brand/icons/BrandIcon';

type WordmarkProps = {
  variant?: 'hero' | 'nav' | 'compact' | 'mono';
  className?: string;
};

export function Wordmark({ variant = 'nav', className }: WordmarkProps) {
  if (variant === 'compact') {
    return (
      <span className={['wordmark', 'wordmark-compact', className].filter(Boolean).join(' ')}>
        <BrandIcon name='showcase' size={16} tone='editorial' />
        <strong>CV //</strong>
      </span>
    );
  }

  const mono = variant === 'mono';
  return (
    <span className={['wordmark', `wordmark-${variant}`, mono ? 'is-mono' : '', className].filter(Boolean).join(' ')}>
      <span className='wordmark-symbol' aria-hidden='true'>
        <BrandIcon name='showcase' size={variant === 'hero' ? 20 : 16} tone={mono ? 'default' : 'editorial'} />
      </span>
      <span className='wordmark-text'>
        <strong>Cadernos</strong>
        <strong>Vivos</strong>
      </span>
    </span>
  );
}
