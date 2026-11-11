/**
 * How an itinerary is presented — the parts the tour page, the day cards and
 * the snapshot table all have to agree on:
 *
 *   - which colour a day's place gets (one colour per place, so six days read
 *     as a journey through three or four of them);
 *   - how a day's activities, typed as free text, split into separate tags;
 *   - the short name a destination goes by where there is one line to say it.
 *
 * Nothing here invents content. A day with no linked place has no colour and
 * no label; a destination whose name has nothing to shorten is shown whole.
 */
import type { ItineraryDay } from '$lib/types';

/**
 * Earthy, and each dark enough for white 11px text on it and for itself as
 * small text on white (4.5:1 or better). The brand gold is not among them: at
 * that size white on gold is unreadable.
 */
export const PLACE_COLOURS = ['#66752F', '#9A6A0C', '#AA3D1D', '#2B737C', '#7A4B6A', '#44617B'];

export type DayPlace = { key: string; name: string; colour: string };

const placeKey = (day: ItineraryDay): string =>
  String(day.destination_id || day.destination?.id || day.destination?.slug || '').trim();

/** The places a trip visits, in the order it reaches them, each with its colour. */
export const placesForDays = (days: ItineraryDay[]): DayPlace[] => {
  const places: DayPlace[] = [];
  const sorted = [...(days ?? [])].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0));
  for (const day of sorted) {
    const key = placeKey(day);
    const name = String(day.destination?.name ?? '').trim();
    if (!key || !name || places.some((place) => place.key === key)) continue;
    places.push({ key, name, colour: PLACE_COLOURS[places.length % PLACE_COLOURS.length] });
  }
  return places;
};

/** The place a day is spent, or null when the day has none linked. */
export const placeOfDay = (day: ItineraryDay, places: DayPlace[]): DayPlace | null => {
  const key = placeKey(day);
  return key ? (places.find((place) => place.key === key) ?? null) : null;
};

/**
 * "flight from Zanzibar,\nTarangire game drive\npicnic lunch" → three tags.
 *
 * Splits only where the writer did — a line break, a comma, a semicolon or a
 * bullet — never on spaces, so a phrase is not cut in the middle. Each tag
 * starts with a capital; the wording is otherwise left as typed.
 */
export const splitList = (value: string | null | undefined): string[] => {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of String(value ?? '').split(/[\n\r;,•·|]+/)) {
    const text = raw.replace(/^[\s\-–—*]+/, '').replace(/[\s.]+$/, '').trim();
    if (!text) continue;
    const tidy = text.charAt(0).toLocaleUpperCase() + text.slice(1);
    if (seen.has(tidy.toLowerCase())) continue;
    seen.add(tidy.toLowerCase());
    items.push(tidy);
  }
  return items;
};

/** "Breakfast, " → "Breakfast": a list typed with a trailing comma, shown without it. */
export const tidyList = (value: string | null | undefined): string => splitList(value).join(', ');

export type ActivityKind = 'flight' | 'drive' | 'meal' | 'birds' | 'walk' | 'boat' | 'beach' | 'culture' | 'other';

/** Which icon a tag gets, from the words in it. Anything unrecognised is a plain "other". */
export const activityKind = (text: string): ActivityKind => {
  const value = text.toLowerCase();
  if (/\b(flight|fly|flying|airstrip|airport)\b/.test(value)) return 'flight';
  if (/\b(bird|birds|birding|birdwatching)\b/.test(value)) return 'birds';
  if (/\b(breakfast|lunch|dinner|picnic|meal|sundowner)\b/.test(value)) return 'meal';
  if (/\b(game drive|safari|wildlife|crater tour|game viewing)\b/.test(value)) return 'drive';
  if (/\b(walk|walking|hike|hiking|trek|trekking|climb)\b/.test(value)) return 'walk';
  if (/\b(boat|canoe|dhow|cruise|ferry|snorkel|snorkelling|snorkeling|diving)\b/.test(value)) return 'boat';
  if (/\b(beach|swim|swimming|island|sandbank)\b/.test(value)) return 'beach';
  if (/\b(village|cultural|culture|maasai|market|coffee|town|museum)\b/.test(value)) return 'culture';
  return 'other';
};

/**
 * "Serengeti National Park" → "Serengeti". Only the generic tail goes, and only
 * when something is left; a name with no such tail is returned as it is.
 */
const GENERIC_TAIL = /\s+(national park|conservation area|game reserve|marine park|forest reserve|crater)$/i;
export const shortPlaceName = (name: string): string => {
  const full = String(name ?? '').trim();
  const short = full.replace(GENERIC_TAIL, '').trim();
  return short.length >= 3 ? short : full;
};

/** Short names for a list of destinations, without repeats ("Ngorongoro Crater" and "Ngorongoro Conservation Area" are one stop). */
export const shortPlaceNames = (names: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const short = shortPlaceName(name);
    if (!short || seen.has(short.toLowerCase())) continue;
    seen.add(short.toLowerCase());
    result.push(short);
  }
  return result;
};
