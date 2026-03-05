const CACHE_VERSION = 'v2';
const CACHE_STATIC = `cv-static-${CACHE_VERSION}`;
const CACHE_PAGES = `cv-pages-${CACHE_VERSION}`;
const CACHE_SHARE = `cv-share-${CACHE_VERSION}`;

const SHARE_TTL_MS = 24 * 60 * 60 * 1000;
const SECTION_TTL_MS = 6 * 60 * 60 * 1000;

const CACHE_LIMITS = {
  [CACHE_STATIC]: 60,
  [CACHE_PAGES]: 80,
  [CACHE_SHARE]: 80,
};

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

function isDisallowed(url) {
  const path = url.pathname;
  if (path.startsWith('/admin')) return true;
  if (path.startsWith('/api/admin')) return true;
  if (path.startsWith('/api/auth')) return true;
  if (path.startsWith('/login')) return true;
  return false;
}

function isSharePage(path) {
  return /^\/c\/[^/]+\/s(\/|$)/.test(path);
}

function isHubPage(path) {
  return /^\/c\/[^/]+\/?$/.test(path);
}

function isUniverseSection(path) {
  return /^\/c\/[^/]+\/(provas|linha|debate|mapa|glossario|trilhas|tutor)(\/|$)/.test(path);
}

function isPrivateUniversePath(path) {
  if (/^\/c\/[^/]+\/tutor\/s\//.test(path)) return true;
  if (/^\/c\/[^/]+\/exports\//.test(path)) return true;
  return false;
}

function isAppShellAsset(path) {
  if (path === '/' || path === '/offline') return true;
  if (path === '/favicon.svg') return true;
  if (path.startsWith('/icons/')) return true;
  if (path.startsWith('/_next/static/')) return true;
  return false;
}

function readCachedAt(response) {
  if (!response) return 0;
  const raw = response.headers.get('sw-cached-at');
  const value = Number(raw ?? '0');
  return Number.isFinite(value) ? value : 0;
}

async function putWithMeta(cacheName, request, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(cacheName);
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', String(Date.now()));
  const body = await response.clone().blob();
  const wrapped = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(request, wrapped);
  await pruneCache(cacheName, CACHE_LIMITS[cacheName] ?? 80);
}

async function pruneCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;

  const rows = await Promise.all(
    keys.map(async (key) => {
      const item = await cache.match(key);
      return { key, cachedAt: readCachedAt(item) };
    }),
  );

  rows.sort((a, b) => a.cachedAt - b.cachedAt);
  const toDelete = rows.slice(0, Math.max(0, rows.length - maxEntries));
  await Promise.all(toDelete.map((row) => cache.delete(row.key)));
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      await putWithMeta(cacheName, request, response);
      return response;
    })
    .catch(() => null);
  return cached || networkPromise || offlineFallbackResponse(request);
}

async function cacheFirstWithTtl(request, cacheName, ttlMs) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    const age = Date.now() - readCachedAt(cached);
    if (age <= ttlMs) {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    await putWithMeta(cacheName, request, response);
    return response;
  } catch {
    return cached || offlineFallbackResponse(request);
  }
}

async function networkFirstWithFallback(request, cacheName, ttlMs) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    await putWithMeta(cacheName, request, response);
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const age = Date.now() - readCachedAt(cached);
      if (age <= ttlMs) return cached;
      return cached;
    }
    return offlineFallbackResponse(request);
  }
}

function offlineFallbackResponse(request) {
  if (request.mode !== 'navigate') {
    return new Response('', { status: 503, statusText: 'offline' });
  }
  const url = new URL(request.url);
  return Response.redirect(`/offline?from=${encodeURIComponent(`${url.pathname}${url.search}`)}`, 302);
}

async function precacheOfflineSeed() {
  try {
    const response = await fetch('/api/public/offline-seed', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    const slugs = Array.isArray(payload?.universeSlugs) ? payload.universeSlugs : [];
    const sharePages = Array.isArray(payload?.sharePages) ? payload.sharePages : [];
    const pageCache = await caches.open(CACHE_PAGES);
    const shareCache = await caches.open(CACHE_SHARE);

    const urls = [];
    for (const slug of slugs.slice(0, 3)) {
      urls.push(`/c/${slug}`);
      urls.push(`/c/${slug}/s`);
    }
    for (const url of sharePages.slice(0, 10)) {
      urls.push(String(url));
    }

    await Promise.allSettled(
      urls.map(async (url) => {
        if (typeof url !== 'string' || !url.startsWith('/')) return;
        const request = new Request(url, { method: 'GET', credentials: 'same-origin' });
        const targetCache = isSharePage(new URL(url, self.location.origin).pathname) ? shareCache : pageCache;
        try {
          const network = await fetch(request);
          if (network && network.ok) {
            const headers = new Headers(network.headers);
            headers.set('sw-cached-at', String(Date.now()));
            const wrapped = new Response(await network.clone().blob(), {
              status: network.status,
              statusText: network.statusText,
              headers,
            });
            await targetCache.put(request, wrapped);
          }
        } catch {}
      }),
    );

    await Promise.all([
      pruneCache(CACHE_PAGES, CACHE_LIMITS[CACHE_PAGES]),
      pruneCache(CACHE_SHARE, CACHE_LIMITS[CACHE_SHARE]),
    ]);
  } catch {}
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then(async (cache) => {
        await cache.addAll(PRECACHE_URLS);
        await pruneCache(CACHE_STATIC, CACHE_LIMITS[CACHE_STATIC]);
      })
      .then(() => precacheOfflineSeed())
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![CACHE_STATIC, CACHE_PAGES, CACHE_SHARE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() =>
        Promise.all([
          pruneCache(CACHE_STATIC, CACHE_LIMITS[CACHE_STATIC]),
          pruneCache(CACHE_PAGES, CACHE_LIMITS[CACHE_PAGES]),
          pruneCache(CACHE_SHARE, CACHE_LIMITS[CACHE_SHARE]),
        ]),
      ),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isDisallowed(url)) return;

  const path = url.pathname;
  if (isPrivateUniversePath(path)) return;

  if (isAppShellAsset(path)) {
    event.respondWith(cacheFirstWithTtl(request, CACHE_STATIC, SHARE_TTL_MS));
    return;
  }

  if (path === '/api/og') {
    event.respondWith(cacheFirstWithTtl(request, CACHE_SHARE, SHARE_TTL_MS));
    return;
  }

  if (isSharePage(path)) {
    event.respondWith(cacheFirstWithTtl(request, CACHE_SHARE, SHARE_TTL_MS));
    return;
  }

  if (path === '/' || isHubPage(path)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_PAGES));
    return;
  }

  if (isUniverseSection(path)) {
    event.respondWith(networkFirstWithFallback(request, CACHE_PAGES, SECTION_TTL_MS));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request, CACHE_PAGES, SECTION_TTL_MS));
  }
});

