import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { attachedFaqQuery, generalFaqQuery, mergeFaqs } from '$lib/faqEntities';
import { DEFAULT_LOCALE, localeFromPath, withLocale } from '$lib/i18n';
import { toMetaText } from '$lib/richText';
import { titleWithBrand } from '$lib/seo';
import type { FAQ, Review, ReviewSummary, Tour, TourCategory } from '$lib/types';
import { shareImageOf } from '$lib/img';

type Items<T> = { data?: { items?: T[]; pagination?: { total?: number } } };
/** One published property per comfort level, with the photo the form shows for that level. */
type StayPhotos = Partial<Record<'Budget' | 'Mid-range' | 'Luxury', Record<string, unknown>>>;
const LEVELS = { BUDGET: 'Budget', MID_RANGE: 'Mid-range', LUXURY: 'Luxury' } as const;
function stayPhotosFrom(lodges: Record<string, unknown>[]): StayPhotos {
  const photos: StayPhotos = {};
  for (const lodge of lodges) {
    const level = LEVELS[String(lodge.accommodation_level ?? '') as keyof typeof LEVELS];
    if (!level || photos[level] || !(lodge.image_url || lodge.hero_image_url)) continue;
    // Only what the picture needs travels to the page.
    photos[level] = {
      name: lodge.name, image_url: lodge.image_url || lodge.hero_image_url,
      image_url_variants: lodge.image_url ? lodge.image_url_variants : lodge.hero_image_url_variants
    };
  }
  return photos;
}

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
    tourTotal: 0,
    otherStyles: [] as TourCategory[],
    faqs: [] as FAQ[],
    reviews: [] as Review[],
    galleryItems: [] as Record<string, unknown>[],
    startPoints: [] as Array<Record<string, unknown>>,
    stayPhotos: {} as StayPhotos,
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
  const [tours, otherStyles, styleFaqs, generalFaqs, featuredReviews, allReviews, reviewSummary, homeSections, startPoints, galleryItems, lodges] = await Promise.allSettled([
    // The whole style, not a first page of it: the tours grid filters
    // client-side (days, comfort, price) and the hero states the shortest
    // trip, the longest and the lowest price — and either over a truncated
    // list would quietly lie about what is available. 60 is well past the
    // largest style today (29); the page checks the total and leaves those
    // figures out if a style ever outgrows it.
    cachedJson<Items<Tour>>(withLocale(`${API_URL}/tours?category_id=${encodeURIComponent(category.id)}&status=published&limit=60`, locale), fetch),
    cachedJson<Items<TourCategory>>(withLocale(`${API_URL}/categories?status=published&limit=30`, locale), fetch),
    // The questions attached to this travel style, then the general library to
    // fill the rest of the section.
    cachedJson<Items<FAQ>>(withLocale(`${API_URL}/faqs?${attachedFaqQuery('tour_categories', category.id, 6)}`, locale), fetch),
    cachedJson<Items<FAQ>>(withLocale(`${API_URL}/faqs?${generalFaqQuery(6)}`, locale), fetch),
    cachedJson<Items<Review>>(`${API_URL}/reviews?status=approved&is_featured=true&limit=6`, fetch),
    cachedJson<Items<Review>>(`${API_URL}/reviews?status=approved&limit=6`, fetch),
    cachedJson<{ data?: ReviewSummary }>(`${API_URL}/reviews/summary`, fetch),
    cachedJson<{ data?: Record<string, unknown>[] }>(withLocale(`${API_URL}/homepage`, locale), fetch),
    cachedJson<Items<Record<string, unknown>>>(`${API_URL}/trip-points?status=published&limit=30`, fetch),
    cachedJson<Items<Record<string, unknown>>>(`${API_URL}/gallery?status=published&media_type=image&limit=14`, fetch),
    // Real properties, one per comfort level, to picture what each level means in the form.
    cachedJson<Items<Record<string, unknown>>>(`${API_URL}/lodges?status=published&show_property_publicly=true&limit=100`, fetch)
  ]);

  const featured = items(featuredReviews);

  return {
    category,
    // Consumed by the root layout for hreflang and by the switcher, so neither
    // ever links to a language this page has no published translation for.
    availableLocales: (category as { available_locales?: string[] }).available_locales ?? null,
    tours: items(tours),
    // How many trips the style has published, which may be more than were loaded.
    tourTotal: tours.status === 'fulfilled' ? Number(tours.value?.data?.pagination?.total ?? items(tours).length) || 0 : 0,
    otherStyles: items(otherStyles).filter((style) => style.slug !== category?.slug),
    faqs: mergeFaqs(items(styleFaqs), items(generalFaqs), 6),
    // Reviews is the single source of truth for this slider. Featured approved
    // records lead; when none are featured, the latest approved CMS records do.
    reviews: featured.length ? featured : items(allReviews),
    reviewSummary: reviewSummary.status === 'fulfilled' ? reviewSummary.value?.data ?? null : null,
    homeSections: homeSections.status === 'fulfilled' ? homeSections.value?.data ?? [] : [],
    startPoints: items(startPoints).filter((point) => ['start', 'both'].includes(String(point.role ?? ''))),
    galleryItems: items(galleryItems),
    stayPhotos: stayPhotosFrom(items(lodges)),
    // The shared layout owns the document head. Supplying this in load keeps
    // category metadata in the initial HTML instead of waiting for hydration.
    seo: {
      title: titleWithBrand(category.meta_title, category.name),
      description: toMetaText(category.meta_description || category.short_description || category.description || '', 160),
      ogImage: shareImageOf(category, 'seo_image_url', 'image_url'),
      imageAlt: category.name
    }
  };
};
