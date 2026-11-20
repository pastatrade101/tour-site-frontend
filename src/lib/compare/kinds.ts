import { accommodationKind } from './accommodation';
import { destinationsKind } from './destinations';
import { guidesKind } from './guides';
import type { CompareKind } from './model';
import type { KindConfig } from './shared';
import { toursKind } from './tours';

/**
 * Every category a visitor can compare. Adding one is a file like the four
 * beside this one — its rows and where its records come from — and a line
 * here; the tray, the button, the picker and the comparison page are shared.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const KINDS: Record<CompareKind, KindConfig<any>> = {
  tours: toursKind,
  accommodation: accommodationKind,
  destinations: destinationsKind,
  guides: guidesKind
};
