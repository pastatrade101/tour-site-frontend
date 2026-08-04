import type { PageLoad } from './$types';
import type { Destination, Tour } from '$lib/types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';

// SSR the above-the-fold landing content — the CMS section config (hero etc.),
// featured tours and destinations — so the page arrives already rendered instead
// of a blank shell that then fetches. Blog, testimonials and FAQs are below the
// fold and stay in the component's onMount. Runs on the server for direct hits
// and on the client for in-app navigation.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const [toursBody, destBody, homeBody] = await Promise.all([
      cachedJson<{ data?: { items?: Tour[] } }>(`${API_URL}/tours?limit=3`, fetch),
      cachedJson<{ data?: { items?: Destination[] } }>(`${API_URL}/destinations?limit=3`, fetch),
      cachedJson<{ data?: Record<string, unknown>[] }>(`${API_URL}/homepage`, fetch)
    ]);
    return {
      tours: toursBody?.data?.items ?? [],
      destinations: destBody?.data?.items ?? [],
      homeSections: homeBody?.data ?? []
    };
  } catch {
    return { tours: [] as Tour[], destinations: [] as Destination[], homeSections: [] as Record<string, unknown>[] };
  }
};
