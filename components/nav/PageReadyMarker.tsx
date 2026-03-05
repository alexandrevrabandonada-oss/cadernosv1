'use client';

import { useEffect } from 'react';

type PageReadyMarkerProps = {
  id?: string;
};

export function PageReadyMarker({ id }: PageReadyMarkerProps) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('cv:page-ready', {
        detail: { id: id ?? 'page' },
      }),
    );
  }, [id]);

  return <span data-testid='page-ready-marker' aria-hidden='true' style={{ display: 'none' }} />;
}
