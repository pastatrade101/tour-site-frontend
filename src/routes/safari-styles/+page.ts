import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import type { TourCategory } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: TourCategory[] } }>(`${API_URL}/categories?status=published&limit=100`, fetch);
    return {
      categories: body.data?.items ?? []
    };
  } catch {
    return {
      categories: [] as TourCategory[]
    };
  }
};
