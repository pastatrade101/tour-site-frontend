<script lang="ts">
  /**
   * One inline filter row: search, a dropdown per facet group, then the CTA.
   *
   * On mobile the same controls stay inline — the selects become a compact
   * horizontally-scrolling row rather than opening a filter sheet — so nothing
   * is hidden behind a popup and the bar stays one tap deep.
   */
  import { createEventDispatcher } from 'svelte';
  import { ChevronDown, Search, X } from '@lucide/svelte';
  import type { FacetGroup } from '$lib/destinationFacets';

  export let value = '';
  export let groups: FacetGroup[] = [];
  export let activeGroup = '';
  export let activeFacet = '';
  export let resultCount = 0;
  export let popular: { label: string; href: string }[] = [];
  export let placeholder = 'Search destinations, parks, islands or wildlife…';

  const dispatch = createEventDispatcher<{ facet: { group: string; facet: string }; clear: void }>();

  // "All experience" reads wrong, and naive pluralisation gives "All wildlifes".
  // Group labels are a known, small set, so they are spelled out.
  const ALL_LABELS: Record<string, string> = {
    experience: 'All experiences',
    region: 'All regions',
    wildlife: 'All wildlife',
    'length of stay': 'Any length'
  };
  const allLabel = (group: FacetGroup) =>
    ALL_LABELS[group.label.toLowerCase()] ?? `All ${group.label.toLowerCase()}`;

  const onSelect = (group: FacetGroup, event: Event) =>
    dispatch('facet', { group: group.key, facet: (event.currentTarget as HTMLSelectElement).value });

  const jumpToResults = () =>
    document.getElementById('all-destinations')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Derived reactively rather than via a helper called from the template: Svelte
  // tracks the variables an expression *names*, so a labelFor(group) helper would
  // only re-run when `group` changed, leaving the trigger stuck on "All regions"
  // after a selection.
  $: shown = groups.slice(0, 3).map((group) => {
    const current = activeGroup === group.key ? activeFacet : '';
    return {
      group,
      current,
      label: group.facets.find((facet) => facet.key === current)?.label ?? allLabel(group)
    };
  });
  $: hasFilter = Boolean(activeFacet || value.trim());
</script>

<div class="destination-search-card rounded-[14px] border border-ink/10 bg-surface p-2 shadow-[0_10px_30px_rgba(57,61,50,0.08)]">
  <!-- single row from md up; on mobile the selects drop to their own scroll row -->
  <div class="destination-search-row gap-2 md:flex md:items-center md:gap-1">
    <!-- search -->
    <div class="destination-search-input flex h-12 items-center gap-2.5 rounded-[10px] border border-ink/12 px-3.5 transition focus-within:border-goldfinch-gold focus-within:ring-2 focus-within:ring-goldfinch-gold/25 md:h-14 md:min-w-0 md:flex-[1.6]">
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

    <!-- facet dropdowns: inline on desktop, one scroll row on mobile -->
    <div class="destination-filter-row -mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] md:mx-0 md:flex-[2] md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
      {#each shown as { group, current, label } (group.key)}
        <label
          class="destination-filter-select relative flex h-12 min-w-[150px] shrink-0 cursor-pointer flex-col justify-center gap-0.5 rounded-[10px] pl-3.5 pr-8 transition hover:bg-sand/40 focus-within:bg-sand/40 focus-within:ring-2 focus-within:ring-goldfinch-gold/30 md:h-14 md:min-w-0 md:flex-1 md:border-l md:border-ink/8 md:pl-4"
        >
          <span class="gf-label">{group.label}</span>
          <span class={`truncate text-sm font-bold ${current ? 'text-heading' : 'text-ink/70'}`}>{label}</span>
          <ChevronDown size={15} class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden="true" />
          <!-- the real control sits on top, invisible, so the styled row keeps the
               native picker, keyboard support and the mobile wheel -->
          <select
            class="absolute inset-0 cursor-pointer opacity-0"
            aria-label={group.label}
            value={current}
            on:change={(event) => onSelect(group, event)}
          >
            <option value="">{allLabel(group)}</option>
            {#each group.facets as facet (facet.key)}
              <option value={facet.key}>{facet.label}</option>
            {/each}
          </select>
        </label>
      {/each}
    </div>

    <button
      type="button"
      class="destination-filter-submit inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-goldfinch-gold px-6 text-sm font-extrabold text-heading transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold md:h-14 md:px-8"
      on:click={jumpToResults}
    >
      <Search size={17} aria-hidden="true" />
      <span class="md:hidden">Show {resultCount}</span>
      <span class="hidden md:inline">Search</span>
    </button>
  </div>

  <!-- popular shortcuts; scrolls rather than wrapping to three rows on mobile -->
  <div class="destination-popular-row mt-2 flex items-center gap-2 border-t border-ink/8 px-2 pb-0.5 pt-2.5">
    <span class="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Popular</span>
    <div class="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] md:flex-wrap [&::-webkit-scrollbar]:hidden">
      {#each popular as item (item.href)}
        <a
          class="shrink-0 whitespace-nowrap rounded-full bg-sand/60 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-sand hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          href={item.href}
          data-sveltekit-preload-data="hover"
        >
          {item.label}
        </a>
      {/each}
    </div>
    {#if hasFilter}
      <button
        type="button"
        class="shrink-0 whitespace-nowrap text-xs font-bold text-clay underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
        on:click={() => dispatch('clear')}
      >
        Clear
      </button>
    {/if}
    <span class="hidden shrink-0 text-xs font-semibold text-ink/45 md:inline" aria-live="polite">
      {resultCount} {resultCount === 1 ? 'destination' : 'destinations'}
    </span>
  </div>
</div>

<style>
  @media (max-width: 767px) {
    .destination-search-card {
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      padding: 0;
    }

    .destination-search-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.55rem;
      align-items: center;
    }

    .destination-search-input {
      min-width: 0;
      height: 2.85rem;
      border-color: rgb(var(--c-ink) / 0.12);
      border-radius: 14px;
      background: rgb(var(--c-surface));
      padding-inline: 0.85rem;
      box-shadow: 0 10px 24px rgb(57 61 50 / 0.06);
    }

    .destination-search-input input {
      font-size: 0.9rem;
      font-weight: 650;
    }

    .destination-search-input input::placeholder {
      color: rgb(var(--c-ink) / 0.42);
    }

    .destination-filter-submit {
      height: 2.85rem;
      border-radius: 14px;
      padding-inline: 0.95rem;
      font-size: 0.78rem;
      line-height: 1;
      white-space: nowrap;
      box-shadow: 0 10px 24px rgb(57 61 50 / 0.08);
    }

    .destination-filter-row {
      grid-column: 1 / -1;
      margin-inline: -16px;
      padding-inline: 16px;
      scroll-padding-inline: 16px;
      gap: 0.45rem;
      overflow-x: auto;
    }

    .destination-filter-select {
      min-width: min(48vw, 190px);
      height: 2.35rem;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      border: 1px solid rgb(var(--c-ink) / 0.1);
      border-radius: 999px;
      background: rgb(var(--c-surface));
      padding: 0 1.9rem 0 0.9rem;
      box-shadow: 0 8px 20px rgb(57 61 50 / 0.04);
    }

    .destination-filter-select :global(.gf-label) {
      display: none;
    }

    .destination-filter-select span:not(.gf-label) {
      max-width: 100%;
      font-size: 0.76rem;
      line-height: 1;
    }

    .destination-filter-select :global(svg) {
      right: 0.75rem;
    }

    .destination-popular-row {
      display: none;
    }
  }

  @media (max-width: 479px) {
    .destination-search-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .destination-filter-submit {
      width: 100%;
    }
  }

  @media (min-width: 480px) and (max-width: 767px) {
    .destination-filter-submit {
      min-width: 6.8rem;
    }
  }
</style>
