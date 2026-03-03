import Link from 'next/link';

type SegmentItem = {
  href: string;
  label: string;
};

type SegmentedProps = {
  label: string;
  items: SegmentItem[];
  currentPath: string;
};

export function Segmented({ label, items, currentPath }: SegmentedProps) {
  return (
    <nav aria-label={label}>
      <div className='ui-segmented' role='tablist' aria-label={label}>
        {items.map((item) => {
          const isCurrent = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className='ui-segmented-item'
              role='tab'
              aria-selected={isCurrent}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
