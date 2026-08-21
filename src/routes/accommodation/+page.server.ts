import type { PageServerLoad } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import type { Lodge } from '$lib/types';
import { attachResolvedVariantFields, type ImageVariantMap } from '$lib/img';
import { localeFromPath, withLocale } from '$lib/i18n';

type PaginatedBody<T> = { data?: { items?: T[] } };

const apiBase = (origin: string) => {
  const raw = publicEnv.PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:5000/api';
  return raw.startsWith('/') ? `${origin}${raw}` : raw;
};

/**
 * The listing renders every published property, so the difference between
 * originals and the responsive ladder is dozens of full-size downloads. Most
 * properties have no image_url at all and are carried by cover_image_url — the
 * gallery cover the API attaches — so that field has to be resolved too or
 * those cards fall back to the multi-megabyte original.
 */
const IMAGE_FIELDS = ['hero_image_url', 'image_url', 'cover_image_url'];

const resolveImageVariants = async (
  fetchFn: typeof fetch,
  base: string,
  rows: Array<Record<string, unknown>>
): Promise<ImageVariantMap> => {
  const urls = new Set<string>();
  for (const row of rows) {
    for (const field of IMAGE_FIELDS) {
      const value = row[field];
      if (typeof value === 'string' && value.trim()) urls.add(value.trim());
    }
  }

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

export const load: PageServerLoad = async ({ fetch, url }) => {
  try {
    const base = apiBase(url.origin);
  // Active locale from the URL prefix; published translations merge on the
  // API side with per-field fallback to the default language.
  const locale = localeFromPath(url.pathname);
    const res = await fetch(withLocale(`${base}/lodges?status=published&show_property_publicly=true&limit=100`, locale));
    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    const body = (await res.json()) as PaginatedBody<Lodge>;
    const lodges = body.data?.items ?? [];

    // Fail-soft: without variants the cards still render, just heavier.
    const variants = await resolveImageVariants(fetch, base, lodges as Array<Record<string, unknown>>);
    attachResolvedVariantFields(lodges as Array<Record<string, any>>, variants, IMAGE_FIELDS);

    return { lodges };
  } catch {
    return { lodges: [] as Lodge[] };
  }
};
