import type { Tour } from '$lib/types';
import { activityKind, splitList, type ActivityKind } from '../itineraryDisplay';
import { toPlainText } from '../richText';
import { getTourDestinations } from '../tourDestinations';
import { list, money, text, type SectionDef } from './model';
import { fill, thumbImage, translated, words, type KindConfig, type KindContext, type Translate } from './shared';

/**
 * Safaris side by side. A card carries a price and a length; it cannot carry
 * what actually decides between two trips: where you sleep, how you travel,
 * what you do and what the price covers. Every cell is the safari's own data.
 */

const IMAGE_FIELDS = ['main_image_url', 'banner_image_url'];

const length = (tour: Tour, t: Translate): string => {
  const days = Number(tour.duration_days) || 0;
  const nights = Number(tour.duration_nights) || 0;
  if (!days) return '';
  const dayPart = `${days} ${t(days === 1 ? 'label.day' : 'label.days')}`;
  return nights ? `${dayPart} / ${nights} ${t(nights === 1 ? 'label.night' : 'label.nights')}` : dayPart;
};

const groupSize = (tour: Tour, t: Translate): string => {
  const min = Number(tour.group_size_min) || 0;
  const max = Number(tour.group_size_max) || 0;
  if (min && max) return min === max ? `${min} ${t('ui.people')}` : `${min}–${max} ${t('ui.people')}`;
  if (max) return `${t('ui.up_to')} ${max} ${t('ui.people')}`;
  return String(tour.group_size ?? '').trim();
};

/** Where the trip sleeps: the linked property when a day has one, otherwise what the editor typed. */
const stays = (tour: Tour): string[] =>
  (tour.itinerary_days ?? []).map((day) => day.lodge?.name || day.accommodation || '').filter(Boolean);

/**
 * What you do on the trip, read from the itinerary's own activity lines and
 * grouped by kind, so "Sunrise game drive" on one safari and "Afternoon game
 * drive" on another line up as the same thing. Meals, flights and lines the
 * words do not place (transfers, check-ins) are not activities and are left out.
 */
const ACTIVITY_LABELS: Partial<Record<ActivityKind, string>> = {
  drive: 'compare.act_game_drives',
  walk: 'compare.act_walking',
  boat: 'compare.act_boat',
  birds: 'compare.act_birding',
  culture: 'compare.act_culture',
  beach: 'compare.act_beach'
};
const activities = (tour: Tour, t: Translate): string[] => {
  const kinds = new Set<ActivityKind>();
  for (const day of tour.itinerary_days ?? []) {
    for (const line of splitList(day.activities)) kinds.add(activityKind(line));
  }
  return (Object.keys(ACTIVITY_LABELS) as ActivityKind[]).filter((kind) => kinds.has(kind)).map((kind) => t(ACTIVITY_LABELS[kind]!));
};

const TRAVEL_MODES: Record<string, string> = { DRIVE: 'ui.route_leg_drive', FLY: 'ui.route_leg_fly', BOAT: 'ui.route_leg_boat' };

const titles = (rows: Array<{ title: string; sort_order?: number }> | undefined): string[] =>
  [...(rows ?? [])].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)).map((row) => toPlainText(row.title));

const sections = (_tours: Tour[], { t }: KindContext): SectionDef<Tour>[] => [
  {
    id: 'glance',
    title: 'compare.sec_at_a_glance',
    rows: [
      { id: 'price', label: 'compare.row_price_pp', get: (tour) => money(tour.price_from), best: 'low' },
      { id: 'length', label: 'label.duration', get: (tour) => text(length(tour, t)) },
      { id: 'style', label: 'compare.row_safari_style', get: (tour) => text(tour.tour_categories?.name) },
      { id: 'comfort', label: 'compare.row_comfort', get: (tour) => (tour.budget_tier ? text(translated(t, `tier.${String(tour.budget_tier).toLowerCase()}`, tour.budget_tier)) : null) },
      { id: 'group', label: 'ui.group_size', get: (tour) => text(groupSize(tour, t)) },
      { id: 'start', label: 'compare.row_starts_in', get: (tour) => text(tour.start_location) },
      { id: 'end', label: 'compare.row_ends_in', get: (tour) => text(tour.end_location) }
    ]
  },
  {
    id: 'route',
    title: 'compare.sec_route_stays',
    rows: [
      { id: 'places', label: 'compare.row_where_you_go', get: (tour) => list(getTourDestinations(tour).map((place) => place.name)) },
      { id: 'stays', label: 'compare.row_where_you_sleep', get: (tour) => list(stays(tour)) },
      { id: 'travel', label: 'compare.row_getting_around', get: (tour) => list((tour.itinerary_days ?? []).map((day) => (day.travel_mode && TRAVEL_MODES[day.travel_mode] ? t(TRAVEL_MODES[day.travel_mode]) : ''))) },
      { id: 'activities', label: 'ui.activities', get: (tour) => list(activities(tour, t)) }
    ]
  },
  {
    id: 'suits',
    title: 'compare.sec_who_it_suits',
    rows: [
      { id: 'ideal', label: 'compare.row_ideal_for', get: (tour) => list((tour.persona_tags ?? []).map(words)) },
      { id: 'difficulty', label: 'ui.difficulty', get: (tour) => (tour.difficulty_level ? text(translated(t, `difficulty.${String(tour.difficulty_level).trim().toLowerCase()}`, tour.difficulty_level)) : null) },
      { id: 'age', label: 'ui.minimum_age', get: (tour) => (Number(tour.minimum_age) > 0 ? text(fill(t('compare.from_n_years'), { n: Number(tour.minimum_age) })) : null) }
    ]
  },
  {
    id: 'highlights',
    title: 'label.highlights',
    rows: [{ id: 'highlights', label: 'compare.row_moments', get: (tour) => list((tour.highlights ?? []).map((entry) => toPlainText(entry)), 6) }]
  },
  {
    id: 'covers',
    title: 'compare.sec_price_covers',
    rows: [
      { id: 'included', label: 'ui.included', get: (tour) => list(titles(tour.tour_inclusions)) },
      { id: 'excluded', label: 'ui.not_included', get: (tour) => list(titles(tour.tour_exclusions)) }
    ]
  }
];

export const toursKind: KindConfig<Tour> = {
  kind: 'tours',
  nameKey: 'compare.kind_tours',
  titleKey: 'compare.title_tours',
  introKey: 'compare.intro_tours',
  addKey: 'compare.add_tour',
  browseHref: '/tours',
  listPath: '/tours?status=published&limit=100',
  detailPath: (key) => `/tours/${encodeURIComponent(key)}`,
  needs: [],
  keyOf: (tour) => tour.slug,
  toPick: (tour) => ({ key: tour.slug, title: tour.title, image: thumbImage(tour, IMAGE_FIELDS) }),
  toItem: (tour, { t }) => ({
    key: tour.slug,
    title: tour.title,
    subtitle: getTourDestinations(tour).slice(0, 3).map((place) => place.name).join(' · '),
    record: tour,
    imageFields: IMAGE_FIELDS,
    href: `/tours/${tour.slug}`,
    hrefLabel: t('compare.see_full_itinerary'),
    enquire: { href: `/plan-my-trip?tour=${encodeURIComponent(tour.slug)}&from=compare`, label: t('ui.plan_this_trip_2') }
  }),
  sections
};
