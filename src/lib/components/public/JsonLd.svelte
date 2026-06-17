<script lang="ts">
  // Renders a JSON-LD schema block in <head> (SRS v2.0 §7.4: TouristTrip, FAQPage,
  // BreadcrumbList, etc.). Pass any schema.org object as `data`.
  export let data: Record<string, unknown>;
  $: json = JSON.stringify({ '@context': 'https://schema.org', ...data });
</script>

<svelte:head>
  <script type="application/ld+json">{json}</script>
</svelte:head>
