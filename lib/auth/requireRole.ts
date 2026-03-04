import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentSession, isDevAdminBypass, type AppRole } from '@/lib/auth/server';

type SessionInfo = {
  userId: string;
  email: string | null;
  role: AppRole;
};

export { isDevAdminBypass };

export async function requireUser(): Promise<SessionInfo> {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login?next=/admin');
  }
  return session;
}

export async function requireEditorOrAdmin(): Promise<SessionInfo> {
  const session = await requireUser();
  if (!(session.role === 'admin' || session.role === 'editor')) {
    redirect('/login?error=Permissao%20de%20escrita%20negada');
  }
  return session;
}

export async function requireAdmin(): Promise<SessionInfo> {
  const session = await requireUser();
  if (session.role !== 'admin') {
    redirect('/login?error=Permissao%20de%20admin%20negada');
  }
  return session;
}

export async function canWriteAdminContent() {
  const session = await getCurrentSession();
  if (!session) return false;
  return session.role === 'admin' || session.role === 'editor';
}
