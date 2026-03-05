'use client';

import Link, { type LinkProps } from 'next/link';
import { useCallback } from 'react';
import type { AnchorHTMLAttributes } from 'react';
import { useSmartPrefetch } from '@/hooks/useSmartPrefetch';

type SmartPrefetchMode = 'off' | 'hover' | 'visible' | 'all';

type PrefetchLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  Omit<LinkProps, 'href' | 'prefetch'> & {
    href: string;
    smartPrefetch?: SmartPrefetchMode;
    prefetchOnVisible?: boolean;
  };

function emitNavStart() {
  window.dispatchEvent(new CustomEvent('cv:navigation-start'));
}

export function PrefetchLink({
  href,
  smartPrefetch = 'hover',
  prefetchOnVisible = false,
  onMouseEnter,
  onFocus,
  onClick,
  ...props
}: PrefetchLinkProps) {
  const mode: SmartPrefetchMode = prefetchOnVisible
    ? smartPrefetch === 'off'
      ? 'visible'
      : smartPrefetch === 'hover'
        ? 'all'
        : smartPrefetch
    : smartPrefetch;
  const prefetch = useSmartPrefetch({ href, mode });

  const setRef = useCallback(
    (node: HTMLAnchorElement | null) => {
      prefetch.setNode(node);
    },
    [prefetch],
  );

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      ref={setRef}
      onMouseEnter={(event) => {
        if (prefetch.prefetchOnHover) prefetch.prefetchNow();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        if (prefetch.prefetchOnHover) prefetch.prefetchNow();
        onFocus?.(event);
      }}
      onClick={(event) => {
        if (
          href.startsWith('/') &&
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          emitNavStart();
        }
        onClick?.(event);
      }}
    />
  );
}
