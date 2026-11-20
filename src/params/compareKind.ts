import type { ParamMatcher } from '@sveltejs/kit';
import { isCompareKind } from '$lib/compare/model';

/**
 * /compare/tours, /compare/accommodation, /compare/destinations and
 * /compare/guides are the side-by-side tool. Every other /compare/<slug> is an
 * editorial comparison written in the CMS and keeps its own page.
 */
export const match: ParamMatcher = (param) => isCompareKind(param);
