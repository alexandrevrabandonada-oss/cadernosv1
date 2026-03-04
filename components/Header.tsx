import Link from 'next/link';
import { Button } from '@/components/ui/Button';

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
        background: 'color-mix(in srgb, var(--surface-0), transparent 12%)',
      }}
    >
      <div className='header-wrap'>
        <Link href='/' style={{ fontWeight: 800, letterSpacing: '0.05em' }} aria-label='Voltar para Home'>
          Cadernos Vivos // Urbano
        </Link>
        <nav className='top-nav' aria-label='Navegacao principal'>
          <Button href='/' variant='ghost'>
            Home
          </Button>
          <Button href='/c/exemplo' variant='ghost'>
            Universo
          </Button>
          <Button href='/admin' variant='ghost'>
            Admin
          </Button>
          <Button href='/login' variant='ghost'>
            Login
          </Button>
          <Button href='/status' variant='ghost'>
            Status
          </Button>
        </nav>
      </div>
    </header>
  );
}
