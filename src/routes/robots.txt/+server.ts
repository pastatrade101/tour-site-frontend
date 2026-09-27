import { SITE_URL } from '$lib/config/env';
import { siteOrigin } from '$lib/seoPolicy';
import { KNOWN_LOCALES } from '$lib/i18n';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
  const origin = siteOrigin(SITE_URL, url.origin);
  const blocked = ['', ...KNOWN_LOCALES.map((locale) => `/${locale}`)]
    .flatMap((prefix) => ['admin', 'api'].flatMap((path) => [`Disallow: ${prefix}/${path}$`, `Disallow: ${prefix}/${path}/`]));
  return new Response(`User-agent: *\nAllow: /\n${blocked.join('\n')}\n\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
  });
};
