import type { Handle } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { DEFAULT_LOCALE, localeFromPath, stripLocale } from '$lib/i18n';

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
  const locale = localeFromPath(event.url.pathname);
  const prefixed = stripLocale(event.url.pathname) !== event.url.pathname;

  // The default language is canonical without a prefix, so /en/tours is a
  // permanent redirect to /tours. Both addresses work; only one is indexable,
  // which is what keeps the default language from competing with itself.
  if (prefixed && locale === DEFAULT_LOCALE) {
    const target = stripLocale(event.url.pathname) + event.url.search;
    return new Response(null, { status: 301, headers: { location: target } });
  }

  const response = await resolve(event, {
    // The document must declare the language it is actually written in —
    // screen readers, translation prompts and search engines all read it.
    transformPageChunk: ({ html }) =>
      locale === DEFAULT_LOCALE ? html : html.replace('<html lang="en"', `<html lang="${locale}"`)
  });

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
