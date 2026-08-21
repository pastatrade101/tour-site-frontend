import type { PageServerLoad } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import { localeFromPath, withLocale } from '$lib/i18n';
import { toMetaText } from '$lib/richText';
import type { Activity, Destination, FAQ, Lodge, Tour, TourCategory, TripPoint } from '$lib/types';

/**
 * Pick the description a search engine should see.
 *
 * Prefers a field that was actually translated over one that fell back to the
 * default language, so a German page does not advertise an English meta
 * description just because the SEO field has not been translated yet. On the
 * default language nothing is marked translated and this collapses to the
 * ordinary priority order.
 */
const seoDescription = (record: Record<string, unknown>, chain: string[]): string => {
  const translated = new Set((record.translated_fields as string[] | undefined) ?? []);
  const text = (key: string) => (typeof record[key] === 'string' ? (record[key] as string) : '');
  const preferred = chain.find((key) => translated.has(key) && text(key).trim());
  return toMetaText(text(preferred ?? chain.find((key) => text(key).trim()) ?? ''), 160);
};


export type DestinationGalleryImage = {
  id?: string;
  title?: string | null;
  image_url?: string | null;
  alt_text?: string | null;
  caption?: string | null;
  media_type?: string | null;
  destinations?: { id?: string; name?: string; slug?: string } | null;
  tours?: { id?: string; title?: string; slug?: string } | null;
};

const emptyRelatedData = () => ({
  relatedTours: [] as Tour[],
  tourCategories: [] as TourCategory[],
  otherDestinations: [] as Destination[],
  lodges: [] as Lodge[],
  activities: [] as Activity[],
  tripPoints: [] as TripPoint[],
  galleryImages: [] as DestinationGalleryImage[],
  faqs: [] as FAQ[]
});

const apiBase = (origin: string) => {
  const raw = publicEnv.PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:5000/api';
  return raw.startsWith('/') ? `${origin}${raw}` : raw;
};

/**
 * The destination itself is fetched here now.
 *
 * It used to load client-side, so the server-rendered HTML had no title, no
 * description and no copy — a crawler saw an empty shell, and a translated
 * destination was invisible to search engines. Everything below the fold
 * (tours, lodges, activities, gallery, FAQs) still hydrates on the client.
 */
export const load: PageServerLoad = async ({ fetch, params, url }) => {
  const locale = localeFromPath(url.pathname);
  const base = apiBase(url.origin);

  let destination: Destination | null = null;
  try {
    const res = await fetch(withLocale(`${base}/destinations/${params.slug}`, locale));
    if (res.ok) destination = ((await res.json()) as { data?: Destination }).data ?? null;
  } catch {
    // Fail soft: the component keeps its own loading and error handling.
    destination = null;
  }

  return {
    slug: params.slug,
    destination,
    availableLocales: (destination as { available_locales?: string[] } | null)?.available_locales ?? null,
    // Published to the root layout, which owns the document head — emitting a
    // title here as well would leave two in the document.
    seo: destination
      ? {
          title: `${destination.meta_title || destination.name} | Goldfinch Adventures`,
          description: seoDescription(destination as unknown as Record<string, unknown>, ['meta_description', 'short_description', 'description'])
        }
      : null,
    ...emptyRelatedData(),
    origin: url.origin
  };
};
