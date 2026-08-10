import type { PageServerLoad } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import type { Destination } from '$lib/types';

type PaginatedBody<T> = { data?: { items?: T[] } };

const apiBase = (origin: string) => {
  const raw = publicEnv.PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:5000/api';
  return raw.startsWith('/') ? `${origin}${raw}` : raw;
};

export const load: PageServerLoad = async ({ fetch, url }) => {
  try {
    const base = apiBase(url.origin);
    const res = await fetch(`${base}/destinations?status=published&limit=100&include=guide`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const body = (await res.json()) as PaginatedBody<Destination>;
    return { destinations: body.data?.items ?? [] };
  } catch {
    return { destinations: [] as Destination[] };
  }
};
