import type { PageLoad } from './$types';
import type { Tour } from '$lib/types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';

// SSR-load the published tours so the grid is in the initial HTML (no loading
// flash). All filtering is client-side over this base list, so the fetch is the
// same regardless of the URL filters. Runs on the server for direct hits and on
// the client for in-app navigation.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: Tour[] } }>(
      `${API_URL}/tours?status=published&limit=100`,
      fetch
    );
    return { tours: body?.data?.items ?? [] };
  } catch {
    return { tours: [] as Tour[] };
  }
};
