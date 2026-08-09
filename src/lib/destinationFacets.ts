/**
 * Facets for the destinations page, derived only from data the CMS actually holds.
 *
 * Every destination carries a `guide` block whose first entry is an "At a glance"
 * list of quick facts written by the editor:
 *
 *   Best for          "Big Five & crater views"
 *   Recommended stay  "1–2 nights"
 *   Works well with   "Serengeti & Tarangire"
 *   Travel style      "Drive-in safari"
 *
 * Those strings plus the `region` column are the whole basis for filtering here.
 * Matching a destination to "Big Five" because its own quick fact says
 * "Big Five & crater views" is reading the data; assigning it a star rating or a
 * best-season window would be inventing it.
 *
 * Deliberately NOT built, because nothing in the CMS backs them:
 *   · season / best-month filters  — no month field exists. The guide has a
 *     "Best Time to Visit" section in prose, which the destination page renders.
 *   · star ratings, review counts, "500+ trips", "most popular" — no ratings or
 *     booking-volume data exists anywhere. `is_featured` is a real editorial flag
 *     and is the only badge used.
 *   · score_wildlife / score_family / etc. — columns exist but are empty on all 19.
 */
import type { Destination } from '$lib/types';
import { toMetaText } from '$lib/richText';

export type Facet = { key: string; label: string; icon: string };
export type FacetGroup = { key: string; label: string; hint: string; facets: Facet[] };

type GuideBlock = Record<string, unknown>;
type QuickFacts = Record<string, string>;

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** The "At a glance" quick facts, keyed by label. Empty when a guide is missing. */
export const quickFacts = (destination: Destination): QuickFacts => {
  const guide = Array.isArray(destination.guide) ? (destination.guide as GuideBlock[]) : [];
  const facts: QuickFacts = {};
  for (const block of guide) {
    const items = Array.isArray(block?.items) ? (block.items as Record<string, unknown>[]) : [];
    for (const item of items) {
      const label = clean(item?.title).replace(/:$/, '');
      const value = clean(item?.body);
      if (label && value && !facts[label]) facts[label] = value;
    }
  }
  return facts;
};

export const bestFor = (destination: Destination) => quickFacts(destination)['Best for'] ?? '';
export const travelStyle = (destination: Destination) => quickFacts(destination)['Travel style'] ?? '';
export const recommendedStay = (destination: Destination) => quickFacts(destination)['Recommended stay'] ?? '';
export const pairsWith = (destination: Destination) => quickFacts(destination)['Works well with'] ?? '';

/** All searchable/matchable text for one destination, lowercased. */
const haystack = (destination: Destination) => {
  const facts = quickFacts(destination);
  return [
    destination.name,
    destination.region,
    destination.country,
    toMetaText(destination.short_description, 240),
    toMetaText(destination.description, 500),
    ...Object.values(facts)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

/** Matched against "Best for" + "Travel style" only — the editor's own summary of
 *  what the place is for, rather than any word that happens to appear in prose. */
const themeText = (destination: Destination) => `${bestFor(destination)} ${travelStyle(destination)}`.toLowerCase();

const EXPERIENCE_RULES: { facet: Facet; match: RegExp }[] = [
  { facet: { key: 'safari', label: 'Safari', icon: '🦁' }, match: /safari|big cats|big five|predator|wildlife|plains|game drive|elephants|baobab|migration|calving|river crossing/ },
  { facet: { key: 'beach', label: 'Beach & islands', icon: '🏝️' }, match: /beach|swimming|sunset|kite-surfing|island|marine|coast/ },
  { facet: { key: 'trekking', label: 'Trekking', icon: '🥾' }, match: /trek|summit|mountain|walking safari/ },
  { facet: { key: 'culture', label: 'Culture & history', icon: '🏛️' }, match: /culture|cultural|history|food|village|heritage/ },
  { facet: { key: 'wilderness', label: 'Remote wilderness', icon: '🧭' }, match: /remote|wilderness|quiet|low-key|fly-in/ }
];

const WILDLIFE_RULES: { facet: Facet; match: RegExp }[] = [
  { facet: { key: 'big-five', label: 'Big Five', icon: '🦏' }, match: /big five/ },
  { facet: { key: 'big-cats', label: 'Big cats', icon: '🐆' }, match: /big cats|predator/ },
  { facet: { key: 'migration', label: 'Great Migration', icon: '🦓' }, match: /migration|calving|river crossing/ },
  { facet: { key: 'elephants', label: 'Elephants', icon: '🐘' }, match: /elephant/ },
  { facet: { key: 'birdlife', label: 'Birdlife', icon: '🦩' }, match: /bird/ },
  { facet: { key: 'marine', label: 'Marine life', icon: '🐋' }, match: /marine|whale|reef|snorkel|diving/ },
  { facet: { key: 'walking', label: 'Walking safari', icon: '👣' }, match: /walking safari/ }
];

/** Minimum nights implied by "Recommended stay". "Half day–1 night" → 0. */
export const minNights = (destination: Destination): number | null => {
  const raw = recommendedStay(destination).toLowerCase();
  if (!raw) return null;
  if (/half day|day trip/.test(raw)) return 0;
  const match = raw.match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? (/(day)/.test(raw) && !/night/.test(raw) ? n : n) : null;
};

const DURATION_RULES: { facet: Facet; match: (destination: Destination) => boolean }[] = [
  { facet: { key: 'short', label: 'Day trip – 1 night', icon: '⏱️' }, match: (d) => (minNights(d) ?? -1) <= 1 && minNights(d) !== null },
  { facet: { key: 'mid', label: '2 – 4 nights', icon: '📆' }, match: (d) => { const n = minNights(d); return n !== null && n >= 2 && n <= 4; } },
  { facet: { key: 'long', label: '5 nights +', icon: '🗓️' }, match: (d) => (minNights(d) ?? 0) >= 5 }
];

export const experiencesOf = (destination: Destination) =>
  EXPERIENCE_RULES.filter((rule) => rule.match.test(themeText(destination))).map((rule) => rule.facet);

export const wildlifeOf = (destination: Destination) =>
  WILDLIFE_RULES.filter((rule) => rule.match.test(themeText(destination))).map((rule) => rule.facet);

export const durationOf = (destination: Destination) =>
  DURATION_RULES.filter((rule) => rule.match(destination)).map((rule) => rule.facet);

export const regionOf = (destination: Destination) => clean(destination.region);

/** Groups are built from the supplied destinations, so a facet never appears
 *  unless at least one real destination matches it. */
export const buildFacetGroups = (destinations: Destination[]): FacetGroup[] => {
  const used = (facets: (d: Destination) => Facet[]) => {
    const seen = new Map<string, Facet>();
    for (const destination of destinations) for (const facet of facets(destination)) seen.set(facet.key, facet);
    return [...seen.values()];
  };

  const regions = [...new Set(destinations.map(regionOf).filter(Boolean))]
    .sort()
    .map((region) => ({ key: region, label: region, icon: '📍' }));

  return [
    { key: 'experience', label: 'Experience', hint: 'What kind of trip is this?', facets: used(experiencesOf) },
    { key: 'region', label: 'Region', hint: 'Where in the country?', facets: regions },
    { key: 'wildlife', label: 'Wildlife', hint: 'What do you want to see?', facets: used(wildlifeOf) },
    { key: 'duration', label: 'Length of stay', hint: 'How long do you have?', facets: used(durationOf) }
  ].filter((group) => group.facets.length > 1);
};

export const matchesFacet = (destination: Destination, groupKey: string, facetKey: string): boolean => {
  if (!facetKey) return true;
  if (groupKey === 'region') return regionOf(destination) === facetKey;
  if (groupKey === 'experience') return experiencesOf(destination).some((f) => f.key === facetKey);
  if (groupKey === 'wildlife') return wildlifeOf(destination).some((f) => f.key === facetKey);
  if (groupKey === 'duration') return durationOf(destination).some((f) => f.key === facetKey);
  return true;
};

export const matchesSearch = (destination: Destination, term: string) => {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  return query.split(/\s+/).every((word) => haystack(destination).includes(word));
};

export const countFor = (destinations: Destination[], groupKey: string, facetKey: string) =>
  destinations.filter((destination) => matchesFacet(destination, groupKey, facetKey)).length;

/** Editorial collections for the discovery rails. Each is a real query over real
 *  fields — an empty one is simply not rendered. */
export const collectionsOf = (destinations: Destination[]) =>
  [
    { key: 'featured', title: 'Featured by our specialists', blurb: 'The places our planners return to most.', items: destinations.filter((d) => d.is_featured) },
    { key: 'safari', title: 'Classic safari country', blurb: 'Parks and plains built around game viewing.', items: destinations.filter((d) => matchesFacet(d, 'experience', 'safari')) },
    { key: 'beach', title: 'Coast & islands', blurb: 'Where a safari slows down into sea air.', items: destinations.filter((d) => matchesFacet(d, 'experience', 'beach')) },
    { key: 'migration', title: 'Following the migration', blurb: 'Calving, crossings and the herds in motion.', items: destinations.filter((d) => matchesFacet(d, 'wildlife', 'migration')) },
    { key: 'quiet', title: 'Quieter corners', blurb: 'Remote camps and long horizons.', items: destinations.filter((d) => matchesFacet(d, 'experience', 'wilderness')) }
  ].filter((collection) => collection.items.length >= 2);
