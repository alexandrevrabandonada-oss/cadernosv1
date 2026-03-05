'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { trackEvent } from '@/lib/analytics/track';

type ShareButtonProps = {
  url: string;
  title: string;
  text?: string;
  label?: string;
  className?: string;
};

function toAbsoluteUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === 'undefined') return url;
  return new URL(url, window.location.origin).toString();
}

export function ShareButton({ url, title, text, label = 'Compartilhar', className }: ShareButtonProps) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const absoluteUrl = useMemo(() => toAbsoluteUrl(url), [url]);

  async function onShare() {
    if (!absoluteUrl || busy) return;
    setBusy(true);
    const match = absoluteUrl.match(/\/c\/([^/]+)/i);
    const universeSlug = match?.[1] ? decodeURIComponent(match[1]) : undefined;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: text ?? title, url: absoluteUrl });
        toast.success('Compartilhado');
      } else {
        await navigator.clipboard.writeText(absoluteUrl);
        toast.success('Link copiado');
      }
      trackEvent({
        universeSlug,
        event_name: 'cta_click',
        route: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : undefined,
        object_type: 'share',
        meta: {
          cta: 'compartilhar',
          target: absoluteUrl,
        },
      });
    } catch {
      try {
        await navigator.clipboard.writeText(absoluteUrl);
        toast.success('Link copiado');
      } catch {
        toast.error('Falha ao compartilhar');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className={className ?? 'ui-button'} type='button' data-variant='ghost' onClick={onShare} disabled={busy}>
      {busy ? '...' : label}
    </button>
  );
}
