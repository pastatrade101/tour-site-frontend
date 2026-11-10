import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { localeFromPath, withLocale, type KnownLocale } from '$lib/i18n';
import { translateIn } from '$lib/i18n/ui';
import { titleWithBrand } from '$lib/seo';
import type { BlogCategory } from '$lib/types';

/** The Travel Journal hub: every published category, rendered on the server. */
export const load: PageLoad = async ({ fetch, url }) => {
  const locale = localeFromPath(url.pathname) as KnownLocale;
  let categories: BlogCategory[] = [];
  try {
    const body = await cachedJson<{ data?: { items?: BlogCategory[] } }>(
      withLocale(`${API_URL}/blog-categories?status=published&limit=50`, locale),
      fetch
    );
    categories = body.data?.items ?? [];
  } catch {
    categories = [];
  }
  return {
    categories,
    seo: {
      title: titleWithBrand(null, translateIn(locale, 'journal.hub_title')),
      description: translateIn(locale, 'journal.hub_intro'),
      ogImage: categories.find((category) => category.cover_image_url)?.cover_image_url ?? undefined,
      type: 'website' as const
    }
  };
};
