<script lang="ts">
  /**
   * A journal category (/blog/safaris): featured guides, then every published
   * article grouped by topic in two balanced columns. With nothing published
   * yet it is a "coming soon" page that points to the topics that are ready.
   */
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/ui';
  import { breadcrumbLd } from '$lib/seo';
  import { categoryHref, directoryColumns } from '$lib/journal';
  import type { BlogCategory, BlogPost } from '$lib/types';
  import Img from '../Img.svelte';
  import JsonLd from '../JsonLd.svelte';
  import JournalBreadcrumbs from './JournalBreadcrumbs.svelte';
  import JournalCategoryCard from './JournalCategoryCard.svelte';
  import JournalFeaturedCard from './JournalFeaturedCard.svelte';
  import JournalPlanningCta from './JournalPlanningCta.svelte';
  import JournalTopicGroup from './JournalTopicGroup.svelte';

  export let category: BlogCategory;
  export let posts: BlogPost[] = [];
  export let others: BlogCategory[] = [];

  $: heading = category.heading?.trim() || category.name;
  $: comingSoon = !category.published_posts;
  $: featured = posts.filter((post) => post.featured).slice(0, 3);
  $: columns = directoryColumns(posts, category.topic_groups ?? [], $t('journal.other_articles'));
  $: crumbs = [{ label: $t('nav.home'), href: '/' }, { label: $t('journal.hub_title'), href: '/blog' }, { label: category.name }];
</script>

<JsonLd data={breadcrumbLd($page.url.origin, [{ name: $t('nav.home'), path: '/' }, { name: $t('journal.hub_title'), path: '/blog' }, { name: category.name, path: categoryHref(category) }])} />

<JournalBreadcrumbs items={crumbs} />

{#if comingSoon}
  <section class="mx-auto max-w-[720px] px-5 py-14 text-center">
    {#if category.cover_image_url}
      <Img src={category.cover_image_url} alt={category.image_alt || category.name} width={1200} sizes="(max-width: 760px) 92vw, 720px" eager className="mx-auto aspect-[16/7] w-full rounded-[12px] object-cover" />
    {/if}
    <span class="mt-8 inline-block rounded-full bg-sand px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-heading">{$t('journal.coming_soon')}</span>
    <h1 class="mt-4 font-serif text-[30px] font-semibold leading-[1.15] text-heading md:text-[44px]">{heading}</h1>
    {#if category.intro}<p class="mt-3 text-[16px] leading-[1.7] text-ink/70">{category.intro}</p>{/if}
    <p class="mt-3 text-[16px] leading-[1.7] text-ink/70">{$t('journal.coming_soon_text')}</p>
    <a href="/blog" class="mt-6 inline-block text-[15px] font-semibold text-clay hover:underline">{$t('journal.back_to_journal')}</a>
  </section>
  {#if others.length}
    <section class="container-shell pb-16">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each others as item (item.id)}<JournalCategoryCard category={item} />{/each}
      </div>
    </section>
  {/if}
{:else}
  <header class="mx-auto max-w-[760px] px-5 pb-10 pt-[60px] text-center xl:pt-10">
    <h1 class="font-serif text-[30px] font-semibold leading-[1.15] text-heading md:text-[44px]">{heading}</h1>
    {#if category.intro || category.description}
      <p class="mt-3 text-[16px] leading-[1.7] text-ink/70 md:text-[17px]">{category.intro || category.description}</p>
    {/if}
  </header>

  {#if featured.length}
    <section class="container-shell" aria-labelledby="journal-featured">
      <h2 id="journal-featured" class="font-serif text-[24px] font-semibold leading-tight text-heading md:text-[30px]">{category.featured_heading?.trim() || $t('journal.essential_guides')}</h2>
      <div class="mt-5 grid gap-5 md:grid-cols-3">
        {#each featured as post (post.id)}<JournalFeaturedCard {post} compact />{/each}
      </div>
    </section>
  {/if}

  <section class="container-shell pb-16 {featured.length ? 'pt-14' : ''}" aria-labelledby="journal-all">
    <div class={featured.length ? 'border-t border-ink/10 pt-10' : ''}>
      <h2 id="journal-all" class="font-serif text-[24px] font-semibold leading-tight text-heading md:text-[30px]">{$t('journal.all_articles')}</h2>
      <p class="mt-2 text-[15.5px] text-ink/70">{$t('journal.all_articles_intro')}</p>
      <div class="mt-8 grid items-start gap-x-12 gap-y-9 md:grid-cols-2">
        {#each columns as column, index (index)}
          <div class="min-w-0 space-y-9">
            {#each column as entry (entry.group.id)}<JournalTopicGroup group={entry.group} posts={entry.posts} />{/each}
          </div>
        {/each}
      </div>
    </div>
  </section>
{/if}

<JournalPlanningCta />
