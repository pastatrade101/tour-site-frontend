import { SITE_URL } from '$lib/config/env';
import { COMPARISONS } from '$lib/data/comparisons';
import { TRAVEL_STYLES } from '$lib/data/travel-styles';
import type { SafariPackage } from '$lib/types';
import type { RequestHandler } from './$types';

const routes = [
  '/',
  '/tours',
  '/experiences',
  '/safari-styles',
  '/safari-packages',
  '/trip-finder',
  '/destinations',
  '/destination-scores',
  '/gallery',
  '/blog',
  '/expert-advice',
  '/compare',
  ...COMPARISONS.map((c) => `/compare/${c.slug}`),
  '/travel-styles',
  ...TRAVEL_STYLES.map((s) => `/travel-styles/${s.slug}`),
  '/about',
  '/contact',
  '/plan-my-trip',
  '/departures'
];

/**
 * The landing pages a crawler is actually invited to.
 *
 * Two conditions, both strict. `published` because a draft is not a page yet,
 * and `indexable === true` because the detail route stamps `noindex` on
 * anything else — a sitemap that lists a page whose own markup refuses
 * indexing is worse than listing nothing, since it spends crawl budget
 * arguing with itself.
 *
 * `=== true` rather than truthiness on purpose: a row from before the column
 * existed comes back `undefined`, and must read as "no".
 *
 * The fetch is relative so it passes through the app's own /api proxy, and it
 * fails soft — a sitemap missing its packages is a smaller problem than a
 * sitemap that 500s.
 */
const packageRoutes = async (fetchFn: typeof fetch): Promise<string[]> => {
  try {
    const response = await fetchFn('/api/safari-packages?status=published&limit=500');
    if (!response.ok) return [];
    const body = (await response.json()) as { data?: { items?: SafariPackage[] } };
    return (body?.data?.items ?? [])
      .filter((row) => row?.slug && row.indexable === true)
      .map((row) => `/${row.slug}`);
  } catch {
    return [];
  }
};

export const GET: RequestHandler = async ({ url, fetch }) => {
  const origin = SITE_URL || url.origin;
  const all = [...routes, ...(await packageRoutes(fetch))];

  const urls = all
    .map((route) => `<url><loc>${origin}${route}</loc><changefreq>weekly</changefreq><priority>${route === '/' ? '1.0' : '0.7'}</priority></url>`)
    .join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: {
      'Content-Type': 'application/xml'
    }
  });
};
