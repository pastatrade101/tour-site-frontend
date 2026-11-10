/**
 * Travel Journal helpers shared by the hub, category pages, article pages and
 * the CMS preview links. Everything here is derived from CMS records — no
 * article, category or price is written into the code.
 */
import { toMetaText } from '$lib/richText';
import type { BlogCategory, BlogGuideBlock, BlogPost, BlogTopicGroup } from '$lib/types';

export const JOURNAL_BASE = '/blog';

/** An article lives under its category: /blog/{category}/{slug}. Uncategorised ones stay at /blog/{slug}. */
export const postHref = (post: Pick<BlogPost, 'slug' | 'blog_categories'>): string =>
  post.blog_categories?.slug ? `${JOURNAL_BASE}/${post.blog_categories.slug}/${post.slug}` : `${JOURNAL_BASE}/${post.slug}`;

export const categoryHref = (category: Pick<BlogCategory, 'slug'>): string => `${JOURNAL_BASE}/${category.slug}`;

/** A category is "coming soon" until it has a published article. */
export const isComingSoon = (category: Pick<BlogCategory, 'published_posts'>): boolean => !category.published_posts;

const anchorOf = (title: string, taken: Set<string>): string => {
  const base = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section';
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
  taken.add(id);
  return id;
};

export type ArticleSection = { id: string; title: string; toc: string; blocks: BlogGuideBlock[] };
export type ArticleLayout = {
  /** Body text before the first section (simple articles only). */
  lead: string;
  sections: ArticleSection[];
  structured: boolean;
};

/**
 * The sections an article is read in. A structured guide uses its own; a
 * simple article is split at its H2 headings so it gets the same "On this
 * page" navigation without anyone re-entering it.
 */
export const articleLayout = (post: Pick<BlogPost, 'guide' | 'content'>): ArticleLayout => {
  const taken = new Set<string>();
  const guideSections = (post.guide?.sections ?? []).filter((section) => section.title?.trim() || section.blocks?.length);
  if (guideSections.length) {
    return {
      lead: '',
      structured: true,
      sections: guideSections.map((section) => {
        const title = section.title?.trim() ?? '';
        return { id: anchorOf(title || section._id, taken), title, toc: section.toc_label?.trim() || title, blocks: section.blocks ?? [] };
      })
    };
  }

  const html = String(post.content ?? '');
  const heading = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  const marks = [...html.matchAll(heading)];
  if (!marks.length) return { lead: html, sections: [], structured: false };
  const sections = marks.map((mark, index) => {
    const start = (mark.index ?? 0) + mark[0].length;
    const end = index + 1 < marks.length ? marks[index + 1].index ?? html.length : html.length;
    const title = toMetaText(mark[1], 200);
    return { id: anchorOf(title, taken), title, toc: title, blocks: [{ _id: `h${index}`, type: 'text', body: html.slice(start, end) }] };
  });
  return { lead: html.slice(0, marks[0].index ?? 0), sections, structured: false };
};

/** Every word a reader will meet, for the reading-time estimate. */
const collectText = (value: unknown, out: string[]): void => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectText(item, out));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === '_id' || key === 'type' || key === 'icon' || key.endsWith('href') || key === 'image_url') continue;
      collectText(item, out);
    }
  }
};

export const readingMinutes = (post: Pick<BlogPost, 'guide' | 'content' | 'excerpt'>): number => {
  const parts: string[] = [];
  collectText(post.guide ?? null, parts);
  if (!post.guide?.sections?.length) parts.push(String(post.content ?? ''));
  const words = toMetaText(parts.join(' '), 1_000_000).match(/\S+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 220));
};

export type DirectoryGroup = { group: BlogTopicGroup; posts: BlogPost[] };

/**
 * "All Articles": topic groups with their published articles, in the CMS
 * order, split into two columns of similar height. Empty groups are left out;
 * articles without a group are collected under `otherTitle` at the end.
 */
export const directoryColumns = (posts: BlogPost[], groups: BlogTopicGroup[], otherTitle: string): DirectoryGroup[][] => {
  const entries: DirectoryGroup[] = [];
  const known = new Set(groups.map((group) => group.id));
  for (const group of groups) {
    const items = posts.filter((post) => post.topic_group_id === group.id);
    if (items.length) entries.push({ group, posts: items });
  }
  const loose = posts.filter((post) => !post.topic_group_id || !known.has(post.topic_group_id));
  if (loose.length) entries.push({ group: { id: '__other', title: otherTitle, icon: 'compass' }, posts: loose });

  const columns: DirectoryGroup[][] = [[], []];
  const weights = [0, 0];
  for (const entry of entries) {
    const column = weights[0] <= weights[1] ? 0 : 1;
    columns[column].push(entry);
    weights[column] += 2 + entry.posts.reduce((total, post) => total + Math.ceil(post.title.length / 48), 0);
  }
  return columns.filter((column) => column.length);
};

/** Links the CMS may point a button at: a site path or a full web address. */
export const isExternal = (href: string): boolean => /^https?:\/\//i.test(href);
