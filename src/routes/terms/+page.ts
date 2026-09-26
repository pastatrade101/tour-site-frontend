import type { PageLoad } from './$types';
import { loadLegalPage } from '$lib/legal';

export const load: PageLoad = ({ fetch, url }) => loadLegalPage(fetch, 'terms', url);
