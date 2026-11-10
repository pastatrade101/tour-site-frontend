/**
 * Server-rendered data for the Travel Journal's category and article pages,
 * shared by /blog/[slug] (categories, and articles at their old address) and
 * /blog/[category]/[slug] (articles).
 */
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { withLocale, type KnownLocale } from '$lib/i18n';
import { translateIn } from '$lib/i18n/ui';
import { shareImageOf } from '$lib/img';
import { toMetaText } from '$lib/richText';
import { titleWithBrand } from '$lib/seo';
import type { BlogCategory, BlogPost } from '$lib/types';

type Fetch = typeof fetch;

/** The JSON body's `data`, or null when the API has no such record (or is unreachable). */
const maybe = async <T>(url: string, fetchFn: Fetch): Promise<T | null> => {
  try {
    const body = await cachedJson<{ data?: T }>(url, fetchFn);
    return body.data ?? null;
  } catch {
    return null;
  }
};

const list = async <T>(url: string, fetchFn: Fetch): Promise<T[]> =>
  (await maybe<{ items?: T[] }>(url, fetchFn))?.items ?? [];

export const loadJournalCategory = async (slug: string, locale: KnownLocale, fetchFn: Fetch) => {
  const category = await maybe<BlogCategory>(withLocale(`${API_URL}/blog-categories/${encodeURIComponent(slug)}`, locale), fetchFn);
  if (!category) return null;
  const comingSoon = !category.published_posts;
  const [posts, others] = await Promise.all([
    comingSoon ? Promise.resolve([] as BlogPost[]) : list<BlogPost>(withLocale(`${API_URL}/blog?view=card&category_id=${category.id}&limit=100`, locale), fetchFn),
    // A coming-soon page points readers at the topics that are ready.
    comingSoon
      ? list<BlogCategory>(withLocale(`${API_URL}/blog-categories?status=published&limit=50`, locale), fetchFn)
          .then((items) => items.filter((item) => item.id !== category.id && item.published_posts))
      : Promise.resolve([] as BlogCategory[])
  ]);
  const heading = category.heading?.trim() || category.name;
  return {
    kind: 'category' as const,
    category,
    posts,
    others,
    journal: { noindex: comingSoon },
    availableLocales: category.available_locales ?? null,
    seo: {
      title: titleWithBrand(category.meta_title, heading),
      description: toMetaText(category.meta_description || category.intro || category.description || translateIn(locale, 'journal.hub_intro'), 160),
      ogImage: category.cover_image_url ?? undefined,
      imageAlt: category.image_alt || heading,
      type: 'website' as const
    }
  };
};

export const loadJournalArticle = async (slug: string, locale: KnownLocale, fetchFn: Fetch) => {
  const post = await maybe<BlogPost>(withLocale(`${API_URL}/blog/${encodeURIComponent(slug)}`, locale), fetchFn);
  if (!post) return null;
  let related = (post.related ?? []).filter((item) => item.id !== post.id);
  // Nothing picked by the editor: offer the newest articles from the same category.
  if (!related.length && post.category_id) {
    related = (await list<BlogPost>(withLocale(`${API_URL}/blog?view=card&category_id=${post.category_id}&limit=4`, locale), fetchFn))
      .filter((item) => item.id !== post.id)
      .slice(0, 3);
  }
  return {
    kind: 'article' as const,
    post,
    related,
    availableLocales: post.available_locales ?? null,
    seo: {
      title: titleWithBrand(post.meta_title, post.title),
      description: toMetaText(post.meta_description || post.excerpt || post.guide?.quick_answer || post.content || '', 160),
      ogImage: shareImageOf(post, 'og_image_url', 'featured_image_url'),
      imageAlt: post.featured_image_alt || post.title,
      type: 'article' as const
    }
  };
};
