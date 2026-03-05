import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { rateLimit } from '@/lib/ratelimit';
import { getOrSetSessionId } from '@/lib/analytics/session';
import { validateTrackPayload } from '@/lib/analytics/schema';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const parsed = validateTrackPayload(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payload = parsed.value;
  const response = NextResponse.json({ ok: true });
  const sessionId = getOrSetSessionId(request, response);
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    return response;
  }

  let universeId: string | null = null;
  if (payload.universeSlug) {
    const access = await getUniverseAccessBySlug(payload.universeSlug);
    if (!access.universe) {
      return NextResponse.json({ error: 'universe_not_found' }, { status: 404 });
    }
    if (!access.published && !access.canPreview) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    universeId = access.universe.id;
  }

  const session = await getCurrentSession();
  const rl = await rateLimit(`track:${sessionId}:${payload.event_name}`, {
    limit: 60,
    windowSec: 60,
    prefix: 'cv:track',
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      { status: 429 },
    );
  }

  await db.from('analytics_events').insert({
    universe_id: universeId,
    user_id: session?.userId ?? null,
    session_id: sessionId,
    event_name: payload.event_name,
    route: payload.route ?? null,
    referrer_route: payload.referrer_route ?? null,
    object_type: payload.object_type ?? null,
    object_id: payload.object_id ?? null,
    meta: payload.meta ?? {},
  });

  return response;
}

