import type { PageLoad } from './$types';
import type { BlogPost, Destination, FAQ, MigrationEntry, Review, ReviewSummary, Testimonial, Tour } from '$lib/types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';

const items = <T>(result: PromiseSettledResult<{ data?: { items?: T[] } }>) =>
  result.status === 'fulfilled' ? result.value?.data?.items ?? [] : [];

const dataArray = <T>(result: PromiseSettledResult<{ data?: T[] }>) =>
  result.status === 'fulfilled' ? result.value?.data ?? [] : [];

const dataValue = <T>(result: PromiseSettledResult<{ data?: T }>) =>
  result.status === 'fulfilled' ? result.value?.data ?? null : null;

// SSR the landing page content in parallel. Each endpoint resolves independently:
// one slow or failed CMS request should not blank unrelated homepage sections.
export const load: PageLoad = async ({ fetch }) => {
  const [
    tours,
    destinations,
    homeSections,
    posts,
    testimonials,
    faqs,
    reviewSummary,
    featuredReviews,
    allReviews,
    migrationEntries
  ] = await Promise.allSettled([
    cachedJson<{ data?: { items?: Tour[] } }>(`${API_URL}/tours?status=published&limit=3`, fetch),
    cachedJson<{ data?: { items?: Destination[] } }>(`${API_URL}/destinations?status=published&limit=6`, fetch),
    cachedJson<{ data?: Record<string, unknown>[] }>(`${API_URL}/homepage`, fetch),
    cachedJson<{ data?: { items?: BlogPost[] } }>(`${API_URL}/blog?limit=3`, fetch),
    cachedJson<{ data?: { items?: Testimonial[] } }>(`${API_URL}/testimonials?limit=6`, fetch),
    cachedJson<{ data?: { items?: FAQ[] } }>(`${API_URL}/faqs?limit=5`, fetch),
    cachedJson<{ data?: ReviewSummary }>(`${API_URL}/reviews/summary`, fetch),
    cachedJson<{ data?: { items?: Review[] } }>(`${API_URL}/reviews?status=approved&is_featured=true&limit=6`, fetch),
    cachedJson<{ data?: { items?: Review[] } }>(`${API_URL}/reviews?status=approved&limit=6`, fetch),
    cachedJson<{ data?: { items?: MigrationEntry[] } }>(`${API_URL}/migration-calendar?is_published=true&limit=24`, fetch)
  ]);

  const featuredReviewItems = items<Review>(featuredReviews);
  const fallbackReviewItems = items<Review>(allReviews);

  return {
    tours: items<Tour>(tours),
    destinations: items<Destination>(destinations),
    homeSections: dataArray<Record<string, unknown>>(homeSections),
    posts: items<BlogPost>(posts),
    testimonials: items<Testimonial>(testimonials),
    faqs: items<FAQ>(faqs),
    reviewSummary: dataValue<ReviewSummary>(reviewSummary),
    reviews: featuredReviewItems.length ? featuredReviewItems : fallbackReviewItems,
    migrationEntries: items<MigrationEntry>(migrationEntries)
  };
};
