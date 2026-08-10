/**
 * The three form configurations, plus the per-category question sets.
 *
 * Everything that makes one form different from another lives here: headings,
 * CTAs, which steps exist and which questions sit on them. The renderer knows
 * nothing about safaris.
 */
import {
  ACCOMMODATION,
  NOT_SURE,
  YES_NO,
  aboutYouFields,
  accommodationField,
  budgetField,
  durationField,
  exactDateField,
  flexibilityField,
  monthField,
  specialRequestsField,
  timingField,
  travellerFields
} from './fields';
import type { EnquiryContext, Field, FormConfig, FormValues, Option } from './types';

const opts = (...labels: string[]): Option[] => labels.map((label) => ({ label, value: label }));

// ─────────────────────────────────────────────────────────────────────────────
// 1. Homepage trip planner
// ─────────────────────────────────────────────────────────────────────────────

const TRIP_INTERESTS = opts(
  'Tanzania safari',
  'Safari from Zanzibar',
  'Safari and Zanzibar beach',
  'Kilimanjaro climb',
  'Gorilla trekking',
  'Chimpanzee trekking',
  'Kenya and Tanzania',
  'Honeymoon',
  'Family holiday',
  NOT_SURE
);

/** Already-coastal interests — asking these travellers about Zanzibar is noise. */
const COASTAL = ['Safari from Zanzibar', 'Safari and Zanzibar beach'];

export const homepageConfig = (): FormConfig => ({
  formType: 'homepage_trip_planner',
  title: 'Plan Your East Africa Trip',
  description:
    'Tell us a few details and a local specialist will recommend a trip that fits your dates, interests, pace and budget.',
  submitLabel: 'Request My Trip Plan',
  submitNote: 'No payment required. A local specialist replies within one business day.',
  steps: [
    {
      key: 'trip',
      label: 'Trip details',
      heading: 'What kind of trip are you imagining?',
      fields: [
        {
          key: 'trip_interests',
          label: 'What interests you?',
          hint: 'Choose as many as you like.',
          kind: 'chips-multi',
          options: TRIP_INTERESTS,
          required: true,
          validate: (value) => ((value as string[])?.length ? '' : 'Pick at least one — or “Not sure yet”')
        },
        durationField,
        timingField,
        exactDateField,
        monthField,
        {
          // Deliberately not "Starting from", which reads as a price.
          key: 'trip_start_location',
          label: 'Where will your trip start?',
          kind: 'chips',
          options: opts(
            'Zanzibar',
            'Arusha',
            'Kilimanjaro Airport',
            'Dar es Salaam',
            'Nairobi',
            'International arrival',
            NOT_SURE
          ),
          required: true
        }
      ]
    },
    {
      key: 'preferences',
      label: 'Preferences',
      heading: 'How would you like to travel?',
      fields: [
        accommodationField,
        budgetField,
        {
          key: 'include_zanzibar',
          label: 'Would you like to include Zanzibar?',
          kind: 'chips',
          options: YES_NO,
          // Only for travellers whose plan does not already include the coast.
          showIf: (values) => {
            const interests = (values.trip_interests as string[]) ?? [];
            return interests.length > 0 && !interests.some((item) => COASTAL.includes(item));
          }
        },
        specialRequestsField
      ]
    },
    {
      key: 'about',
      label: 'About you',
      heading: 'Who should we send this to?',
      fields: [...travellerFields(), ...aboutYouFields()]
    }
  ]
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Category enquiry — per-category question sets
// ─────────────────────────────────────────────────────────────────────────────

type CategorySet = {
  title: string;
  submitLabel: string;
  questions: Field[];
};

const zanzibarSafariSet: CategorySet = {
  title: 'Plan Your Safari from Zanzibar',
  submitLabel: 'Request My Safari Plan',
  questions: [
    { key: 'zanzibar_hotel', label: 'Your Zanzibar hotel or pickup area', kind: 'text', placeholder: 'Hotel name or area' },
    { key: 'safari_region', label: 'Preferred park or safari region', kind: 'chips', options: opts('Serengeti', 'Ngorongoro', 'Tarangire', 'Manyara', 'Mikumi', 'Nyerere / Selous', 'Recommend the best') },
    { key: 'fly_or_drive', label: 'Fly-in or drive?', kind: 'chips', options: opts('Fly-in', 'Drive', 'Recommend the best'), half: true },
    { key: 'hotel_pickup', label: 'Hotel pickup required?', kind: 'chips', options: YES_NO, half: true },
    { key: 'return_to_zanzibar', label: 'Return to Zanzibar after the safari?', kind: 'chips', options: YES_NO }
  ]
};

const safariAndBeachSet: CategorySet = {
  title: 'Plan Your Safari & Beach Holiday',
  submitLabel: 'Request My Holiday Plan',
  questions: [
    { key: 'safari_beach_split', label: 'Preferred safari / beach split', kind: 'chips', options: opts('More safari', 'Even split', 'More beach', 'Recommend the best') },
    { key: 'safari_parks', label: 'Preferred safari parks', kind: 'chips-multi', options: opts('Serengeti', 'Ngorongoro', 'Tarangire', 'Manyara', 'Nyerere / Selous', 'Recommend the best') },
    { key: 'zanzibar_area', label: 'Preferred Zanzibar area', kind: 'chips', options: opts('North (Nungwi/Kendwa)', 'East coast', 'South (Paje/Jambiani)', 'Stone Town', 'Recommend the best') },
    { key: 'stone_town_interest', label: 'Interested in Stone Town?', kind: 'chips', options: YES_NO, half: true },
    { key: 'marine_activities', label: 'Interested in diving or snorkelling?', kind: 'chips', options: YES_NO, half: true },
    { key: 'beach_hotel_style', label: 'Beach hotel style', kind: 'chips', options: ACCOMMODATION },
    { key: 'special_occasion', label: 'Honeymoon or special occasion?', kind: 'text', placeholder: 'Optional' }
  ]
};

const migrationSet: CategorySet = {
  title: 'Plan Your Migration Safari',
  submitLabel: 'Request My Migration Plan',
  questions: [
    {
      key: 'migration_priority',
      label: 'What matters most to you?',
      kind: 'chips',
      options: opts('Calving season', 'River crossings', 'Large herds', 'Recommend the best region'),
      required: true
    },
    { key: 'photography_priority', label: 'Is photography a priority?', kind: 'chips', options: YES_NO, half: true },
    { key: 'fly_or_drive', label: 'Fly-in or driving safari?', kind: 'chips', options: opts('Fly-in', 'Driving', 'Recommend the best'), half: true },
    { key: 'other_parks', label: 'Other parks to include', kind: 'chips-multi', options: opts('Ngorongoro', 'Tarangire', 'Manyara', 'Zanzibar extension', 'None') }
  ]
};

const familySet: CategorySet = {
  title: 'Plan Your Family Safari',
  submitLabel: 'Request My Family Safari',
  questions: [
    { key: 'preferred_pace', label: 'Preferred pace', kind: 'chips', options: opts('Relaxed', 'Balanced', 'Activity-filled'), required: true },
    { key: 'family_rooms', label: 'Family room requirements', kind: 'chips', options: opts('Family room', 'Adjoining rooms', 'Separate rooms', 'Recommend the best') },
    { key: 'pool_required', label: 'Is a pool important?', kind: 'chips', options: YES_NO, half: true },
    { key: 'child_seats', label: 'Child seats required?', kind: 'chips', options: YES_NO, half: true },
    { key: 'dietary_medical', label: 'Dietary or medical considerations', kind: 'textarea', placeholder: 'Optional' },
    { key: 'zanzibar_extension', label: 'Interested in a Zanzibar extension?', kind: 'chips', options: YES_NO }
  ]
};

const honeymoonSet: CategorySet = {
  title: 'Plan Your Tanzania Honeymoon',
  submitLabel: 'Request My Honeymoon Plan',
  questions: [
    { key: 'occasion_date', label: 'Wedding or anniversary date', kind: 'date', half: true },
    { key: 'atmosphere', label: 'The feeling you are after', kind: 'chips-multi', options: opts('Romantic', 'Adventure', 'Luxury', 'Private and secluded') },
    { key: 'safari_beach_split', label: 'Safari and beach preference', kind: 'chips', options: opts('More safari', 'Even split', 'More beach', 'Recommend the best') },
    { key: 'private_dinner', label: 'Private dinner', kind: 'chips', options: YES_NO, half: true },
    { key: 'balloon_safari', label: 'Balloon safari', kind: 'chips', options: YES_NO, half: true },
    { key: 'spa', label: 'Spa', kind: 'chips', options: YES_NO, half: true },
    { key: 'beachfront_room', label: 'Beachfront room', kind: 'chips', options: YES_NO, half: true },
    { key: 'celebration_requests', label: 'Other celebration requests', kind: 'textarea', placeholder: 'Optional' }
  ]
};

const trekkingSet: CategorySet = {
  title: 'Plan Your Trekking Safari',
  submitLabel: 'Request My Trekking Plan',
  questions: [
    { key: 'trek_type', label: 'Gorilla, chimpanzee or both?', kind: 'chips', options: opts('Gorilla', 'Chimpanzee', 'Both'), required: true },
    { key: 'trek_country', label: 'Preferred country', kind: 'chips', options: opts('Uganda', 'Rwanda', 'Tanzania', 'Recommend the best') },
    { key: 'trekkers', label: 'Number of trekkers', kind: 'number', min: 1, max: 20, half: true },
    { key: 'traveller_ages', label: 'Traveller ages', kind: 'text', half: true, placeholder: 'e.g. 34, 36, 62' },
    { key: 'fitness_considerations', label: 'Fitness or mobility considerations', kind: 'textarea', placeholder: 'Optional — it affects which trek we suggest.' },
    { key: 'preferred_trek_date', label: 'Preferred trekking date', kind: 'date', half: true },
    { key: 'trek_extension', label: 'Safari or beach extension?', kind: 'chips', options: YES_NO, half: true }
  ]
};

/**
 * Category slug → question set. The seven published categories with no bespoke
 * set fall through to the default, which asks the common questions only —
 * better than showing them a form written for somebody else's trip.
 */
const CATEGORY_SETS: Record<string, CategorySet> = {
  'safari-from-zanzibar': zanzibarSafariSet,
  'tanzania-and-zanzibar-holidays': safariAndBeachSet,
  'zanzibar-beach-holidays': safariAndBeachSet,
  'great-migration-safari-tanzania': migrationSet,
  'family-safari-tanzania': familySet,
  'tanzania-honeymoon-safari': honeymoonSet,
  'gorilla-trekking-tours': trekkingSet,
  'chimp-trekking-tours': trekkingSet
};

export const categoryConfig = (context: EnquiryContext): FormConfig => {
  const slug = context.category?.slug ?? '';
  const name = context.category?.name ?? 'Your Trip';
  const set = CATEGORY_SETS[slug];

  return {
    formType: 'category_enquiry',
    // Falls back to the real category name rather than inventing a heading.
    title: set?.title ?? `Plan Your ${name}`,
    description: 'A local specialist will shape this around your dates, pace and budget.',
    submitLabel: set?.submitLabel ?? 'Request My Trip Plan',
    submitNote: 'No payment required. We reply within one business day.',
    steps: [
      {
        key: 'preferences',
        label: 'Trip preferences',
        heading: 'Tell us about the trip',
        fields: [
          timingField,
          exactDateField,
          monthField,
          flexibilityField,
          durationField,
          ...travellerFields(),
          accommodationField,
          ...(set?.questions ?? []),
          specialRequestsField
        ]
      },
      {
        key: 'about',
        label: 'Contact details',
        heading: 'Who should we send this to?',
        fields: aboutYouFields()
      }
    ]
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tour enquiry
// ─────────────────────────────────────────────────────────────────────────────

/** "As shown" travellers get a deliberately short second step. */
const wantsChanges = (values: FormValues) => values.how_you_like_it !== 'As shown';

export const tourConfig = (context: EnquiryContext, departures: Option[] = []): FormConfig => ({
  formType: 'tour_enquiry',
  title: 'Request Availability & Exact Price',
  description: "You're requesting this tour. Tell us your dates and we'll confirm what's available.",
  submitLabel: 'Request Availability & Exact Price',
  submitNote: "No payment required. We'll confirm availability and send your personalised quotation.",
  steps: [
    {
      key: 'trip',
      label: 'Your trip',
      heading: 'Your dates and party',
      fields: [
        {
          key: 'how_you_like_it',
          label: 'How would you like this trip?',
          kind: 'chips',
          options: opts('As shown', 'With some changes', 'I have questions first'),
          required: true
        },
        // Only rendered when the CMS actually holds scheduled departures.
        ...(departures.length
          ? [{ key: 'departure', label: 'Scheduled departure', kind: 'chips' as const, options: departures }]
          : []),
        { ...exactDateField, label: 'Preferred travel date', showIf: undefined, required: false },
        flexibilityField,
        ...travellerFields()
      ]
    },
    {
      key: 'preferences',
      label: 'Preferences',
      heading: 'Anything to adjust?',
      fields: [
        {
          key: 'accommodation_preference',
          label: 'Accommodation',
          kind: 'chips',
          // Short labels so the row does not wrap; the stored value stays
          // descriptive for whoever reads the enquiry.
          options: [
            { label: 'As listed', value: 'Keep the listed accommodation' },
            { label: 'Value', value: 'Value option' },
            { label: 'Mid-range', value: 'Mid-range' },
            { label: 'Luxury', value: 'Luxury upgrade' },
            { label: 'Recommend', value: 'Recommend the best fit' }
          ]
        },
        {
          key: 'room_arrangement',
          label: 'Room arrangement',
          kind: 'chips',
          options: opts('Double', 'Twin', 'Single', 'Family room', 'Multiple rooms')
        },
        { key: 'pickup_location', label: 'Start or pickup location', kind: 'text', half: true, showIf: wantsChanges },
        { key: 'dropoff_location', label: 'End or drop-off location', kind: 'text', half: true, showIf: wantsChanges },
        { key: 'dietary_requirements', label: 'Dietary requirements', kind: 'text', half: true },
        { key: 'special_occasion', label: 'Special occasion', kind: 'text', half: true, placeholder: 'Birthday, honeymoon…' },
        {
          key: 'requested_changes',
          label: 'Requested changes or questions',
          kind: 'textarea',
          placeholder: 'Tell us what you would like to change, or what you would like to know.',
          showIf: wantsChanges
        }
      ]
    },
    {
      key: 'about',
      label: 'About you',
      heading: 'Who should we send this to?',
      fields: aboutYouFields()
    }
  ]
});

export const configFor = (
  formType: 'homepage_trip_planner' | 'category_enquiry' | 'tour_enquiry',
  context: EnquiryContext = {},
  departures: Option[] = []
): FormConfig => {
  if (formType === 'category_enquiry') return categoryConfig(context);
  if (formType === 'tour_enquiry') return tourConfig(context, departures);
  return homepageConfig();
};
