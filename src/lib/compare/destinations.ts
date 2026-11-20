import type { Destination } from '$lib/types';
import { toMetaText } from '../richText';
import { getTourDestinations } from '../tourDestinations';
import { list, money, score, text, type RowDef, type SectionDef } from './model';
import { fill, thumbImage, type KindConfig, type KindContext } from './shared';

/**
 * Destinations side by side, from what the CMS holds about each place:
 *
 *   · the "At a glance" quick facts an editor wrote in its guide (best for,
 *     recommended stay, works well with, travel style);
 *   · the 1–10 ratings shown on the destination-scores page;
 *   · the guide's own words on when to go, what to expect and how the place
 *     fits a route — the opening of each section, with the full text one
 *     click away on the destination's page;
 *   · what is linked to it: activities, arrival points, the safaris that
 *     visit it and the places to stay there.
 *
 * Nothing is rated, ranked or dated here that the CMS does not say.
 */

const IMAGE_FIELDS = ['main_image_url', 'image_url', 'banner_image_url'];
const EXCERPT = 280;

type GuideBlock = { title?: unknown; body?: unknown; items?: unknown };
type QuickFact = { title: string; body: string };

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const blocks = (destination: Destination): GuideBlock[] => (Array.isArray(destination.guide) ? (destination.guide as GuideBlock[]) : []);

/** The quick facts, in the order the editor wrote them. */
const quickFacts = (destination: Destination): QuickFact[] => {
  const block = blocks(destination).find((entry) => Array.isArray(entry.items) && entry.items.length);
  return ((block?.items as Array<Record<string, unknown>> | undefined) ?? [])
    .map((item) => ({ title: clean(item?.title).replace(/:$/, ''), body: toMetaText(item?.body, 200) }))
    .filter((fact) => fact.title && fact.body);
};

/**
 * One prose section of the guide. Found by what its title says; a guide in
 * another language no longer says "Best time", so a guide with the standard
 * five sections falls back to their fixed order (why, highlights, when,
 * route, tips). A guide of any other shape gives nothing rather than the
 * wrong section.
 */
const SECTIONS = {
  highlights: { match: /highlight/i, position: 1 },
  when: { match: /best time/i, position: 2 },
  route: { match: /\bfits?\b.*\b(into|in)\b/i, position: 3 }
} as const;
const prose = (destination: Destination, section: keyof typeof SECTIONS): string => {
  const written = blocks(destination).filter((entry) => !Array.isArray(entry.items) && toMetaText(entry.body, 40));
  const { match, position } = SECTIONS[section];
  const found = written.find((entry) => match.test(clean(entry.title))) ?? (written.length === 5 ? written[position] : undefined);
  return found ? toMetaText(found.body, EXCERPT) : '';
};

/** Quick-fact rows take their labels from the guides themselves: one row per position, labelled as the first guide labels it. */
const factRows = (destinations: Destination[]): RowDef<Destination>[] => {
  const all = destinations.map(quickFacts);
  const count = Math.max(0, ...all.map((facts) => facts.length));
  // Every guide that has quick facts has the same number of them: the standard
  // set, so position alone lines them up (a translated label may be worded
  // slightly differently from one guide to the next). Otherwise a fact only
  // joins a row whose label it shares.
  const standard = all.filter((facts) => facts.length).every((facts) => facts.length === count);
  return Array.from({ length: count }, (_, index): RowDef<Destination> => {
    const label = all.map((facts) => facts[index]?.title).find(Boolean) ?? '';
    return {
      id: `fact-${index}`,
      label: 'compare.sec_at_a_glance',
      labelText: label,
      get: (destination) => {
        const fact = quickFacts(destination)[index];
        return fact && (standard || fact.title.toLowerCase() === label.toLowerCase()) ? text(fact.body) : null;
      }
    };
  }).filter((row) => row.labelText);
};

const sections = (destinations: Destination[], { t, extras }: KindContext): SectionDef<Destination>[] => {
  const visiting = (destination: Destination) =>
    (extras.tours ?? []).filter((tour) => getTourDestinations(tour).some((place) => place.id === destination.id || place.slug === destination.slug));
  const lowest = (destination: Destination): number | null => {
    const prices = visiting(destination).map((tour) => Number(tour.price_from)).filter((price) => Number.isFinite(price) && price > 0);
    return prices.length ? Math.min(...prices) : null;
  };
  const count = (total: number, one: string, many: string): string => (total > 0 ? fill(t(total === 1 ? one : many), { n: total }) : '');

  return [
    {
      id: 'glance',
      title: 'compare.sec_at_a_glance',
      rows: [
        { id: 'country', label: 'compare.row_country', get: (destination) => text(destination.country) },
        { id: 'region', label: 'destination_facets.region', get: (destination) => text(destination.region) },
        ...factRows(destinations)
      ]
    },
    {
      id: 'ratings',
      title: 'compare.sec_ratings',
      rows: [
        { id: 'wildlife', label: 'destination_facets.wildlife', get: (destination) => score(destination.score_wildlife), best: 'high' },
        { id: 'luxury', label: 'tier.luxury', get: (destination) => score(destination.score_luxury), best: 'high' },
        { id: 'family', label: 'compare.row_family', get: (destination) => score(destination.score_family), best: 'high' },
        { id: 'photography', label: 'compare.row_photography', get: (destination) => score(destination.score_photography), best: 'high' },
        { id: 'adventure', label: 'compare.row_adventure', get: (destination) => score(destination.score_adventure), best: 'high' }
      ]
    },
    {
      id: 'guide',
      title: 'compare.sec_from_the_guide',
      rows: [
        { id: 'when', label: 'ui.best_time_to_visit', get: (destination) => text(prose(destination, 'when')) },
        { id: 'highlights', label: 'label.highlights', get: (destination) => text(prose(destination, 'highlights')) },
        { id: 'route', label: 'compare.row_fits_route', get: (destination) => text(prose(destination, 'route')) }
      ]
    },
    {
      id: 'doing',
      title: 'compare.sec_getting_there_doing',
      rows: [
        { id: 'activities', label: 'ui.activities', get: (destination) => list((extras.activities ?? []).filter((activity) => activity.destination_id === destination.id).map((activity) => activity.name), 8) },
        {
          id: 'arrival',
          label: 'compare.row_arrival_points',
          get: (destination) =>
            list((extras.tripPoints ?? []).filter((point) => point.destination_id === destination.id).map((point) => (point.airport_code ? `${point.name} (${point.airport_code})` : point.name)))
        }
      ]
    },
    {
      id: 'trips',
      title: 'compare.sec_trips_and_stays',
      rows: [
        { id: 'safaris', label: 'compare.row_safaris_visiting', get: (destination) => text(count(visiting(destination).length, 'compare.n_safari', 'compare.n_safaris')) },
        { id: 'from', label: 'compare.row_safaris_from', get: (destination) => money(lowest(destination)), best: 'low' },
        { id: 'budget', label: 'ui.starting_budget', get: (destination) => money(destination.score_budget_from), best: 'low' },
        { id: 'stays', label: 'compare.row_places_to_stay', get: (destination) => text(count((extras.lodges ?? []).filter((lodge) => lodge.destination_id === destination.id).length, 'compare.n_stay', 'compare.n_stays')) }
      ]
    }
  ];
};

export const destinationsKind: KindConfig<Destination> = {
  kind: 'destinations',
  nameKey: 'nav.destinations',
  titleKey: 'compare.title_destinations',
  introKey: 'compare.intro_destinations',
  addKey: 'compare.add_destination',
  browseHref: '/destinations',
  listPath: '/destinations?status=published&limit=100',
  detailPath: (key) => `/destinations/${encodeURIComponent(key)}`,
  needs: ['tours', 'lodges', 'activities', 'tripPoints'],
  keyOf: (destination) => destination.slug,
  toPick: (destination) => ({ key: destination.slug, title: destination.name, image: thumbImage(destination, IMAGE_FIELDS) }),
  toItem: (destination, { t }) => ({
    key: destination.slug,
    title: destination.name,
    subtitle: [destination.region, destination.country].filter(Boolean).join(', '),
    record: destination,
    imageFields: IMAGE_FIELDS,
    href: `/destinations/${destination.slug}`,
    hrefLabel: t('compare.read_the_guide'),
    enquire: { href: `/plan-my-trip?destination=${encodeURIComponent(destination.slug)}&from=compare`, label: t('compare.plan_trip_here') }
  }),
  sections
};
