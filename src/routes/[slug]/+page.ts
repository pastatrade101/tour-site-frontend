import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { attachedFaqQuery, generalFaqQuery, mergeFaqs } from '$lib/faqEntities';
import { lines, routeTourSlugs } from '$lib/safariPackageBlocks';
import { localeFromPath, withLocale } from '$lib/i18n';
import type { FAQ, Lodge, SafariPackage, Tour } from '$lib/types';

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

  // Only what a block actually names. No block, no request.
  //
  // Two blocks name tours: `tours` lists them for cards, and `routes` names one
  // per comfort level as "Label | slug". They share one fetch and one array, so
  // a tour used by both is requested once.
  const sections = (record.sections ?? []) as Array<Record<string, unknown>>;

  const fromTourBlocks = sections
    .filter((block) => block?.type === 'tours')
    .flatMap((block) => lines(block.tour_slugs));

  const fromRouteBlocks = sections
    .filter((block) => block?.type === 'routes')
    .flatMap((block) => (block.routes as Array<Record<string, unknown>>) ?? [])
    .flatMap((route) => routeTourSlugs(route));

  const accommodationIds = [
    ...new Set(
      sections
        .filter((block) => block?.type === 'routes')
        .flatMap((block) => (block.routes as Array<Record<string, unknown>>) ?? [])
        .flatMap((route) => (route?.comforts as Array<Record<string, unknown>>) ?? [])
        .flatMap((comfort) => (comfort?.accommodation_ids as unknown[]) ?? [])
        .map((id) => String(id ?? '').trim())
        .filter(Boolean)
    )
  ];

  const slugs = [
    ...new Set(
      [...fromTourBlocks, ...fromRouteBlocks].map((slug) => String(slug ?? '').trim()).filter(Boolean)
    )
  ];

  // What the closing planner band offers: the real published categories as
  // "main interest", and the real gateways as "starting point". Same two lists
  // a safari-style page hands the same band, so a lead from here reaches the
  // inbox looking like every other one. Both fail soft — the band drops the
  // starting-point field entirely rather than inventing a gateway.
  // The third is the homepage sections, which carry the site-wide Advisor's
  // Note. An `advisor` block writes over that rather than replacing it, so the
  // parts a page does not override still follow the one note the client edits.
  const plannerPromise = Promise.allSettled([
    fetch(withLocale('/api/categories?status=published&limit=30', locale)),
    fetch('/api/trip-points?status=published&limit=30'),
    fetch(withLocale('/api/homepage', locale))
  ]);

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

  // The selected accommodation cards are explicit package content. Fetch the
  // small CMS inventory only when a route option names at least one property.
  let relatedLodges: Lodge[] = [];
  if (accommodationIds.length) {
    try {
      const lodgingResponse = await fetch(withLocale('/api/lodges?status=published&limit=200', locale));
      const lodgingBody = (await lodgingResponse.json()) as { data?: { items?: Lodge[] } };
      relatedLodges = (lodgingBody?.data?.items ?? []).filter((lodge) => accommodationIds.includes(lodge.id));
    } catch {
      // The selected route still has its tour itinerary as a useful fallback.
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

  const [categoryResult, pointResult, homepageResult] = await plannerPromise;

  const listOf = async (result: PromiseSettledResult<Response>): Promise<Record<string, unknown>[]> => {
    if (result.status !== 'fulfilled' || !result.value.ok) return [];
    const payload = (await result.value.json()) as { data?: { items?: Record<string, unknown>[] } };
    return payload?.data?.items ?? [];
  };

  const interests = (await listOf(categoryResult))
    .map((item) => ({ name: String(item?.name ?? '').trim(), slug: String(item?.slug ?? '').trim() }))
    .filter((item) => item.name);

  // Only points this operator actually starts from, exactly as the safari-style
  // loader filters them.
  const startPoints = (await listOf(pointResult)).filter((point) =>
    ['start', 'both'].includes(String(point?.role ?? ''))
  );

  // `/homepage` answers with a bare array, not the `{ items }` envelope the
  // list endpoints use.
  const homeSections =
    homepageResult.status === 'fulfilled' && homepageResult.value.ok
      ? (((await homepageResult.value.json()) as { data?: Record<string, unknown>[] })?.data ?? [])
      : [];

  return {
    package: record,
    // Read by the root layout for hreflang and the canonical, so a package is
    // only announced in the languages it has a published translation in —
    // same as tours. Without it every enabled language was claimed.
    availableLocales: (record as { available_locales?: string[] }).available_locales ?? null,
    related,
    relatedLodges,
    moduleFaqs,
    interests,
    startPoints,
    homeSections
  };
};
