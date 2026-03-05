import Link from 'next/link';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { Button } from '@/components/ui/Button';
import { Wordmark } from '@/components/brand/Wordmark';

export function Header() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--header-height)',
        zIndex: 40,
        borderBottom: '1px solid var(--stroke-2)',
        backdropFilter: 'blur(var(--blur-1))',
        background: 'rgba(18, 22, 27, 0.58)',
      }}
    >
      <div className='header-wrap'>
        <Link href='/' className='brand-link' aria-label='Voltar para Home'>
          <Wordmark variant='nav' />
        </Link>
        <nav className='top-nav' aria-label='Navegacao principal'>
          <InstallPrompt compact className='desktop-only' />
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
