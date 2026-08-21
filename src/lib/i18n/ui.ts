import { derived, writable } from 'svelte/store';
import { DEFAULT_LOCALE, type KnownLocale } from '$lib/i18n';
import de from '$lib/locales/de.json';
import en from '$lib/locales/en.json';
import es from '$lib/locales/es.json';
import fr from '$lib/locales/fr.json';
import sw from '$lib/locales/sw.json';

/**
 * Static interface copy — buttons, labels, navigation. Deliberately separate
 * from CMS content translations: these strings ship with the build and never
 * belong in the database (§21). CMS records go through content_translations;
 * this is everything the app itself says.
 */
type Dictionary = Record<string, string>;

const DICTIONARIES: Record<KnownLocale, Dictionary> = { en, sw, de, fr, es };

/** Active locale, set once per navigation by the root layout. */
export const locale = writable<KnownLocale>(DEFAULT_LOCALE);

/**
 * `$t('cta.book_now')` — falls back to the default language for a key a
 * translation has not covered, and to the key itself if it is unknown, so a
 * missing string is visible in review rather than rendering as blank.
 */
export const t = derived(locale, ($locale) => (key: string): string => {
  const dictionary = DICTIONARIES[$locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  return dictionary[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key;
});
