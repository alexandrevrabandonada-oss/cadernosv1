'use client';

import { useEffect } from 'react';

function shouldDisableMotionByQuery() {
  try {
    return new URLSearchParams(window.location.search).get('snapshot') === '1';
  } catch {
    return false;
  }
}

export function MotionModeSync() {
  useEffect(() => {
    const snapshotEnv = process.env.NEXT_PUBLIC_UI_SNAPSHOT === '1';
    const apply = () => {
      const disabled = snapshotEnv || shouldDisableMotionByQuery();
      if (disabled) {
        document.documentElement.setAttribute('data-motion', 'off');
      } else if (document.documentElement.getAttribute('data-motion') === 'off') {
        document.documentElement.removeAttribute('data-motion');
      }
    };

    apply();
    window.addEventListener('popstate', apply);
    window.addEventListener('hashchange', apply);
    return () => {
      window.removeEventListener('popstate', apply);
      window.removeEventListener('hashchange', apply);
    };
  }, []);

  return null;
}
