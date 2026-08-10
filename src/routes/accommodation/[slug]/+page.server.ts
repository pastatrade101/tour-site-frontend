import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import type { Lodge, Tour } from '$lib/types';

type Body<T> = { data?: T };
type PaginatedBody<T> = { data?: { items?: T[] } };

const apiBase = (origin: string) => {
  const raw = publicEnv.PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:5000/api';
  return raw.startsWith('/') ? `${origin}${raw}` : raw;
};

export const load: PageServerLoad = async ({ params, url }) => {
  const base = apiBase(url.origin);

  let lodge: Lodge | null = null;
  try {
    const res = await globalThis.fetch(`${base}/lodges/${params.slug}`);
    if (res.ok) lodge = ((await res.json()) as Body<Lodge>).data ?? null;
  } catch {
    lodge = null;
  }

  if (!lodge) throw error(404, 'Stay not found');

  // Siblings for the "other places to stay" rail — fetched fail-soft so a slow
  // or broken list never takes the detail page down with it.
  let related: Lodge[] = [];
  try {
    const res = await globalThis.fetch(`${base}/lodges?status=published&limit=100`);
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
      const res = await globalThis.fetch(
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

  return { lodge, related, safaris };
};
