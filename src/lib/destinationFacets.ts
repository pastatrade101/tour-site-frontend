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
import en from '$lib/locales/en.json';

export type Facet = { key: string; label: string; icon: string };
export type FacetGroup = { key: string; label: string; hint: string; facets: Facet[] };

/**
 * Interface copy here is stored as i18n keys and resolved by a translator the
 * caller passes in — `$t` from '$lib/i18n/ui' — so labels follow the visitor's
 * language and re-run when it changes. Without one, the English dictionary is
 * used (for callers that only compare facet keys).
 */
export type Translate = (key: string) => string;
const english: Translate = (key) => (en as Record<string, string>)[key] ?? key;

type FacetRule = { key: string; labelKey: string; icon: string };
const toFacet = (rule: FacetRule, tr: Translate): Facet => ({ key: rule.key, label: tr(rule.labelKey), icon: rule.icon });

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

const EXPERIENCE_RULES: { facet: FacetRule; match: RegExp }[] = [
  { facet: { key: 'safari', labelKey: 'destination_facets.safari', icon: '🦁' }, match: /safari|big cats|big five|predator|wildlife|plains|game drive|elephants|baobab|migration|calving|river crossing/ },
  { facet: { key: 'beach', labelKey: 'destination_facets.beach_islands', icon: '🏝️' }, match: /beach|swimming|sunset|kite-surfing|island|marine|coast/ },
  { facet: { key: 'trekking', labelKey: 'destination_facets.trekking', icon: '🥾' }, match: /trek|summit|mountain|walking safari/ },
  { facet: { key: 'culture', labelKey: 'destination_facets.culture_history', icon: '🏛️' }, match: /culture|cultural|history|food|village|heritage/ },
  { facet: { key: 'wilderness', labelKey: 'destination_facets.remote_wilderness', icon: '🧭' }, match: /remote|wilderness|quiet|low-key|fly-in/ }
];

const WILDLIFE_RULES: { facet: FacetRule; match: RegExp }[] = [
  { facet: { key: 'big-five', labelKey: 'destination_facets.big_five', icon: '🦏' }, match: /big five/ },
  { facet: { key: 'big-cats', labelKey: 'destination_facets.big_cats', icon: '🐆' }, match: /big cats|predator/ },
  { facet: { key: 'migration', labelKey: 'destination_facets.great_migration', icon: '🦓' }, match: /migration|calving|river crossing/ },
  { facet: { key: 'elephants', labelKey: 'destination_facets.elephants', icon: '🐘' }, match: /elephant/ },
  { facet: { key: 'birdlife', labelKey: 'destination_facets.birdlife', icon: '🦩' }, match: /bird/ },
  { facet: { key: 'marine', labelKey: 'destination_facets.marine_life', icon: '🐋' }, match: /marine|whale|reef|snorkel|diving/ },
  { facet: { key: 'walking', labelKey: 'destination_facets.walking_safari', icon: '👣' }, match: /walking safari/ }
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

const DURATION_RULES: { facet: FacetRule; match: (destination: Destination) => boolean }[] = [
  { facet: { key: 'short', labelKey: 'destination_facets.duration_short', icon: '⏱️' }, match: (d) => (minNights(d) ?? -1) <= 1 && minNights(d) !== null },
  { facet: { key: 'mid', labelKey: 'destination_facets.duration_mid', icon: '📆' }, match: (d) => { const n = minNights(d); return n !== null && n >= 2 && n <= 4; } },
  { facet: { key: 'long', labelKey: 'destination_facets.duration_long', icon: '🗓️' }, match: (d) => (minNights(d) ?? 0) >= 5 }
];

export const experiencesOf = (destination: Destination, tr: Translate = english) =>
  EXPERIENCE_RULES.filter((rule) => rule.match.test(themeText(destination))).map((rule) => toFacet(rule.facet, tr));

export const wildlifeOf = (destination: Destination, tr: Translate = english) =>
  WILDLIFE_RULES.filter((rule) => rule.match.test(themeText(destination))).map((rule) => toFacet(rule.facet, tr));

export const durationOf = (destination: Destination, tr: Translate = english) =>
  DURATION_RULES.filter((rule) => rule.match(destination)).map((rule) => toFacet(rule.facet, tr));

export const regionOf = (destination: Destination) => clean(destination.region);

/** Groups are built from the supplied destinations, so a facet never appears
 *  unless at least one real destination matches it. Pass `$t` as `tr`. */
export const buildFacetGroups = (destinations: Destination[], tr: Translate = english): FacetGroup[] => {
  const used = (facets: (d: Destination, tr: Translate) => Facet[]) => {
    const seen = new Map<string, Facet>();
    for (const destination of destinations) for (const facet of facets(destination, tr)) seen.set(facet.key, facet);
    return [...seen.values()];
  };

  // Region names are CMS data, not interface copy, so they are shown as stored.
  const regions = [...new Set(destinations.map(regionOf).filter(Boolean))]
    .sort()
    .map((region) => ({ key: region, label: region, icon: '📍' }));

  return [
    { key: 'experience', label: tr('hero.experience'), hint: tr('destination_facets.experience_hint'), facets: used(experiencesOf) },
    { key: 'region', label: tr('destination_facets.region'), hint: tr('destination_facets.region_hint'), facets: regions },
    { key: 'wildlife', label: tr('destination_facets.wildlife'), hint: tr('destination_facets.wildlife_hint'), facets: used(wildlifeOf) },
    { key: 'duration', label: tr('destination_facets.length_of_stay'), hint: tr('destination_facets.length_of_stay_hint'), facets: used(durationOf) }
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
 *  fields — an empty one is simply not rendered. Pass `$t` as `tr`. */
export const collectionsOf = (destinations: Destination[], tr: Translate = english) =>
  [
    { key: 'featured', title: tr('destination_facets.featured_title'), blurb: tr('destination_facets.featured_blurb'), items: destinations.filter((d) => d.is_featured) },
    { key: 'safari', title: tr('destination_facets.safari_title'), blurb: tr('destination_facets.safari_blurb'), items: destinations.filter((d) => matchesFacet(d, 'experience', 'safari')) },
    { key: 'beach', title: tr('destination_facets.beach_title'), blurb: tr('destination_facets.beach_blurb'), items: destinations.filter((d) => matchesFacet(d, 'experience', 'beach')) },
    { key: 'migration', title: tr('destination_facets.migration_title'), blurb: tr('destination_facets.migration_blurb'), items: destinations.filter((d) => matchesFacet(d, 'wildlife', 'migration')) },
    { key: 'quiet', title: tr('destination_facets.quiet_title'), blurb: tr('destination_facets.quiet_blurb'), items: destinations.filter((d) => matchesFacet(d, 'experience', 'wilderness')) }
  ].filter((collection) => collection.items.length >= 2);
