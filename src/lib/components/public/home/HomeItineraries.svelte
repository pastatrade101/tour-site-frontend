<script lang="ts">
  import { ArrowRight, Heart, Palmtree, PawPrint, ShieldCheck, Users } from '@lucide/svelte';
  import type { Tour } from '$lib/types';
  import TourCard from '../TourCard.svelte';

  export let eyebrow = 'Featured Itineraries';
  export let title = 'Trip Ideas You Can Shape Around You';
  export let subtitle = '';
  export let tours: Tour[] = [];
  export let ctaHref = '/tours';
  export let ctaLabel = 'Browse all itineraries';

  type FilterChip = { key: string; label: string; match: RegExp; icon: typeof PawPrint };

  const filters: FilterChip[] = [
    { key: 'safari-from-zanzibar', label: 'Safari from Zanzibar', match: /safari from zanzibar|zanzibar.*safari|safari.*zanzibar/i, icon: Palmtree },
    { key: 'private-safari', label: 'Private Safari', match: /private safari|private/i, icon: ShieldCheck },
    { key: 'family-safaris', label: 'Family Safaris', match: /family|families/i, icon: Users },
    { key: 'honeymoon-safaris', label: 'Honeymoon Safaris', match: /honeymoon|romantic|couples?/i, icon: Heart },
    { key: 'great-migration', label: 'Great Migration', match: /great migration|migration/i, icon: PawPrint }
  ];

  let activeFilter = filters[0].key;

  const categoryKey = (tour: Tour): string => tour.tour_categories?.slug || '';
  const categoryName = (tour: Tour): string => tour.tour_categories?.name || '';
  const matchesFilter = (tour: Tour, filter: string): boolean => {
    const definition = filters.find((item) => item.key === filter);
    if (!definition) return false;
    const searchable = [tour.title, tour.slug, tour.experience_type, categoryKey(tour), categoryName(tour), ...(tour.persona_tags ?? [])].filter(Boolean).join(' ');
    return definition.match.test(searchable);
  };

  $: list = (tours ?? []).filter(Boolean);
  $: filteredTours = list.filter((tour) => matchesFilter(tour, activeFilter));
  $: visibleTours = filteredTours.slice(0, 6);

</script>

{#if list.length}
  <section id="featured-itineraries" class="home-itineraries scroll-mt-20 bg-surface py-14 md:py-20 lg:py-24">
    <div class="container-shell">
      <div class="flex items-end justify-between gap-8">
        <div class="min-w-0 max-w-3xl">
          {#if eyebrow}
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-clay">{eyebrow}</p>
          {/if}
          {#if title}
            <h2 class="mt-4 font-serif text-3xl font-semibold leading-[1.08] tracking-normal text-heading sm:text-4xl lg:text-[46px]">{title}</h2>
          {/if}
          {#if subtitle}
            <p class="mt-3 max-w-2xl text-[15px] leading-7 text-ink/65 lg:hidden">{subtitle}</p>
          {/if}
        </div>
        <a href={ctaHref} data-cta="browse-all-itineraries" class="group hidden shrink-0 items-center gap-3 pb-1 text-[15px] font-bold text-clay transition hover:text-heading lg:inline-flex">
          {ctaLabel}
          <ArrowRight size={18} class="transition-transform group-hover:translate-x-1" />
        </a>
      </div>

      {#if filters.length}
        <div class="filter-rail mt-8 lg:mt-11" aria-label="Filter featured itineraries">
          {#each filters as filter}
            <button type="button" aria-pressed={activeFilter === filter.key} class:active={activeFilter === filter.key} class="package-tab" on:click={() => (activeFilter = filter.key)}>
              <svelte:component this={filter.icon} size={15} strokeWidth={2.2} class="chip-icon" aria-hidden="true" />{filter.label}
            </button>
          {/each}
        </div>
      {/if}

      {#key activeFilter}
        {#if visibleTours.length}<div class="package-grid mt-8 grid gap-5 lg:grid-cols-3 lg:gap-6">{#each visibleTours as tour (tour.slug)}<div class="package-card min-w-0"><TourCard {tour} showShortlist={false} /></div>{/each}</div>
        {:else}<div class="mt-8 border-y border-ink/10 py-10 text-sm text-ink/55">No featured itineraries are assigned to this collection yet.</div>{/if}
      {/key}

      <a href={ctaHref} data-cta="browse-all-itineraries-mobile" class="mt-6 inline-flex items-center gap-2 text-sm font-bold text-clay lg:hidden">
        {ctaLabel} <ArrowRight size={16} />
      </a>
    </div>
  </section>
{/if}

<style>
  .filter-rail {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
    padding-block: 0.25rem;
  }

  .package-tab {
    display: inline-flex;
    min-height: 42px;
    max-width: 100%;
    align-items: center;
    gap: 0.5rem;
    flex: 0 0 auto;
    border: 1px solid rgb(var(--c-ink) / 0.14);
    border-radius: 10px;
    background: rgb(var(--c-sand) / 0.42);
    padding: 0.625rem 1rem;
    color: rgb(var(--c-heading) / 0.72);
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.15;
    white-space: nowrap;
    transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
  }

  :global(.chip-icon) { flex: 0 0 auto; color: rgb(var(--c-forest) / 0.72); transition: color 180ms ease, transform 180ms ease; }

  .package-tab:hover {
    border-color: rgb(var(--c-forest) / 0.4);
    color: rgb(var(--c-heading));
  }

  .package-tab.active {
    border-color: rgb(var(--c-deep-green));
    background: rgb(var(--c-deep-green));
    color: white;
    box-shadow: 0 4px 12px rgb(var(--c-deep-green) / 0.16);
    animation: chip-select 240ms ease-out;
  }

  .package-tab.active :global(.chip-icon) { color: rgb(var(--c-goldfinch-gold)); transform: scale(1.06); }

  .package-grid { animation: cards-enter 280ms ease-out both; }

  @keyframes chip-select {
    0% { transform: scale(0.96); }
    65% { transform: scale(1.025); }
    100% { transform: scale(1); }
  }

  @keyframes cards-enter {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .package-tab.active, .package-grid { animation: none; }
  }

  @media (max-width: 1023px) {
    .filter-rail {
      width: calc(100% + (var(--container-pad, 1.25rem) * 2));
      margin-inline: calc(var(--container-pad, 1.25rem) * -1);
      flex-wrap: nowrap;
      gap: 0.5rem;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      padding: 0.25rem var(--container-pad, 1.25rem) 0.5rem;
      scroll-padding-inline: var(--container-pad, 1.25rem);
      scrollbar-width: none;
      -ms-overflow-style: none;
      -webkit-overflow-scrolling: touch;
    }

    .filter-rail::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }

    .package-tab {
      min-height: 40px;
      padding-inline: 0.875rem;
      font-size: 0.78rem;
    }

    .package-grid {
      --package-card-width: min(88vw, 390px);
      display: flex;
      margin-inline: calc(var(--container-pad, 1.25rem) * -1);
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scroll-padding-inline: calc((100vw - var(--package-card-width)) / 2);
      padding-inline: max(var(--container-pad, 1.25rem), calc((100vw - var(--package-card-width)) / 2));
      /*
        Room above and below the cards, inside the scrollport.
        `overflow-x: auto` forces the other axis to compute to auto as well, so
        this element clips vertically whether or not it ever scrolls that way.
        With no padding above, a card sat flush against that edge and its
        shadow — 30px of blur reaching about 20px past the top — was sliced off
        square, which read as the cards sitting in a box rather than floating.
        The hover lift had nowhere to go either and simply disappeared into the
        cut. The space below covers the larger shadow the hover state swaps in.
      */
      padding-block: 1.25rem 2.75rem;
      scrollbar-width: none;
    }

    .package-grid::-webkit-scrollbar { display: none; }
    .package-card {
      width: var(--package-card-width);
      flex: 0 0 auto;
      scroll-snap-align: center;
      scroll-snap-stop: always;
    }
  }

  @media (max-width: 639px) {
    .home-itineraries { padding-block: 3.25rem; }
    /* Margin gives way to the padding added above, so the gap under the filter
       chips is the 1.5rem it always was — the space just moved inside the
       scrollport, where it can hold a shadow. */
    .package-grid { margin-top: 0.25rem; gap: 0.875rem; }
  }

  @media (min-width: 640px) and (max-width: 1023px) {
    .package-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-inline: 0;
      overflow: visible;
      padding: 0;
    }

    .package-card { width: auto; }
  }
</style>
