<script lang="ts">
  import JournalArticle from '$lib/components/public/journal/JournalArticle.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<JournalArticle post={data.post} related={data.related} />
