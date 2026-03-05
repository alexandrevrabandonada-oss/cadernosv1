import { describe, expect, it } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { getOrSetSessionId } from '@/lib/analytics/session';
import { validateTrackPayload } from '@/lib/analytics/schema';

describe('analytics payload validation', () => {
  it('accepts valid payload and sanitizes meta', () => {
    const result = validateTrackPayload({
      universeSlug: 'demo',
      event_name: 'cta_click',
      route: '/c/demo/provas',
      object_type: 'evidence',
      object_id: 'not-uuid',
      meta: {
        cta: 'ver_provas',
        veryLong: 'a'.repeat(500),
        nested: { bad: true },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.event_name).toBe('cta_click');
    expect(result.value.object_id).toBeUndefined();
    expect(result.value.meta?.cta).toBe('ver_provas');
    expect(typeof result.value.meta?.veryLong).toBe('string');
  });

  it('rejects unknown event', () => {
    const result = validateTrackPayload({
      universeSlug: 'demo',
      event_name: 'unknown_event',
    });
    expect(result.ok).toBe(false);
  });
});

describe('analytics session cookie', () => {
  it('reuses valid cookie', () => {
    const request = new NextRequest('http://localhost/api/track', {
      headers: { cookie: 'cv_sid=session-fixed-12345' },
    });
    const response = NextResponse.json({ ok: true });
    const sid = getOrSetSessionId(request, response);
    expect(sid).toBe('session-fixed-12345');
  });

  it('creates cookie when missing', () => {
    const request = new NextRequest('http://localhost/api/track');
    const response = NextResponse.json({ ok: true });
    const sid = getOrSetSessionId(request, response);
    expect(sid.length).toBeGreaterThan(20);
    expect(response.cookies.get('cv_sid')?.value).toBe(sid);
  });
});

