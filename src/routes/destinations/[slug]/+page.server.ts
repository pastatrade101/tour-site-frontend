import type { PageServerLoad } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import type { Activity, Destination, FAQ, Lodge, Review, Tour, TourCategory, TripPoint } from '$lib/types';

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

type ApiBody<T> = { data?: T };
type PaginatedBody<T> = { data?: { items?: T[] } };
type QueryValue = string | number | boolean | null | undefined;
const DESTINATION_PAGE_API_CONCURRENCY = 3;

const queryString = (params: Record<string, QueryValue>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : '';
};

const apiBase = (origin: string) => {
  const raw = publicEnv.PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:5000/api';
  return raw.startsWith('/') ? `${origin}${raw}` : raw;
};

const serverJson = async <T>(fetchFn: typeof fetch, url: string) => {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Request failed (${res.status}) for ${url}`);
  return (await res.json()) as T;
};

const loadItems = async <T>(fetchFn: typeof fetch, base: string, path: string, params: Record<string, QueryValue>) => {
  try {
    const body = await serverJson<PaginatedBody<T>>(fetchFn, `${base}${path}${queryString(params)}`);
    return body.data?.items ?? [];
  } catch {
    return [] as T[];
  }
};

const runLimited = async (tasks: Array<() => Promise<unknown>>, limit = DESTINATION_PAGE_API_CONCURRENCY) => {
  const results = new Array<unknown>(tasks.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const index = cursor++;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
};

export const load: PageServerLoad = async ({ fetch, params, url }) => {
  const base = apiBase(url.origin);

  try {
    const destinationBody = await serverJson<ApiBody<Destination>>(fetch, `${base}/destinations/${encodeURIComponent(params.slug)}`);
    const destination = destinationBody.data ?? null;

    if (!destination?.id) {
      const [tourCategories, destinations, reviews] = await Promise.all([
        loadItems<TourCategory>(fetch, base, '/categories', { status: 'published', limit: 100 }),
        loadItems<Destination>(fetch, base, '/destinations', { status: 'published', limit: 9 }),
        loadItems<Review>(fetch, base, '/reviews', { status: 'approved', is_featured: true, limit: 3 })
      ]);

      return {
        destination,
        relatedTours: [] as Tour[],
        tourCategories,
        otherDestinations: destinations.slice(0, 3),
        lodges: [] as Lodge[],
        activities: [] as Activity[],
        tripPoints: [] as TripPoint[],
        galleryImages: [] as DestinationGalleryImage[],
        faqs: [] as FAQ[],
        reviews,
        origin: url.origin
      };
    }

    const [
      relatedTours,
      tourCategories,
      destinations,
      lodges,
      activities,
      tripPoints,
      galleryImages,
      faqs,
      reviews
    ] = (await runLimited([
      () => loadItems<Tour>(fetch, base, '/tours', { destination_id: destination.id, status: 'published', is_available: true, limit: 12 }),
      () => loadItems<TourCategory>(fetch, base, '/categories', { status: 'published', limit: 100 }),
      () => loadItems<Destination>(fetch, base, '/destinations', { status: 'published', limit: 9 }),
      () => loadItems<Lodge>(fetch, base, '/lodges', { destination_id: destination.id, status: 'published', limit: 3 }),
      () => loadItems<Activity>(fetch, base, '/activities', { destination_id: destination.id, status: 'published', limit: 6 }),
      () => loadItems<TripPoint>(fetch, base, '/trip-points', { destination_id: destination.id, status: 'published', limit: 4 }),
      () =>
        loadItems<DestinationGalleryImage>(fetch, base, '/gallery', {
          destination_id: destination.id,
          media_type: 'image',
          status: 'published',
          limit: 10
        }),
      () => loadItems<FAQ>(fetch, base, '/faqs', { destination_id: destination.id, status: 'published', limit: 8 }),
      () => loadItems<Review>(fetch, base, '/reviews', { status: 'approved', is_featured: true, limit: 3 })
    ])) as [
      Tour[],
      TourCategory[],
      Destination[],
      Lodge[],
      Activity[],
      TripPoint[],
      DestinationGalleryImage[],
      FAQ[],
      Review[]
    ];

    return {
      destination,
      relatedTours,
      tourCategories,
      otherDestinations: destinations
        .filter((item) => item.id !== destination.id && item.slug !== destination.slug)
        .slice(0, 3),
      lodges,
      activities,
      tripPoints,
      galleryImages,
      faqs,
      reviews,
      origin: url.origin
    };
  } catch {
    return {
      destination: null as Destination | null,
      relatedTours: [] as Tour[],
      tourCategories: [] as TourCategory[],
      otherDestinations: [] as Destination[],
      lodges: [] as Lodge[],
      activities: [] as Activity[],
      tripPoints: [] as TripPoint[],
      galleryImages: [] as DestinationGalleryImage[],
      faqs: [] as FAQ[],
      reviews: [] as Review[],
      origin: url.origin
    };
  }
};
