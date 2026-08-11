import type { PageLoad } from './$types';
import type { Destination, FAQ, Review, ReviewSummary, Tour, TravelStyle } from '$lib/types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';

const items = <T>(r: PromiseSettledResult<{ data?: { items?: T[] } }>) =>
  r.status === 'fulfilled' ? r.value?.data?.items ?? [] : [];
const value = <T>(r: PromiseSettledResult<{ data?: T }>) =>
  r.status === 'fulfilled' ? r.value?.data ?? null : null;

// SSR-load the published tours so the grid is in the initial HTML (no loading
// flash). All filtering is client-side over this base list, so the fetch is the
// same regardless of the URL filters. The supporting content below the grid
// (parks, reviews, FAQs, photos) loads in parallel and each part fails soft —
// a slow or missing endpoint must never blank the tour list.
export const load: PageLoad = async ({ fetch }) => {
  const [tours, destinations, reviews, reviewSummary, faqs, gallery, travelStyles] = await Promise.allSettled([
    cachedJson<{ data?: { items?: Tour[] } }>(`${API_URL}/tours?status=published&limit=100`, fetch),
    cachedJson<{ data?: { items?: Destination[] } }>(`${API_URL}/destinations?status=published&limit=8`, fetch),
    cachedJson<{ data?: { items?: Review[] } }>(`${API_URL}/reviews?status=approved&limit=6`, fetch),
    cachedJson<{ data?: ReviewSummary }>(`${API_URL}/reviews/summary`, fetch),
    cachedJson<{ data?: { items?: FAQ[] } }>(`${API_URL}/faqs?limit=8`, fetch),
    cachedJson<{ data?: { items?: Record<string, unknown>[] } }>(
      `${API_URL}/gallery?status=published&media_type=image&limit=10`,
      fetch
    ),
    cachedJson<{ data?: { items?: TravelStyle[] } }>(
      `${API_URL}/travel-styles?status=published&limit=100`,
      fetch
    )
  ]);

  return {
    tours: items<Tour>(tours),
    destinations: items<Destination>(destinations),
    reviews: items<Review>(reviews),
    reviewSummary: value<ReviewSummary>(reviewSummary),
    faqs: items<FAQ>(faqs),
    galleryItems: items<Record<string, unknown>>(gallery),
    travelStyles: items<TravelStyle>(travelStyles)
  };
};
