<script lang="ts">
  // Renders a JSON-LD schema block in <head> (SRS v2.0 §7.4: TouristTrip, FAQPage,
  // BreadcrumbList, etc.). Pass any schema.org object as `data`.
  //
  // Svelte does NOT interpolate {mustache} inside a <script> element, so we inject
  // the tag via {@html}. The literal "<script" string is built by concatenation so
  // Svelte's compiler doesn't mistake it for a real script tag, and we escape "<"
  // in the JSON so it can never break out of the closing tag.
  export let data: Record<string, unknown>;

  const OPEN = '<scr' + 'ipt type="application/ld+json">';
  const CLOSE = '</scr' + 'ipt>';
  $: json = JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');
</script>

<svelte:head>
  {@html OPEN + json + CLOSE}
</svelte:head>
