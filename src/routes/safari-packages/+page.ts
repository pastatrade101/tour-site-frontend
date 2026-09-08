import type { PageLoad } from './$types';
import { localeFromPath, withLocale } from '$lib/i18n';
import type { SafariPackage } from '$lib/types';

/** Relative /api path so this renders on the server through the app's proxy. */
export const load: PageLoad = async ({ fetch, url }) => {
  const locale = localeFromPath(url.pathname);
  try {
    const response = await fetch(withLocale('/api/safari-packages?status=published&limit=100', locale));
    if (!response.ok) return { packages: [] as SafariPackage[] };
    const body = (await response.json()) as { data?: { items?: SafariPackage[] } };
    return { packages: body?.data?.items ?? [] };
  } catch {
    return { packages: [] as SafariPackage[] };
  }
};
