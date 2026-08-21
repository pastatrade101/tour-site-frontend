import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { localeFromPath, withLocale } from '$lib/i18n';
import { cachedJson } from '$lib/cache';
import type { TourCategory } from '$lib/types';

export const load: PageLoad = async ({ fetch, url }) => {
  // Active locale from the URL prefix; the API merges published
  // translations and falls back per field to the default language.
  const locale = localeFromPath(url.pathname);
  try {
    const body = await cachedJson<{ data?: { items?: TourCategory[] } }>(withLocale(`${API_URL}/categories?status=published&limit=100`, locale), fetch);
    return {
      categories: body.data?.items ?? []
    };
  } catch {
    return {
      categories: [] as TourCategory[]
    };
  }
};
