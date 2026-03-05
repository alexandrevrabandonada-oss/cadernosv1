import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import {
  getDefaultSharePackChecklistChecks,
  getSharePackChecklist,
  type SharePackChecklistChecks,
  upsertSharePackChecklist,
} from '@/lib/share/checklist';
import { getSharePackById } from '@/lib/share/pack';

export const runtime = 'nodejs';

function forbidden() {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}

async function requireEditorSession() {
  const session = await getCurrentSession();
  if (!session || !(session.role === 'admin' || session.role === 'editor')) return null;
  return session;
}

function normalizeChecks(raw: unknown): SharePackChecklistChecks {
  const base = typeof raw === 'object' && raw ? (raw as Record<string, unknown>) : {};
  const posted =
    typeof base.posted === 'object' && base.posted
      ? (base.posted as Record<string, unknown>)
      : {};
  const reminder =
    typeof base.reminder === 'object' && base.reminder
      ? (base.reminder as Record<string, unknown>)
      : {};
  return {
    reviewed: Array.isArray(base.reviewed)
      ? Array.from(new Set(base.reviewed.map((item) => String(item).trim()).filter(Boolean))).slice(0, 64)
      : [],
    posted: {
      instagram: Boolean(posted.instagram),
      whatsapp: Boolean(posted.whatsapp),
      telegram: Boolean(posted.telegram),
      twitter: Boolean(posted.twitter),
    },
    reminder: {
      enabled: Boolean(reminder.enabled),
      mode: 'instructions',
    },
  };
}

export async function GET(request: NextRequest) {
  const session = await requireEditorSession();
  if (!session) return forbidden();

  const packId = request.nextUrl.searchParams.get('packId')?.trim() ?? '';
  if (!packId) {
    return NextResponse.json({ error: 'missing_pack_id' }, { status: 400 });
  }
  const pack = await getSharePackById(packId);
  if (!pack) {
    return NextResponse.json({ error: 'pack_not_found' }, { status: 404 });
  }

  const checklist = await getSharePackChecklist(packId);
  return NextResponse.json({
    packId,
    universeId: pack.universe_id,
    checks: checklist?.checks ?? getDefaultSharePackChecklistChecks(),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await requireEditorSession();
  if (!session) return forbidden();
  const payload = (await request.json().catch(() => null)) as
    | {
        packId?: string;
        checks?: unknown;
      }
    | null;
  const packId = String(payload?.packId ?? '').trim();
  if (!packId) return NextResponse.json({ error: 'missing_pack_id' }, { status: 400 });
  const pack = await getSharePackById(packId);
  if (!pack) return NextResponse.json({ error: 'pack_not_found' }, { status: 404 });

  const updated = await upsertSharePackChecklist({
    packId,
    universeId: pack.universe_id,
    checks: normalizeChecks(payload?.checks),
    updatedBy: session.userId,
  });
  if (!updated) return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  return NextResponse.json({ ok: true, checks: updated.checks });
}

