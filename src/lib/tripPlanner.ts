/**
 * The logic behind /plan-my-trip — what to ask, what to suggest, and what the
 * specialist receives. Kept out of the page so the page is only layout.
 *
 * Recommendations are built from the published tours themselves: the places
 * each one visits, its length, its price, its comfort tier, who it is written
 * for and its minimum age. Nothing here invents a trip, a price or a rating — a
 * trip type the catalogue cannot back is not offered, the budget scale is the
 * catalogue's own price range, and a request with no packaged match says so and
 * goes to a specialist as a custom plan.
 */
import type { Tour } from '$lib/types';
import { monthRanges } from '$lib/categoryFacts';

// ── What the tours list carries (embedded relations are not on the Tour type) ──

type Embedded = {
  tour_categories?: { name?: string; slug?: string } | null;
  destinations?: { name?: string; slug?: string } | null;
  tour_destinations?: Array<{ destinations?: { name?: string; slug?: string } | null }> | null;
  persona_tags?: string[] | null;
  minimum_age?: number | null;
  main_image_url_thumbnail?: string | null;
};
export type PlannerTour = Tour & Embedded;

/** A published style, as the planner needs it: to offer trip types and read its best months. */
export type PlannerCategory = { slug: string; name: string; best_months?: number[] | null };

const categorySlug = (tour: PlannerTour) => String(tour.tour_categories?.slug ?? '');
const personas = (tour: PlannerTour) => (tour.persona_tags ?? []).map((tag) => String(tag).toLowerCase());

/** Every place a tour visits, primary first. */
export const placesOf = (tour: PlannerTour): Array<{ name: string; slug: string }> => {
  const out = new Map<string, string>();
  const primary = tour.destinations;
  if (primary?.slug) out.set(primary.slug, String(primary.name ?? primary.slug));
  for (const link of tour.tour_destinations ?? []) {
    const place = link?.destinations;
    if (place?.slug && !out.has(place.slug)) out.set(place.slug, String(place.name ?? place.slug));
  }
  return [...out].map(([slug, name]) => ({ slug, name }));
};

/** The answer for anyone who has not decided yet — offered on every question that allows it. */
export const NOT_SURE = 'Not sure yet';

// ── Trip types, each tied to the data that can back it ─────────────────────────

export type TypeId = 'safari' | 'zanzibar-safari' | 'beach' | 'kenya' | 'culture' | 'primates' | 'unsure';

type TripType = {
  id: TypeId;
  label: string;
  desc: string;
  /** Categories that sell this kind of trip — a published one keeps the option on offer. */
  categories: string[];
  /** Does a tour include this kind of trip? */
  matches: (tour: PlannerTour) => boolean;
  /**
   * The ways a safari can start. They are alternatives rather than parts of one
   * trip, so choosing one swaps out another — their lengths would otherwise be
   * added together as if they were two safaris.
   */
  base?: boolean;
};

const PARK = /national-park|crater|serengeti|ndutu|tarangire|manyara|nyerere|selous|mikumi|ruaha|katavi/;
const KENYA = /kenya|nairobi|masai-mara|maasai-mara|amboseli|tsavo|samburu|nakuru|naivasha/;

const SAFARI: TripType = {
  id: 'safari',
  label: 'Safari',
  desc: 'Serengeti, Ngorongoro, Tarangire & more',
  categories: [],
  matches: (tour) => placesOf(tour).some((p) => PARK.test(p.slug)) || categorySlug(tour).includes('safari'),
  base: true
};

const ZANZIBAR_SAFARI: TripType = {
  id: 'zanzibar-safari',
  label: 'Safari from Zanzibar',
  desc: 'Add a mainland safari to your Zanzibar stay',
  categories: ['safari-from-zanzibar'],
  // The category, or a tour whose own experience type says it flies in from Zanzibar.
  matches: (tour) => categorySlug(tour) === 'safari-from-zanzibar' || /from zanzibar/i.test(String(tour.experience_type ?? '')),
  base: true
};

const BEACH: TripType = {
  id: 'beach',
  label: 'Zanzibar beach',
  desc: 'White sand, Stone Town, ocean days',
  categories: ['safari-and-beach-holidays', 'zanzibar-beach-holidays'],
  matches: (tour) => placesOf(tour).some((p) => /zanzibar|beach/.test(p.slug)) || /beach/.test(categorySlug(tour))
};

const KENYA_TANZANIA: TripType = {
  id: 'kenya',
  label: 'Kenya & Tanzania',
  desc: 'One safari across both countries',
  categories: ['kenya-and-tanzania-tours', 'safari-from-nairobi'],
  matches: (tour) => /kenya|nairobi/.test(categorySlug(tour)) || placesOf(tour).some((p) => KENYA.test(p.slug)),
  base: true
};

const CULTURE: TripType = {
  id: 'culture',
  label: 'Culture & villages',
  desc: 'Maasai, Mto wa Mbu, local life',
  categories: ['tanzania-cultural-experiences'],
  matches: (tour) =>
    /cultur/.test(categorySlug(tour)) ||
    /cultur|village|maasai/i.test(String(tour.title ?? '')) ||
    (tour.persona_tags ?? []).some((tag) => /cultur/i.test(tag))
};

const PRIMATES: TripType = {
  id: 'primates',
  label: 'Gorillas & chimps',
  desc: 'Uganda, Rwanda, Gombe trekking',
  categories: ['gorilla-trekking-tours', 'chimp-trekking-tours'],
  matches: (tour) =>
    /gorilla|chimp/.test(categorySlug(tour)) || placesOf(tour).some((p) => /gombe|mahale|bwindi|volcanoes/.test(p.slug))
};

const UNSURE: TripType = {
  id: 'unsure',
  label: NOT_SURE,
  desc: "Tell us what you enjoy and we'll suggest a direction",
  categories: [],
  // Every trip is a candidate when the visitor has not chosen a kind yet.
  matches: () => true
};

/**
 * The four kinds the homepage planning band links to. Kept as they were so the
 * band is unchanged; the planner itself offers PLANNER_TYPES.
 */
export const TRIP_TYPES: TripType[] = [SAFARI, BEACH, CULTURE, PRIMATES];

/** Everything the planner can ask about, in the order it shows them. */
export const PLANNER_TYPES: TripType[] = [SAFARI, ZANZIBAR_SAFARI, BEACH, KENYA_TANZANIA, CULTURE, PRIMATES, UNSURE];

export const typeOf = (id: TypeId) => PLANNER_TYPES.find((type) => type.id === id)!;

/**
 * Only the trip types the site can actually deliver: a tour includes it, or a
 * published style sells it. "Not sure yet" is always on offer.
 */
export const offeredTypes = (tours: PlannerTour[], categorySlugs: string[]): TripType[] =>
  PLANNER_TYPES.filter(
    (type) =>
      type.id === 'unsure' ||
      tours.some(type.matches) ||
      type.categories.some((slug) => categorySlugs.includes(slug))
  );

/** Chosen types other than "Not sure yet". */
const definite = (types: TypeId[]) => types.filter((type) => type !== 'unsure');

// ── Lengths ────────────────────────────────────────────────────────────────────

export const LENGTHS: Record<TypeId, string[]> = {
  safari: ['1–2 days', '3–4 days', '5–7 days', '8+ days'],
  'zanzibar-safari': ['1 day', '2–3 days', '4–5 days', '6+ days'],
  beach: ['2–3 nights', '4–5 nights', '6–7 nights', '8+ nights'],
  kenya: ['3–4 days', '5–7 days', '8–10 days', '11+ days'],
  culture: ['Half day', '1 day', '2–3 days'],
  primates: ['2–3 days', '4–5 days', '6+ days'],
  // "Not sure yet" as a trip type still has a length: the whole trip.
  unsure: ['3–4 days', '5–7 days', '8–10 days', '11–14 days', '15+ days']
};

/** What the length question calls each part of the trip. */
export const lengthLabel = (type: TypeId) => (type === 'unsure' ? 'Whole trip' : typeOf(type).label);

/** "5–7 days" → [5, 7]; "8+ days" → [8, 10]; "Half day" → [0.5, 0.5]. */
const bandRange = (band: string): [number, number] => {
  if (band === 'Half day') return [0.5, 0.5];
  const [lo, hi] = band.split('–').map((part) => parseInt(part, 10));
  if (band.includes('+')) return [lo, lo + 2];
  return [lo, Number.isFinite(hi) ? hi : lo];
};

export const bandDays = (band?: string): number => {
  if (!band || band === NOT_SURE) return 0;
  const [lo, hi] = bandRange(band);
  return Number.isFinite(lo) ? (lo + hi) / 2 : 0;
};

/**
 * The length most of our own tours of this type fall into — the "Popular"
 * badge is a count of the catalogue, not a guess. No badge where no tour of
 * the type exists yet.
 */
export const popularBand = (type: TypeId, tours: PlannerTour[]): string | null => {
  if (type === 'beach') return null; // beach days are nights added to a safari, not a tour length
  const counts = LENGTHS[type].map((band) => {
    const [lo, hi] = bandRange(band);
    return tours.filter(typeOf(type).matches).filter((t) => {
      const days = Number(t.duration_days ?? 0);
      return days >= Math.floor(lo) && (band.includes('+') ? true : days <= hi);
    }).length;
  });
  const best = Math.max(...counts);
  return best > 0 ? LENGTHS[type][counts.indexOf(best)] : null;
};

// ── Travellers, dates, pace ────────────────────────────────────────────────────

export const PARTIES = [
  { id: 'solo', label: 'Solo' },
  { id: 'partner', label: 'Partner' },
  { id: 'family', label: 'Family' },
  { id: 'group', label: 'Group' }
] as const;
export type Party = (typeof PARTIES)[number]['id'];

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Season calendar for northern Tanzania / Zanzibar.
export const SEASON: Array<'Peak' | 'Shoulder' | 'Low'> = ['Peak', 'Peak', 'Shoulder', 'Low', 'Low', 'Shoulder', 'Peak', 'Peak', 'Peak', 'Shoulder', 'Shoulder', 'Peak'];
export const MONTH_TIP = [
  'Calving season in Ndutu — thousands of newborn wildebeest and active predators.',
  'Peak calving in the southern Serengeti. Warm, green and dramatic.',
  'Herds still in the south; fewer crowds before the long rains.',
  'Long rains — lush landscapes and the lowest prices. Some camps close; Zanzibar is humid.',
  'Rains easing, green season rates. A quiet, great-value month.',
  'Herds move to the Western corridor; dry season begins.',
  'Dry season — excellent game viewing and Grumeti river crossings possible.',
  'Mara river crossings in the northern Serengeti. Book early.',
  'Mara crossings continue; dry, clear and superb for photography.',
  'Crossings taper off; good game, fewer vehicles.',
  'Short rains — brief showers, green scenery and shoulder prices.',
  'Herds return south; festive season is busy, book ahead.'
];

/** Planning guidance only — how the route is shaped, not a promise about it. */
export const PACES = [
  { id: 'Relaxed', desc: 'More nights in fewer places, less moving around.' },
  { id: 'Balanced', desc: 'A mix of game drives, rest and route variety.' },
  { id: 'Active', desc: 'More places, fuller days and more time on the move.' },
  { id: NOT_SURE, desc: "We'll suggest a pace that fits your route." }
];

/** Where the traveller is with their own planning. */
export const STAGES = [
  { id: "I'm just starting", desc: 'I need help understanding what fits.' },
  { id: 'I know the places I want', desc: 'I have destinations in mind but need help connecting them.' },
  { id: 'I already have a rough itinerary', desc: 'I want someone to review and refine the route.' },
  { id: "I'm comparing quotes", desc: 'I want a clear proposal and honest trade-offs.' },
  { id: 'I need help fixing the route', desc: 'Something feels unclear, rushed or too complicated.' }
];

// ── Comfort, from the tiers the catalogue actually uses ────────────────────────

const TIERS: Record<string, { label: string; desc: string }> = {
  budget: { label: 'Value', desc: 'Comfortable tented camps & lodges, great guiding' },
  mid_range: { label: 'Mid-range', desc: 'Well-located lodges with pools and views' },
  luxury: { label: 'Luxury', desc: 'Top camps, private vehicle, exclusive locations' }
};
const TIER_ORDER = Object.keys(TIERS);

export const tierLabel = (tier: string) =>
  tier === NOT_SURE ? NOT_SURE : TIERS[tier]?.label ?? tier.replace(/_/g, '-').replace(/^./, (c) => c.toUpperCase());

export type ComfortOption = { id: string; label: string; desc: string; count: number; min: number; max: number };

/**
 * One option per budget tier the published tours use, with how many trips sit
 * in it and their starting-price range. Without a catalogue (the API failed)
 * the three known tiers are offered with no figures.
 */
export const comfortOptions = (tours: PlannerTour[]): ComfortOption[] => {
  const present = [...new Set(tours.map((t) => String(t.budget_tier ?? '')).filter(Boolean))];
  const ids = present.length
    ? present.sort((a, b) => (TIER_ORDER.indexOf(a) + 1 || 99) - (TIER_ORDER.indexOf(b) + 1 || 99))
    : TIER_ORDER;
  return ids.map((id) => {
    const prices = tours
      .filter((t) => t.budget_tier === id)
      .map((t) => Number(t.price_from ?? 0))
      .filter((n) => n > 0);
    return {
      id,
      label: tierLabel(id),
      desc: TIERS[id]?.desc ?? '',
      count: tours.filter((t) => t.budget_tier === id).length,
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0
    };
  });
};

// ── Budget, on the catalogue's own price scale ─────────────────────────────────

const startingPrices = (tours: PlannerTour[]) =>
  tours
    .map((t) => Number(t.price_from ?? 0))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

export type BudgetScale = { min: number; max: number; step: number; start: number };

/**
 * The slider runs from our lowest to our highest published starting price per
 * person (USD), rounded out to a step that suits the spread. It starts at the
 * median. Null when there are no prices to build it from.
 */
export const budgetScale = (tours: PlannerTour[]): BudgetScale | null => {
  const prices = startingPrices(tours);
  if (!prices.length) return null;
  const spread = prices[prices.length - 1] - prices[0];
  const step = spread > 20000 ? 500 : spread > 8000 ? 250 : 100;
  const min = Math.floor(prices[0] / step) * step;
  const max = Math.max(min + step, Math.ceil(prices[prices.length - 1] / step) * step);
  const mid = prices.length % 2 ? prices[(prices.length - 1) / 2] : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
  return { min, max, step, start: Math.min(max, Math.max(min, Math.round(mid / step) * step)) };
};

/** Published trips whose starting price per person is at or under `usd`. */
export const startingAtOrUnder = (tours: PlannerTour[], usd: number) => startingPrices(tours).filter((n) => n <= usd).length;

// ── Priorities ─────────────────────────────────────────────────────────────────

type Priority = {
  id: string;
  /** Kept on offer only when the catalogue or a published style backs it. */
  available: (tours: PlannerTour[], categorySlugs: string[]) => boolean;
  /** Does a tour serve this priority, by its own data? */
  matches: (tour: PlannerTour, valueCut: number) => boolean;
};

const tagged = (pattern: RegExp) => (tour: PlannerTour) => personas(tour).some((tag) => pattern.test(tag));
const migration = (tour: PlannerTour) =>
  /migration/.test(categorySlug(tour)) || tagged(/migration/)(tour) || /migration/i.test(String(tour.title ?? ''));
const romance = (tour: PlannerTour) => /honeymoon/.test(categorySlug(tour)) || tagged(/couple|honeymoon/)(tour);
const families = (tour: PlannerTour) => /famil/.test(categorySlug(tour)) || tagged(/famil/)(tour);
const shortStay = tagged(/time-conscious|short-stay|short on time/);
const photography = tagged(/photograph/);
const luxury = (tour: PlannerTour) => tour.budget_tier === 'luxury' || /luxury/.test(categorySlug(tour));
const privateGuide = (tour: PlannerTour) => /private/.test(categorySlug(tour)) || tagged(/private/)(tour);

export const PRIORITIES: Priority[] = [
  { id: 'Big wildlife', available: (tours) => tours.some(SAFARI.matches), matches: (tour) => placesOf(tour).some((p) => PARK.test(p.slug)) },
  {
    id: 'Great Migration',
    available: (tours, slugs) => tours.some(migration) || slugs.includes('great-migration-safari-tanzania'),
    matches: migration
  },
  {
    id: 'Zanzibar beach time',
    available: (tours, slugs) => tours.some(BEACH.matches) || BEACH.categories.some((s) => slugs.includes(s)),
    matches: BEACH.matches
  },
  { id: 'Romantic stays', available: (tours, slugs) => tours.some(romance) || slugs.includes('tanzania-honeymoon-safari'), matches: romance },
  { id: 'Family-friendly pacing', available: (tours, slugs) => tours.some(families) || slugs.includes('family-safari-tanzania'), matches: families },
  { id: 'Short on time', available: (tours) => tours.some(shortStay), matches: shortStay },
  // "Value" is relative to our own prices: the cheapest third of starting prices.
  { id: 'Best value', available: (tours) => startingPrices(tours).length > 2, matches: (tour, cut) => Number(tour.price_from ?? 0) > 0 && Number(tour.price_from) <= cut },
  { id: 'Photography', available: (tours) => tours.some(photography), matches: photography },
  {
    id: 'Culture',
    available: (tours, slugs) => tours.some(CULTURE.matches) || CULTURE.categories.some((s) => slugs.includes(s)),
    matches: CULTURE.matches
  },
  { id: 'Luxury lodges', available: (tours, slugs) => tours.some(luxury) || slugs.includes('luxury-tanzania-safaris'), matches: luxury },
  { id: 'Private guiding', available: (tours, slugs) => tours.some(privateGuide) || slugs.includes('private-tanzania-safaris'), matches: privateGuide }
];

export const MAX_PRIORITIES = 3;

/** The priorities the business can act on today, plus "Not sure yet". */
export const offeredPriorities = (tours: PlannerTour[], categorySlugs: string[]): string[] => [
  ...PRIORITIES.filter((p) => p.available(tours, categorySlugs)).map((p) => p.id),
  NOT_SURE
];

const valueCutOf = (tours: PlannerTour[]) => {
  const prices = startingPrices(tours);
  return prices.length ? prices[Math.floor((prices.length - 1) / 3)] : 0;
};

// ── The answers ────────────────────────────────────────────────────────────────

export type Draft = {
  types: TypeId[];
  party: Party | '';
  adults: number;
  children: number;
  /** One per child, '' where the age was not given. */
  childAges: string[];
  dateMode: 'flexible' | 'exact';
  year: number;
  /** null until a month is picked (or when the visitor is not sure yet). */
  month: number | null;
  dateUnsure: boolean;
  /** YYYY-MM-DD, exact-dates mode only. */
  startDate: string;
  endDate: string;
  lengths: Partial<Record<TypeId, string>>;
  pace: string;
  priorities: string[];
  /** A budget_tier value, or NOT_SURE. */
  comfort: string;
  /** USD per person; null until the slider is moved. */
  budget: number | null;
  budgetUnsure: boolean;
  stage: string;
  notes: string;
};

export const travellers = (d: Draft) => ({
  adults: d.party === 'solo' ? 1 : d.party === 'partner' ? 2 : d.adults,
  children: d.party === 'family' || d.party === 'group' ? d.children : 0
});

/** The ages given, as numbers — only for parties that can include children. */
export const childAgesOf = (d: Draft): number[] =>
  travellers(d).children
    ? d.childAges
        .slice(0, d.children)
        .filter((age) => age !== '')
        .map(Number)
        .filter((age) => Number.isFinite(age))
    : [];

export const totalDays = (d: Draft) => Math.round(d.types.reduce((sum, type) => sum + bandDays(d.lengths[type]), 0));

/** The month the trip falls in, from the exact start date or the month picked; null if unknown. */
export const activeMonth = (d: Draft): number | null => {
  if (d.dateMode === 'exact') return /^\d{4}-\d{2}/.test(d.startDate) ? Number(d.startDate.slice(5, 7)) - 1 : null;
  return d.dateUnsure ? null : d.month;
};

/** "12 Mar 2027" from "2027-03-12". */
export const shortDate = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
};

/** When, in words — English, as the specialist reads it. */
export const whenText = (d: Draft): string => {
  if (d.dateMode === 'exact') {
    if (!d.startDate) return '';
    return d.endDate ? `${shortDate(d.startDate)} → ${shortDate(d.endDate)}` : `From ${shortDate(d.startDate)}`;
  }
  if (d.dateUnsure) return NOT_SURE;
  return d.month === null ? '' : `${MONTH_NAMES[d.month]} ${d.year}`;
};

// ── Expert tips ────────────────────────────────────────────────────────────────

export const insights = (d: Draft): string[] => {
  const out: string[] = [];
  const has = (type: TypeId) => d.types.includes(type);
  const month = activeMonth(d);
  // A safari from Zanzibar reaches the same parks, so the season tips apply to it too.
  const safariTrip = has('safari') || has('zanzibar-safari');
  if (has('safari') && has('beach'))
    out.push('Safari first, beach last is the classic flow — you end the trip relaxed, and short flights link Arusha or the Serengeti to Zanzibar.');
  if (has('primates') && (safariTrip || has('kenya')))
    out.push("Gorilla trekking is in Uganda or Rwanda — we'd add a regional flight and plan 2–3 extra days.");
  if (safariTrip && month !== null && [6, 7, 8].includes(month))
    out.push('Your month overlaps river-crossing season — northern Serengeti camps are ideal.');
  if (safariTrip && month !== null && [0, 1].includes(month))
    out.push("January–February is calving season: we'd base you in Ndutu for predator action.");
  if (month !== null && [3, 4].includes(month))
    out.push('April–May is green season: lower prices and quiet parks, but some remote camps close.');
  if (travellers(d).children > 0)
    out.push("Family-friendly lodges with pools and family rooms suit your group well; some camps have minimum ages, and we'll check them against your children's ages.");
  if (d.party === 'partner' && d.comfort === 'luxury')
    out.push('Sounds like a honeymoon-style trip — ask us about private dinners and balloon safaris.');
  const safariDays = Math.max(bandDays(d.lengths.safari), bandDays(d.lengths['zanzibar-safari']));
  if (safariTrip && safariDays > 0 && safariDays <= 2)
    out.push('With 1–2 safari days, fly-in routes from Zanzibar to Nyerere or Mikumi maximise game time.');
  if (safariDays >= 7)
    out.push('A week or more lets you combine Tarangire, Ngorongoro and a deep Serengeti stay without rushing.');
  if (month !== null && SEASON[month] === 'Peak')
    out.push('Peak season — the best lodges fill 6–9 months ahead, so an early request helps.');
  return out.slice(0, 3);
};

/**
 * Tips counted from the catalogue itself: how many published trips fit the
 * answers so far, the real price range of the chosen comfort tier, and the
 * best months a published style lists. Every figure is read from the data.
 */
export const catalogueTips = (
  d: Draft,
  tours: PlannerTour[],
  categories: PlannerCategory[],
  formatPrice: (usd: number) => string
): Array<{ id: string; text: string }> => {
  const out: Array<{ id: string; text: string }> = [];
  if (!d.types.length) return out;
  const chosen = definite(d.types);
  const pool = chosen.length ? tours.filter((t) => chosen.some((type) => typeOf(type).matches(t))) : tours;
  const trips = (n: number) => (n === 1 ? 'trip' : 'trips');

  if (chosen.length > 1) {
    const both = tours.filter((t) => chosen.every((type) => typeOf(type).matches(t))).length;
    if (both)
      out.push({
        id: 'combo',
        text: `${both} of our published ${trips(both)} already ${both === 1 ? 'combines' : 'combine'} ${chosen.map((type) => typeOf(type).label.toLowerCase()).join(' and ')}.`
      });
  }

  const target = totalDays(d);
  if (pool.length && target > 0) {
    const lo = Math.max(1, target - 1);
    const hi = target + 1;
    const n = pool.filter((t) => {
      const days = Number(t.duration_days ?? 0);
      return days >= lo && days <= hi;
    }).length;
    out.push({
      id: 'length',
      text: n
        ? `${n} of the ${pool.length} published ${trips(pool.length)} that match your trip type ${n === 1 ? 'runs' : 'run'} ${lo}–${hi} days.`
        : `None of our published trips of this type runs ${lo}–${hi} days yet — we'll plan yours as a custom trip.`
    });
  }

  if (d.comfort && d.comfort !== NOT_SURE) {
    const option = comfortOptions(tours).find((o) => o.id === d.comfort);
    if (option?.count && option.min) {
      out.push({
        id: 'comfort',
        text:
          option.min === option.max
            ? `Our ${option.label.toLowerCase()} ${trips(option.count)} ${option.count === 1 ? 'starts' : 'start'} from ${formatPrice(option.min)} per person.`
            : `Our ${option.count} ${option.label.toLowerCase()} trips start between ${formatPrice(option.min)} and ${formatPrice(option.max)} per person.`
      });
    }
  }

  if (d.budget !== null && !d.budgetUnsure && pool.length) {
    const n = startingAtOrUnder(pool, d.budget);
    out.push({
      id: 'budget',
      text: `${n} of the ${pool.length} published ${trips(pool.length)} that match your trip type ${n === 1 ? 'starts' : 'start'} at or under ${formatPrice(d.budget)} per person.`
    });
  }

  const month = activeMonth(d);
  for (const type of chosen) {
    for (const slug of typeOf(type).categories) {
      const category = categories.find((c) => c.slug === slug);
      const best = (category?.best_months ?? []).map(Number).filter((m) => m >= 1 && m <= 12);
      if (!category || !best.length) continue;
      const ranges = monthRanges(best);
      out.push({
        id: `months-${slug}`,
        text:
          month !== null && best.includes(month + 1)
            ? `${MONTH_NAMES[month]} is one of the best months listed for our ${category.name} (${ranges}).`
            : `Best months listed for our ${category.name}: ${ranges}.`
      });
    }
  }
  return out;
};

// ── Recommendations ────────────────────────────────────────────────────────────

/** Where the visitor came from — a tour page, a park, a style — nudges the match. */
export type PlannerContext = { tourSlug?: string; destinationSlug?: string; placeName?: string };

export type Recommendation = { tour: PlannerTour; reasons: string[] };

const personaParty = (tag: string): Party | null => {
  const text = tag.toLowerCase();
  if (/solo/.test(text)) return 'solo';
  if (/couple|honeymoon/.test(text)) return 'partner';
  if (/famil/.test(text)) return 'family';
  if (/group/.test(text)) return 'group';
  return null;
};

/** Days per place visited, from the tour's own length and route. */
const daysPerPlace = (tour: PlannerTour) => {
  const days = Number(tour.duration_days ?? 0);
  const places = placesOf(tour).length;
  return days && places ? days / places : 0;
};

export const recommend = (
  d: Draft,
  tours: PlannerTour[],
  context: PlannerContext = {},
  formatPrice: (usd: number) => string = (usd) => `$${usd.toLocaleString()}`
): Recommendation[] => {
  if (!d.types.length) return [];
  const chosen = definite(d.types);
  const target = totalDays(d);
  const month = activeMonth(d);
  const ages = childAgesOf(d);
  const youngest = ages.length ? Math.min(...ages) : null;
  const valueCut = valueCutOf(tours);
  const wanted = PRIORITIES.filter((p) => d.priorities.includes(p.id));

  const scored = tours.map((tour) => {
    const reasons: string[] = [];
    let score = 1;
    if (chosen.length) {
      const typesHit = chosen.filter((type) => typeOf(type).matches(tour));
      if (!typesHit.length) return { tour, score: -Infinity, reasons };
      score = typesHit.length * 3;
    }

    const places = placesOf(tour);
    const named = places.filter((p) => PARK.test(p.slug) || /zanzibar|kilimanjaro/.test(p.slug)).slice(0, 3);

    const days = Number(tour.duration_days ?? 0);
    if (target && days) {
      score -= Math.abs(days - target) * 0.6;
      if (Math.abs(days - target) <= 1) reasons.push(`${days} days — about the length you want`);
    }

    const price = Number(tour.price_from ?? 0);
    if (d.budget !== null && !d.budgetUnsure && price) {
      if (price <= d.budget) {
        score += 2;
        reasons.push(`From ${formatPrice(price)} per person — within your budget`);
      } else if (price > d.budget * 1.15) {
        score -= 2;
      } else {
        score -= 0.5;
      }
    }

    if (d.party && (tour.persona_tags ?? []).some((tag) => personaParty(tag) === d.party)) {
      score += 1.5;
      reasons.push(`Suits ${PARTIES.find((p) => p.id === d.party)!.label.toLowerCase()} travellers`);
    }

    if (d.comfort && d.comfort !== NOT_SURE && tour.budget_tier) {
      if (tour.budget_tier === d.comfort) {
        score += 1.5;
        reasons.push(`${tierLabel(d.comfort)} comfort, as you asked`);
      } else {
        score -= 0.5;
      }
    }

    const hits = wanted.filter((p) => p.matches(tour, valueCut)).map((p) => p.id);
    if (hits.length) {
      score += hits.length * 1.5;
      reasons.push(`Fits your ${hits.length > 1 ? 'priorities' : 'priority'}: ${hits.join(', ')}`);
    }

    // Pace, read from the route: days per place visited.
    const ratio = daysPerPlace(tour);
    if (ratio && d.pace === 'Relaxed' && ratio >= 2.5) {
      score += 1;
      reasons.push(`${days} days for ${places.length} ${places.length === 1 ? 'place' : 'places'} — an unhurried route`);
    } else if (ratio && d.pace === 'Active' && ratio <= 1.34 && places.length > 1) {
      score += 1;
      reasons.push(`${places.length} places in ${days} days`);
    } else if (ratio && d.pace === 'Balanced' && ratio > 1.34 && ratio < 2.5) {
      score += 0.5;
    }

    // A minimum age above the youngest child rules the trip out as it stands.
    if (youngest !== null && tour.minimum_age && youngest < tour.minimum_age) score -= 4;

    // Migration timing, read from the tour itself: a calving-season trip (its
    // title or slug says calving or Ndutu) runs January–March; the others follow
    // the herds north for the river crossings, July–October. A month outside the
    // tour's own season earns neither the nudge nor the claim.
    if (/migration/.test(categorySlug(tour)) && month !== null) {
      const calving = /calving|ndutu/i.test(`${tour.title ?? ''} ${tour.slug ?? ''}`);
      if ((calving ? [0, 1, 2] : [6, 7, 8, 9]).includes(month)) {
        score += 1;
        reasons.push(`Timed for the migration in ${MONTH_NAMES[month]}`);
      }
    }

    if (context.tourSlug && tour.slug === context.tourSlug) {
      score += 5;
      reasons.unshift('The trip you were looking at');
    }
    if (context.destinationSlug && places.some((p) => p.slug === context.destinationSlug)) score += 2;
    // Places last: every match visits somewhere, so it is the weakest reason
    // and the page may only show the first.
    if (named.length) reasons.push(`Visits ${named.map((p) => p.name).join(', ')}`);

    return { tour, score, reasons: reasons.slice(0, 3) };
  });

  return scored
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ tour, reasons }) => ({ tour, reasons }));
};

// ── Coming in from a link ──────────────────────────────────────────────────────

const EXPERIENCE: Record<string, TypeId[]> = {
  safari: ['safari'],
  beach: ['beach'],
  zanzibar: ['beach'],
  'zanzibar-safari': ['zanzibar-safari'],
  kenya: ['kenya'],
  cultural: ['culture'],
  culture: ['culture'],
  gorilla: ['primates'],
  chimp: ['primates'],
  primates: ['primates']
};

/** A published style named in a link (the homepage hero sends its name) → the planner's types. */
const CATEGORY_TYPES: Record<string, TypeId[]> = {
  'safari-from-zanzibar': ['zanzibar-safari'],
  'safari-and-beach-holidays': ['safari', 'beach'],
  'zanzibar-beach-holidays': ['beach'],
  'kenya-and-tanzania-tours': ['kenya'],
  'safari-from-nairobi': ['kenya'],
  'gorilla-trekking-tours': ['primates'],
  'chimp-trekking-tours': ['primates'],
  'tanzania-cultural-experiences': ['culture']
};
/** …and the priority a style stands for, where it has one. */
const CATEGORY_PRIORITY: Record<string, string> = {
  'great-migration-safari-tanzania': 'Great Migration',
  'tanzania-honeymoon-safari': 'Romantic stays',
  'family-safari-tanzania': 'Family-friendly pacing',
  'luxury-tanzania-safaris': 'Luxury lodges',
  'private-tanzania-safaris': 'Private guiding'
};
const PERSONA: Record<string, Party> = {
  solo: 'solo',
  couple: 'partner',
  couples: 'partner',
  partner: 'partner',
  honeymoon: 'partner',
  family: 'family',
  families: 'family',
  group: 'group'
};

/** Query strings a link may carry, kept for the specialist exactly as they arrived. */
const ENTRY_KEYS = ['from', 'tour', 'destination', 'place', 'persona', 'experience', 'category', 'month', 'date', 'stay', 'stay_name', 'adults', 'children', 'days'];
const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

const pick = (query: URLSearchParams, keys: string[]) => {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = String(query.get(key) ?? '').trim();
    if (value) out[key] = value.slice(0, 200);
  }
  return out;
};

/** Reads the query strings the rest of the site already links here with. */
export const fromQuery = (query: URLSearchParams, now = new Date(), categories: PlannerCategory[] = []) => {
  const experience = String(query.get('experience') ?? query.get('category') ?? '').trim();
  const key = experience.toLowerCase();
  const category = categories.find((c) => c.slug.toLowerCase() === key || c.name.toLowerCase() === key);
  const types: TypeId[] =
    EXPERIENCE[key] ??
    (category ? CATEGORY_TYPES[category.slug] ?? (/safari/.test(category.slug) ? ['safari'] : []) : []);
  const priority = category ? CATEGORY_PRIORITY[category.slug] : undefined;
  const party = PERSONA[String(query.get('persona') ?? '').toLowerCase()];

  let year: number | undefined;
  let month: number | undefined;
  const raw = String(query.get('month') ?? '');
  const iso = raw.match(/^(\d{4})-(\d{2})/);
  // A hand-edited link can say month 13 or 00 — only a real month is read.
  if (iso && Number(iso[2]) >= 1 && Number(iso[2]) <= 12) {
    year = Number(iso[1]);
    month = Number(iso[2]) - 1;
  } else if (raw && !iso) {
    const index = MONTH_NAMES.findIndex((name) => name.toLowerCase().startsWith(raw.toLowerCase().slice(0, 3)));
    if (index >= 0) {
      month = index;
      year = index < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
    }
  }
  // A full date (the homepage hero's date picker) is an exact start date — if
  // it is a real one: 2027-02-30 would read as a date but no input can show it.
  const rawDate = String(query.get('date') ?? '').match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  const parsed = rawDate ? new Date(`${rawDate}T00:00:00Z`) : null;
  const date = parsed && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === rawDate ? rawDate : undefined;

  // Numbers a page's own short form already asked (a safari-style page hands
  // its first step over here): only whole numbers in a sensible range count.
  const count = (name: string, min: number, max: number) => {
    const raw = query.get(name);
    const n = raw === null || raw.trim() === '' ? NaN : Number(raw);
    return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  };
  const adults = count('adults', 1, 30);
  const children = count('children', 0, 20);
  const days = count('days', 1, 60);
  // Who is travelling, only where the numbers leave no doubt: one adult alone
  // is solo, anyone with children is a family. Two adults could be a couple or
  // two friends, so that stays the traveller's answer.
  const partyFromCounts: Party | undefined =
    adults === 1 && !children ? 'solo' : children ? 'family' : undefined;
  // A trip length, only when the trip is one kind — days spread across a
  // safari and a beach stay cannot be split without guessing.
  const definiteTypes = types.filter((type) => type !== 'unsure');
  const lengths: Partial<Record<TypeId, string>> = {};
  if (days && definiteTypes.length === 1) {
    const type = definiteTypes[0];
    const band = LENGTHS[type].find((candidate) => {
      const [lo, hi] = bandRange(candidate);
      return days >= Math.floor(lo) && (candidate.includes('+') || days <= hi);
    });
    if (band) lengths[type] = band;
  }

  return {
    types,
    party: party ?? partyFromCounts ?? '',
    adults,
    children,
    lengths,
    priorities: priority ? [priority] : [],
    year,
    month,
    startDate: date,
    context: {
      tourSlug: query.get('tour') ?? undefined,
      destinationSlug: query.get('destination') ?? undefined,
      placeName: query.get('place') ?? query.get('stay_name') ?? undefined
    } satisfies PlannerContext,
    from: query.get('from') ?? undefined,
    /** Every call-to-action value the link carried. */
    entry: pick(query, ENTRY_KEYS),
    /** Campaign tags on this visit (first-touch attribution is kept separately). */
    campaign: pick(query, CAMPAIGN_KEYS)
  };
};
