import type { PageLoad } from './$types';
import type { BlogPost, Destination, FAQ, MigrationEntry, Review, ReviewSummary, Testimonial, Tour } from '$lib/types';
import { API_URL } from '$lib/config/env';
import { localeFromPath, withLocale } from '$lib/i18n';
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
export const load: PageLoad = async ({ fetch, url }) => {
  // Active locale from the URL prefix; the API merges published
  // translations and falls back per field to the default language.
  const locale = localeFromPath(url.pathname);
  const [
    homeSections,
    categories,
    heroTours,
    heroDestinations
  ] = await Promise.allSettled([
    cachedJson<{ data?: Record<string, unknown>[] }>(`${API_URL}/homepage`, fetch),
    cachedJson<{ data?: { items?: Record<string, unknown>[] } }>(withLocale(`${API_URL}/categories?status=published&limit=8`, locale), fetch),
    // Just the two of each the hero actually shows. The full lists still
    // hydrate after paint for the sections below the fold; these are here
    // because the hero cannot wait for them — see heroSlides below.
    cachedJson<{ data?: { items?: Tour[] } }>(withLocale(`${API_URL}/tours?status=published&limit=2`, locale), fetch),
    cachedJson<{ data?: { items?: Destination[] } }>(withLocale(`${API_URL}/destinations?status=published&limit=2`, locale), fetch)
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

  /**
   * The hero's slides, decided here rather than after hydration.
   *
   * They used to be derived from the deferred tour and destination lists,
   * which are empty during SSR — so the hero painted the CMS background image
   * as its only slide, and the moment the deferred fetch landed there were
   * three real slides and the background was no longer among them. The picture
   * the visitor was looking at swapped for a different one, unprompted.
   *
   * Two records of each is all the hero can show, so that is all this asks
   * for. The full lists still hydrate after paint for the sections below.
   */
  const heroSlides = [
    ...items<Tour>(heroTours).map((tour) => ({
      imageUrl: imageText(tour.banner_image_url) || imageText(tour.main_image_url),
      label: tour.title,
      href: `/tours/${tour.slug}`
    })),
    ...items<Destination>(heroDestinations).map((destination) => ({
      imageUrl:
        imageText(destination.banner_image_url) ||
        imageText(destination.main_image_url) ||
        imageText(destination.image_url),
      label: destination.name,
      href: `/destinations/${destination.slug}`
    }))
  ].filter(
    (slide, index, all) =>
      Boolean(slide.imageUrl) && all.findIndex((other) => other.imageUrl === slide.imageUrl) === index
  );

  const variantUrls = new Set<string>();
  collectImageUrls(variantUrls, homeSectionItems, ['image_url']);
  collectImageUrls(variantUrls, categoryItems, ['image_url', 'icon_url']);
  // Without these the hero would fall back to the full-size originals — the
  // very thing the responsive ladder exists to avoid, on the page's LCP image.
  collectImageUrls(variantUrls, heroSlides as Array<Record<string, unknown>>, ['imageUrl']);

  const imageVariants = await resolveImageVariants(fetch, variantUrls);
  attachResolvedVariantFields(homeSectionItems as Array<Record<string, any>>, imageVariants, ['image_url']);
  attachResolvedVariantFields(categoryItems as Array<Record<string, any>>, imageVariants, ['image_url', 'icon_url']);

  return {
    heroSlides,
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
