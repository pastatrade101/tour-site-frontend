import type { PageLoad } from './$types';
import type { Destination } from '$lib/types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';

// SSR-load the destinations list so the circuit cards are in the initial HTML
// (no "Loading destinations…" flash after hydration). Below-the-fold content
// (related tours) stays in the component's reactive block — it isn't above the
// fold. Runs on the server for direct hits and on the client for in-app nav.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: Destination[] } }>(
      `${API_URL}/destinations?status=published&limit=100`,
      fetch
    );
    return { destinations: body?.data?.items ?? [] };
  } catch {
    return { destinations: [] as Destination[] };
  }
};
