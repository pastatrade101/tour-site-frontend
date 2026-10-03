/**
 * Where "plan my trip" calls to action lead: always the six-step planner at
 * /plan-my-trip, which suggests real trips as it goes and is the one place
 * enquiries start. The old in-page form (`#lead-form`) and its popup are no
 * longer a destination for these buttons.
 */

const PLANNER = '/plan-my-trip';

// Addresses older CMS content and defaults still carry for "the planning form".
const LEGACY_TARGETS = new Set(['', '#', '#lead-form', '#plan', '#plan-my-trip', '#enquiry']);

/** A CTA address from the CMS or a prop, with the old form anchors sent to the planner. */
export const resolvePlanHref = (href: string | null | undefined, planner = PLANNER): string => {
  const value = String(href ?? '').trim();
  return LEGACY_TARGETS.has(value.toLowerCase()) ? planner : value;
};

/**
 * The planner, opened from a page about something specific (a safari style,
 * an experience): the name is shown to the traveller as their interest, and
 * the obvious answers are pre-filled — honeymoon -> a couple, family -> a
 * family, Zanzibar/beach -> a beach trip, otherwise a safari.
 */
export const planTripHref = ({ name, slug, from }: { name?: string | null; slug?: string | null; from?: string } = {}): string => {
  const query = new URLSearchParams();
  const hay = `${slug ?? ''} ${name ?? ''}`.toLowerCase();

  if (/honeymoon|romantic|couple/.test(hay)) query.set('persona', 'couple');
  else if (/famil/.test(hay)) query.set('persona', 'family');
  else if (/solo/.test(hay)) query.set('persona', 'solo');
  else if (/group/.test(hay)) query.set('persona', 'group');

  if (/gorilla|chimp|primate/.test(hay)) query.set('experience', 'gorilla');
  else if (/cultur|village/.test(hay)) query.set('experience', 'culture');
  else if (/zanzibar|beach/.test(hay) && !/safari/.test(hay)) query.set('experience', 'beach');
  else if (hay.trim()) query.set('experience', 'safari');

  if (name?.trim()) query.set('place', name.trim());
  if (from) query.set('from', from);

  const qs = query.toString();
  return qs ? `${PLANNER}?${qs}` : PLANNER;
};
