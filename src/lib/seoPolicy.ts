import { DEFAULT_LOCALE, stripLocale } from './i18n';

export type SeoOverride = {
  path?: string;
  title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  canonical_url?: string | null;
  robots?: string | null;
  structured_data?: Record<string, unknown> | unknown[] | null;
};

export const isPrivateOrUtilityPath = (path: string): boolean =>
  /^\/(admin|api|booking|quote|trip|shortlist|guides)(\/|$)/.test(stripLocale(path));

// These detail components currently read only the default-language content.
// Do not advertise translated copies just because their navigation is translated.
export const defaultPageLocales = (path: string): string[] | null =>
  /^\/(blog|experiences|compare|travel-styles)\/[^/]+\/?$/.test(stripLocale(path)) ? [DEFAULT_LOCALE] : null;

export const disallowsIndexing = (robots?: string | null): boolean =>
  /(?:^|[\s,;])(noindex|none)(?=$|[\s,;])/i.test(robots ?? '');

export const siteOrigin = (configured: string, fallback: string): string => {
  const url = new URL(configured.trim() || fallback);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !/^\/*$/.test(url.pathname)) {
    throw new Error('PUBLIC_SITE_URL must be an http(s) origin without a path, query or credentials.');
  }
  return url.origin;
};
