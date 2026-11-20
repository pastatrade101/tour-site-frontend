/**
 * Side-by-side comparison, shared by every category a visitor can compare:
 * safaris, places to stay, destinations and guides.
 *
 * A category supplies rows — a label, and how to read one value out of a
 * record — and this file does everything that is the same for all of them:
 * which rows are worth showing, which ones the items agree on, which value is
 * the one to point out, and which entries of a list every item shares.
 *
 * Nothing here knows what a safari or a lodge is, and nothing here invents a
 * value: a row no item fills is dropped, and an item that does not say is an
 * empty cell the page labels "not stated".
 *
 * Pure on purpose (no Svelte, no browser): it is unit-tested as it is.
 */

export const COMPARE_KINDS = ['tours', 'accommodation', 'destinations', 'guides'] as const;
export type CompareKind = (typeof COMPARE_KINDS)[number];
export const isCompareKind = (value: unknown): value is CompareKind => COMPARE_KINDS.includes(value as CompareKind);

/** Comparing starts at two. Four columns is what a laptop shows before the type collapses. */
export const MIN_COMPARE = 2;
export const MAX_COMPARE = 4;

// A slug, or a record id: letters, digits and single dashes.
const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/** `?items=a,b,c` → valid, distinct keys, at most four. Anything else in the address is ignored. */
export const parseCompareKeys = (value: string | null | undefined): string[] => {
  const keys = String(value ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0 && key.length <= 160 && KEY.test(key));
  return [...new Set(keys)].slice(0, MAX_COMPARE);
};

/** The address of a comparison. It carries the items, so it can be sent to whoever else is deciding. */
export const compareHref = (kind: CompareKind, keys: string[] = []): string =>
  keys.length ? `/compare/${kind}?items=${keys.map(encodeURIComponent).join(',')}` : `/compare/${kind}`;

/* ── Values ────────────────────────────────────────────────────────────── */

export type Cell =
  | { type: 'text'; text: string }
  /** `more` is how many further entries were left off the end. */
  | { type: 'list'; items: string[]; more?: number }
  /** An amount in US dollars; the page shows it in the visitor's currency. */
  | { type: 'money'; usd: number }
  | { type: 'score'; value: number; max: number }
  | { type: 'flag'; value: boolean }
  | { type: 'links'; items: Array<{ label: string; href: string }> };

export type RowDef<T> = {
  id: string;
  /** An interface-copy key. With `labelText`, text that is already in the reader's language. */
  label: string;
  labelText?: string;
  get: (item: T) => Cell | null;
  /** Which end of a number is the one to point out. Left out: neither is "better". */
  best?: 'low' | 'high';
};

export type SectionDef<T> = { id: string; title: string; rows: RowDef<T>[] };

export type BuiltRow = {
  id: string;
  label: string;
  labelText?: string;
  cells: Array<Cell | null>;
  /** Every item gives the same answer. */
  same: boolean;
  /** The column holding the lowest price, the highest score. Null when there is no single one. */
  best: number | null;
  /** Which end `best` points at, kept so a narrower view can judge again. */
  end?: 'low' | 'high';
  /** For lists: entries every item has, lower-cased. */
  common: string[];
};

export type BuiltSection = { id: string; title: string; rows: BuiltRow[] };
export type Built = { sections: BuiltSection[]; differing: number; matching: number };

/* ── Small builders the categories share ───────────────────────────────── */

const clean = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

export const text = (value: unknown): Cell | null => {
  const out = typeof value === 'number' && Number.isFinite(value) ? String(value) : clean(value);
  return out ? { type: 'text', text: out } : null;
};

/** Distinct, non-empty entries in the order given; `limit` keeps the first few and counts the rest. */
export const list = (values: unknown[] | null | undefined, limit = 0): Cell | null => {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const value of values ?? []) {
    const entry = clean(value);
    if (!entry || seen.has(entry.toLowerCase())) continue;
    seen.add(entry.toLowerCase());
    items.push(entry);
  }
  if (!items.length) return null;
  if (limit > 0 && items.length > limit) return { type: 'list', items: items.slice(0, limit), more: items.length - limit };
  return { type: 'list', items };
};

/** A price. Zero and negative are "no price", never "free". */
export const money = (value: unknown): Cell | null => {
  const usd = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(usd) && usd > 0 ? { type: 'money', usd } : null;
};

/** A rating. Zero is an unrated field, not a rating of nothing. */
export const score = (value: unknown, max = 10): Cell | null => {
  const rating = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(rating) && rating > 0
    ? { type: 'score', value: Math.min(rating, max), max }
    : null;
};

/** Yes or no — only when the record actually says. Null and undefined are "not stated". */
export const flag = (value: unknown): Cell | null => (typeof value === 'boolean' ? { type: 'flag', value } : null);

export const links = (items: Array<{ label: string; href: string | null | undefined }>): Cell | null => {
  const kept = items
    .map((item) => ({ label: clean(item.label), href: clean(item.href) }))
    .filter((item) => item.label && /^(https?:\/\/|\/)/i.test(item.href));
  return kept.length ? { type: 'links', items: kept } : null;
};

/* ── Building the table ────────────────────────────────────────────────── */

const isEmpty = (cell: Cell | null): boolean => {
  if (!cell) return true;
  if (cell.type === 'text') return !cell.text;
  if (cell.type === 'list' || cell.type === 'links') return !cell.items.length;
  return false;
};

/** One comparable string per cell: lists compare as sets, so the order an editor typed them in is not a difference. */
const signature = (cell: Cell | null): string => {
  if (!cell || isEmpty(cell)) return '';
  switch (cell.type) {
    case 'text':
      return `t:${cell.text.toLowerCase()}`;
    case 'list':
      return `l:${[...cell.items.map((item) => item.toLowerCase())].sort().join('|')}+${cell.more ?? 0}`;
    case 'money':
      return `m:${cell.usd}`;
    case 'score':
      return `s:${cell.value}/${cell.max}`;
    case 'flag':
      return `f:${cell.value}`;
    case 'links':
      return `k:${[...cell.items.map((item) => item.href.toLowerCase())].sort().join('|')}`;
  }
};

const numberOf = (cell: Cell | null): number | null =>
  cell?.type === 'money' ? cell.usd : cell?.type === 'score' ? cell.value : null;

/** The one column at the low (or high) end. A tie, or a single priced item, points at nothing. */
const bestColumn = (cells: Array<Cell | null>, end: 'low' | 'high' | undefined): number | null => {
  if (!end) return null;
  const values = cells.map(numberOf);
  const known = values.filter((value): value is number => value !== null);
  if (known.length < 2) return null;
  const target = end === 'low' ? Math.min(...known) : Math.max(...known);
  const at = values.flatMap((value, index) => (value === target ? [index] : []));
  return at.length === 1 ? at[0] : null;
};

/** Entries every item's list contains. Empty unless every item has a list. */
const commonEntries = (cells: Array<Cell | null>): string[] => {
  if (cells.length < 2 || !cells.every((cell) => cell?.type === 'list' && cell.items.length)) return [];
  const sets = cells.map((cell) => new Set((cell as Extract<Cell, { type: 'list' }>).items.map((item) => item.toLowerCase())));
  return [...sets[0]].filter((entry) => sets.every((set) => set.has(entry)));
};

export const buildComparison = <T>(sections: SectionDef<T>[], items: T[]): Built => {
  let differing = 0;
  let matching = 0;

  const built = sections
    .map((section) => ({
      id: section.id,
      title: section.title,
      rows: section.rows.flatMap((row): BuiltRow[] => {
        const cells = items.map((item) => {
          const cell = row.get(item);
          return isEmpty(cell) ? null : cell;
        });
        // A row nobody fills is not a row.
        if (cells.every((cell) => cell === null)) return [];
        const signatures = cells.map(signature);
        const same = items.length > 1 && signatures.every((value) => value !== '' && value === signatures[0]);
        if (items.length > 1) {
          if (same) matching += 1;
          else differing += 1;
        }
        return [
          {
            id: row.id,
            label: row.label,
            ...(row.labelText ? { labelText: row.labelText } : {}),
            cells,
            same,
            best: same ? null : bestColumn(cells, row.best),
            ...(row.best ? { end: row.best } : {}),
            common: same ? [] : commonEntries(cells)
          }
        ];
      })
    }))
    .filter((section) => section.rows.length > 0);

  return { sections: built, differing, matching };
};

/** The same table narrowed to some columns (a phone shows two at a time), judged again for those columns only. */
export const narrowComparison = (built: Built, columns: number[]): Built => {
  let differing = 0;
  let matching = 0;
  const sections = built.sections
    .map((section) => ({
      id: section.id,
      title: section.title,
      rows: section.rows.flatMap((row): BuiltRow[] => {
        const cells = columns.map((column) => row.cells[column] ?? null);
        if (cells.every((cell) => cell === null)) return [];
        const signatures = cells.map(signature);
        const same = cells.length > 1 && signatures.every((value) => value !== '' && value === signatures[0]);
        if (cells.length > 1) {
          if (same) matching += 1;
          else differing += 1;
        }
        return [{ ...row, cells, same, best: same ? null : bestColumn(cells, row.end), common: same ? [] : commonEntries(cells) }];
      })
    }))
    .filter((section) => section.rows.length > 0);
  return { sections, differing, matching };
};
