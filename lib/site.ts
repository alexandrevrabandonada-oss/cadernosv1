export function resolveSiteUrl() {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL ?? '').trim();
  if (raw) {
    const normalized = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    return normalized.replace(/\/+$/, '');
  }

  const port = process.env.PORT ?? '3000';
  return `http://127.0.0.1:${port}`;
}

export function resolveMetadataBase() {
  return new URL(resolveSiteUrl());
}
