import { PrefetchLink } from '@/components/nav/PrefetchLink';

type Variant = 'primary' | 'neutral' | 'ghost';

type ButtonProps = {
  children: React.ReactNode;
  variant?: Variant;
  href?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit' | 'reset';
};

export function Button({ children, variant = 'neutral', href, ariaLabel, type = 'button' }: ButtonProps) {
  if (href) {
    return (
      <PrefetchLink className='ui-button' data-variant={variant} href={href} aria-label={ariaLabel}>
        {children}
      </PrefetchLink>
    );
  }

  return (
    <button className='ui-button' data-variant={variant} aria-label={ariaLabel} type={type}>
      {children}
    </button>
  );
}
