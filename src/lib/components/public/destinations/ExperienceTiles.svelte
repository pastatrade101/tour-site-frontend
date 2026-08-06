<script lang="ts">
  /**
   * "Browse by experience" — a row of tiles, one per experience facet, each
   * showing how many destinations actually match it.
   *
   * Only facets that real destinations carry are rendered, so the row is as
   * long as the data supports and no tile ever reads "0 destinations".
   */
  import { createEventDispatcher } from 'svelte';
  import type { Facet } from '$lib/destinationFacets';

  export let facets: Facet[] = [];
  export let counts: Record<string, number> = {};
  export let activeFacet = '';
  export let title = 'Browse by experience';

  const dispatch = createEventDispatcher<{ facet: string }>();

  $: shown = facets.filter((facet) => (counts[facet.key] ?? 0) > 0);
</script>

{#if shown.length}
  <section aria-label={title}>
    <p class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">
      <span class="h-3 w-[3px] rounded-full bg-goldfinch-gold" aria-hidden="true"></span>
      {title}
    </p>

    <!-- scrolls on mobile rather than wrapping into a ragged block -->
    <div class="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5">
      {#each shown as facet (facet.key)}
        {@const active = activeFacet === facet.key}
        {@const count = counts[facet.key] ?? 0}
        <button
          type="button"
          class={`group flex min-w-[190px] snap-start items-center gap-3 rounded-[10px] border px-4 py-3.5 text-left transition duration-200 md:min-w-0
            ${active
              ? 'border-goldfinch-gold bg-goldfinch-gold/10 shadow-card'
              : 'border-ink/10 bg-surface hover:-translate-y-0.5 hover:border-goldfinch-gold/50 hover:shadow-card'}
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold`}
          aria-pressed={active}
          on:click={() => dispatch('facet', active ? '' : facet.key)}
        >
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-sand/70 text-lg transition group-hover:bg-sand" aria-hidden="true">
            {facet.icon}
          </span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-extrabold text-heading">{facet.label}</span>
            <span class="block text-xs text-ink/50">{count} {count === 1 ? 'destination' : 'destinations'}</span>
          </span>
        </button>
      {/each}
    </div>
  </section>
{/if}
