import { api } from '$lib/api/client';
import { postHref } from '$lib/journal';
import type { BlogPost } from '$lib/types';

export type LinkOption = { label: string; value: string };
export type LinkGroup = { label: string; options: LinkOption[] };

/**
 * Real pages of this site, offered as a dropdown wherever an editor would
 * otherwise type a path by hand.
 *
 * Typing paths by hand is how a CMS accumulates links to pages that never
 * existed or were renamed later — and nothing tells the editor, because a
 * wrong-but-well-formed path passes every validation we have. Everything below
 * is either a route that exists in the app or a published record read back from
 * the API, so a chosen link resolves by construction.
 */

/** Fixed routes — these are pages in the app, not CMS records. */
const STATIC_PAGES: LinkOption[] = [
  { label: 'Home', value: '/' },
  { label: 'Plan my trip', value: '/plan-my-trip' },
  { label: 'All tours', value: '/tours' },
  { label: 'Destinations', value: '/destinations' },
  { label: 'Experiences', value: '/experiences' },
  { label: 'Travel styles', value: '/travel-styles' },
  { label: 'Safari packages', value: '/safari-packages' },
  { label: 'Accommodation', value: '/accommodation' },
  { label: 'Expert advice', value: '/expert-advice' },
  { label: 'Compare destinations', value: '/compare' },
  { label: 'Destination scores', value: '/destination-scores' },
  { label: 'Departures', value: '/departures' },
  { label: 'Trip finder', value: '/trip-finder' },
  { label: 'Gallery', value: '/gallery' },
  { label: 'Guides', value: '/guides' },
  { label: 'Travel Journal', value: '/blog' },
  { label: 'About us', value: '/about' },
  { label: 'Contact', value: '/contact' },
  { label: 'Health & safety', value: '/safety' },
  { label: 'Privacy policy', value: '/privacy' },
  { label: 'Terms', value: '/terms' },
  { label: 'Cancellation policy', value: '/cancellation-policy' }
];

/** In-page anchors the landing-page template itself renders. */
const ANCHORS: LinkOption[] = [{ label: 'Enquiry form on this page', value: '#lead-form' }];

type Row = Record<string, unknown>;

const toOptions = (rows: Row[], prefix: string, key: 'name' | 'title'): LinkOption[] =>
  rows
    .filter((row) => typeof row?.slug === 'string' && row.slug)
    .map((row) => ({ label: String(row[key] ?? row.slug), value: `${prefix}${row.slug}` }))
    .sort((a, b) => a.label.localeCompare(b.label));

const settled = <T>(result: PromiseSettledResult<{ data: { items?: T[] } }>): T[] =>
  result.status === 'fulfilled' ? result.value.data.items ?? [] : [];

/**
 * Published records only. A draft page is a 404 to a visitor, so offering one
 * here would just be a slower way of typing a broken path.
 */
export const loadInternalLinks = async (): Promise<LinkGroup[]> => {
  const params = { status: 'published', limit: 200 } as const;

  const [destinations, categories, tours, activities, lodges, packages, posts, journalCategories] = await Promise.allSettled([
    api.destinations.list(params),
    api.categories.list(params),
    api.tours.list(params),
    api.activities.list(params),
    api.lodges.list(params),
    api.safariPackages.list(params),
    api.blog.list({ ...params, view: 'card' }),
    api.blogCategories.list(params)
  ]);

  const groups: LinkGroup[] = [
    { label: 'Pages', options: STATIC_PAGES },
    { label: 'On this page', options: ANCHORS },
    { label: 'Destinations', options: toOptions(settled<Row>(destinations), '/destinations/', 'name') },
    { label: 'Travel styles', options: toOptions(settled<Row>(categories), '/safari-styles/', 'name') },
    { label: 'Tours', options: toOptions(settled<Row>(tours), '/tours/', 'title') },
    { label: 'Experiences', options: toOptions(settled<Row>(activities), '/experiences/', 'name') },
    { label: 'Accommodation', options: toOptions(settled<Row>(lodges), '/accommodation/', 'name') },
    // Safari packages are served from the root: /6-day-classic-safari.
    { label: 'Safari packages', options: toOptions(settled<Row>(packages), '/', 'name') },
    // Journal articles live under their category: /blog/safaris/how-much-…
    {
      label: 'Travel Journal topics',
      // A category page with nothing published is a "coming soon" page.
      options: settled<Row>(journalCategories)
        .filter((row) => typeof row.slug === 'string' && row.slug && Number(row.published_posts ?? 0) > 0)
        .map((row) => ({ label: String(row.name ?? row.slug), value: `/blog/${row.slug}` }))
        .sort((a, b) => a.label.localeCompare(b.label))
    },
    {
      label: 'Travel Journal articles',
      options: settled<BlogPost>(posts)
        .filter((post) => post.slug)
        .map((post) => ({ label: post.title, value: postHref(post) }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }
  ];

  // A group with nothing published in it is noise in the dropdown.
  return groups.filter((group) => group.options.length > 0);
};

let shared: { at: number; links: Promise<LinkGroup[]> } | null = null;

/**
 * The same list, loaded once and shared by every field on the page (an
 * article can have dozens of text fields). Refreshed after two minutes so a
 * page published meanwhile shows up.
 */
export const internalLinks = (): Promise<LinkGroup[]> => {
  if (!shared || Date.now() - shared.at > 120_000) {
    const links = loadInternalLinks();
    shared = { at: Date.now(), links };
    links.catch(() => { shared = null; });
  }
  return shared.links;
};

/** True when `href` is one of the offered links, so we know to show the picker rather than the free-text box. */
export const isKnownLink = (groups: LinkGroup[], href: string) =>
  Boolean(href) && groups.some((group) => group.options.some((option) => option.value === href));
