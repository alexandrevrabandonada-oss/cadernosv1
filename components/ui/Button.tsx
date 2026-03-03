import Link from 'next/link';

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
      <Link className='ui-button' data-variant={variant} href={href} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button className='ui-button' data-variant={variant} aria-label={ariaLabel} type={type}>
      {children}
    </button>
  );
}
