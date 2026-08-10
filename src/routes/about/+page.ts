import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import type { FAQ, Specialist, Testimonial } from '$lib/types';
import type { PageLoad } from './$types';

// Real published testimonials + FAQs so the About page shows genuine content
// (no fabricated reviews). Sections hide themselves when their list is empty.
export const load: PageLoad = async ({ fetch }) => {
  const [tRes, fRes, sRes] = await Promise.all([
    cachedJson<{ data?: { items?: Testimonial[] } }>(`${API_URL}/testimonials?status=published&limit=12`, fetch).catch(() => null),
    cachedJson<{ data?: { items?: FAQ[] } }>(`${API_URL}/faqs?status=published&limit=12`, fetch).catch(() => null),
    cachedJson<{ data?: { items?: Specialist[] } }>(`${API_URL}/specialists?status=published&limit=12`, fetch).catch(() => null)
  ]);
  return {
    testimonials: tRes?.data?.items ?? [],
    faqs: fRes?.data?.items ?? [],
    specialists: sRes?.data?.items ?? []
  };
};
