import { NextResponse } from 'next/server';
import { updateUserUiSettings } from '@/lib/user/settings';
import type { UiSettings } from '@/lib/user/uiSettings';

type Payload = Partial<UiSettings>;

function sanitizePayload(raw: unknown): Payload {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const payload: Payload = {};
  if (source.density === 'normal' || source.density === 'compact') payload.density = source.density;
  if (source.texture === 'normal' || source.texture === 'low') payload.texture = source.texture;
  if (typeof source.focus_mode === 'boolean') payload.focus_mode = source.focus_mode;
  if (typeof source.haptics === 'boolean') payload.haptics = source.haptics;
  if (typeof source.sound_cues === 'boolean') payload.sound_cues = source.sound_cues;
  if (typeof source.last_section === 'string') payload.last_section = source.last_section as UiSettings['last_section'];
  return payload;
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const payload = sanitizePayload(body);
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }
    const saved = await updateUserUiSettings(payload);
    if (!saved) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ ok: true, settings: saved });
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
}
