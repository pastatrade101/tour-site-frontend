/**
 * Locale plumbing — the one place that knows how a locale is encoded in a URL.
 *
 * URL strategy: the default language is served UNPREFIXED and every other
 * language is prefixed.
 *
 *   English  /tours/serengeti      (unchanged — every existing URL still works)
 *   German   /de/tours/serengeti
 *
 * The spec's example shows /en/... for English too, which would mean 301ing
 * every indexed URL on a live site to a new address. Prefix-except-default is
 * the standard way to add locales to an established site without touching its
 * existing addresses or splitting its ranking signals; /en/... still resolves
 * and redirects to the canonical unprefixed form, so both shapes work and only
 * one is canonical.
 */

/** Locales the router will recognise in a path. Must match the seeded set. */
export const KNOWN_LOCALES = ['en', 'sw', 'de', 'fr', 'es'] as const;
export type KnownLocale = (typeof KNOWN_LOCALES)[number];

/** Served without a prefix. Mirrors languages.is_default in the database. */
export const DEFAULT_LOCALE: KnownLocale = 'en';

const LOCALE_PATTERN = new RegExp(`^/(${KNOWN_LOCALES.join('|')})(?=/|$)`, 'i');

export const isKnownLocale = (value: string): value is KnownLocale =>
  (KNOWN_LOCALES as readonly string[]).includes(value.toLowerCase());

/** The locale a path asks for, or the default when it carries no prefix. */
export const localeFromPath = (pathname: string): KnownLocale => {
  const match = LOCALE_PATTERN.exec(pathname);
  return match ? (match[1].toLowerCase() as KnownLocale) : DEFAULT_LOCALE;
};

/** The same path with any locale prefix removed — what the router matches. */
export const stripLocale = (pathname: string): string => {
  const stripped = pathname.replace(LOCALE_PATTERN, '');
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
};

/**
 * The address of `pathname` in `locale`. Used by the language switcher and by
 * hreflang, so a visitor changing language lands on the equivalent page rather
 * than back at the homepage.
 */
/**
 * Add ?locale= to an API URL, correctly whether or not it already has a query.
 * The default language is never sent — the API serves it by definition, and
 * omitting it keeps the default-language cache keys identical to before.
 */
export const withLocale = (apiUrl: string, locale: string): string => {
  if (locale === DEFAULT_LOCALE) return apiUrl;
  return `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}locale=${locale}`;
};

export const localizeHref = (pathname: string, locale: string): string => {
  const base = stripLocale(pathname);
  if (locale === DEFAULT_LOCALE) return base;
  return base === '/' ? `/${locale}` : `/${locale}${base}`;
};
