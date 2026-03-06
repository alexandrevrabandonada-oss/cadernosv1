import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { buildNotebookAppLink, NOTEBOOK_ITEM_CHAR_LIMIT, NOTEBOOK_MAX_ITEMS, type NotebookExportItem } from '@/lib/export/notebook';
import { buildGuestNotebookFile, createNotebookExportRecord, getUniverseTitleBySlug, listOwnNotebookExports, toggleOwnNotebookExportPublic } from '@/lib/export/notebookService';
import { extractClientIp } from '@/lib/ratelimit/keys';
import { rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

type Payload = {
  universeSlug?: string;
  scope?: 'all' | 'filtered';
  filters?: { kind?: string; tags?: string[]; q?: string };
  format?: 'pdf' | 'md';
  mode?: 'logged' | 'guest';
  includeTagIndex?: boolean;
  items?: Array<Record<string, unknown>>;
};

function clean(value: unknown, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

function toActorLabel(session: Awaited<ReturnType<typeof getCurrentSession>>) {
  if (!session || session.userId === 'dev-bypass') return 'Visitante';
  return 'Usuario';
}

function sanitizeItems(slug: string, raw: unknown): NotebookExportItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, NOTEBOOK_MAX_ITEMS * 2)
    .map((item): NotebookExportItem | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const sourceType = row.sourceType;
      if (!['evidence', 'thread', 'citation', 'chunk', 'doc', 'event', 'term', 'node'].includes(String(sourceType))) return null;
      const sourceMeta = row.sourceMeta && typeof row.sourceMeta === 'object' ? (row.sourceMeta as Record<string, unknown>) : {};
      return {
        kind: row.kind === 'note' ? 'note' : 'highlight',
        title: clean(row.title, 160) || null,
        text: clean(row.text, NOTEBOOK_ITEM_CHAR_LIMIT + 80),
        tags: Array.isArray(row.tags) ? row.tags.map((tag) => clean(tag, 48)).filter(Boolean).slice(0, 12) : [],
        source: {
          type: sourceType as NotebookExportItem['source']['type'],
          id: clean(row.sourceId, 80) || null,
          meta: sourceMeta,
        },
        linkToApp: buildNotebookAppLink(slug, {
          type: sourceType as NotebookExportItem['source']['type'],
          id: clean(row.sourceId, 80) || null,
          meta: sourceMeta,
        }),
        createdAt: clean(row.createdAt, 40) || null,
      } satisfies NotebookExportItem;
    })
    .filter((item): item is NotebookExportItem => Boolean(item?.text));
}

export async function GET(request: NextRequest) {
  const universeSlug = clean(request.nextUrl.searchParams.get('universeSlug'));
  if (!universeSlug) return NextResponse.json({ error: 'invalid_universe_slug' }, { status: 400 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ items: [] });
  const items = await listOwnNotebookExports(universeSlug);
  return NextResponse.json({ ok: true, items });
}

export async function PATCH(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { exportId?: string; isPublic?: boolean } | null;
  const exportId = clean(body?.exportId, 80);
  if (!exportId) return NextResponse.json({ error: 'invalid_export_id' }, { status: 400 });
  try {
    await toggleOwnNotebookExportPublic({ exportId, isPublic: body?.isPublic === true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'toggle_failed';
    return NextResponse.json({ error: message }, { status: message === 'forbidden' ? 403 : 400 });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Payload | null;
  const universeSlug = clean(body?.universeSlug, 120);
  const format = body?.format === 'pdf' ? 'pdf' : 'md';
  const mode = body?.mode === 'logged' ? 'logged' : 'guest';
  if (!universeSlug) return NextResponse.json({ error: 'invalid_universe_slug' }, { status: 400 });

  const session = await getCurrentSession();
  const items = sanitizeItems(universeSlug, body?.items);
  if (items.length === 0) return NextResponse.json({ error: 'empty_notebook' }, { status: 400 });

  if (mode === 'logged') {
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const created = await createNotebookExportRecord({
        universeSlug,
        actorLabel: toActorLabel(session),
        items,
        format,
        includeTagIndex: body?.includeTagIndex !== false,
        isPublic: false,
      });
      return NextResponse.json({ ok: true, mode, scope: body?.scope ?? 'all', ...created });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'export_failed';
      return NextResponse.json({ error: message }, { status: message === 'unauthorized' ? 401 : 500 });
    }
  }

  const ip = extractClientIp(request);
  const guestRate = await rateLimit(`notebook:${universeSlug}:${ip}`, { limit: 6, windowSec: 60, prefix: 'cv:guest:notebook' });
  if (!guestRate.ok) {
    return NextResponse.json({ error: 'rate_limited', retryAfterSec: Math.max(1, Math.ceil((guestRate.resetAt - Date.now()) / 1000)) }, { status: 429 });
  }

  try {
    const universeTitle = (await getUniverseTitleBySlug(universeSlug)) ?? universeSlug;
    const asset = await buildGuestNotebookFile({
      universe: universeTitle,
      actorLabel: 'Visitante',
      slug: universeSlug,
      items,
      format,
      includeTagIndex: body?.includeTagIndex !== false,
    });
    return NextResponse.json({ ok: true, mode, asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'export_failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
