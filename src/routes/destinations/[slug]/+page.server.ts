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

const serverJson = async <T>(url: string) => {
  const res = await globalThis.fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status}) for ${url}`);
  return (await res.json()) as T;
};

const loadItems = async <T>(base: string, path: string, params: Record<string, QueryValue>) => {
  try {
    const body = await serverJson<PaginatedBody<T>>(`${base}${path}${queryString(params)}`);
    return body.data?.items ?? [];
  } catch {
    return [] as T[];
  }
};

export const load: PageServerLoad = async ({ params, url }) => {
  const base = apiBase(url.origin);
  try {
    const destinationBody = await serverJson<ApiBody<Destination>>(`${base}/destinations/${encodeURIComponent(params.slug)}`);
    const destination = destinationBody.data ?? null;

    if (!destination?.id) {
      return {
        destination,
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
    ] = await Promise.all([
      loadItems<Tour>(base, '/tours', { destination_id: destination.id, status: 'published', is_available: true, limit: 12 }),
      loadItems<TourCategory>(base, '/categories', { status: 'published', limit: 100 }),
      loadItems<Destination>(base, '/destinations', { status: 'published', limit: 9 }),
      loadItems<Lodge>(base, '/lodges', { destination_id: destination.id, status: 'published', limit: 3 }),
      loadItems<Activity>(base, '/activities', { destination_id: destination.id, status: 'published', limit: 6 }),
      loadItems<TripPoint>(base, '/trip-points', { destination_id: destination.id, status: 'published', limit: 4 }),
      loadItems<DestinationGalleryImage>(base, '/gallery', {
        destination_id: destination.id,
        media_type: 'image',
        status: 'published',
        limit: 10
      }),
      loadItems<FAQ>(base, '/faqs', { destination_id: destination.id, status: 'published', limit: 8 }),
      loadItems<Review>(base, '/reviews', { status: 'approved', is_featured: true, limit: 3 })
    ]);

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
