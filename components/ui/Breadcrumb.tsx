import Link from 'next/link';

type Crumb = {
  href?: string;
  label: string;
};

type BreadcrumbProps = {
  items: Crumb[];
  ariaLabel?: string;
};

export function Breadcrumb({ items, ariaLabel = 'Breadcrumb' }: BreadcrumbProps) {
  return (
    <nav aria-label={ariaLabel}>
      <ol className='ui-breadcrumb'>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              {item.href && !isLast ? <Link href={item.href}>{item.label}</Link> : <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>}
              {!isLast ? <span aria-hidden='true'>/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
