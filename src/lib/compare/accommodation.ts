import type { Lodge } from '$lib/types';
import { toMetaText } from '../richText';
import { flag, list, money, text, type Cell, type SectionDef } from './model';
import { fill, firstImage, thumbImage, translated, words, type KindConfig, type KindContext, type Translate } from './shared';

/**
 * Places to stay side by side: where each one is, what kind of place it is,
 * what it has, its rooms and what you can do from it.
 *
 * Most properties were imported with a name, a type, a comfort level and a
 * description, and little else. Rows about facilities, rooms and experiences
 * therefore appear only for properties an editor has filled in, and say "not
 * stated" for the rest — never a guess.
 */

const IMAGE_FIELDS = ['image_url', 'hero_image_url', 'cover_image_url'];

/**
 * A property's own picture, or — for the few that have only a gallery — its
 * cover photograph. The list endpoint attaches that cover itself; a single
 * record carries the gallery instead.
 */
const galleryCover = (lodge: Lodge): string => {
  const gallery = lodge.images ?? [];
  const cover = gallery.find((image) => image.is_cover && image.image_url) ?? gallery.find((image) => image.image_url);
  return cover?.image_url ?? '';
};
const picture = (lodge: Lodge): string => thumbImage(lodge, IMAGE_FIELDS) || galleryCover(lodge);

const propertyType = (lodge: Lodge, t: Translate): string =>
  lodge.lodge_type ? translated(t, `ui.${String(lodge.lodge_type).toLowerCase()}`, lodge.lodge_type) : '';

const comfort = (lodge: Lodge, t: Translate): string =>
  lodge.accommodation_level ? translated(t, `tier.${String(lodge.accommodation_level).toLowerCase()}`, lodge.accommodation_level) : '';

/** A stored choice (LIMITED_HOURS) or text an editor typed, shown readably either way. */
const choice = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  return /^[A-Z0-9_]+$/.test(raw) ? words(raw) : raw;
};

/**
 * Yes, only when the record says yes. These columns default to "no" in the
 * database, so a "no" is as likely to mean nobody has answered as it is to
 * mean no — and printing it would be stating something the CMS never said.
 */
const yes = (value: unknown): Cell | null => (value === true ? flag(true) : null);

const children = (lodge: Lodge, t: Translate): Cell | null => {
  if (lodge.children_allowed !== true) return null;
  const age = Number(lodge.minimum_child_age) || 0;
  return age > 0 ? text(fill(t('compare.from_n_years'), { n: age })) : flag(true);
};

const nights = (lodge: Lodge, t: Translate): string => {
  const count = Number(lodge.recommended_nights) || 0;
  return count ? `${count} ${t(count === 1 ? 'label.night' : 'label.nights')}` : '';
};

const sections = (_lodges: Lodge[], { t }: KindContext): SectionDef<Lodge>[] => [
  {
    id: 'location',
    title: 'compare.sec_location',
    rows: [
      { id: 'destination', label: 'filter.destination', get: (lodge) => text(lodge.destinations?.name) },
      { id: 'country', label: 'compare.row_country', get: (lodge) => text(lodge.country) },
      { id: 'region', label: 'destination_facets.region', get: (lodge) => text(lodge.region) },
      { id: 'park', label: 'compare.row_park_area', get: (lodge) => text(lodge.park_area) },
      { id: 'setting', label: 'compare.row_setting', get: (lodge) => list((lodge.settings ?? []).map(choice)) }
    ]
  },
  {
    id: 'category',
    title: 'ui.category',
    rows: [
      { id: 'comfort', label: 'compare.row_comfort', get: (lodge) => text(comfort(lodge, t)) },
      { id: 'type', label: 'compare.row_property_type', get: (lodge) => text(propertyType(lodge, t)) },
      { id: 'best_for', label: 'ui.best_for', get: (lodge) => list((lodge.best_for ?? []).map(choice)) }
    ]
  },
  {
    id: 'facilities',
    title: 'compare.sec_facilities',
    rows: [
      { id: 'amenities', label: 'compare.sec_facilities', get: (lodge) => list((lodge.amenities ?? []).map((amenity) => amenity.name), 12) },
      { id: 'wifi', label: 'compare.row_wifi', get: (lodge) => text(choice(lodge.wifi_availability)) },
      { id: 'power', label: 'compare.row_electricity', get: (lodge) => text(choice(lodge.electricity_availability)) },
      { id: 'children', label: 'ui.children', get: (lodge) => children(lodge, t) },
      { id: 'family', label: 'compare.row_family_friendly', get: (lodge) => yes(lodge.family_friendly) },
      { id: 'honeymoon', label: 'compare.row_honeymoon', get: (lodge) => yes(lodge.honeymoon_friendly) },
      { id: 'wheelchair', label: 'compare.row_wheelchair', get: (lodge) => yes(lodge.wheelchair_accessible) }
    ]
  },
  {
    id: 'rooms',
    title: 'compare.sec_rooms',
    rows: [
      { id: 'room_types', label: 'compare.row_room_types', get: (lodge) => list((lodge.rooms ?? []).map((room) => room.name), 8) },
      { id: 'beds', label: 'compare.row_beds', get: (lodge) => list((lodge.rooms ?? []).flatMap((room) => room.bed_types ?? []).map(choice)) }
    ]
  },
  {
    id: 'experiences',
    title: 'compare.sec_experiences',
    rows: [{ id: 'experiences', label: 'compare.row_experiences', get: (lodge) => list((lodge.experiences ?? []).map((experience) => experience.name), 10) }]
  },
  {
    id: 'access',
    title: 'pg_destinations_slug.getting_there',
    rows: [
      { id: 'airport', label: 'compare.row_nearest_airport', get: (lodge) => text(lodge.nearest_airport) },
      { id: 'transfer', label: 'compare.row_transfer_time', get: (lodge) => text(lodge.transfer_time) },
      { id: 'fly_in', label: 'compare.row_fly_in', get: (lodge) => yes(lodge.fly_in_available) },
      { id: 'road', label: 'compare.row_road_access', get: (lodge) => text(choice(lodge.road_accessibility)) }
    ]
  },
  {
    id: 'planning',
    title: 'compare.sec_planning',
    rows: [
      { id: 'nights', label: 'compare.row_recommended_nights', get: (lodge) => text(nights(lodge, t)) },
      { id: 'months', label: 'compare.row_best_months', get: (lodge) => list((lodge.best_months ?? []).map(choice)) },
      { id: 'rate', label: 'compare.row_price_night', get: (lodge) => money(lodge.price_per_night_from), best: 'low' },
      // Only safaris whose itinerary really stays here: the API never guesses from the area.
      { id: 'safaris', label: 'compare.row_safaris_staying', get: (lodge) => list((lodge.featured_in_tours ?? []).map((tour) => tour.title), 5) }
    ]
  },
  {
    id: 'why',
    title: 'compare.sec_in_our_words',
    rows: [{ id: 'why', label: 'compare.row_why_recommend', get: (lodge) => text(toMetaText(lodge.why_we_recommend ?? '', 260)) }]
  }
];

const enquireHref = (lodge: Lodge): string =>
  `/plan-my-trip?${new URLSearchParams({
    stay: lodge.slug,
    stay_name: lodge.name,
    stay_id: lodge.id,
    stay_type: lodge.lodge_type ?? '',
    ...(lodge.destinations?.name ? { place: lodge.destinations.name } : {}),
    from: 'compare'
  }).toString()}`;

export const accommodationKind: KindConfig<Lodge> = {
  kind: 'accommodation',
  nameKey: 'nav.accommodation',
  titleKey: 'compare.title_accommodation',
  introKey: 'compare.intro_accommodation',
  addKey: 'compare.add_stay',
  browseHref: '/accommodation',
  listPath: '/lodges?status=published&show_property_publicly=true&limit=100',
  detailPath: (key) => `/lodges/${encodeURIComponent(key)}`,
  needs: [],
  keyOf: (lodge) => lodge.slug,
  toPick: (lodge) => ({ key: lodge.slug, title: lodge.name, image: picture(lodge) }),
  toItem: (lodge, { t }) => ({
    key: lodge.slug,
    title: lodge.name,
    subtitle: [propertyType(lodge, t), lodge.destinations?.name ?? ''].filter(Boolean).join(' · '),
    record: lodge,
    imageFields: IMAGE_FIELDS,
    ...(firstImage(lodge, IMAGE_FIELDS) ? {} : { image: galleryCover(lodge) }),
    href: `/accommodation/${lodge.slug}`,
    hrefLabel: t('ui.view_accommodation'),
    enquire: { href: enquireHref(lodge), label: t('compare.plan_with_stay') }
  }),
  sections
};
