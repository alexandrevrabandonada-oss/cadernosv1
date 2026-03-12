import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ADMIN_BYPASS_COOKIE = 'cv_admin_bypass';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token')?.trim() ?? '';
  const clear = url.searchParams.get('clear') === '1';
  const configured = process.env.ADMIN_BYPASS_TOKEN?.trim() ?? '';
  const redirectTo = url.searchParams.get('next')?.trim() || '/admin';
  const target = redirectTo.startsWith('/') ? redirectTo : '/admin';
  const cookieStore = await cookies();

  if (clear) {
    cookieStore.set({
      name: ADMIN_BYPASS_COOKIE,
      value: '',
      path: '/',
      expires: new Date(0),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return NextResponse.redirect(new URL('/login?error=Bypass%20admin%20removido', url));
  }

  if (!configured || token !== configured) {
    return NextResponse.redirect(new URL('/login?error=Bypass%20admin%20invalido', url));
  }

  cookieStore.set({
    name: ADMIN_BYPASS_COOKIE,
    value: configured,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.redirect(new URL(target, url));
}
