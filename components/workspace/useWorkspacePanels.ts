'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

function nextUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function useWorkspacePanels() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get('selected') ?? '';
  const panel = searchParams.get('panel') ?? '';
  const detailOpen = panel === 'detail' || Boolean(selectedId);
  const filtersOpen = panel === 'filters';

  const setPanel = useCallback(
    (value: 'detail' | 'filters' | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('panel', value);
      } else {
        params.delete('panel');
      }
      router.replace(nextUrl(pathname, params), { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setSelected = useCallback(
    (id: string | null, openPanel = true) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set('selected', id);
      } else {
        params.delete('selected');
      }
      if (openPanel && id) {
        params.set('panel', 'detail');
      }
      router.replace(nextUrl(pathname, params), { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openFilters = useCallback(() => setPanel('filters'), [setPanel]);
  const closeFilters = useCallback(() => setPanel(null), [setPanel]);
  const openDetail = useCallback(() => setPanel('detail'), [setPanel]);
  const closeDetail = useCallback(() => setPanel(null), [setPanel]);

  return useMemo(
    () => ({
      selectedId,
      panel,
      detailOpen,
      filtersOpen,
      setSelected,
      openFilters,
      closeFilters,
      openDetail,
      closeDetail,
    }),
    [closeDetail, closeFilters, detailOpen, filtersOpen, openDetail, openFilters, panel, selectedId, setSelected],
  );
}
