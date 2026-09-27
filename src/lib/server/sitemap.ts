import { COMPARISONS } from '../data/comparisons';
import { TRAVEL_STYLES } from '../data/travel-styles';
import { DEFAULT_LOCALE, KNOWN_LOCALES, localizeHref } from '../i18n';
import { defaultPageLocales, disallowsIndexing, isPrivateOrUtilityPath, type SeoOverride } from '../seoPolicy';

export const STATIC_SITEMAP_PATHS = [
  '/', '/tours', '/experiences', '/safari-styles', '/safari-packages', '/trip-finder',
  '/destinations', '/destination-scores', '/accommodation', '/gallery', '/blog',
  '/expert-advice', '/compare', '/travel-styles', '/about', '/contact', '/plan-my-trip',
  '/departures', '/safety', '/privacy', '/terms', '/cancellation-policy', '/data-retention'
] as const;

export type SitemapRecord = { slug: string; locales: string[] };
export type SitemapCatalog = {
  collections: Record<string, SitemapRecord[]>;
  languages: string[];
  legalLocales: Record<string, string[]>;
  overrides: SeoOverride[];
};
export type SitemapEntry = { loc: string; alternates: Array<{ lang: string; href: string }> };
const collectionPaths: Record<string, string[]> = {
  tours: ['/tours'], destinations: ['/destinations'], tour_categories: ['/safari-styles', '/experiences'],
  lodges: ['/accommodation'], blog_posts: ['/blog'], comparisons: ['/compare'],
  travel_styles: ['/travel-styles'], safari_packages: ['']
};
const legalDocuments: Record<string, string> = {
  '/privacy': 'privacy', '/terms': 'terms', '/cancellation-policy': 'cancellation', '/data-retention': 'data_retention'
};
const reservedRootSlugs = new Set([
  ...STATIC_SITEMAP_PATHS.map((path) => path.slice(1)), ...KNOWN_LOCALES,
  'admin', 'api', 'booking', 'quote', 'trip', 'shortlist', 'guides', 'sitemap.xml', 'robots.txt', '_app'
]);
const slugSegment = (value: string): string | null => {
  if (!value || value !== value.trim() || /[\s/\\?#%\u0000-\u001f]/.test(value) || ['.', '..'].includes(value)) return null;
  return encodeURIComponent(value);
};
const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);

export const buildSitemapEntries = (catalog: SitemapCatalog, origin: string): SitemapEntry[] => {
  // An incomplete snapshot must not turn into a successful, incomplete sitemap.
  if (!catalog || !Array.isArray(catalog.languages) || !Array.isArray(catalog.overrides) || !catalog.legalLocales) throw new Error('Invalid sitemap inventory.');
  for (const key of Object.keys(collectionPaths)) {
    if (!Array.isArray(catalog.collections?.[key])) throw new Error(`Missing sitemap collection: ${key}`);
  }
  const enabled = [...new Set([DEFAULT_LOCALE, ...catalog.languages.filter((code) => (KNOWN_LOCALES as readonly string[]).includes(code))])];
  const candidates = new Map<string, string[]>();
  for (const path of STATIC_SITEMAP_PATHS) {
    const doc = legalDocuments[path];
    if (doc && !Array.isArray(catalog.legalLocales[doc])) throw new Error(`Missing legal locales: ${doc}`);
    candidates.set(path, doc ? catalog.legalLocales[doc] : enabled);
  }
  // These routes have real built-in content when no CMS record is available.
  for (const item of COMPARISONS) candidates.set(`/compare/${item.slug}`, [DEFAULT_LOCALE]);
  for (const item of TRAVEL_STYLES) candidates.set(`/travel-styles/${item.slug}`, [DEFAULT_LOCALE]);
  for (const [table, prefixes] of Object.entries(collectionPaths)) {
    for (const row of catalog.collections[table]) {
      const slug = slugSegment(row.slug);
      if (!slug || (table === 'safari_packages' && reservedRootSlugs.has(row.slug))) continue;
      for (const prefix of prefixes) {
        const path = `${prefix}/${slug}`;
        candidates.set(path, defaultPageLocales(path) ?? row.locales);
      }
    }
  }
  const overrides = new Map(catalog.overrides.filter((row) => row.path).map((row) => [row.path!, row]));
  const entries = new Map<string, SitemapEntry>();
  for (const [path, locales] of candidates) {
    if (isPrivateOrUtilityPath(path)) continue;
    const variants = enabled.filter((lang) => locales.includes(lang)).map((lang) => {
      const localizedPath = localizeHref(path, lang);
      const loc = `${origin}${localizedPath}`;
      const rule = overrides.get(localizedPath);
      if (disallowsIndexing(rule?.robots)) return null;
      // A page canonicalised elsewhere is not a second sitemap URL. Its target
      // is included only if it independently exists in this public inventory.
      if (rule?.canonical_url) {
        try { if (new URL(rule.canonical_url).href !== new URL(loc).href) return null; }
        catch { return null; }
      }
      return { lang, href: loc };
    }).filter((value): value is { lang: string; href: string } => value !== null);
    const defaultVariant = variants.find((variant) => variant.lang === DEFAULT_LOCALE);
    const alternates = variants.length > 1
      ? [...variants, ...(defaultVariant ? [{ lang: 'x-default', href: defaultVariant.href }] : [])]
      : [];
    for (const variant of variants) entries.set(variant.href, { loc: variant.href, alternates });
  }
  return [...entries.values()].sort((a, b) => a.loc.localeCompare(b.loc));
};

export const renderSitemap = (entries: SitemapEntry[]): string => {
  if (entries.length > 50_000) throw new Error('Sitemap exceeds 50,000 URLs; split into a sitemap index.');
  const urls = entries.map(({ loc, alternates }) => `  <url>\n    <loc>${escapeXml(loc)}</loc>${alternates.map(({ lang, href }) => `\n    <xhtml:link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(href)}" />`).join('')}\n  </url>`).join('\n');
  // lastmod is deliberately omitted: parent updated_at does not track every
  // itinerary, gallery or related-content edit. Never substitute today's date.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
  if (new TextEncoder().encode(xml).byteLength > 50 * 1024 * 1024) throw new Error('Sitemap exceeds 50 MB.');
  return xml;
};
