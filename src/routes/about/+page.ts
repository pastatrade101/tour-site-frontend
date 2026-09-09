import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { generalFaqQuery } from '$lib/faqEntities';
import { localeFromPath, withLocale } from '$lib/i18n';
import type { FAQ, Specialist, Testimonial } from '$lib/types';
import type { PageLoad } from './$types';

// Real published testimonials + FAQs so the About page shows genuine content
// (no fabricated reviews). Sections hide themselves when their list is empty.
export const load: PageLoad = async ({ fetch, url }) => {
  const locale = localeFromPath(url.pathname);
  const [tRes, fRes, sRes, hRes] = await Promise.all([
    cachedJson<{ data?: { items?: Testimonial[] } }>(`${API_URL}/testimonials?status=published&limit=12`, fetch).catch(() => null),
    cachedJson<{ data?: { items?: FAQ[] } }>(`${API_URL}/faqs?${generalFaqQuery(12)}`, fetch).catch(() => null),
    cachedJson<{ data?: { items?: Specialist[] } }>(`${API_URL}/specialists?status=published&limit=12`, fetch).catch(() => null),
    // The Advisor's Note is one section, edited on the homepage and shown here
    // too — so this page reads the same record rather than restating it.
    // withLocale, like every other page that shows it — without it a visitor on
    // /de/about read the note in English while /de/tours showed it translated.
    cachedJson<{ data?: Record<string, unknown>[] }>(withLocale(`${API_URL}/homepage`, locale), fetch).catch(() => null)
  ]);
  return {
    testimonials: tRes?.data?.items ?? [],
    faqs: fRes?.data?.items ?? [],
    specialists: sRes?.data?.items ?? [],
    homeSections: hRes?.data ?? []
  };
};
