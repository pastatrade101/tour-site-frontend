<script lang="ts">
  import JournalArticle from '$lib/components/public/journal/JournalArticle.svelte';
  import JournalCategoryPage from '$lib/components/public/journal/JournalCategoryPage.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

{#if data.kind === 'category'}
  <JournalCategoryPage category={data.category} posts={data.posts} others={data.others} />
{:else}
  <JournalArticle post={data.post} related={data.related} />
{/if}
