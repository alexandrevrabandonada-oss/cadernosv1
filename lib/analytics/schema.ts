export const ANALYTICS_EVENT_NAMES = [
  'page_view',
  'cta_click',
  'share_view',
  'share_open_app',
  'evidence_click',
  'node_select',
  'download_click',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type TrackPayload = {
  universeSlug?: string;
  event_name: AnalyticsEventName;
  route?: string;
  referrer_route?: string;
  object_type?: string;
  object_id?: string;
  meta?: Record<string, unknown>;
};

function normalizeText(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function sanitizeMeta(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    const k = normalizeText(key, 32);
    if (!k) continue;
    if (typeof value === 'string') clean[k] = value.slice(0, 160);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) clean[k] = value;
  }
  return clean;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validateTrackPayload(payload: unknown): { ok: true; value: TrackPayload } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'invalid_payload' };
  }
  const body = payload as Record<string, unknown>;
  const eventName = normalizeText(body.event_name, 32) as AnalyticsEventName;
  if (!ANALYTICS_EVENT_NAMES.includes(eventName)) {
    return { ok: false, error: 'invalid_event_name' };
  }

  const universeSlug = normalizeText(body.universeSlug, 80);
  const route = normalizeText(body.route, 180);
  const referrerRoute = normalizeText(body.referrer_route, 180);
  const objectType = normalizeText(body.object_type, 40);
  const objectIdRaw = normalizeText(body.object_id, 60);
  const objectId = objectIdRaw && isUuid(objectIdRaw) ? objectIdRaw : '';

  return {
    ok: true,
    value: {
      universeSlug: universeSlug || undefined,
      event_name: eventName,
      route: route || undefined,
      referrer_route: referrerRoute || undefined,
      object_type: objectType || undefined,
      object_id: objectId || undefined,
      meta: sanitizeMeta(body.meta),
    },
  };
}

