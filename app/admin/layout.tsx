import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getSupabaseServerAuthClient } from '@/lib/supabase/server';
import { getCurrentSession } from '@/lib/auth/server';
import { isDevAdminBypass } from '@/lib/auth/requireRole';

async function logoutAction() {
  'use server';
  const auth = await getSupabaseServerAuthClient();
  if (auth) {
    await auth.auth.signOut();
  }
  redirect('/login');
}

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getCurrentSession();
  if (!session && !isDevAdminBypass()) {
    redirect('/login?next=/admin');
  }

  const hasRole = Boolean(session && (session.role === 'admin' || session.role === 'editor'));
  if (!hasRole && !isDevAdminBypass()) {
    return (
      <main className='stack'>
        <Card className='stack'>
          <SectionHeader
            title='Sem permissao'
            description='Sua conta esta autenticada, mas nao possui papel editor/admin para usar o painel.'
            tag='Acesso negado'
          />
          <form action={logoutAction}>
            <button className='ui-button' type='submit'>
              Sair
            </button>
          </form>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
