import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { DEFAULT_LOCALE, localeFromPath, withLocale } from '$lib/i18n';
import type { FAQ, Review, ReviewSummary, Testimonial, Tour, TourCategory } from '$lib/types';

type Items<T> = { data?: { items?: T[] } };

const items = <T>(result: PromiseSettledResult<Items<T>>) =>
  result.status === 'fulfilled' ? result.value?.data?.items ?? [] : [];

export const load: PageLoad = async ({ fetch, params, url }) => {
  // The active locale comes from the URL prefix; the API returns the published
  // translation for it, falling back per field to the default language.
  const locale = localeFromPath(url.pathname);
  const localeQuery = locale === DEFAULT_LOCALE ? '' : `?locale=${locale}`;

  const empty = {
    category: null as TourCategory | null,
    tours: [] as Tour[],
    otherStyles: [] as TourCategory[],
    faqs: [] as FAQ[],
    reviews: [] as Array<Review | Testimonial>,
    startPoints: [] as Array<Record<string, unknown>>,
    reviewSummary: null as ReviewSummary | null,
    homeSections: [] as Record<string, unknown>[]
  };

  let category: TourCategory | null = null;
  try {
    const categoryBody = await cachedJson<{ data?: TourCategory }>(`${API_URL}/categories/${params.slug}${localeQuery}`, fetch);
    category = categoryBody.data ?? null;
  } catch {
    return empty;
  }
  if (!category?.id) return { ...empty, category };

  // Everything below is section data and fails soft. The shared page supplies
  // truthful CMS-derived fallbacks so one failed list never takes the route down.
  const [tours, otherStyles, faqs, featuredReviews, allReviews, testimonials, reviewSummary, homeSections, startPoints] = await Promise.allSettled([
    // 24 rather than 9: the tours grid now filters client-side (days, comfort,
    // price), and a filter over a truncated list would quietly lie about what
    // is available.
    cachedJson<Items<Tour>>(withLocale(`${API_URL}/tours?category_id=${encodeURIComponent(category.id)}&status=published&limit=24`, locale), fetch),
    cachedJson<Items<TourCategory>>(withLocale(`${API_URL}/categories?status=published&limit=30`, locale), fetch),
    cachedJson<Items<FAQ>>(withLocale(`${API_URL}/faqs?limit=6`, locale), fetch),
    cachedJson<Items<Review>>(`${API_URL}/reviews?status=approved&is_featured=true&limit=6`, fetch),
    cachedJson<Items<Review>>(`${API_URL}/reviews?status=approved&limit=6`, fetch),
    // The review list currently depends on an optional tour relation in the
    // backend schema. Published CMS testimonials keep the same homepage slider
    // populated if that relation is unavailable; no testimonial is fabricated.
    cachedJson<Items<Testimonial>>(`${API_URL}/testimonials?status=published&limit=6`, fetch),
    cachedJson<{ data?: ReviewSummary }>(`${API_URL}/reviews/summary`, fetch),
    cachedJson<{ data?: Record<string, unknown>[] }>(withLocale(`${API_URL}/homepage`, locale), fetch),
    cachedJson<Items<Record<string, unknown>>>(`${API_URL}/trip-points?status=published&limit=30`, fetch)
  ]);

  const featured = items(featuredReviews);

  return {
    category,
    // Consumed by the root layout for hreflang and by the switcher, so neither
    // ever links to a language this page has no published translation for.
    availableLocales: (category as { available_locales?: string[] }).available_locales ?? null,
    tours: items(tours),
    otherStyles: items(otherStyles).filter((style) => style.slug !== category?.slug),
    faqs: items(faqs),
    reviews: featured.length ? featured : items(allReviews).length ? items(allReviews) : items(testimonials),
    reviewSummary: reviewSummary.status === 'fulfilled' ? reviewSummary.value?.data ?? null : null,
    homeSections: homeSections.status === 'fulfilled' ? homeSections.value?.data ?? [] : [],
    startPoints: items(startPoints).filter((point) => ['start', 'both'].includes(String(point.role ?? '')))
  };
};
