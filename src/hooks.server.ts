import type { Handle } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

// Internal backend origin (server-side only — mirrors src/routes/api/[...path]).
//   • Docker Compose: reachable by service name -> http://backend:5000
//   • Single host: http://127.0.0.1:5000
// Override with BACKEND_ORIGIN when neither applies.
const backendOrigin = (privateEnv.BACKEND_ORIGIN || 'http://127.0.0.1:5000').replace(/\/+$/, '');

// Never treat these as content pages worth a redirect lookup.
const SKIP_PREFIX = /^\/(api|_app|@|\.well-known)(\/|$)/;
const HAS_EXTENSION = /\.[a-z0-9]+$/i;

/**
 * SEO redirect rescue: when a GET navigation would 404, ask the backend whether
 * the path has a configured redirect (Admin → Redirects). If so, issue a real
 * 301/302 instead of showing the 404. Everything else passes through untouched;
 * if the backend is unreachable the visitor just gets the normal 404 page.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  if (
    response.status !== 404 ||
    event.request.method !== 'GET' ||
    SKIP_PREFIX.test(event.url.pathname) ||
    HAS_EXTENSION.test(event.url.pathname)
  ) {
    return response;
  }

  try {
    const target = `${backendOrigin}/api/redirects/resolve?path=${encodeURIComponent(event.url.pathname)}`;
    const res = await fetch(target);
    if (!res.ok) return response;

    const body = (await res.json()) as { data?: { match?: boolean; to_path?: string; status_code?: number } };
    const hit = body?.data;

    if (hit?.match && hit.to_path && hit.to_path !== event.url.pathname) {
      const status = hit.status_code && hit.status_code >= 300 && hit.status_code < 400 ? hit.status_code : 301;
      return new Response(null, { status, headers: { location: hit.to_path } });
    }
  } catch {
    // Backend unreachable — fall through to the normal 404 page.
  }

  return response;
};
