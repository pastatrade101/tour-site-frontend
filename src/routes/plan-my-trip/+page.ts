import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { localeFromPath, withLocale } from '$lib/i18n';
import { cachedJson } from '$lib/cache';
import type { PlannerTour } from '$lib/tripPlanner';

/*
 * The planner suggests trips as the visitor answers, so it needs the published
 * catalogue up front — and the published styles, which decide which trip types
 * are on offer at all. Both fail soft: without them the planner still collects
 * the request, it just has nothing to suggest.
 */
export const load: PageLoad = async ({ fetch, url }) => {
  const locale = localeFromPath(url.pathname);
  const [tours, categories] = await Promise.allSettled([
    cachedJson<{ data?: { items?: PlannerTour[] } }>(withLocale(`${API_URL}/tours?status=published&limit=100`, locale), fetch),
    cachedJson<{ data?: { items?: Array<{ slug?: string }> } }>(withLocale(`${API_URL}/categories?limit=100`, locale), fetch)
  ]);
  return {
    tours: tours.status === 'fulfilled' ? tours.value?.data?.items ?? [] : [],
    categorySlugs:
      categories.status === 'fulfilled'
        ? (categories.value?.data?.items ?? []).map((c) => String(c.slug ?? '')).filter(Boolean)
        : []
  };
};
