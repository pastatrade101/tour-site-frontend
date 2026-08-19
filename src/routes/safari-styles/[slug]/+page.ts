import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import type { FAQ, Review, ReviewSummary, Tour, TourCategory } from '$lib/types';

type Items<T> = { data?: { items?: T[] } };

const items = <T>(result: PromiseSettledResult<Items<T>>) =>
  result.status === 'fulfilled' ? result.value?.data?.items ?? [] : [];

export const load: PageLoad = async ({ fetch, params }) => {
  const empty = {
    category: null as TourCategory | null,
    tours: [] as Tour[],
    otherStyles: [] as TourCategory[],
    faqs: [] as FAQ[],
    reviews: [] as Review[],
    reviewSummary: null as ReviewSummary | null,
    homeSections: [] as Record<string, unknown>[]
  };

  let category: TourCategory | null = null;
  try {
    const categoryBody = await cachedJson<{ data?: TourCategory }>(`${API_URL}/categories/${params.slug}`, fetch);
    category = categoryBody.data ?? null;
  } catch {
    return empty;
  }
  if (!category?.id) return { ...empty, category };

  // Everything below is section fodder and fails soft: a broken list hides its
  // section rather than taking the page down.
  const [tours, otherStyles, faqs, featuredReviews, allReviews, reviewSummary, homeSections] = await Promise.allSettled([
    // 24 rather than 9: the tours grid now filters client-side (days, comfort,
    // price), and a filter over a truncated list would quietly lie about what
    // is available.
    cachedJson<Items<Tour>>(`${API_URL}/tours?category_id=${encodeURIComponent(category.id)}&status=published&limit=24`, fetch),
    cachedJson<Items<TourCategory>>(`${API_URL}/categories?status=published&limit=12`, fetch),
    cachedJson<Items<FAQ>>(`${API_URL}/faqs?limit=6`, fetch),
    cachedJson<Items<Review>>(`${API_URL}/reviews?status=approved&is_featured=true&limit=6`, fetch),
    cachedJson<Items<Review>>(`${API_URL}/reviews?status=approved&limit=6`, fetch),
    cachedJson<{ data?: ReviewSummary }>(`${API_URL}/reviews/summary`, fetch),
    // Advisor's-note copy is the site-wide editorial content managed on the
    // homepage CMS record; cachedJson shares the response with the homepage.
    cachedJson<{ data?: Record<string, unknown>[] }>(`${API_URL}/homepage`, fetch)
  ]);

  const featured = items(featuredReviews);

  return {
    category,
    tours: items(tours),
    otherStyles: items(otherStyles).filter((style) => style.slug !== category?.slug),
    faqs: items(faqs),
    reviews: featured.length ? featured : items(allReviews),
    reviewSummary: reviewSummary.status === 'fulfilled' ? reviewSummary.value?.data ?? null : null,
    homeSections: homeSections.status === 'fulfilled' ? homeSections.value?.data ?? [] : []
  };
};
