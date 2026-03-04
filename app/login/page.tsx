import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getCurrentSession } from '@/lib/auth/server';
import { getSupabaseServerAuthClient } from '@/lib/supabase/server';

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

async function loginAction(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent('Informe e-mail e senha')}&next=${encodeURIComponent(next)}`);
  }

  const auth = await getSupabaseServerAuthClient();
  if (!auth) {
    redirect(`/login?error=${encodeURIComponent('Supabase Auth nao configurado')}`);
  }

  const { error } = await auth.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent('Credenciais invalidas')}&next=${encodeURIComponent(next)}`);
  }

  redirect(next.startsWith('/') ? next : '/admin');
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getCurrentSession();
  const sp = await searchParams;
  const next = sp.next?.trim() ? sp.next : '/admin';
  const error = sp.error?.trim() || '';

  if (session) {
    redirect(next);
  }

  return (
    <main className='stack'>
      <Card className='stack'>
        <SectionHeader
          title='Login'
          description='Acesso ao painel admin via Supabase Auth (SSR-friendly).'
          tag='Auth'
        />
      </Card>

      <Card className='stack'>
        <form action={loginAction} className='stack'>
          <input type='hidden' name='next' value={next} />
          <label>
            <span>E-mail</span>
            <input type='email' name='email' required autoComplete='email' style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Senha</span>
            <input
              type='password'
              name='password'
              required
              autoComplete='current-password'
              style={{ width: '100%', minHeight: 40 }}
            />
          </label>
          <button className='ui-button' type='submit' data-variant='primary'>
            Entrar
          </button>
        </form>
        {error ? (
          <p role='alert' className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>
            {error}
          </p>
        ) : null}
      </Card>
    </main>
  );
}
