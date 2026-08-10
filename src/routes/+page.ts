import type { PageLoad } from './$types';
import type { BlogPost, Destination, FAQ, MigrationEntry, Review, ReviewSummary, Testimonial, Tour } from '$lib/types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { attachResolvedVariantFields, type ImageVariantMap } from '$lib/img';

const items = <T>(result: PromiseSettledResult<{ data?: { items?: T[] } }>) =>
  result.status === 'fulfilled' ? result.value?.data?.items ?? [] : [];

const dataArray = <T>(result: PromiseSettledResult<{ data?: T[] }>) =>
  result.status === 'fulfilled' ? result.value?.data ?? [] : [];

const dataValue = <T>(result: PromiseSettledResult<{ data?: T }>) =>
  result.status === 'fulfilled' ? result.value?.data ?? null : null;

const imageText = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : '');

const collectImageUrls = (urls: Set<string>, rows: Array<Record<string, unknown>>, fields: string[]) => {
  for (const row of rows) {
    for (const field of fields) {
      const value = imageText(row[field]);
      if (value) urls.add(value);
    }
  }
};

const resolveImageVariants = async (fetchFn: typeof fetch, urls: Set<string>): Promise<ImageVariantMap> => {
  const list = [...urls].slice(0, 100);
  if (!list.length) return {};

  try {
    const query = new URLSearchParams({ urls: list.join(',') });
    const res = await cachedJson<{ data?: ImageVariantMap }>(`${API_URL}/public/image-variants?${query}`, fetchFn);
    return res.data ?? {};
  } catch {
    return {};
  }
};

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
    migrationEntries,
    galleryItems,
    categories
  ] = await Promise.allSettled([
    cachedJson<{ data?: { items?: Tour[] } }>(`${API_URL}/tours?status=published&limit=6`, fetch),
    cachedJson<{ data?: { items?: Destination[] } }>(`${API_URL}/destinations?status=published&limit=8`, fetch),
    cachedJson<{ data?: Record<string, unknown>[] }>(`${API_URL}/homepage`, fetch),
    cachedJson<{ data?: { items?: BlogPost[] } }>(`${API_URL}/blog?limit=3`, fetch),
    cachedJson<{ data?: { items?: Testimonial[] } }>(`${API_URL}/testimonials?limit=6`, fetch),
    cachedJson<{ data?: { items?: FAQ[] } }>(`${API_URL}/faqs?limit=5`, fetch),
    cachedJson<{ data?: ReviewSummary }>(`${API_URL}/reviews/summary`, fetch),
    cachedJson<{ data?: { items?: Review[] } }>(`${API_URL}/reviews?status=approved&is_featured=true&limit=6`, fetch),
    cachedJson<{ data?: { items?: Review[] } }>(`${API_URL}/reviews?status=approved&limit=6`, fetch),
    cachedJson<{ data?: { items?: MigrationEntry[] } }>(`${API_URL}/migration-calendar?is_published=true&limit=24`, fetch),
    cachedJson<{ data?: { items?: Record<string, unknown>[] } }>(`${API_URL}/gallery?status=published&media_type=image&limit=7`, fetch),
    cachedJson<{ data?: { items?: Record<string, unknown>[] } }>(`${API_URL}/categories?status=published&limit=8`, fetch)
  ]);

  const featuredReviewItems = items<Review>(featuredReviews);
  const fallbackReviewItems = items<Review>(allReviews);
  const tourItems = items<Tour>(tours);
  const destinationItems = items<Destination>(destinations);
  const homeSectionItems = dataArray<Record<string, unknown>>(homeSections);
  const postItems = items<BlogPost>(posts);
  const testimonialItems = items<Testimonial>(testimonials);
  const faqItems = items<FAQ>(faqs);
  const migrationItems = items<MigrationEntry>(migrationEntries);
  const galleryImageItems = items<Record<string, unknown>>(galleryItems);
  const categoryItems = items<Record<string, unknown>>(categories);

  const variantUrls = new Set<string>();
  collectImageUrls(variantUrls, tourItems as Array<Record<string, unknown>>, ['main_image_url', 'banner_image_url', 'image_url']);
  collectImageUrls(variantUrls, destinationItems as Array<Record<string, unknown>>, ['main_image_url', 'image_url', 'banner_image_url']);
  collectImageUrls(variantUrls, homeSectionItems, ['image_url']);
  collectImageUrls(variantUrls, postItems as Array<Record<string, unknown>>, ['featured_image_url']);
  collectImageUrls(variantUrls, migrationItems as Array<Record<string, unknown>>, ['image_url']);
  collectImageUrls(variantUrls, galleryImageItems, ['image_url']);
  collectImageUrls(variantUrls, categoryItems, ['image_url', 'icon_url']);

  const imageVariants = await resolveImageVariants(fetch, variantUrls);
  attachResolvedVariantFields(tourItems as Array<Record<string, any>>, imageVariants, ['main_image_url', 'banner_image_url', 'image_url']);
  attachResolvedVariantFields(destinationItems as Array<Record<string, any>>, imageVariants, ['main_image_url', 'image_url', 'banner_image_url']);
  attachResolvedVariantFields(homeSectionItems as Array<Record<string, any>>, imageVariants, ['image_url']);
  attachResolvedVariantFields(postItems as Array<Record<string, any>>, imageVariants, ['featured_image_url']);
  attachResolvedVariantFields(migrationItems as Array<Record<string, any>>, imageVariants, ['image_url']);
  attachResolvedVariantFields(galleryImageItems as Array<Record<string, any>>, imageVariants, ['image_url']);
  attachResolvedVariantFields(categoryItems as Array<Record<string, any>>, imageVariants, ['image_url', 'icon_url']);

  return {
    tours: tourItems,
    destinations: destinationItems,
    homeSections: homeSectionItems,
    posts: postItems,
    testimonials: testimonialItems,
    faqs: faqItems,
    reviewSummary: dataValue<ReviewSummary>(reviewSummary),
    reviews: featuredReviewItems.length ? featuredReviewItems : fallbackReviewItems,
    migrationEntries: migrationItems,
    galleryItems: galleryImageItems,
    categories: categoryItems,
    imageVariants
  };
};
