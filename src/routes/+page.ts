import type { PageLoad } from './$types';
import type { BlogPost, Destination, FAQ, MigrationEntry, Review, ReviewSummary, Testimonial, Tour } from '$lib/types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { attachResolvedVariantFields, type ImageVariantMap } from '$lib/img';

const items = <T>(result: PromiseSettledResult<{ data?: { items?: T[] } }>) =>
  result.status === 'fulfilled' ? result.value?.data?.items ?? [] : [];

const dataArray = <T>(result: PromiseSettledResult<{ data?: T[] }>) =>
  result.status === 'fulfilled' ? result.value?.data ?? [] : [];

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

// Keep SSR focused on the content required to paint the top of the landing page:
// homepage copy/config and the category records used by the hero planner and
// first content band. Heavier below-fold lists hydrate client-side after paint.
export const load: PageLoad = async ({ fetch }) => {
  const [
    homeSections,
    categories
  ] = await Promise.allSettled([
    cachedJson<{ data?: Record<string, unknown>[] }>(`${API_URL}/homepage`, fetch),
    cachedJson<{ data?: { items?: Record<string, unknown>[] } }>(`${API_URL}/categories?status=published&limit=8`, fetch)
  ]);

  const tourItems: Tour[] = [];
  const destinationItems: Destination[] = [];
  const homeSectionItems = dataArray<Record<string, unknown>>(homeSections);
  const postItems: BlogPost[] = [];
  const testimonialItems: Testimonial[] = [];
  const faqItems: FAQ[] = [];
  const reviewSummaryValue: ReviewSummary | null = null;
  const reviewItems: Review[] = [];
  const migrationItems: MigrationEntry[] = [];
  const galleryImageItems: Record<string, unknown>[] = [];
  const categoryItems = items<Record<string, unknown>>(categories);

  const variantUrls = new Set<string>();
  collectImageUrls(variantUrls, homeSectionItems, ['image_url']);
  collectImageUrls(variantUrls, categoryItems, ['image_url', 'icon_url']);

  const imageVariants = await resolveImageVariants(fetch, variantUrls);
  attachResolvedVariantFields(homeSectionItems as Array<Record<string, any>>, imageVariants, ['image_url']);
  attachResolvedVariantFields(categoryItems as Array<Record<string, any>>, imageVariants, ['image_url', 'icon_url']);

  return {
    tours: tourItems,
    destinations: destinationItems,
    homeSections: homeSectionItems,
    posts: postItems,
    testimonials: testimonialItems,
    faqs: faqItems,
    reviewSummary: reviewSummaryValue,
    reviews: reviewItems,
    migrationEntries: migrationItems,
    galleryItems: galleryImageItems,
    categories: categoryItems,
    imageVariants
  };
};
