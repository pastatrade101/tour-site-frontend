import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import type { Tour, TourCategory } from '$lib/types';

export const load: PageLoad = async ({ fetch, params }) => {
  try {
    const categoryBody = await cachedJson<{ data?: TourCategory }>(`${API_URL}/categories/${params.slug}`, fetch);
    const category = categoryBody.data ?? null;
    if (!category?.id) return { category, tours: [] as Tour[] };

    const toursBody = await cachedJson<{ data?: { items?: Tour[] } }>(
      `${API_URL}/tours?category_id=${encodeURIComponent(category.id)}&status=published&limit=9`,
      fetch
    );

    return {
      category,
      tours: toursBody.data?.items ?? []
    };
  } catch {
    return {
      category: null as TourCategory | null,
      tours: [] as Tour[]
    };
  }
};
