import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { attachedFaqQuery, generalFaqQuery, mergeFaqs } from '$lib/faqEntities';
import { localeFromPath, withLocale } from '$lib/i18n';
import type { FAQ, SafariPackage, Tour } from '$lib/types';

/**
 * Safari-package landing pages, served straight off the root: /2-day-safari.
 *
 * This is the last route SvelteKit tries. Every real top-level path — /tours,
 * /about, /admin, /api, /sitemap.xml — is a more specific match and still wins,
 * so this only ever sees a path nothing else claimed. The cost is that an
 * unknown URL does one database lookup before it 404s, which is the trade a
 * keyword-first URL asks for.
 *
 * The page is fetched here, not in the component, so the server-rendered HTML
 * carries the real title, description and copy. A landing page whose content
 * only appears after hydration is invisible to the crawler it exists for.
 *
 * The fetches use a RELATIVE `/api/...` path deliberately. That routes through
 * the app's own proxy, which is what makes SSR work; calling the backend origin
 * directly fails cross-origin during server rendering in a way that leaves no
 * trace in the access log.
 */
export const load: PageLoad = async ({ fetch, params, url }) => {
  const locale = localeFromPath(url.pathname);

  const response = await fetch(withLocale(`/api/safari-packages/${params.slug}`, locale));
  if (response.status === 404) throw error(404, 'Safari package not found');
  if (!response.ok) throw error(response.status, 'Could not load this safari package');

  const body = (await response.json()) as { data?: SafariPackage | null };
  const record = body?.data ?? null;
  if (!record) throw error(404, 'Safari package not found');

  // Only what a `tours` block actually names. No block, no request.
  const slugs = [
    ...new Set(
      (record.sections ?? [])
        .filter((block) => (block as { type?: string })?.type === 'tours')
        .flatMap((block) => ((block as { tour_slugs?: unknown }).tour_slugs as unknown[]) ?? [])
        .map((slug) => String(slug ?? '').trim())
        .filter(Boolean)
    )
  ];

  const related: Tour[] = [];
  if (slugs.length) {
    const results = await Promise.allSettled(
      slugs.map((slug) => fetch(withLocale(`/api/tours/${slug}`, locale)).then((res) => (res.ok ? res.json() : null)))
    );
    for (const result of results) {
      const tour = result.status === 'fulfilled' ? ((result.value as { data?: Tour } | null)?.data ?? null) : null;
      // A slug that no longer resolves is left out rather than rendered blank.
      if (tour) related.push(tour);
    }
  }

  // A `faq` block with no questions typed into it falls back to whatever the
  // FAQ module has attached to this package, so questions can be managed in one
  // place instead of being retyped per landing page. No empty block, no request.
  const hasEmptyFaqBlock = (record.sections ?? []).some((block) => {
    const candidate = block as { items?: unknown; type?: string };
    if (candidate?.type !== 'faq') return false;
    const items = Array.isArray(candidate.items) ? candidate.items : [];
    return !items.some((item) => {
      const row = (item ?? {}) as { answer?: unknown; question?: unknown };
      return String(row.question ?? '').trim() && String(row.answer ?? '').trim();
    });
  });

  let moduleFaqs: FAQ[] = [];
  if (hasEmptyFaqBlock && record.id) {
    const [attached, general] = await Promise.allSettled([
      fetch(withLocale(`/api/faqs?${attachedFaqQuery('safari_packages', record.id, 8)}`, locale)),
      fetch(withLocale(`/api/faqs?${generalFaqQuery(8)}`, locale))
    ]);

    const read = async (result: PromiseSettledResult<Response>): Promise<FAQ[]> => {
      if (result.status !== 'fulfilled' || !result.value.ok) return [];
      const payload = (await result.value.json()) as { data?: { items?: FAQ[] } };
      return payload?.data?.items ?? [];
    };

    moduleFaqs = mergeFaqs(await read(attached), await read(general), 8);
  }

  return { package: record, related, moduleFaqs };
};
