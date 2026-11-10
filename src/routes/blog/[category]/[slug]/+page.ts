import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { localeFromPath, localizeHref, type KnownLocale } from '$lib/i18n';
import { postHref } from '$lib/journal';
import { loadJournalArticle } from '$lib/journalLoad';

/** /blog/{category}/{slug}. An article moved to another category is sent to its current address. */
export const load: PageLoad = async ({ fetch, params, url }) => {
  const locale = localeFromPath(url.pathname) as KnownLocale;
  const article = await loadJournalArticle(params.slug, locale, fetch);
  if (!article) throw error(404, 'Article not found');
  const canonical = postHref(article.post);
  if (canonical !== `/blog/${params.category}/${params.slug}`) throw redirect(301, `${localizeHref(canonical, locale)}${url.search}`);
  return article;
};
