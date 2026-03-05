'use client';

import type { AnalyticsEventName } from '@/lib/analytics/schema';

type TrackClientInput = {
  universeSlug?: string;
  event_name: AnalyticsEventName;
  route?: string;
  referrer_route?: string;
  object_type?: string;
  object_id?: string;
  meta?: Record<string, unknown>;
};

const MAX_BODY = 4_000;

export function trackEvent(input: TrackClientInput) {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify(input);
  if (!payload || payload.length > MAX_BODY) return;

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/track', blob);
      return;
    }
  } catch {}

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

