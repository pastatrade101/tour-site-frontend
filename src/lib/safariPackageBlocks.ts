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

/** Icons the quick-facts strip can draw. The renderer maps these to Lucide. */
export const FACT_ICONS = ['plane', 'pin', 'clock', 'route', 'price', 'people', 'vehicle', 'tent'] as const;

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
          { key: 'value', label: 'Value', kind: 'text', placeholder: '2 days, 1 night' },
          { key: 'icon', label: 'Icon', kind: 'text', hint: `One of: ${FACT_ICONS.join(', ')}. Anything else, or blank, draws no icon.`, placeholder: 'clock' }
        ]
      }
    ]
  },
  {
    type: 'prose',
    label: 'Written section',
    blurb: 'A heading and formatted copy. The workhorse block.',
    fields: [
      eyebrow,
      title,
      { key: 'body', label: 'Body', kind: 'richtext' },
      { key: 'aside_title', label: 'Side card label', kind: 'text', hint: 'Fill both to show a card beside the copy; leave either empty and the copy runs full width.', placeholder: 'Keep in mind' },
      { key: 'aside_body', label: 'Side card text', kind: 'textarea' }
    ]
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
  },
  {
    type: 'routes',
    label: 'Route options (tabbed)',
    blurb:
      'The alternative routes for this trip, each as a tab. Points at real published tours — the photo, wording, price and day-by-day come from them, so this page and the tour pages can never disagree.',
    fields: [
      eyebrow,
      title,
      intro,
      {
        key: 'routes',
        label: 'Routes',
        kind: 'items',
        hint: 'One per tab. Three or four reads best.',
        fields: [
          { key: 'tab', label: 'Tab label', kind: 'text', placeholder: 'Tarangire & Ngorongoro' },
          {
            key: 'tours',
            label: 'Comfort levels',
            kind: 'lines',
            hint: 'One per line, as "Label | tour-slug" — e.g. Mid-range | 2-day-tarangire-midrange. The first is shown first. A slug that no longer resolves is left out rather than shown broken.'
          },
          { key: 'best_for', label: 'Best for', kind: 'text', placeholder: 'first-time safari travellers who want the classic route.' },
          { key: 'note', label: 'Caveat under the route', kind: 'textarea', placeholder: 'This route is busier and needs careful flight and lodge timing.' }
        ]
      },
      { key: 'cta_label', label: 'Button under each route', kind: 'text', placeholder: 'Send request for this route' }
    ]
  },
  {
    type: 'advice',
    label: 'Which route suits you',
    blurb: '"Choose this if…" cards, for a reader who cannot pick between the routes.',
    fields: [
      eyebrow,
      title,
      intro,
      {
        key: 'cards',
        label: 'Cards',
        kind: 'items',
        fields: [
          { key: 'title', label: 'Heading', kind: 'text', placeholder: 'Choose Tarangire & Ngorongoro if…' },
          { key: 'body', label: 'Body', kind: 'textarea' },
          { key: 'best_for', label: 'Best for', kind: 'text' },
          { key: 'note', label: 'Caveat', kind: 'text' }
        ]
      },
      { key: 'help_text', label: 'Line above the help button', kind: 'text', placeholder: "Still not sure? Send us your dates and we'll recommend the best route." },
      { key: 'cta_label', label: 'Help button', kind: 'text', placeholder: 'Help Me Choose' }
    ]
  },
  {
    type: 'expectations',
    label: 'What it can and cannot be',
    blurb: 'Two honest lists. Sets expectations before someone books a trip that is too short for what they want.',
    fields: [
      eyebrow,
      title,
      intro,
      { key: 'can_title', label: 'Left heading', kind: 'text', placeholder: 'Two days can give you' },
      { key: 'can', label: 'Can', kind: 'lines' },
      { key: 'cannot_title', label: 'Right heading', kind: 'text', placeholder: 'Two days cannot give you' },
      { key: 'cannot', label: 'Cannot', kind: 'lines' },
      { key: 'note', label: 'Closing line', kind: 'textarea' }
    ]
  },
  {
    type: 'priceguide',
    label: 'Price guide',
    blurb: 'What the options cost and why they differ, plus what moves a quote.',
    fields: [
      eyebrow,
      title,
      intro,
      {
        key: 'rows',
        label: 'Options',
        kind: 'items',
        fields: [
          { key: 'route', label: 'Option', kind: 'text', placeholder: 'Mikumi overnight' },
          { key: 'price', label: 'Price', kind: 'text', placeholder: 'From ~$850 pp' },
          { key: 'best_for', label: 'Usually best for', kind: 'text' },
          { key: 'tendency', label: 'Price tendency', kind: 'text', placeholder: 'Usually lower' },
          { key: 'why', label: 'Why it costs that way', kind: 'textarea' }
        ]
      },
      { key: 'small_print', label: 'Line under the table', kind: 'textarea' },
      { key: 'factors_title', label: 'Factors heading', kind: 'text', placeholder: 'Why your quote may change' },
      { key: 'factors', label: 'What moves the price', kind: 'lines' },
      { key: 'factors_note', label: 'Line under the factors', kind: 'textarea' },
      { key: 'note_label', label: 'Pull-quote label', kind: 'text', placeholder: 'Goldfinch note' },
      { key: 'note', label: 'Pull quote', kind: 'textarea' },
      { key: 'cta_label', label: 'Button', kind: 'text', placeholder: 'Check My Date and Group Size' }
    ]
  },
  {
    type: 'durations',
    label: 'Compare trip lengths',
    blurb: 'The shorter and longer versions of this trip, so a reader can size it correctly. Leave a link empty to mark the one they are already on.',
    fields: [
      eyebrow,
      title,
      intro,
      {
        key: 'options',
        label: 'Lengths',
        kind: 'items',
        fields: [
          { key: 'title', label: 'Heading', kind: 'text', placeholder: '3-Day Safari from Zanzibar' },
          { key: 'body', label: 'Body', kind: 'textarea' },
          { key: 'best_for', label: 'Best for', kind: 'text' },
          { key: 'href', label: 'Link', kind: 'text', hint: 'A path on this site. Leave empty for the page you are on — it renders as "you are viewing this option".', placeholder: '/3-day-safari-from-zanzibar' },
          { key: 'cta_label', label: 'Button', kind: 'text', placeholder: 'Ask About 3-Day Safari' }
        ]
      }
    ]
  }
];

/**
 * "Mid-range | 2-day-tarangire-midrange" → { label, slug }.
 *
 * A line with no pipe is taken as a bare slug and labelled from the tour it
 * resolves to, so a single-comfort route needs no ceremony.
 */
export const parseRouteTour = (line: string): { label: string; slug: string } => {
  const [first, ...rest] = str(line).split('|');
  const slug = (rest.length ? rest.join('|') : first).trim();
  return { label: rest.length ? first.trim() : '', slug };
};

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
