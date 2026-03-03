import Link from 'next/link';

export function Header() {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--header-height)',
        zIndex: 20,
        borderBottom: '1px solid var(--line-0)',
        backdropFilter: 'blur(10px)',
        background: 'color-mix(in srgb, var(--surface-0), transparent 20%)',
      }}
    >
      <div
        style={{
          width: 'min(1100px, 92vw)',
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <Link href='/' style={{ fontWeight: 700, letterSpacing: '0.03em' }}>
          Cadernos Vivos
        </Link>
        <nav style={{ display: 'flex', gap: '0.8rem', color: 'var(--text-1)' }}>
          <Link href='/'>Home</Link>
          <Link href='/c/exemplo'>Universo Exemplo</Link>
          <Link href='/admin'>Admin</Link>
        </nav>
      </div>
    </header>
  );
}
