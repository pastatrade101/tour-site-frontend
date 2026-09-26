<script lang="ts">
  import { t } from '$lib/i18n/ui';
  import LegalLayout from '$lib/components/public/LegalLayout.svelte';
  import { sanitizeRichText } from '$lib/richText';
  import { publicSettings, settingText } from '$lib/settings';
  import type { PageData } from './$types';

  export let data: PageData;

  // Edited in Admin → Settings, in the visitor's language where published.
  $: doc = data.legal;
  $: notice = settingText($publicSettings, 'data_retention_notice');
</script>

<LegalLayout title={doc.title} updated={doc.updated} intro={doc.intro}>
  {#if notice}
    <h2>{$t('ui.our_retention_notice')}</h2>
    <p>{notice}</p>
    <hr />
  {/if}
  {@html sanitizeRichText(doc.body)}
</LegalLayout>
