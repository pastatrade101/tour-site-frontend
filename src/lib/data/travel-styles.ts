// Travel styles (SRS v2.0 type 6) — persona-led landing pages, shipped as static
// config (no schema/backend change). `persona` links results to the tailored
// /tours?persona= view where it maps; otherwise the CTA goes to Plan My Trip.
//
// The copy lives in the locale files under `travel_styles.*`, so this module
// stores translation KEYS only and never reads the locale store itself. Render
// it through `localizeTravelStyle(style, $t)` inside a reactive statement or
// markup, so the text follows the active language.
export type TravelStyle = {
  slug: string;
  nameKey: string;
  emotionalPromiseKey: string;
  descriptionKey: string;
  desireKeys: string[];
  concernKeys: string[];
  persona?: string;
};

/** A travel style with its keys resolved into the active language. */
export type LocalizedTravelStyle = {
  slug: string;
  name: string;
  emotionalPromise: string;
  description: string;
  desires: string[];
  concerns: string[];
  persona?: string;
};

export const TRAVEL_STYLES: TravelStyle[] = [
  {
    slug: 'honeymoon',
    nameKey: 'travel_styles.honeymoon_name',
    emotionalPromiseKey: 'travel_styles.honeymoon_promise',
    descriptionKey: 'travel_styles.honeymoon_description',
    desireKeys: [
      'travel_styles.honeymoon_desire_private_camps',
      'travel_styles.honeymoon_desire_safari_zanzibar',
      'travel_styles.honeymoon_desire_special_touches',
      'travel_styles.honeymoon_desire_effortless_planning'
    ],
    concernKeys: [
      'travel_styles.honeymoon_concern_romantic_not_rushed',
      'travel_styles.honeymoon_concern_best_beach',
      'travel_styles.honeymoon_concern_lodge_privacy'
    ],
    persona: 'couple'
  },
  {
    slug: 'family-travel',
    nameKey: 'travel_styles.family_name',
    emotionalPromiseKey: 'travel_styles.family_promise',
    descriptionKey: 'travel_styles.family_description',
    desireKeys: [
      'travel_styles.family_desire_kid_friendly_pace',
      'travel_styles.family_desire_big_five_short_drives',
      'travel_styles.family_desire_flexible_meals',
      'travel_styles.family_desire_hands_on_moments'
    ],
    concernKeys: [
      'travel_styles.family_concern_safe_for_children',
      'travel_styles.family_concern_malaria_health',
      'travel_styles.family_concern_younger_kids'
    ],
    persona: 'family'
  },
  {
    slug: 'luxury-travel',
    nameKey: 'travel_styles.luxury_name',
    emotionalPromiseKey: 'travel_styles.luxury_promise',
    descriptionKey: 'travel_styles.luxury_description',
    desireKeys: [
      'travel_styles.luxury_desire_ultra_luxury_lodges',
      'travel_styles.luxury_desire_private_vehicles',
      'travel_styles.luxury_desire_light_aircraft',
      'travel_styles.luxury_desire_total_discretion'
    ],
    concernKeys: [
      'travel_styles.luxury_concern_top_tier_lodge',
      'travel_styles.luxury_concern_privacy_exclusivity',
      'travel_styles.luxury_concern_seamless_connections'
    ]
  },
  {
    slug: 'photography',
    nameKey: 'travel_styles.photography_name',
    emotionalPromiseKey: 'travel_styles.photography_promise',
    descriptionKey: 'travel_styles.photography_description',
    desireKeys: [
      'travel_styles.photography_desire_prime_light',
      'travel_styles.photography_desire_time_at_sightings',
      'travel_styles.photography_desire_bean_bags',
      'travel_styles.photography_desire_migration_timing'
    ],
    concernKeys: [
      'travel_styles.photography_concern_guide_waits',
      'travel_styles.photography_concern_best_season',
      'travel_styles.photography_concern_gear_handling'
    ]
  },
  {
    slug: 'group-travel',
    nameKey: 'travel_styles.group_name',
    emotionalPromiseKey: 'travel_styles.group_promise',
    descriptionKey: 'travel_styles.group_description',
    desireKeys: [
      'travel_styles.group_desire_fair_pricing',
      'travel_styles.group_desire_one_itinerary',
      'travel_styles.group_desire_fitness_levels',
      'travel_styles.group_desire_celebration_moments'
    ],
    concernKeys: [
      'travel_styles.group_concern_keeping_together',
      'travel_styles.group_concern_mixed_budgets',
      'travel_styles.group_concern_rooming_logistics'
    ],
    persona: 'group'
  },
  {
    slug: 'solo-travel',
    nameKey: 'travel_styles.solo_name',
    emotionalPromiseKey: 'travel_styles.solo_promise',
    descriptionKey: 'travel_styles.solo_description',
    desireKeys: [
      'travel_styles.solo_desire_trusted_guides',
      'travel_styles.solo_desire_group_departures',
      'travel_styles.solo_desire_no_supplement_surprises',
      'travel_styles.solo_desire_independent_pace'
    ],
    concernKeys: [
      'travel_styles.solo_concern_safe_solo',
      'travel_styles.solo_concern_feel_isolated',
      'travel_styles.solo_concern_single_supplement'
    ],
    persona: 'solo'
  }
];

export const getTravelStyle = (slug: string) => TRAVEL_STYLES.find((s) => s.slug === slug);

/**
 * Resolve a style's keys with the caller's translator — pass `$t` from a
 * component (inside `$:` or markup) so the result re-renders on a locale change.
 */
export const localizeTravelStyle = (style: TravelStyle, translate: (key: string) => string): LocalizedTravelStyle => ({
  slug: style.slug,
  name: translate(style.nameKey),
  emotionalPromise: translate(style.emotionalPromiseKey),
  description: translate(style.descriptionKey),
  desires: style.desireKeys.map((key) => translate(key)),
  concerns: style.concernKeys.map((key) => translate(key)),
  persona: style.persona
});
