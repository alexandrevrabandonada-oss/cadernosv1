import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { requireUser } from '@/lib/auth/requireRole';
import { getSupabaseServerAuthClient } from '@/lib/supabase/server';

async function logoutAction() {
  'use server';

  const auth = await getSupabaseServerAuthClient();
  if (auth) {
    await auth.auth.signOut();
  }
  redirect('/login');
}

export default async function AdminPage() {
  const session = await requireUser();

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb items={[{ href: '/', label: 'Home' }, { label: 'Admin' }]} ariaLabel='Trilha admin' />
        <SectionHeader title='Admin' description='Painel minimo para operacoes do MVP.' tag='Restrito' />
        <div className='toolbar-row'>
          <Carimbo>{`role:${session.role}`}</Carimbo>
          <Carimbo>{session.email ?? 'sem-email'}</Carimbo>
          <form action={logoutAction}>
            <button className='ui-button' type='submit' data-variant='ghost'>
              Sair
            </button>
          </form>
          <Link className='ui-button' href='https://github.com/alexandrevrabandonada-oss/cadernosv1/blob/main/docs/SECURITY.md' data-variant='ghost'>
            Como virar admin
          </Link>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Modulos' description='Navegacao para gestao de universos e nos.' />
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/universes'>
            Gerenciar universos
          </Link>
          <Link className='ui-button' href='/admin/programa-editorial'>
            Programa editorial
          </Link>
          <Link className='ui-button' href='/admin/universes/inbox'>
            Universe Inbox
          </Link>
          <Link className='ui-button' href='/admin/status'>
            Painel operacional
          </Link>
        </div>
      </Card>
    </main>
  );
}
