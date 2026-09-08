/**
 * The block vocabulary for safari-package landing pages.
 *
 * One list, read by two things: the editor builds its form from it, and the
 * renderer draws whatever the editor produced. Adding a block type means adding
 * an entry here and a branch in the renderer — no migration, and no second
 * place where the field names have to be kept in step.
 *
 * A page is `sections: Block[]`, each `{ type, ...fields }`. The renderer skips
 * a type it does not recognise rather than throwing, so removing a block type
 * cannot break a page that still has one saved.
 */

export type Block = Record<string, unknown> & { type: string };

/** How the editor draws one field. The renderer never reads these. */
export type FieldKind =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'image'
  /** A simple list of strings, one per line. */
  | 'lines'
  /** A list of objects; `fields` describes one row. */
  | 'items'
  /** Months of the year, chosen as chips. */
  | 'months';

export type FieldSpec = {
  key: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  placeholder?: string;
  /** 'items' only — the shape of one row. */
  fields?: FieldSpec[];
};

export type BlockSpec = {
  type: string;
  label: string;
  /** One line telling an editor what this block is for. */
  blurb: string;
  fields: FieldSpec[];
};

const eyebrow: FieldSpec = { key: 'eyebrow', label: 'Small label above the heading', kind: 'text', placeholder: 'Why this trip' };
const title: FieldSpec = { key: 'title', label: 'Heading', kind: 'text' };
const intro: FieldSpec = { key: 'intro', label: 'Intro paragraph', kind: 'textarea' };

export const BLOCK_TYPES: BlockSpec[] = [
  {
    type: 'facts',
    label: 'Quick facts strip',
    blurb: 'The short bar of trip facts — where it starts, how long, what it covers.',
    fields: [
      {
        key: 'items',
        label: 'Facts',
        kind: 'items',
        hint: 'Four reads best. A fact with no value is left out.',
        fields: [
          { key: 'label', label: 'Label', kind: 'text', placeholder: 'Duration' },
          { key: 'value', label: 'Value', kind: 'text', placeholder: '2 days, 1 night' }
        ]
      }
    ]
  },
  {
    type: 'prose',
    label: 'Written section',
    blurb: 'A heading and formatted copy. The workhorse block.',
    fields: [eyebrow, title, { key: 'body', label: 'Body', kind: 'richtext' }]
  },
  {
    type: 'highlights',
    label: 'Highlights with a photo',
    blurb: 'A picture beside a list of what makes this trip worth taking.',
    fields: [
      eyebrow,
      title,
      intro,
      { key: 'image_url', label: 'Photo', kind: 'image' },
      { key: 'items', label: 'Highlights', kind: 'lines', hint: 'One per line.' }
    ]
  },
  {
    type: 'season',
    label: 'Best time to travel',
    blurb: 'The months this trip is at its best, and why.',
    fields: [
      eyebrow,
      title,
      intro,
      { key: 'months', label: 'Best months', kind: 'months' },
      { key: 'note', label: 'Note under the strip', kind: 'textarea' }
    ]
  },
  {
    type: 'tiers',
    label: 'Price tiers',
    blurb: 'Comfort levels side by side. Leave a price empty and only the name shows.',
    fields: [
      eyebrow,
      title,
      intro,
      {
        key: 'tiers',
        label: 'Tiers',
        kind: 'items',
        fields: [
          { key: 'label', label: 'Tier name', kind: 'text', placeholder: 'Mid-range' },
          { key: 'price', label: 'Price', kind: 'text', placeholder: 'From $1,450 pp' },
          { key: 'body', label: 'What it includes', kind: 'textarea' }
        ]
      },
      { key: 'note', label: 'Small print', kind: 'textarea' }
    ]
  },
  {
    type: 'itinerary',
    label: 'Day-by-day itinerary',
    blurb: "Renders the linked tour's real published days. Nothing to type — set the tour on the page itself.",
    fields: [eyebrow, title, intro]
  },
  {
    type: 'compare',
    label: 'Comparison table',
    blurb: 'This trip against the alternatives, so a reader can rule one in.',
    fields: [
      eyebrow,
      title,
      intro,
      { key: 'columns', label: 'Column headings', kind: 'lines', hint: 'One per line. The first column is the row label.' },
      {
        key: 'rows',
        label: 'Rows',
        kind: 'items',
        fields: [
          { key: 'label', label: 'Row label', kind: 'text' },
          { key: 'values', label: 'Cells', kind: 'lines', hint: 'One per line, in column order.' }
        ]
      }
    ]
  },
  {
    type: 'inclusions',
    label: 'Included / not included',
    blurb: 'Two columns. Either one alone is fine.',
    fields: [
      title,
      { key: 'included', label: 'Included', kind: 'lines' },
      { key: 'excluded', label: 'Not included', kind: 'lines' }
    ]
  },
  {
    type: 'gallery',
    label: 'Photo grid',
    blurb: 'Pictures of the actual trip.',
    fields: [
      eyebrow,
      title,
      {
        key: 'images',
        label: 'Photos',
        kind: 'items',
        fields: [
          { key: 'image_url', label: 'Photo', kind: 'image' },
          { key: 'caption', label: 'Caption', kind: 'text' }
        ]
      }
    ]
  },
  {
    type: 'tours',
    label: 'Related trips',
    blurb: 'Cards linking to real tours. They stay the product pages; this only points at them.',
    fields: [
      eyebrow,
      title,
      intro,
      { key: 'tour_slugs', label: 'Tour slugs', kind: 'lines', hint: 'One slug per line, in the order you want them shown.' }
    ]
  },
  {
    type: 'faq',
    label: 'Questions and answers',
    blurb: 'The questions this trip actually gets asked.',
    fields: [
      title,
      {
        key: 'items',
        label: 'Questions',
        kind: 'items',
        fields: [
          { key: 'question', label: 'Question', kind: 'text' },
          { key: 'answer', label: 'Answer', kind: 'textarea' }
        ]
      }
    ]
  },
  {
    type: 'enquiry',
    label: 'Enquiry band',
    blurb: 'The trip planner, on the dark band. One per page is plenty.',
    fields: [eyebrow, title, intro]
  }
];

export const blockSpec = (type: string): BlockSpec | undefined => BLOCK_TYPES.find((spec) => spec.type === type);

/** A new block with every field present and empty, so the editor has rows to fill. */
export const emptyBlock = (type: string): Block => {
  const spec = blockSpec(type);
  const block: Block = { type };
  for (const field of spec?.fields ?? []) {
    if (field.kind === 'items') block[field.key] = [];
    else if (field.kind === 'lines' || field.kind === 'months') block[field.key] = [];
    else if (field.kind === 'number') block[field.key] = null;
    else block[field.key] = '';
  }
  return block;
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ── Reading a stored block safely ───────────────────────────────────────────
//
// Everything below assumes nothing about what is in the jsonb. A block written
// by an older version of the editor, or by hand, must not be able to throw.

export const str = (value: unknown): string => (typeof value === 'string' ? value : '');

export const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Non-blank strings only — an empty line an editor left behind is not content. */
export const lines = (value: unknown): string[] =>
  arr<unknown>(value)
    .map((entry) => str(entry).trim())
    .filter(Boolean);

/** Rows that carry at least one non-blank value of their own. */
export const rows = <T extends Record<string, unknown>>(value: unknown): T[] =>
  arr<T>(value).filter((row) => row && typeof row === 'object' && Object.values(row).some((v) => (Array.isArray(v) ? v.length : str(v).trim())));

// ── Editing shape vs stored shape ───────────────────────────────────────────
//
// A `lines` field is an array in the database and a textarea in the editor. The
// two conversions live here rather than in the form, so the editor can bind
// every control straight to the block — the components in this codebase expose
// `bind:value` and do not forward input events, and a handler that never fires
// silently drops what an editor typed.

const eachLinesField = (block: Block, run: (key: string) => void) => {
  for (const field of blockSpec(block.type)?.fields ?? []) {
    if (field.kind === 'lines') run(field.key);
    if (field.kind === 'items') {
      for (const sub of field.fields ?? []) if (sub.kind === 'lines') run(`${field.key}.${sub.key}`);
    }
  }
};

/** Stored → editable: arrays of lines become one string per line. */
export const blocksForEditing = (source: unknown): Block[] =>
  arr<Block>(source).map((block) => {
    const next: Block = { ...block, type: str(block.type) };
    eachLinesField(next, (path) => {
      const [key, sub] = path.split('.');
      if (sub) {
        next[key] = arr<Record<string, unknown>>(next[key]).map((row) => ({ ...row, [sub]: lines(row[sub]).join('\n') }));
      } else {
        next[key] = lines(next[key]).join('\n');
      }
    });
    return next;
  });

/** Editable → stored: those strings become arrays again, blanks dropped. */
export const blocksForSaving = (source: unknown): Block[] =>
  arr<Block>(source).map((block) => {
    const next: Block = { ...block, type: str(block.type) };
    eachLinesField(next, (path) => {
      const [key, sub] = path.split('.');
      const split = (value: unknown) => str(value).split('\n').map((line) => line.trim()).filter(Boolean);
      if (sub) {
        next[key] = arr<Record<string, unknown>>(next[key]).map((row) => ({ ...row, [sub]: split(row[sub]) }));
      } else {
        next[key] = split(next[key]);
      }
    });
    return next;
  });
