import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import {
  buildInstagramCaption,
  buildTelegramText,
  buildTwitterThread,
  buildWhatsAppText,
  type SharePackTemplateInput,
} from '@/lib/share/copyTemplates';
import { generateWeeklyPackBySlug } from '@/lib/share/pack';

export const runtime = 'nodejs';

function forbidden() {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || !(session.role === 'admin' || session.role === 'editor')) {
    return forbidden();
  }

  const slug = request.nextUrl.searchParams.get('u')?.trim() ?? '';
  const channel = request.nextUrl.searchParams.get('channel')?.trim() ?? 'whatsapp';
  if (!slug) {
    return NextResponse.json({ error: 'missing_universe_slug' }, { status: 400 });
  }

  const pack = await generateWeeklyPackBySlug(slug);
  if (!pack) {
    return NextResponse.json({ error: 'pack_unavailable' }, { status: 404 });
  }

  const payload: SharePackTemplateInput = {
    universeSlug: pack.universeSlug,
    universeTitle: pack.universeTitle,
    weekKey: pack.weekKey,
    title: pack.title,
    note: pack.note,
    items: pack.items,
  };

  const text =
    channel === 'instagram'
      ? buildInstagramCaption(payload)
      : channel === 'telegram'
        ? buildTelegramText(payload)
        : channel === 'twitter'
          ? buildTwitterThread(payload)
          : buildWhatsAppText(payload);

  return NextResponse.json({ channel, text, length: text.length });
}

