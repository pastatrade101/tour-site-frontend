import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { localeFromPath, withLocale } from '$lib/i18n';
import { cachedJson } from '$lib/cache';
import type { ReviewSummary } from '$lib/types';
import { placesOf, type PlannerCategory, type PlannerTour } from '$lib/tripPlanner';

/*
 * The planner suggests trips as the visitor answers, so it needs the published
 * catalogue up front — and the published styles, which decide which trip types
 * are on offer at all and carry their best months. The review summary feeds
 * the trust line. All three fail soft: without them the planner still collects
 * the request, it just has nothing to suggest (and no trust line to show).
 *
 * Staff read every enquiry in English. On a translated page the catalogue
 * arrives translated, so the English titles and place names are loaded too
 * (the same cached list the English page uses) for the request that is sent.
 */
export const load: PageLoad = async ({ fetch, url }) => {
  const locale = localeFromPath(url.pathname);
  const toursUrl = `${API_URL}/tours?status=published&limit=100`;
  const [tours, categories, reviews, englishTours] = await Promise.allSettled([
    cachedJson<{ data?: { items?: PlannerTour[] } }>(withLocale(toursUrl, locale), fetch),
    cachedJson<{ data?: { items?: Array<{ slug?: string; name?: string; best_months?: unknown }> } }>(
      withLocale(`${API_URL}/categories?limit=100`, locale),
      fetch
    ),
    cachedJson<{ data?: ReviewSummary }>(`${API_URL}/reviews/summary`, fetch),
    locale === 'en' ? Promise.resolve(null) : cachedJson<{ data?: { items?: PlannerTour[] } }>(toursUrl, fetch)
  ]);

  const styles: PlannerCategory[] =
    categories.status === 'fulfilled'
      ? (categories.value?.data?.items ?? [])
          .filter((c) => c.slug)
          .map((c) => ({
            slug: String(c.slug),
            name: String(c.name ?? c.slug),
            best_months: Array.isArray(c.best_months) ? c.best_months.map(Number).filter((m) => m >= 1 && m <= 12) : []
          }))
      : [];
  const summary = reviews.status === 'fulfilled' ? reviews.value?.data ?? null : null;

  const items = tours.status === 'fulfilled' ? tours.value?.data?.items ?? [] : [];
  const english = locale === 'en' ? items : englishTours.status === 'fulfilled' ? englishTours.value?.data?.items ?? [] : [];
  const englishNames = { tours: {} as Record<string, string>, places: {} as Record<string, string> };
  for (const tour of english) {
    if (tour.id && tour.title) englishNames.tours[String(tour.id)] = String(tour.title);
    for (const place of placesOf(tour)) englishNames.places[place.slug] ??= place.name;
  }

  return {
    tours: items,
    englishNames,
    categorySlugs: styles.map((c) => c.slug),
    categories: styles,
    // Only a real, non-empty summary earns a trust line.
    reviews: summary && Number(summary.count) > 0 && Number(summary.average) > 0 ? summary : null
  };
};
