/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// SvelteKit auto-registers this in production. Strategy:
//  • precache hashed build assets + static files (offline.html lives in /static)
//  • static assets: cache-first (they're content-hashed → safe)
//  • page navigations: network-first, fall back to /offline.html when offline
//  • /admin and /api: never cached — always fresh
const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `goldfinch-cache-${version}`;
const ASSETS = [...build, ...files];

/*
 * Files only some pages ever ask for, and large as a set: the country flags
 * (270 of them, 2.6 MB — a page shows five) and the live map's worker and
 * stylesheet. Precaching downloads everything in the list for every visitor,
 * so these are left to be fetched by the pages that use them; the browser's
 * own cache keeps them after that.
 */
const onDemand = (path: string) => path.startsWith('/flags/') || path.includes('maplibre');
const PRECACHE = ASSETS.filter((path) => !onDemand(path));

sw.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) await caches.delete(key);
      }
      await sw.clients.claim();
    })()
  );
});

sw.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) return;

  // Content-hashed build/static assets → cache-first.
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
    return;
  }

  // Page navigations → network-first (stay fresh), offline fallback when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match('/offline.html')) ?? new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Everything else → network, fall back to cache if present.
  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch {
        return (await caches.match(request)) ?? new Response('', { status: 504 });
      }
    })()
  );
});
