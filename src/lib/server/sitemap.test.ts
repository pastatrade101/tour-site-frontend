import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSitemapEntries, renderSitemap, STATIC_SITEMAP_PATHS, type SitemapCatalog } from './sitemap';
import { disallowsIndexing, isPrivateOrUtilityPath, siteOrigin } from '../seoPolicy';

const origin = 'https://example.com';
const fixture = (): SitemapCatalog => ({
  collections: Object.fromEntries(['tours', 'destinations', 'tour_categories', 'lodges', 'blog_posts', 'comparisons', 'travel_styles', 'safari_packages']
    .map((key) => [key, [{ slug: `${key}-sample`, locales: ['en', 'de', 'fr'] }]])),
  languages: ['en', 'de', 'unknown'],
  legalLocales: { privacy: ['en', 'de'], terms: ['en'], cancellation: ['en'], data_retention: ['en'] },
  overrides: []
});

test('covers public routes and every content family without duplicates', () => {
  const entries = buildSitemapEntries(fixture(), origin);
  const urls = new Set(entries.map((entry) => entry.loc));
  for (const path of STATIC_SITEMAP_PATHS) assert.ok(urls.has(`${origin}${path}`), path);
  for (const path of ['/tours/tours-sample', '/destinations/destinations-sample', '/safari-styles/tour_categories-sample', '/experiences/tour_categories-sample', '/accommodation/lodges-sample', '/blog/blog_posts-sample', '/compare/comparisons-sample', '/travel-styles/travel_styles-sample', '/safari_packages-sample']) {
    assert.ok(urls.has(`${origin}${path}`), path);
  }
  assert.equal(urls.size, entries.length);
  assert.ok(!entries.some((entry) => isPrivateOrUtilityPath(new URL(entry.loc).pathname)));
});

test('only publishes supported, enabled, actually served language variants with reciprocal alternates', () => {
  const entries = buildSitemapEntries(fixture(), origin);
  const urls = entries.map((entry) => entry.loc);
  assert.ok(urls.includes(`${origin}/de/tours/tours-sample`));
  assert.ok(urls.includes(`${origin}/de/privacy`));
  for (const path of ['/fr/tours/tours-sample', '/unknown', '/en', '/de/terms', '/de/blog/blog_posts-sample', '/de/experiences/tour_categories-sample', '/de/compare/comparisons-sample', '/de/travel-styles/travel_styles-sample']) assert.ok(!urls.includes(`${origin}${path}`), path);
  for (const entry of entries) {
    for (const alternate of entry.alternates) {
      const target = entries.find((candidate) => candidate.loc === alternate.href);
      assert.ok(target);
      assert.deepEqual(target.alternates, entry.alternates);
    }
  }
});

test('honours noindex and canonical overrides without inventing redirect targets', () => {
  const data = fixture();
  data.overrides = [
    { path: '/de/tours/tours-sample', robots: 'NOINDEX, follow' },
    { path: '/blog/blog_posts-sample', robots: 'none' },
    { path: '/about', canonical_url: 'https://elsewhere.example/about' },
    { path: '/contact', canonical_url: `${origin}/contact` },
    { path: '/safety', canonical_url: 'invalid' }
  ];
  const entries = buildSitemapEntries(data, origin);
  for (const path of ['/de/tours/tours-sample', '/blog/blog_posts-sample', '/about', '/safety']) assert.ok(!entries.some((entry) => entry.loc === `${origin}${path}`));
  assert.ok(entries.some((entry) => entry.loc === `${origin}/contact`));
  assert.equal(entries.find((entry) => entry.loc === `${origin}/tours/tours-sample`)?.alternates.length, 0);
});

test('handles more than 100 records, reserved slugs and XML escaping', () => {
  const data = fixture();
  data.collections.tours = Array.from({ length: 1207 }, (_, n) => ({ slug: `tour-${n}`, locales: ['en'] }));
  data.collections.safari_packages.push(...['admin', 'privacy', 'de', '../bad', 'bad?x=1', 'with space'].map((slug) => ({ slug, locales: ['en'] })));
  data.collections.tours.push({ slug: "safari&relax'", locales: ['en'] });
  const entries = buildSitemapEntries(data, origin);
  assert.equal(entries.filter((entry) => entry.loc.startsWith(`${origin}/tours/`)).length, 1208);
  assert.ok(!entries.some((entry) => entry.loc === `${origin}/admin`));
  const xml = renderSitemap(entries);
  assert.ok(xml.includes('safari%26relax&apos;'));
  assert.ok(!xml.includes('<lastmod>'));
  assert.ok(!xml.includes('<priority>'));
});

test('rejects incomplete inventories and oversized sitemaps', () => {
  const data = fixture();
  delete data.collections.tours;
  assert.throws(() => buildSitemapEntries(data, origin));
  assert.throws(() => renderSitemap(Array.from({ length: 50_001 }, () => ({ loc: origin, alternates: [] }))));
});

test('shares URL and indexing policy with page metadata and robots', () => {
  assert.equal(siteOrigin('https://example.com/', 'http://localhost'), origin);
  assert.equal(siteOrigin('', 'http://localhost:5176'), 'http://localhost:5176');
  for (const value of ['https://example.com/path', 'https://user@example.com', 'https://example.com?x=1', 'ftp://example.com']) assert.throws(() => siteOrigin(value, origin));
  assert.ok(disallowsIndexing('max-snippet:-1, noindex'));
  assert.ok(!disallowsIndexing('index, follow'));
  for (const path of ['/admin', '/de/admin/tours', '/booking/test', '/quote/token', '/trip/token', '/shortlist', '/guides/test']) assert.ok(isPrivateOrUtilityPath(path));
  assert.ok(!isPrivateOrUtilityPath('/trip-finder'));
});
