import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await cachedJson<{ data?: { items?: Record<string, unknown>[] } }>(
      `${API_URL}/gallery?status=published&limit=200`,
      fetch
    );
    return { galleryItems: res.data?.items ?? [] };
  } catch {
    return { galleryItems: [] };
  }
};
