'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';

type SmartPrefetchMode = 'off' | 'hover' | 'visible' | 'all';

type UseSmartPrefetchInput = {
  href: string;
  mode?: SmartPrefetchMode;
};

function isSnapshotMode() {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.getAttribute('data-motion') === 'off') return true;
  try {
    return new URLSearchParams(window.location.search).get('snapshot') === '1';
  } catch {
    return false;
  }
}

function isDisallowedPath(href: string) {
  if (!href || !href.startsWith('/')) return true;
  if (href.startsWith('/admin')) return true;
  if (href.startsWith('/login')) return true;
  if (href.startsWith('/api')) return true;
  return false;
}

function isSlowNetwork() {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };
  const connection = nav.connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  const type = (connection.effectiveType ?? '').toLowerCase();
  return type === '2g' || type === 'slow-2g';
}

export function useSmartPrefetch({ href, mode = 'hover' }: UseSmartPrefetchInput) {
  const router = useRouter();
  const nodeRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefetchedRef = useRef(false);

  const canPrefetch = useMemo(() => {
    if (mode === 'off') return false;
    if (isSnapshotMode()) return false;
    if (isSlowNetwork()) return false;
    if (isDisallowedPath(href)) return false;
    return true;
  }, [href, mode]);

  const prefetchNow = useCallback(() => {
    if (!canPrefetch) return;
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    router.prefetch(href);
  }, [canPrefetch, href, router]);

  const setNode = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      if (!node || !canPrefetch) return;
      if (mode !== 'visible' && mode !== 'all') return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            prefetchNow();
            observerRef.current?.disconnect();
          }
        },
        { rootMargin: '180px 0px' },
      );
      observerRef.current.observe(node);
    },
    [canPrefetch, mode, prefetchNow],
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return {
    setNode,
    prefetchOnHover: mode === 'hover' || mode === 'all',
    prefetchNow,
  };
}
