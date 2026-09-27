import { SITE_URL } from '$lib/config/env';
import { siteOrigin } from '$lib/seoPolicy';
import { buildSitemapEntries, renderSitemap, type SitemapCatalog } from '$lib/server/sitemap';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
  try {
    const response = await fetch('/api/public/sitemap', { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Sitemap inventory returned ${response.status}.`);
    const body = await response.json() as { data?: SitemapCatalog };
    const xml = renderSitemap(buildSitemapEntries(body.data!, siteOrigin(SITE_URL, url.origin)));
    return new Response(xml, { headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    } });
  } catch (cause) {
    console.error('Unable to generate sitemap:', cause);
    return new Response('Sitemap temporarily unavailable. Please retry shortly.\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '300' }
    });
  }
};
