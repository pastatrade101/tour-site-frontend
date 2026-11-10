/**
 * The block vocabulary for Travel Journal guides, as the editor presents it.
 *
 * The same types and field names are cleaned by the API (backend
 * utils/blog-guide.ts) and drawn by JournalBlock.svelte. Adding a block type
 * means an entry here, one there, and a branch in the renderer.
 */
import type { BlogGuideBlock } from '$lib/types';

/** A guide as the editor holds it: every text present as a string, so inputs can bind to it. */
export type EditableSection = { _id: string; title: string; toc_label: string; blocks: BlogGuideBlock[] };
export type EditableGuide = {
  quick_answer: string;
  intro: string;
  takeaways: string[];
  sections: EditableSection[];
  final_cta: { heading: string; text: string; button: string; href: string; secondary_label: string; secondary_href: string };
};

export type GuideFieldKind = 'rich' | 'text' | 'textarea' | 'lines' | 'image' | 'href' | 'icon' | 'cells';

export type GuideField = {
  key: string;
  label: string;
  kind: GuideFieldKind;
  hint?: string;
  placeholder?: string;
};

export type GuideBlockSpec = {
  type: string;
  label: string;
  blurb: string;
  fields: GuideField[];
  /** A repeatable list inside the block, e.g. table rows or FAQ items. */
  items?: { key: string; label: string; fields: GuideField[] };
};

/** Icon names the public page can draw (JournalIcon.svelte). */
export const GUIDE_ICON_NAMES = [
  'plane', 'trees', 'car', 'bed', 'route', 'compass', 'map', 'calendar', 'wallet', 'users', 'clock',
  'shield', 'camera', 'utensils', 'binoculars', 'ticket', 'luggage', 'sun'
] as const;

/** Topic-group heading icons (backend schemas/blog-categories.schema.ts TOPIC_ICONS). */
export const TOPIC_ICON_NAMES = ['compass', 'map', 'calendar', 'backpack', 'tent', 'palm', 'binoculars', 'scale', 'plane', 'mountain', 'waves', 'camera'] as const;

export const GUIDE_BLOCK_TYPES: GuideBlockSpec[] = [
  {
    type: 'text',
    label: 'Text',
    blurb: 'Paragraphs, sub-headings, lists, bold and links.',
    fields: [{ key: 'body', label: 'Text', kind: 'rich', hint: 'Use H3 for sub-headings inside this section.' }]
  },
  {
    type: 'table',
    label: 'Table',
    blurb: 'A comparison or price table. On phones each row becomes a small card.',
    fields: [
      { key: 'head', label: 'Column headings', kind: 'lines', hint: 'One heading per line. The first column names each row.' },
      { key: 'caption', label: 'What the table shows (for screen readers)', kind: 'text' },
      { key: 'note', label: 'Note under the table', kind: 'textarea', hint: 'E.g. the date prices were checked and what they assume.' }
    ],
    items: { key: 'rows', label: 'Row', fields: [{ key: 'cells', label: 'Cells', kind: 'cells' }] }
  },
  {
    type: 'advisor_note',
    label: "Advisor's note",
    blurb: 'A short, practical tip set apart from the text.',
    fields: [
      { key: 'body', label: 'The note', kind: 'textarea' },
      { key: 'attribution', label: 'Signed by', kind: 'text', placeholder: 'Goldfinch Adventures — Travel Planning Team' },
      { key: 'label', label: 'Small label (optional)', kind: 'text', placeholder: "Advisor's note" }
    ]
  },
  {
    type: 'pullquote',
    label: 'Pull quote',
    blurb: 'One sentence worth remembering, set large.',
    fields: [{ key: 'text', label: 'Quote', kind: 'textarea' }]
  },
  {
    type: 'image',
    label: 'Photo',
    blurb: 'A photo inside the text, with an optional caption.',
    fields: [
      { key: 'image_url', label: 'Photo', kind: 'image' },
      { key: 'alt', label: 'Describe the photo (alt text)', kind: 'text' },
      { key: 'caption', label: 'Caption', kind: 'text' }
    ]
  },
  {
    type: 'icon_list',
    label: 'Icon list',
    blurb: 'Short items with an icon each — e.g. what a price is made of.',
    fields: [{ key: 'title', label: 'Small heading (optional)', kind: 'text' }],
    items: { key: 'items', label: 'Item', fields: [{ key: 'icon', label: 'Icon', kind: 'icon' }, { key: 'label', label: 'Label', kind: 'text' }] }
  },
  {
    type: 'questions',
    label: 'Checked questions',
    blurb: 'A ticked list of questions, each with an explanation.',
    fields: [],
    items: { key: 'items', label: 'Question', fields: [{ key: 'title', label: 'Question', kind: 'text' }, { key: 'body', label: 'Explanation', kind: 'rich' }] }
  },
  {
    type: 'steps',
    label: 'Numbered steps',
    blurb: 'A journey or process, step by step.',
    fields: [],
    items: { key: 'items', label: 'Step', fields: [{ key: 'title', label: 'Step title', kind: 'text' }, { key: 'body', label: 'Step text', kind: 'rich' }] }
  },
  {
    type: 'comparison',
    label: 'Comparison',
    blurb: 'Options side by side (two) or one under another (three or more).',
    fields: [],
    items: { key: 'items', label: 'Option', fields: [{ key: 'title', label: 'Option', kind: 'text' }, { key: 'body', label: 'Description', kind: 'rich' }] }
  },
  {
    type: 'checkboxes',
    label: 'Tick-off checklist',
    blurb: 'Items a reader can tick off, e.g. before departure.',
    fields: [
      { key: 'title', label: 'Checklist heading', kind: 'text', placeholder: 'Departure checklist' },
      { key: 'items', label: 'Items', kind: 'lines', hint: 'One per line.' }
    ]
  },
  {
    type: 'faq',
    label: 'Questions and answers',
    blurb: 'Expandable questions; also offered to search engines as an FAQ.',
    fields: [],
    items: { key: 'items', label: 'Question', fields: [{ key: 'question', label: 'Question', kind: 'text' }, { key: 'answer', label: 'Answer', kind: 'rich' }] }
  },
  {
    type: 'cta',
    label: 'Call to action',
    blurb: 'A box with a button, in the middle of the article.',
    fields: [
      { key: 'heading', label: 'Heading', kind: 'text' },
      { key: 'text', label: 'Text', kind: 'textarea' },
      { key: 'button', label: 'Button', kind: 'text', placeholder: 'Plan My Trip' },
      { key: 'href', label: 'Button link', kind: 'href', hint: 'Leave empty to open Plan My Trip.' }
    ]
  },
  {
    type: 'links',
    label: 'Related links',
    blurb: 'A lead-in line with links to tours or other pages.',
    fields: [{ key: 'text', label: 'Lead-in', kind: 'textarea' }],
    items: { key: 'items', label: 'Link', fields: [{ key: 'label', label: 'Link text', kind: 'text' }, { key: 'href', label: 'Link', kind: 'href' }] }
  }
];

export const guideBlockSpec = (type: string) => GUIDE_BLOCK_TYPES.find((spec) => spec.type === type);

/** Short, unique ids: translations are keyed by them, so they never change once made. */
export const newGuideId = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

export const emptyGuideBlock = (type: string): BlogGuideBlock => {
  const spec = guideBlockSpec(type);
  const block: BlogGuideBlock = { _id: newGuideId('b'), type };
  for (const field of spec?.fields ?? []) block[field.key] = field.kind === 'lines' ? [] : '';
  if (spec?.items) block[spec.items.key] = [];
  return block;
};

export const emptyGuideRow = (spec: GuideBlockSpec): Record<string, unknown> => {
  const row: Record<string, unknown> = { _id: newGuideId('r') };
  for (const field of spec.items?.fields ?? []) row[field.key] = field.kind === 'cells' ? [] : field.kind === 'icon' ? 'compass' : '';
  return row;
};

export const emptySection = (): EditableSection => ({ _id: newGuideId('s'), title: '', toc_label: '', blocks: [emptyGuideBlock('text')] });

export const emptyGuide = (): EditableGuide => ({
  quick_answer: '',
  intro: '',
  takeaways: [],
  sections: [],
  final_cta: { heading: '', text: '', button: '', href: '', secondary_label: '', secondary_href: '' }
});

/** A guide as loaded from the API, with every part the editor binds to present. */
export const normaliseGuide = (value: unknown): EditableGuide => {
  const base = emptyGuide();
  if (!value || typeof value !== 'object') return base;
  const guide = value as Partial<EditableGuide> & { final_cta?: Record<string, string | null> | null };
  const cta: Record<string, string | null | undefined> = guide.final_cta ?? {};
  return {
    quick_answer: guide.quick_answer ?? '',
    intro: guide.intro ?? '',
    takeaways: Array.isArray(guide.takeaways) ? guide.takeaways : [],
    sections: (Array.isArray(guide.sections) ? guide.sections : []).map((section) => ({
      _id: section._id || newGuideId('s'),
      title: section.title ?? '',
      toc_label: section.toc_label ?? '',
      blocks: (Array.isArray(section.blocks) ? section.blocks : []).map((block) => ({ ...block, _id: block._id || newGuideId('b') }))
    })),
    final_cta: {
      heading: cta.heading ?? '', text: cta.text ?? '', button: cta.button ?? '', href: cta.href ?? '',
      secondary_label: cta.secondary_label ?? '', secondary_href: cta.secondary_href ?? ''
    }
  };
};
