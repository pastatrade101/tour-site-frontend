import { browser } from '$app/environment';
import { env as publicEnv } from '$env/dynamic/public';

// Resolve the API base URL (priority order):
//   1. PUBLIC_API_URL when explicitly set (dev + cross-domain backends).
//   2. In the browser, same-origin "/api" — works when the backend is reverse-proxied
//      under the same domain (e.g. https://your-site/api). No env var, no CORS.
//   3. Localhost fallback (SSR / local dev before env is set).
// A stale "localhost" value that leaked into a real deployment is ignored in favour of
// same-origin, so the live site never gets stuck calling localhost.
function resolveApiUrl(): string {
  const explicit = publicEnv.PUBLIC_API_URL?.trim().replace(/\/+$/, '');

  if (browser) {
    const onLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const looksLikeLeakedLocalDefault = !!explicit && explicit.includes('localhost') && !onLocalhost;
    if (explicit && !looksLikeLeakedLocalDefault) return explicit;
    return `${window.location.origin}/api`;
  }

  return explicit || 'http://localhost:5000/api';
}

export const API_URL = resolveApiUrl();

// Public site origin (no trailing slash) for canonical URLs, OG tags, sitemap and
// robots. Set PUBLIC_SITE_URL in .env; when unset, usages fall back to the live
// request origin so it is never stuck on localhost in production.
export const SITE_URL = (publicEnv.PUBLIC_SITE_URL || '').replace(/\/+$/, '');
