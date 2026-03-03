import Link from 'next/link';

type PortalLinkProps = {
  href: string;
  title: string;
  description: string;
  ariaLabel?: string;
};

export function PortalLink({ href, title, description, ariaLabel }: PortalLinkProps) {
  return (
    <Link className='ui-portal-link' href={href} aria-label={ariaLabel ?? `${title}: ${description}`}>
      <strong>{title}</strong>
      <span className='muted'>{description}</span>
    </Link>
  );
}
