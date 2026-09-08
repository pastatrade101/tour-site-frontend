/**
 * The Advisor's Note, resolved once for every page that shows it.
 *
 * It appeared three different ways: the homepage card driven by the CMS, the
 * same card on the tours listing with its heading and columns hardcoded, and a
 * different layout entirely on a safari-style page reading per-category text.
 * A visitor who saw two of them saw two different companies making two
 * different promises.
 *
 * There is one section now, and this is where its content comes from — the
 * `advisor_note` homepage section, so an editor changes it in one place and
 * every page follows.
 *
 * Only keys the CMS actually fills are returned. Everything else is left off so
 * the component's own defaults apply, rather than being restated here where the
 * two copies would drift.
 */
/** One of the two lists beside the note. The component renders at most two. */
export type AdvisorColumn = { icon_url?: string; title: string; items: string[] };

/** The shape of a homepage section record, as every page already holds it. */
export type AdvisorNoteSection = {
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  extra_data?: Record<string, unknown> | null;
};

const text = (value: unknown): string | undefined => {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  return cleaned || undefined;
};

/** Columns survive only if they carry a title and at least one real line. */
const columnsFrom = (value: unknown): AdvisorColumn[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const columns = value
    .map((entry) => {
      const column = (entry ?? {}) as Record<string, unknown>;
      return {
        icon_url: text(column.icon_url),
        title: text(column.title) ?? '',
        items: (Array.isArray(column.items) ? column.items : []).map((item) => String(item ?? '').trim()).filter(Boolean)
      };
    })
    .filter((column) => column.title && column.items.length);
  return columns.length ? columns : undefined;
};

export type AdvisorNoteProps = {
  eyebrow?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  authorName?: string;
  authorRole?: string;
  footnote?: string;
  columns?: AdvisorColumn[];
};

/**
 * `sections` is the homepage sections keyed by `section_key`, which every page
 * showing this already loads.
 */
export const advisorNoteProps = (
  sections: Record<string, AdvisorNoteSection | undefined> | null | undefined
): AdvisorNoteProps => {
  const section = sections?.advisor_note;
  const extra = (section?.extra_data ?? {}) as Record<string, unknown>;

  const props: AdvisorNoteProps = {
    eyebrow: text(extra.eyebrow),
    title: text(section?.title),
    body: text(section?.subtitle),
    imageUrl: text(section?.image_url),
    authorName: text(extra.author_name),
    authorRole: text(extra.author_role),
    footnote: text(extra.footnote),
    columns: columnsFrom(extra.columns)
  };

  // Undefined keys would override the component's defaults with nothing.
  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)) as AdvisorNoteProps;
};

/** The homepage switch still governs it: off there means off everywhere. */
export const advisorNoteEnabled = (
  sections: Record<string, AdvisorNoteSection | undefined> | null | undefined
): boolean => sections?.advisor_note?.is_active !== false;
