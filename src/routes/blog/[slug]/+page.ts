import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { localeFromPath, localizeHref, type KnownLocale } from '$lib/i18n';
import { postHref } from '$lib/journal';
import { loadJournalArticle, loadJournalCategory } from '$lib/journalLoad';

/**
 * /blog/{slug} is a category page (/blog/safaris). Articles live under their
 * category now; one reached at its old address is sent there permanently, so
 * existing links and search results keep working. An article without a
 * category is still read here.
 */
export const load: PageLoad = async ({ fetch, params, url }) => {
  const locale = localeFromPath(url.pathname) as KnownLocale;
  const category = await loadJournalCategory(params.slug, locale, fetch);
  if (category) return category;

  const article = await loadJournalArticle(params.slug, locale, fetch);
  if (!article) throw error(404, 'Article not found');
  const canonical = postHref(article.post);
  if (canonical !== `/blog/${params.slug}`) throw redirect(301, `${localizeHref(canonical, locale)}${url.search}`);
  return article;
};
