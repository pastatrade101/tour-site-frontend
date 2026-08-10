import type { PageServerLoad } from './$types';
import type { Activity, Destination, FAQ, Lodge, Tour, TourCategory, TripPoint } from '$lib/types';

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

export const load: PageServerLoad = async ({ params, url }) => ({
  slug: params.slug,
  destination: null as Destination | null,
  ...emptyRelatedData(),
  origin: url.origin
});
