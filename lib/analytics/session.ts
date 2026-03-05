import { randomUUID } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

export const ANALYTICS_SESSION_COOKIE = 'cv_sid';

function validSessionId(value: string) {
  return /^[a-z0-9-]{8,80}$/i.test(value);
}

export function getOrSetSessionId(request: NextRequest, response: NextResponse) {
  const existing = request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value?.trim() ?? '';
  if (existing && validSessionId(existing)) return existing;

  const created = randomUUID();
  response.cookies.set({
    name: ANALYTICS_SESSION_COOKIE,
    value: created,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  });
  return created;
}

