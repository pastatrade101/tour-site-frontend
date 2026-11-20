import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { KINDS } from '$lib/compare/kinds';
import { parseCompareKeys, type CompareKind } from '$lib/compare/model';
import type { CompareExtras } from '$lib/compare/shared';
import { localeFromPath, withLocale } from '$lib/i18n';
import { translateIn } from '$lib/i18n/ui';
import { titleWithBrand } from '$lib/seo';

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
 */
export const load: PageLoad = async ({ fetch, params, url }) => {
  const kind = params.kind as CompareKind;
  const config = KINDS[kind];
  const locale = localeFromPath(url.pathname);
  const keys = parseCompareKeys(url.searchParams.get('items'));

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

  let records: unknown[] = [];
  if (keys.length) {
    if (config.detailPath) {
      records = await Promise.all(keys.map((key) => read<unknown>(config.detailPath!(key))));
    } else {
      const all = await readList(config.listPath);
      records = keys.map((key) => all.find((record) => config.keyOf(record) === key) ?? null);
    }
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
    origin: url.origin,
    // Published to the root layout, which owns the document head.
    seo: {
      title: titleWithBrand(null, translateIn(locale, config.titleKey)),
      description: translateIn(locale, config.introKey)
    }
  };
};
