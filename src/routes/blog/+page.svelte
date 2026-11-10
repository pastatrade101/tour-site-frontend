<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/ui';
  import { breadcrumbLd } from '$lib/seo';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import JournalBreadcrumbs from '$lib/components/public/journal/JournalBreadcrumbs.svelte';
  import JournalCategoryCard from '$lib/components/public/journal/JournalCategoryCard.svelte';
  import JournalPlanningCta from '$lib/components/public/journal/JournalPlanningCta.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  $: categories = data.categories ?? [];
  $: crumbs = [{ label: $t('nav.home'), href: '/' }, { label: $t('journal.hub_title') }];
</script>

<JsonLd data={breadcrumbLd($page.url.origin, [{ name: $t('nav.home'), path: '/' }, { name: $t('journal.hub_title'), path: '/blog' }])} />

<JournalBreadcrumbs items={crumbs} />

<header class="mx-auto max-w-[720px] px-5 pb-10 pt-[60px] text-center xl:pt-10">
  <h1 class="font-serif text-[30px] font-semibold leading-[1.15] text-heading md:text-[44px]">{$t('journal.hub_title')}</h1>
  <p class="mt-3 text-[16px] leading-[1.7] text-ink/70 md:text-[17px]">{$t('journal.hub_intro')}</p>
</header>

<section class="container-shell pb-16" aria-labelledby="journal-topics">
  {#if categories.length}
    <h2 id="journal-topics" class="font-serif text-[24px] font-semibold leading-tight text-heading md:text-[30px]">{$t('journal.explore_by_topic')}</h2>
    <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each categories as category (category.id)}
        <JournalCategoryCard {category} />
      {/each}
    </div>
  {:else}
    <p id="journal-topics" class="mx-auto max-w-xl text-center text-ink/70">{$t('journal.hub_empty')}</p>
  {/if}
</section>

<JournalPlanningCta />
