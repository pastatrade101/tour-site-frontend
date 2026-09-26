<script lang="ts">
  import LegalLayout from '$lib/components/public/LegalLayout.svelte';
  import { sanitizeRichText } from '$lib/richText';
  import type { PageData } from './$types';

  export let data: PageData;

  // Edited in Admin → Settings, in the visitor's language where published.
  $: doc = data.legal;
</script>

<LegalLayout title={doc.title} updated={doc.updated} intro={doc.intro}>
  {@html sanitizeRichText(doc.body)}
</LegalLayout>
