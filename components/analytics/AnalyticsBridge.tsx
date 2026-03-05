'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { AnalyticsEventName } from '@/lib/analytics/schema';
import { trackEvent } from '@/lib/analytics/track';

type AnalyticsBridgeProps = {
  universeSlug: string;
};

function currentRoute(pathname: string, search: URLSearchParams) {
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AnalyticsBridge({ universeSlug }: AnalyticsBridgeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRouteRef = useRef('');

  useEffect(() => {
    const route = currentRoute(pathname, searchParams);
    if (!route || route === lastRouteRef.current) return;
    const isShare = pathname.includes('/s/');
    trackEvent({
      universeSlug,
      event_name: isShare ? 'share_view' : 'page_view',
      route,
      referrer_route: document.referrer || undefined,
      meta: {
        density: document.documentElement.getAttribute('data-density') || 'normal',
        texture: document.documentElement.getAttribute('data-texture') || 'normal',
      },
    });
    lastRouteRef.current = route;
  }, [pathname, searchParams, universeSlug]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>('[data-track-event]');
      if (!el) return;
      const eventName = (el.dataset.trackEvent || '').trim() as AnalyticsEventName;
      if (!eventName) return;

      trackEvent({
        universeSlug,
        event_name: eventName,
        route: currentRoute(window.location.pathname, new URLSearchParams(window.location.search)),
        object_type: el.dataset.trackObjectType || undefined,
        object_id: el.dataset.trackObjectId || undefined,
        meta: {
          cta: el.dataset.trackCta || undefined,
          section: el.dataset.trackSection || undefined,
          lens: el.dataset.trackLens || undefined,
        },
      });
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [universeSlug]);

  useEffect(() => {
    const selected = searchParams.get('selected');
    if (!selected) return;
    const path = pathname.toLowerCase();
    const isProvas = path.endsWith('/provas');
    const isMapa = path.endsWith('/mapa');
    if (!isProvas && !isMapa) return;
    trackEvent({
      universeSlug,
      event_name: isProvas ? 'evidence_click' : 'node_select',
      route: currentRoute(pathname, searchParams),
      object_type: isProvas ? 'evidence' : 'node',
      object_id: selected,
    });
  }, [pathname, searchParams, universeSlug]);

  return null;
}

