'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { Button } from '@/components/ui/Button';
import { Wordmark } from '@/components/brand/Wordmark';

function navCurrent(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();

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
            <Link href='/' className='ui-button' data-variant='ghost' aria-current={navCurrent(pathname, '/') ? 'page' : undefined}>
              Home
            </Link>
            <Link href='/c/exemplo' className='ui-button' data-variant='ghost' aria-current={navCurrent(pathname, '/c/exemplo') ? 'page' : undefined}>
              Universo
            </Link>
            <Link href='/admin' className='ui-button' data-variant='ghost' aria-current={navCurrent(pathname, '/admin') ? 'page' : undefined}>
              Admin
            </Link>
            <Link href='/status' className='ui-button' data-variant='ghost' aria-current={navCurrent(pathname, '/status') ? 'page' : undefined}>
              Status
            </Link>
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
