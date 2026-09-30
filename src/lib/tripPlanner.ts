/**
 * The logic behind /plan-my-trip — what to ask, what to suggest, and what the
 * specialist receives. Kept out of the page so the page is only layout.
 *
 * Recommendations are built from the published tours themselves: the places
 * each one visits, its length, its price, who it is written for and its
 * minimum age. Nothing here invents a trip, a price or a rating — a trip type
 * the catalogue cannot back is not offered, and a request with no packaged
 * match says so and goes to a specialist as a custom plan.
 */
import type { Tour } from '$lib/types';

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

const categorySlug = (tour: PlannerTour) => String(tour.tour_categories?.slug ?? '');

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

// ── Trip types, each tied to the data that can back it ─────────────────────────

export type TypeId = 'safari' | 'beach' | 'culture' | 'primates';

type TripType = {
  id: TypeId;
  label: string;
  desc: string;
  /** Categories that sell this kind of trip — a published one keeps the option on offer. */
  categories: string[];
  /** Does a tour include this kind of trip? */
  matches: (tour: PlannerTour) => boolean;
};

const PARK = /national-park|crater|serengeti|ndutu|tarangire|manyara|nyerere|selous|mikumi|ruaha|katavi/;

export const TRIP_TYPES: TripType[] = [
  {
    id: 'safari',
    label: 'Safari',
    desc: 'Serengeti, Ngorongoro, Tarangire & more',
    categories: [],
    matches: (tour) => placesOf(tour).some((p) => PARK.test(p.slug)) || categorySlug(tour).includes('safari')
  },
  {
    id: 'beach',
    label: 'Zanzibar beach',
    desc: 'White sand, Stone Town, ocean days',
    categories: ['safari-and-beach-holidays', 'zanzibar-beach-holidays'],
    matches: (tour) =>
      placesOf(tour).some((p) => /zanzibar|beach/.test(p.slug)) || /beach/.test(categorySlug(tour))
  },
  {
    id: 'culture',
    label: 'Culture & villages',
    desc: 'Maasai, Mto wa Mbu, local life',
    categories: ['tanzania-cultural-experiences'],
    matches: (tour) =>
      /cultur/.test(categorySlug(tour)) ||
      /cultur|village|maasai/i.test(String(tour.title ?? '')) ||
      (tour.persona_tags ?? []).some((tag) => /cultur/i.test(tag))
  },
  {
    id: 'primates',
    label: 'Gorillas & chimps',
    desc: 'Uganda, Rwanda, Gombe trekking',
    categories: ['gorilla-trekking-tours', 'chimp-trekking-tours'],
    matches: (tour) =>
      /gorilla|chimp/.test(categorySlug(tour)) || placesOf(tour).some((p) => /gombe|mahale|bwindi|volcanoes/.test(p.slug))
  }
];

export const typeOf = (id: TypeId) => TRIP_TYPES.find((type) => type.id === id)!;

/** Only the trip types the site can actually deliver: a tour includes it, or a published style sells it. */
export const offeredTypes = (tours: PlannerTour[], categorySlugs: string[]): TripType[] =>
  TRIP_TYPES.filter(
    (type) => tours.some(type.matches) || type.categories.some((slug) => categorySlugs.includes(slug))
  );

// ── Lengths ────────────────────────────────────────────────────────────────────

export const LENGTHS: Record<TypeId, string[]> = {
  safari: ['1–2 days', '3–4 days', '5–7 days', '8+ days'],
  beach: ['2–3 nights', '4–5 nights', '6–7 nights', '8+ nights'],
  culture: ['Half day', '1 day', '2–3 days'],
  primates: ['2–3 days', '4–5 days', '6+ days']
};

/** "5–7 days" → [5, 7]; "8+ days" → [8, 10]; "Half day" → [0.5, 0.5]. */
const bandRange = (band: string): [number, number] => {
  if (band === 'Half day') return [0.5, 0.5];
  const [lo, hi] = band.split('–').map((part) => parseInt(part, 10));
  if (band.includes('+')) return [lo, lo + 2];
  return [lo, Number.isFinite(hi) ? hi : lo];
};

export const bandDays = (band?: string): number => {
  if (!band) return 0;
  const [lo, hi] = bandRange(band);
  return (lo + hi) / 2;
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

// ── Travellers, dates, style ───────────────────────────────────────────────────

export const PARTIES = [
  { id: 'solo', label: 'Solo' },
  { id: 'partner', label: 'Partner' },
  { id: 'family', label: 'Family' },
  { id: 'group', label: 'Group' }
] as const;
export type Party = (typeof PARTIES)[number]['id'];

export const COMFORT = [
  { id: 'Value', desc: 'Comfortable tented camps & lodges, great guiding' },
  { id: 'Mid-range', desc: 'Well-located lodges with pools and views' },
  { id: 'Luxury', desc: 'Top camps, private vehicle, exclusive locations' }
] as const;

/** Per person, in USD; shown in the visitor's chosen currency. */
export const BUDGETS: Array<{ id: string; min: number; max: number }> = [
  { id: 'under-2000', min: 0, max: 2000 },
  { id: '2000-4000', min: 2000, max: 4000 },
  { id: '4000-7000', min: 4000, max: 7000 },
  { id: '7000-plus', min: 7000, max: Infinity }
];

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

// ── The answers ────────────────────────────────────────────────────────────────

export type Draft = {
  types: TypeId[];
  party: Party | '';
  adults: number;
  children: number;
  year: number;
  month: number;
  lengths: Partial<Record<TypeId, string>>;
  comfort: string;
  budget: string;
  notes: string;
};

export const travellers = (d: Draft) => ({
  adults: d.party === 'solo' ? 1 : d.party === 'partner' ? 2 : d.adults,
  children: d.party === 'family' || d.party === 'group' ? d.children : 0
});

export const totalDays = (d: Draft) => Math.round(d.types.reduce((sum, type) => sum + bandDays(d.lengths[type]), 0));

// ── Expert tips ────────────────────────────────────────────────────────────────

export const insights = (d: Draft): string[] => {
  const out: string[] = [];
  const has = (type: TypeId) => d.types.includes(type);
  if (has('safari') && has('beach'))
    out.push('Safari first, beach last is the classic flow — you end the trip relaxed, and short flights link Arusha or the Serengeti to Zanzibar.');
  if (has('primates') && has('safari'))
    out.push("Gorilla trekking is in Uganda or Rwanda — we'd add a regional flight and plan 2–3 extra days.");
  if (has('safari') && [6, 7, 8].includes(d.month))
    out.push('Your month overlaps river-crossing season — northern Serengeti camps are ideal.');
  if (has('safari') && [0, 1].includes(d.month))
    out.push("January–February is calving season: we'd base you in Ndutu for predator action.");
  if ([3, 4].includes(d.month))
    out.push('April–May is green season: lower prices and quiet parks, but some remote camps close.');
  if (travellers(d).children > 0)
    out.push("Family-friendly lodges with pools and family rooms suit your group well; some camps have minimum ages, and we'll check them against your children's ages.");
  if (d.party === 'partner' && d.comfort === 'Luxury')
    out.push('Sounds like a honeymoon-style trip — ask us about private dinners and balloon safaris.');
  const safariDays = bandDays(d.lengths.safari);
  if (has('safari') && safariDays > 0 && safariDays <= 2)
    out.push('With 1–2 safari days, fly-in routes from Zanzibar to Nyerere or Mikumi maximise game time.');
  if (safariDays >= 7)
    out.push('A week or more lets you combine Tarangire, Ngorongoro and a deep Serengeti stay without rushing.');
  if (SEASON[d.month] === 'Peak')
    out.push('Peak season — the best lodges fill 6–9 months ahead, so an early request helps.');
  return out.slice(0, 3);
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

const COMFORT_TIER: Record<string, string> = { Value: 'budget', 'Mid-range': 'mid_range', Luxury: 'luxury' };

export const recommend = (
  d: Draft,
  tours: PlannerTour[],
  context: PlannerContext = {},
  formatPrice: (usd: number) => string = (usd) => `$${usd.toLocaleString()}`
): Recommendation[] => {
  if (!d.types.length) return [];
  const target = totalDays(d);
  const budget = BUDGETS.find((band) => band.id === d.budget);

  const scored = tours.map((tour) => {
    const reasons: string[] = [];
    const typesHit = d.types.filter((type) => typeOf(type).matches(tour));
    if (!typesHit.length) return { tour, score: -Infinity, reasons };
    let score = typesHit.length * 3;

    const places = placesOf(tour);
    const named = places.filter((p) => PARK.test(p.slug) || /zanzibar|kilimanjaro/.test(p.slug)).slice(0, 3);

    const days = Number(tour.duration_days ?? 0);
    if (target && days) {
      score -= Math.abs(days - target) * 0.6;
      if (Math.abs(days - target) <= 1) reasons.push(`${days} days — about the length you want`);
    }

    const price = Number(tour.price_from ?? 0);
    if (budget && price) {
      if (price <= budget.max && price >= budget.min * 0.8) {
        score += 2;
        reasons.push(`From ${formatPrice(price)} per person — within your budget`);
      } else if (price > budget.max) {
        score -= 2;
      }
    }

    if (d.party && (tour.persona_tags ?? []).some((tag) => personaParty(tag) === d.party)) {
      score += 1.5;
      reasons.push(`Suits ${PARTIES.find((p) => p.id === d.party)!.label.toLowerCase()} travellers`);
    }

    if (d.comfort && tour.budget_tier === COMFORT_TIER[d.comfort]) score += 1;

    if (/migration/.test(categorySlug(tour)) && [0, 1, 6, 7, 8, 9].includes(d.month)) {
      score += 1;
      reasons.push(`Timed for the migration in ${MONTH_NAMES[d.month]}`);
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

const EXPERIENCE: Record<string, TypeId> = {
  safari: 'safari',
  beach: 'beach',
  zanzibar: 'beach',
  cultural: 'culture',
  culture: 'culture',
  gorilla: 'primates',
  chimp: 'primates',
  primates: 'primates'
};
const PERSONA: Record<string, Party> = { solo: 'solo', couple: 'partner', partner: 'partner', family: 'family', group: 'group' };

/** Reads the query strings the rest of the site already links here with. */
export const fromQuery = (query: URLSearchParams, now = new Date()) => {
  const type = EXPERIENCE[String(query.get('experience') ?? '').toLowerCase()];
  const party = PERSONA[String(query.get('persona') ?? '').toLowerCase()];
  let year: number | undefined;
  let month: number | undefined;
  const raw = String(query.get('month') ?? '');
  const iso = raw.match(/^(\d{4})-(\d{2})/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]) - 1;
  } else if (raw) {
    const index = MONTH_NAMES.findIndex((name) => name.toLowerCase().startsWith(raw.toLowerCase().slice(0, 3)));
    if (index >= 0) {
      month = index;
      year = index < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
    }
  }
  return {
    types: type ? [type] : [],
    party: party ?? '',
    year,
    month,
    context: {
      tourSlug: query.get('tour') ?? undefined,
      destinationSlug: query.get('destination') ?? undefined,
      placeName: query.get('place') ?? undefined
    } satisfies PlannerContext,
    from: query.get('from') ?? undefined
  };
};
