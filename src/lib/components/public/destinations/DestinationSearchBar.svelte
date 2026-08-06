<script lang="ts">
  /**
   * The raised search card that straddles the hero seam: free-text search plus
   * one dropdown per facet group, then a row of popular shortcuts.
   *
   * The dropdowns are built from the same facet groups that drive the rest of
   * the page, so an option only exists when real destinations match it.
   */
  import { createEventDispatcher } from 'svelte';
  import { Search, X } from '@lucide/svelte';
  import type { FacetGroup } from '$lib/destinationFacets';

  export let value = '';
  export let groups: FacetGroup[] = [];
  export let activeGroup = '';
  export let activeFacet = '';
  export let resultCount = 0;
  export let popular: { label: string; href: string }[] = [];
  export let placeholder = 'Search destinations, parks, islands or wildlife…';

  const dispatch = createEventDispatcher<{ facet: { group: string; facet: string }; clear: void }>();

  // One dropdown per group; the selected option is only kept on the group that
  // is currently driving the filter, so the controls can never disagree.
  const valueFor = (group: FacetGroup) => (activeGroup === group.key ? activeFacet : '');

  const onSelect = (group: FacetGroup, event: Event) => {
    const facet = (event.currentTarget as HTMLSelectElement).value;
    dispatch('facet', { group: group.key, facet });
  };
</script>

<div class="rounded-[12px] bg-surface p-3 shadow-[0_24px_60px_rgba(57,61,50,0.16)] md:p-4">
  <div class="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.75fr))_auto] lg:items-stretch">
    <!-- free-text -->
    <div class="flex h-14 items-center gap-3 rounded-[10px] bg-sand/40 px-4 transition focus-within:bg-sand/60 focus-within:ring-2 focus-within:ring-goldfinch-gold/40">
      <Search size={18} class="shrink-0 text-ink/40" aria-hidden="true" />
      <input
        class="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium text-heading outline-none placeholder:text-ink/40"
        type="search"
        {placeholder}
        aria-label="Search destinations"
        bind:value
      />
      {#if value.trim()}
        <button
          type="button"
          class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/40 transition hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          aria-label="Clear search"
          on:click={() => (value = '')}
        >
          <X size={15} />
        </button>
      {/if}
    </div>

    <!-- one select per facet group -->
    {#each groups.slice(0, 3) as group (group.key)}
      <label class="flex h-14 flex-col justify-center rounded-[10px] bg-sand/40 px-4 transition focus-within:bg-sand/60 focus-within:ring-2 focus-within:ring-goldfinch-gold/40">
        <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">{group.label}</span>
        <select
          class="-ml-0.5 mt-0.5 w-full cursor-pointer appearance-none bg-transparent text-sm font-bold text-heading outline-none"
          value={valueFor(group)}
          on:change={(event) => onSelect(group, event)}
        >
          <option value="">All {group.label.toLowerCase()}</option>
          {#each group.facets as facet (facet.key)}
            <option value={facet.key}>{facet.label}</option>
          {/each}
        </select>
      </label>
    {/each}

    <button
      type="button"
      class="inline-flex h-14 items-center justify-center gap-2 rounded-[10px] bg-heading px-7 text-sm font-bold text-white transition hover:bg-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold lg:px-9"
      on:click={() => document.getElementById('all-destinations')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
    >
      <Search size={17} aria-hidden="true" />
      Search
    </button>
  </div>

  <div class="mt-3 flex flex-wrap items-center gap-2 px-1 pb-1">
    <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Popular</span>
    {#each popular as item (item.href)}
      <a
        class="rounded-full bg-sand/60 px-3.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-sand hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        href={item.href}
        data-sveltekit-preload-data="hover"
      >
        {item.label}
      </a>
    {/each}
    <span class="ml-auto text-xs font-semibold text-ink/45" aria-live="polite">
      {resultCount} {resultCount === 1 ? 'destination' : 'destinations'}
    </span>
  </div>
</div>
