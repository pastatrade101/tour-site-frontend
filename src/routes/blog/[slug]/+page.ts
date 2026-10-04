import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { cachedJson } from '$lib/cache';
import { localeFromPath, withLocale } from '$lib/i18n';
import { toMetaText } from '$lib/richText';
import { titleWithBrand } from '$lib/seo';
import type { BlogPost } from '$lib/types';
import { shareImageOf } from '$lib/img';

/**
 * Fetch the article during SSR so search engines and link-preview bots receive
 * the actual headline, article body and metadata rather than a loading shell.
 */
export const load: PageLoad = async ({ fetch, params, url }) => {
  // A translated page (/fr/blog/…) reads the article in its own language.
  const locale = localeFromPath(url.pathname);
  try {
    const body = await cachedJson<{ data?: BlogPost }>(withLocale(`${API_URL}/blog/${encodeURIComponent(params.slug)}`, locale), fetch);
    const post = body.data ?? null;
    if (!post) throw error(404, 'Article not found');

    return {
      post,
      availableLocales: post.available_locales ?? null,
      seo: {
        title: titleWithBrand(post.meta_title, post.title),
        description: toMetaText(post.meta_description || post.excerpt || post.content || '', 160),
        ogImage: shareImageOf(post, 'og_image_url', 'featured_image_url'),
        imageAlt: post.title,
        type: 'article' as const
      }
    };
  } catch (cause) {
    if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
    throw error(404, 'Article not found');
  }
};
