import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import type { Lodge, Tour } from '$lib/types';
import { attachResolvedVariantFields, type ImageVariantMap } from '$lib/img';

type Body<T> = { data?: T };
type PaginatedBody<T> = { data?: { items?: T[] } };

const apiBase = (origin: string) => {
  const raw = publicEnv.PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:5000/api';
  return raw.startsWith('/') ? `${origin}${raw}` : raw;
};

const collectImageUrls = (rows: Array<Record<string, unknown>>, fields: string[]) => {
  const urls = new Set<string>();
  for (const row of rows) {
    for (const field of fields) {
      const value = row[field];
      if (typeof value === 'string' && value.trim()) urls.add(value.trim());
    }
  }
  return urls;
};

const resolveImageVariants = async (fetchFn: typeof fetch, base: string, urls: Set<string>): Promise<ImageVariantMap> => {
  const list = [...urls].slice(0, 100);
  if (!list.length) return {};
  try {
    const query = new URLSearchParams({ urls: list.join(',') });
    const res = await fetchFn(`${base}/public/image-variants?${query}`);
    if (!res.ok) return {};
    const body = (await res.json()) as { data?: ImageVariantMap };
    return body.data ?? {};
  } catch {
    return {};
  }
};

export const load: PageServerLoad = async ({ fetch, params, url }) => {
  const base = apiBase(url.origin);

  let lodge: Lodge | null = null;
  try {
    const res = await fetch(`${base}/lodges/${params.slug}`);
    if (res.ok) lodge = ((await res.json()) as Body<Lodge>).data ?? null;
  } catch {
    lodge = null;
  }

  if (!lodge) throw error(404, 'Stay not found');

  // Siblings for the "other places to stay" rail — fetched fail-soft so a slow
  // or broken list never takes the detail page down with it.
  let related: Lodge[] = [];
  try {
    const res = await fetch(`${base}/lodges?status=published&show_property_publicly=true&limit=100`);
    if (res.ok) {
      const all = ((await res.json()) as PaginatedBody<Lodge>).data?.items ?? [];
      related = all.filter((item) => item.slug !== lodge!.slug);
    }
  } catch {
    related = [];
  }

  // Safaris that visit this property's destination. This is an area
  // relationship, not a claim that the trip uses this lodge — the copy on the
  // page says so, because no itinerary currently records which property it
  // stays at. Fetched fail-soft; an empty list simply hides the section.
  let safaris: Tour[] = [];
  if (lodge.destination_id) {
    try {
      const res = await fetch(
        `${base}/tours?destination_id=${lodge.destination_id}&status=published&limit=6`
      );
      if (res.ok) {
        const body = (await res.json()) as PaginatedBody<Tour>;
        safaris = (body.data?.items ?? []).slice(0, 3);
      }
    } catch {
      safaris = [];
    }
  }

  const variantUrls = new Set<string>();
  for (const url of collectImageUrls([lodge as Record<string, unknown>], ['hero_image_url', 'image_url'])) variantUrls.add(url);
  for (const url of collectImageUrls((lodge.images ?? []) as Array<Record<string, unknown>>, ['image_url'])) variantUrls.add(url);
  for (const room of lodge.rooms ?? []) {
    for (const url of collectImageUrls((room.lodge_room_images ?? []) as Array<Record<string, unknown>>, ['image_url'])) variantUrls.add(url);
  }
  for (const url of collectImageUrls(related as Array<Record<string, unknown>>, ['hero_image_url', 'image_url'])) variantUrls.add(url);
  for (const url of collectImageUrls(safaris as Array<Record<string, unknown>>, ['main_image_url', 'banner_image_url'])) variantUrls.add(url);

  const imageVariants = await resolveImageVariants(fetch, base, variantUrls);
  attachResolvedVariantFields([lodge as Record<string, any>], imageVariants, ['hero_image_url', 'image_url']);
  attachResolvedVariantFields((lodge.images ?? []) as Array<Record<string, any>>, imageVariants, ['image_url']);
  for (const room of lodge.rooms ?? []) {
    attachResolvedVariantFields((room.lodge_room_images ?? []) as Array<Record<string, any>>, imageVariants, ['image_url']);
  }
  attachResolvedVariantFields(related as Array<Record<string, any>>, imageVariants, ['hero_image_url', 'image_url']);
  attachResolvedVariantFields(safaris as Array<Record<string, any>>, imageVariants, ['main_image_url', 'banner_image_url']);

  return { lodge, related, safaris };
};
