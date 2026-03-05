import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyPackBySlug } from '@/lib/share/pack';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('u')?.trim() ?? '';
  if (!slug) {
    return NextResponse.json({ error: 'missing_universe_slug' }, { status: 400 });
  }

  const pack = await generateWeeklyPackBySlug(slug);
  if (!pack) {
    return NextResponse.json({ error: 'pack_unavailable' }, { status: 404 });
  }

  return NextResponse.json({
    weekKey: pack.weekKey,
    title: pack.title,
    note: pack.note,
    items: pack.items,
  });
}

