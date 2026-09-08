/**
 * A real property photograph for each travel-style card.
 *
 * The cards offer Value, Mid-range and Luxury, and the honest picture for each
 * is a published property at that accommodation level from our own inventory.
 * Nothing else would be: every published tour is mid-range, so a tour photo
 * standing in for "Luxury" would be a picture of something else.
 *
 * One record per level, so this is three small requests. A level with no
 * published property simply gets no picture and the card renders as text.
 */
import { api } from '$lib/api/client';

const LEVELS = [
  ['Value', 'BUDGET'],
  ['Mid-range', 'MID_RANGE'],
  ['Luxury', 'LUXURY']
] as const;

export const loadStyleImages = async (): Promise<Record<string, string>> => {
  const results = await Promise.allSettled(
    LEVELS.map(([, level]) => api.lodges.list({ status: 'published', accommodation_level: level, limit: 1 }))
  );

  const entries = LEVELS.map(([style], index) => {
    const result = results[index];
    const lodge =
      result.status === 'fulfilled'
        ? ((result.value?.data?.items ?? [])[0] as Record<string, unknown> | undefined)
        : undefined;
    return [style, String(lodge?.image_url ?? lodge?.hero_image_url ?? '')] as const;
  }).filter(([, image]) => image);

  return Object.fromEntries(entries);
};
