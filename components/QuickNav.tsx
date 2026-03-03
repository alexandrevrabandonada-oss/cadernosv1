import Link from 'next/link';

type QuickNavProps = {
  slug: string;
};

const sections = [
  { href: '', label: 'Hub' },
  { href: 'mapa', label: 'Mapa' },
  { href: 'provas', label: 'Provas' },
  { href: 'linha', label: 'Linha' },
  { href: 'trilhas', label: 'Trilhas' },
  { href: 'debate', label: 'Debate' },
  { href: 'tutoria', label: 'Tutoria' },
];

export function QuickNav({ slug }: QuickNavProps) {
  return (
    <aside className='card' style={{ position: 'sticky', top: 'calc(var(--header-height) + 1rem)' }}>
      <p style={{ marginTop: 0, fontWeight: 600 }}>QuickNav</p>
      <nav className='stack'>
        {sections.map((section) => (
          <Link
            key={section.label}
            href={`/c/${slug}${section.href ? `/${section.href}` : ''}`}
            style={{
              padding: '0.5rem 0.65rem',
              borderRadius: 8,
              background: 'var(--surface-1)',
              border: '1px solid var(--line-0)',
            }}
          >
            {section.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
