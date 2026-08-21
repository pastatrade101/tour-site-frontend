import type { Reroute } from '@sveltejs/kit';
import { stripLocale } from '$lib/i18n';

/**
 * Locale prefixes are resolved here rather than by moving every route under a
 * [[lang]] folder: /de/tours is matched by the existing /tours route, so no
 * route file changes and no page is aware of the prefix.
 *
 * `event.url` keeps the original address, which is what the layout reads to
 * know the active locale and to build hreflang and switcher links.
 */
export const reroute: Reroute = ({ url }) => stripLocale(url.pathname);
