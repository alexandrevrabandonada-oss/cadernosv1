import Link from 'next/link';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { Button } from '@/components/ui/Button';
import { Wordmark } from '@/components/brand/Wordmark';

export function Header() {
  return (
    <header className='app-header-shell'>
      <div className='header-wrap'>
        <div className='header-brand-block'>
          <Link href='/' className='brand-link' aria-label='Voltar para Home'>
            <Wordmark variant='nav' />
          </Link>
          <span className='header-brand-note'>arquivo vivo de prova e leitura guiada</span>
        </div>
        <nav className='top-nav' aria-label='Navegacao principal'>
          <div className='top-nav-links'>
            <Button href='/' variant='ghost'>
              Home
            </Button>
            <Button href='/c/exemplo' variant='ghost'>
              Universo
            </Button>
            <Button href='/admin' variant='ghost'>
              Admin
            </Button>
            <Button href='/status' variant='ghost'>
              Status
            </Button>
          </div>
          <div className='top-nav-actions'>
            <InstallPrompt compact className='desktop-only' />
            <Button href='/login' variant='primary'>
              Login
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
