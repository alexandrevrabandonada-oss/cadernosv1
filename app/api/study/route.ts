import { NextResponse } from 'next/server';
import type { StudySession } from '@/lib/study/types';
import { getStudyRecap, upsertStudySession } from '@/lib/study/service';

function sanitizeSession(body: unknown) {
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const universeSlug = typeof source.universeSlug === 'string' ? source.universeSlug.trim() : '';
  const session = source.session && typeof source.session === 'object' ? (source.session as StudySession) : null;
  const timeZone = typeof source.timeZone === 'string' ? source.timeZone : 'UTC';
  if (!universeSlug || !session?.id || !session.startedAt) return null;
  return { universeSlug, session, timeZone };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const universeSlug = url.searchParams.get('universeSlug')?.trim() ?? '';
  if (!universeSlug) return NextResponse.json({ error: 'invalid_universe_slug' }, { status: 400 });
  const recap = await getStudyRecap(universeSlug);
  if (!recap) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(recap);
}

export async function POST(request: Request) {
  const payload = sanitizeSession(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const session = await upsertStudySession(payload);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, session });
}
