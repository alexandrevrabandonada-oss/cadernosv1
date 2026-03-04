'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useListKeyboardNav } from '@/hooks/useListKeyboardNav';

type Props = {
  ids: string[];
  selectedId?: string;
  enabled?: boolean;
};

function nextUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function ListKeyboardNavigator({ ids, selectedId = '', enabled = true }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const onSelect = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('selected', id);
      router.replace(nextUrl(pathname, params), { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const onOpenDetail = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('selected', id);
      params.set('panel', 'detail');
      router.replace(nextUrl(pathname, params), { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useListKeyboardNav({
    ids,
    selectedId,
    onSelect,
    onOpenDetail,
    enabled,
  });

  return null;
}
