import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { localeFromPath, withLocale } from '$lib/i18n';
import { toMetaText } from '$lib/richText';
import type { Tour } from '$lib/types';

/**
 * Pick the description a search engine should see.
 *
 * Prefers a field that was actually translated over one that fell back to the
 * default language, so a German page does not advertise an English meta
 * description just because the SEO field has not been translated yet. On the
 * default language nothing is marked translated and this collapses to the
 * ordinary priority order.
 */
const seoDescription = (record: Record<string, unknown>, chain: string[]): string => {
  const translated = new Set((record.translated_fields as string[] | undefined) ?? []);
  const text = (key: string) => (typeof record[key] === 'string' ? (record[key] as string) : '');
  const preferred = chain.find((key) => translated.has(key) && text(key).trim());
  return toMetaText(text(preferred ?? chain.find((key) => text(key).trim()) ?? ''), 160);
};


/**
 * The tour itself is fetched here rather than in the component.
 *
 * It used to load client-side, which meant the server-rendered HTML carried no
 * title, no description and no copy — a crawler saw an empty shell, and the
 * translated version of the page was invisible to search engines entirely.
 * Loading it here renders the real content and its SEO on the server, in
 * whichever locale the URL asks for.
 *
 * Related tours, lodge media and travel styles stay client-side: they are
 * below the fold and not what a crawler indexes the page for.
 */
export const load: PageLoad = async ({ fetch, params, url }) => {
  const locale = localeFromPath(url.pathname);

  try {
    const body = await cachedJson<{ data?: Tour }>(
      withLocale(`${API_URL}/tours/${params.slug}`, locale),
      fetch
    );
    const tour = body.data ?? null;
    if (!tour) return { tour: null, availableLocales: null, seo: null, origin: url.origin };

    return {
      tour,
      availableLocales: (tour as { available_locales?: string[] }).available_locales ?? null,
      seo: {
        title: `${tour.seo_title || tour.meta_title || tour.title} | Goldfinch Adventures`,
        description: seoDescription(tour as unknown as Record<string, unknown>, ['meta_description', 'short_description', 'full_description'])
      },
      origin: url.origin
    };
  } catch {
    // A failed fetch must not 500 the page — the component shows its own error.
    return { tour: null, availableLocales: null, seo: null, origin: url.origin };
  }
};
