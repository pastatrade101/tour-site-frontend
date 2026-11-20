import type { Activity, Lodge, Tour, TripPoint } from '$lib/types';
import type { CompareKind, SectionDef } from './model';
import type { ComparePick } from './store';

/** `$t` from '$lib/i18n/ui', handed in so labels follow the visitor's language. */
export type Translate = (key: string) => string;

/**
 * Published lists fetched once beside the compared items, for the rows that
 * are a count or a lookup across records: the safaris that visit a place, the
 * safaris a guide looks after, the activities linked to a destination.
 */
export type CompareExtras = {
  tours?: Tour[];
  lodges?: Lodge[];
  activities?: Activity[];
  tripPoints?: TripPoint[];
};

export type KindContext = { t: Translate; extras: CompareExtras };

/** One column of the comparison: what its header shows and where its buttons lead. */
export type CompareItem<T> = {
  key: string;
  title: string;
  subtitle: string;
  record: T;
  /** Image fields on the record, in order of preference. */
  imageFields: string[];
  /** A picture from somewhere other than those fields (a gallery), used when they are all empty. */
  image?: string;
  /** The item's own page (null when it has none), and what the link to it says. */
  href: string | null;
  hrefLabel: string;
  /** The next step for this item. `label` is already in the reader's language. */
  enquire: { href: string; label: string; external?: boolean };
};

export type KindConfig<T> = {
  kind: CompareKind;
  /** Interface-copy keys. */
  nameKey: string;
  titleKey: string;
  introKey: string;
  addKey: string;
  /** Where a visitor finds more of these. */
  browseHref: string;
  /** People are photographed upright: their column pictures are cropped tall, from the top. */
  portrait?: boolean;
  /** API path the published list is read from, and the one a single record is read from (null: only the list). */
  listPath: string;
  detailPath: ((key: string) => string) | null;
  /** Which lists `sections` needs beside the items. */
  needs: Array<keyof CompareExtras>;
  keyOf: (record: T) => string;
  toPick: (record: T) => ComparePick;
  toItem: (record: T, ctx: KindContext) => CompareItem<T>;
  sections: (records: T[], ctx: KindContext) => SectionDef<T>[];
};

/** `fill('{n} nights', { n: 3 })` → "3 nights". */
export const fill = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce((out, [name, value]) => out.replaceAll(`{${name}}`, String(value)), template);

/** "mid_range" → "Mid range": a stored value with no translation, made readable. */
export const words = (value: unknown): string =>
  String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

/** The translation when the dictionary has the key, otherwise the stored value made readable. */
export const translated = (t: Translate, key: string, fallback: unknown): string => {
  const out = t(key);
  return out === key ? words(fallback) : out;
};

/** The first image field that has a value. */
export const firstImage = (record: unknown, fields: string[]): string => {
  const row = (record ?? {}) as Record<string, unknown>;
  for (const field of fields) {
    const value = row[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

/**
 * A small version of that image, for the tray and the picker: the record's
 * own thumbnail when the API attached one (`<field>_thumbnail`), otherwise the
 * image itself. Without this a 44-pixel thumbnail downloads the full-size
 * photograph.
 */
export const thumbImage = (record: unknown, fields: string[]): string => {
  const row = (record ?? {}) as Record<string, unknown>;
  for (const field of fields) {
    const original = row[field];
    if (typeof original !== 'string' || !original.trim()) continue;
    const thumbnail = row[`${field}_thumbnail`];
    return typeof thumbnail === 'string' && thumbnail.trim() ? thumbnail.trim() : original.trim();
  }
  return '';
};
