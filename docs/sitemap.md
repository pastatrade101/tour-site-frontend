# Sitemap and indexing

`/sitemap.xml` reads the complete public inventory from the backend's `/api/public/sitemap`. Deploy the frontend and backend together.

## Included pages

- Public landing and listing pages, accommodation, safety, contact/planning and legal pages.
- Published tours, destinations, safari styles and experience categories, public accommodation, blog articles, comparisons, travel styles and indexable safari package landing pages.
- Built-in comparison and travel-style detail pages still available without a CMS record.
- Enabled languages recognised by the router. Detail/legal pages require a published translation. English is unprefixed; `/en/...` redirects to the canonical URL.

Experience-category, blog, comparison and travel-style detail components currently serve English content only, so only their English URLs are advertised. Activities have no public detail route yet and are not treated as standalone pages. Guides are placeholders, not indexable articles.

## Exclusions and reliability

Draft/deleted content, hidden properties, non-indexable safari packages, private/admin/API/booking/quote/trip/shortlist pages and placeholder guides are excluded. Active CMS `noindex`/`none` rules and non-self canonical overrides also exclude a URL. Alternate language links are reciprocal among included variants.

Inventory queries paginate beyond API/database row caps. Any inventory failure returns HTTP 503 with no caching, rather than publishing an incomplete sitemap. Successful responses cache for five minutes; backend inventory caching is invalidated by CMS writes.

XML is UTF-8, escaped and deduplicated, with guards for 50,000 URLs and 50 MB. `lastmod` is intentionally omitted because parent timestamps do not reliably represent linked itinerary/gallery updates. `priority` and `changefreq` are omitted because Google ignores them.

## Production setup

Set `PUBLIC_SITE_URL` to the site's canonical HTTPS origin, without a path/query, e.g. `https://your-domain.example`. The sitemap, robots declaration and shared page canonical use the same setting. An unset value falls back to the request origin; a local development value must not be shipped to production. Confirm the deployed sitemap returns 200 before submitting `/sitemap.xml` in Google Search Console.

`robots.txt` blocks admin/API crawling. Other utility pages remain crawlable to allow their `noindex` directive to be read. SEO overrides are resolved before page rendering, and the shared layout owns the canonical tag.

## Verification

Backend: `npm test` and `npm run build`.

Frontend: `../backend/node_modules/.bin/tsx --test src/lib/server/sitemap.test.ts`, `npm run check`, and `npm run build`.

The tests cover all content families, language reciprocity, overrides, XML escaping, malformed inventories, URL limits and pagination beyond 1,000 records.

References: [Google sitemap requirements](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions).
