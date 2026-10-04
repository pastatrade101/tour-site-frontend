import type { LayoutLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { localeFromPath } from '$lib/i18n';
import { isPrivateOrUtilityPath, type SeoOverride } from '$lib/seoPolicy';
import type { Language } from '$lib/types';

/** Resolve language and SEO before rendering, including on server requests. */
export const load: LayoutLoad = async ({ fetch, url }) => {
  const locale = localeFromPath(url.pathname);
  const [languages, seoOverride, publicSettings] = await Promise.all([
    cachedJson<{ data?: Language[] }>(`${API_URL}/translations/languages`, fetch)
      .then((body) => body.data ?? []).catch(() => [] as Language[]),
    (async (): Promise<SeoOverride | null> => {
      if (isPrivateOrUtilityPath(url.pathname)) return null;
      try {
        const response = await fetch(`${API_URL}/page-seo/resolve?path=${encodeURIComponent(url.pathname)}`, {
          signal: AbortSignal.timeout(8_000)
        });
        if (!response.ok) return null;
        const body = await response.json() as { data?: { match?: boolean; seo?: SeoOverride } };
        return body.data?.match ? body.data.seo ?? null : null;
      } catch {
        return null;
      }
    })(),
    // A CMS default share image must be available during SSR; client-only
    // settings were too late for social crawlers and link previews.
    cachedJson<{ data?: Record<string, unknown> }>(`${API_URL}/public/settings`, fetch)
      .then((body) => body.data ?? {}).catch(() => ({} as Record<string, unknown>))
  ]);
  const rawDefaultOgImage = publicSettings.default_og_image_url;
  const defaultOgImage = typeof rawDefaultOgImage === 'string' ? rawDefaultOgImage.trim() : '';
  return { locale, languages, seoOverride, defaultOgImage };
};
