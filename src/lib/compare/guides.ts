import type { Specialist } from '$lib/types';
import { links, list, text, type SectionDef } from './model';
import { fill, thumbImage, type KindConfig, type KindContext } from './shared';

/**
 * The people who plan and lead the trips, side by side: their role, how long
 * they have been doing it, the languages they speak, what they specialise in,
 * their profile, the safaris each one looks after and where guests review them.
 *
 * Experience, languages and specialisations are typed into the CMS per person.
 * Until someone has been filled in, those rows say "not stated" for them — and
 * while nobody has, the rows are not shown at all.
 */

const IMAGE_FIELDS = ['photo_url', 'photo'];

const experience = (specialist: Specialist, t: KindContext['t']): string => {
  const years = Number(specialist.years_experience);
  return specialist.years_experience !== null && specialist.years_experience !== undefined && Number.isFinite(years) && years > 0
    ? fill(t(years === 1 ? 'compare.n_year' : 'compare.n_years'), { n: years })
    : '';
};

const sections = (_specialists: Specialist[], { t, extras }: KindContext): SectionDef<Specialist>[] => [
  {
    id: 'profile',
    title: 'compare.sec_profile',
    rows: [
      { id: 'role', label: 'compare.row_role', get: (specialist) => text(specialist.role) },
      // Stated, never ranked: nobody is marked as "the most experienced".
      { id: 'experience', label: 'compare.row_experience', get: (specialist) => text(experience(specialist, t)) },
      { id: 'languages', label: 'compare.row_languages', get: (specialist) => list(specialist.languages) },
      { id: 'specialisations', label: 'compare.row_specialisations', get: (specialist) => list(specialist.specialisations) },
      { id: 'about', label: 'compare.row_about', get: (specialist) => text(specialist.blurb) }
    ]
  },
  {
    id: 'work',
    title: 'compare.sec_their_safaris',
    rows: [
      {
        id: 'safaris',
        label: 'compare.row_safaris_looked_after',
        get: (specialist) => list((extras.tours ?? []).filter((tour) => specialist.id && tour.specialist_id === specialist.id).map((tour) => tour.title), 6)
      }
    ]
  },
  {
    id: 'elsewhere',
    title: 'compare.sec_profiles',
    rows: [{ id: 'tripadvisor', label: 'compare.row_reviews', get: (specialist) => links([{ label: 'TripAdvisor', href: specialist.tripadvisor_url }]) }]
  }
];

export const guidesKind: KindConfig<Specialist> = {
  kind: 'guides',
  nameKey: 'compare.kind_guides',
  titleKey: 'compare.title_guides',
  introKey: 'compare.intro_guides',
  addKey: 'compare.add_guide',
  browseHref: '/about#team',
  portrait: true,
  listPath: '/specialists?status=published&limit=100',
  // A specialist has no page of their own: the published list is the source.
  detailPath: null,
  needs: ['tours'],
  fromTour: (tour) => (tour.specialist_id ? [{ key: tour.specialist_id, title: tour.specialist?.name ?? '' }] : []),
  keyOf: (specialist) => specialist.id ?? '',
  toPick: (specialist) => ({ key: specialist.id ?? '', title: specialist.name, image: thumbImage(specialist, IMAGE_FIELDS) }),
  toItem: (specialist, { t }) => {
    const digits = String(specialist.whatsapp_number ?? '').replace(/\D/g, '');
    const firstName = specialist.name.split(/\s+/)[0] ?? specialist.name;
    return {
      key: specialist.id ?? '',
      title: specialist.name,
      subtitle: specialist.role ?? '',
      record: specialist,
      imageFields: IMAGE_FIELDS,
      href: '/about#team',
      hrefLabel: t('ui.meet_the_team'),
      enquire: digits
        ? { href: `https://wa.me/${digits}`, label: fill(t('ui.message_name'), { name: firstName }), external: true }
        : { href: '/plan-my-trip?from=compare', label: t('cta.plan_my_trip') }
    };
  },
  sections
};
