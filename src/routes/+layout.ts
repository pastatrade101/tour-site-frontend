import type { LayoutLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { localeFromPath } from '$lib/i18n';
import type { Language } from '$lib/types';

/**
 * Locale and the enabled language list, resolved once for every page.
 *
 * Centralised here rather than repeated per route: the switcher, hreflang and
 * `<html lang>` all read the same values, and pages that need the active
 * locale for their own API calls take it from `data.locale`.
 */
export const load: LayoutLoad = async ({ fetch, url }) => {
  const locale = localeFromPath(url.pathname);

  let languages: Language[] = [];
  try {
    // cachedJson dedupes this across navigations, so the language list is not
    // refetched on every page view.
    const body = await cachedJson<{ data?: Language[] }>(`${API_URL}/translations/languages`, fetch);
    languages = body.data ?? [];
  } catch {
    // A missing language list must never take the site down — it degrades to
    // the default language with no switcher.
    languages = [];
  }

  return { locale, languages };
};
