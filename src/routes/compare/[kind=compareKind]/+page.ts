import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { KINDS } from '$lib/compare/kinds';
import { MAX_COMPARE, parseCompareKeys, type CompareKind } from '$lib/compare/model';
import { interleave, type CompareExtras } from '$lib/compare/shared';
import { localeFromPath, withLocale } from '$lib/i18n';
import { translateIn } from '$lib/i18n/ui';
import { titleWithBrand } from '$lib/seo';
import type { Tour } from '$lib/types';

/** Where each of the lists a category may ask for is read from. */
const EXTRA_PATHS: Record<keyof CompareExtras, string> = {
  tours: '/tours?status=published&limit=100',
  lodges: '/lodges?status=published&show_property_publicly=true&limit=100',
  activities: '/activities?status=published&limit=200',
  tripPoints: '/trip-points?status=published&limit=200'
};

/**
 * The comparison reads its items from the address, not from the browser's
 * own list: a trip is usually settled by two or three people, so the page has
 * to survive being pasted into a message — and it loads here, before the page
 * renders, so the table arrives with it in whichever language the address is in.
 *
 * An item that has been unpublished since it was picked drops out instead of
 * failing the rest; the page says how many were left out.
 *
 * `?tours=a,b` with no items asks a different question: "what do the safaris
 * I am comparing say about this category?" — the places they sleep at, the
 * places they visit, the people who look after them. Those are read from the
 * safaris themselves and shown as a starting point the visitor can change.
 */
export const load: PageLoad = async ({ fetch, params, url }) => {
  const kind = params.kind as CompareKind;
  const config = KINDS[kind];
  const locale = localeFromPath(url.pathname);
  let keys = parseCompareKeys(url.searchParams.get('items'));
  const tourKeys = keys.length || !config.fromTour ? [] : parseCompareKeys(url.searchParams.get('tours'));

  const read = async <T>(path: string): Promise<T | null> => {
    try {
      return (await cachedJson<{ data?: T }>(withLocale(`${API_URL}${path}`, locale), fetch)).data ?? null;
    } catch {
      return null;
    }
  };
  const readList = async (path: string): Promise<unknown[]> => {
    const data = await read<{ items?: unknown[] } | unknown[]>(path);
    return Array.isArray(data) ? data : (data?.items ?? []);
  };

  /** The records for some keys, in the same order; null where a key no longer leads anywhere. */
  const loadRecords = async (wanted: string[]): Promise<unknown[]> => {
    if (!wanted.length) return [];
    if (config.detailPath) return Promise.all(wanted.map((key) => read<unknown>(config.detailPath!(key))));
    const all = await readList(config.listPath);
    return wanted.map((key) => all.find((record) => config.keyOf(record) === key) ?? null);
  };

  /** Set when the items came from the compared safaris rather than from the visitor's own picks. */
  let derived: { tourKeys: string[]; tours: string[]; more: string[] } | null = null;
  let records: unknown[] = [];
  if (tourKeys.length && config.fromTour) {
    const tours = (await Promise.all(tourKeys.map((slug) => read<Tour>(`/tours/${encodeURIComponent(slug)}`)))).filter((tour): tour is Tour => Boolean(tour));
    // Every safari's first place before any safari's second, so each one is represented.
    const offered = interleave(tours.map((tour) => config.fromTour!(tour))).filter((entry) => parseCompareKeys(entry.key).length === 1).slice(0, 12);
    const loaded = await loadRecords(offered.map((entry) => entry.key));
    // A place a safari names that is not published is simply not offered.
    const published = offered.filter((_, index) => loaded[index] !== null && loaded[index] !== undefined);
    keys = published.slice(0, MAX_COMPARE).map((entry) => entry.key);
    records = keys.map((key) => loaded[offered.findIndex((entry) => entry.key === key)]);
    derived = {
      tourKeys: tours.map((tour) => tour.slug),
      tours: tours.map((tour) => tour.title),
      more: published.slice(MAX_COMPARE).map((entry) => entry.title).filter(Boolean)
    };
  } else {
    records = await loadRecords(keys);
  }
  const found = records.filter((record) => record !== null && record !== undefined);

  const extras: Record<string, unknown[]> = {};
  if (found.length) {
    await Promise.all(
      config.needs.map(async (need) => {
        extras[need] = await readList(EXTRA_PATHS[need]);
      })
    );
  }

  return {
    kind,
    records: found,
    extras: extras as CompareExtras,
    missing: keys.length - found.length,
    derived,
    origin: url.origin,
    // Published to the root layout, which owns the document head.
    seo: {
      title: titleWithBrand(null, translateIn(locale, config.titleKey)),
      description: translateIn(locale, config.introKey)
    }
  };
};
