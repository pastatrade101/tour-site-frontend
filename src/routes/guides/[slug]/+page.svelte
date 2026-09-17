<script lang="ts">
  import { t } from '$lib/i18n/ui';
  import { page } from '$app/stores';
  import PlaceholderPage from '$lib/components/public/PlaceholderPage.svelte';
</script>

<PlaceholderPage
  title={$t('ui.goldfinch_travel_guide')}
  description={`Prepared guide page for ${$page.params.slug}.`}
  showAdvisor
/>
