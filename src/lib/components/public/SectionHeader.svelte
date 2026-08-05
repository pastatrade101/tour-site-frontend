<script lang="ts">
  import { revealHeading } from '$lib/animations';
  export let eyebrow = '';
  export let title = '';
  export let description = '';
</script>

<div class="max-w-2xl">
  {#if eyebrow}
    <p class="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-goldfinch-gold">
      <span class="h-px w-8 bg-goldfinch-gold/70"></span>
      {eyebrow}
    </p>
  {/if}
  {#key title}
    <h2 class="mt-3 text-3xl font-bold leading-tight tracking-normal text-ink md:text-4xl" use:revealHeading>{title}</h2>
  {/key}
  {#if description}
    <p class="mt-3 text-base leading-7 text-ink/70 md:text-lg">{description}</p>
  {/if}
</div>
