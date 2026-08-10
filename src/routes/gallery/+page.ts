import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import type { PageLoad } from './$types';
import { attachResolvedVariantFields, type ImageVariantMap } from '$lib/img';

const resolveImageVariants = async (fetchFn: typeof fetch, items: Record<string, unknown>[]): Promise<ImageVariantMap> => {
  const urls = [
    ...new Set(
      items
        .map((item) => (typeof item.image_url === 'string' ? item.image_url.trim() : ''))
        .filter(Boolean)
        .slice(0, 100)
    )
  ];
  if (!urls.length) return {};

  try {
    const query = new URLSearchParams({ urls: urls.join(',') });
    const res = await cachedJson<{ data?: ImageVariantMap }>(`${API_URL}/public/image-variants?${query}`, fetchFn);
    return res.data ?? {};
  } catch {
    return {};
  }
};

export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await cachedJson<{ data?: { items?: Record<string, unknown>[] } }>(
      `${API_URL}/gallery?status=published&limit=200`,
      fetch
    );
    const galleryItems = res.data?.items ?? [];
    const imageVariants = await resolveImageVariants(fetch, galleryItems);
    attachResolvedVariantFields(galleryItems, imageVariants, ['image_url']);
    return { galleryItems, imageVariants };
  } catch {
    return { galleryItems: [], imageVariants: {} };
  }
};
