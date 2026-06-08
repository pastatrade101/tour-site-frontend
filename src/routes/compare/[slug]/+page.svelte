<script lang="ts">
  import { page } from '$app/stores';
  import PlaceholderPage from '$lib/components/public/PlaceholderPage.svelte';
</script>

<PlaceholderPage
  title="Compare Goldfinch Tours"
  description={`Prepared comparison page for ${$page.params.slug}.`}
/>
