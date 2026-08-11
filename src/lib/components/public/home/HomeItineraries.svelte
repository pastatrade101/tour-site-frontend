<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import type { Tour } from '$lib/types';
  import TourCardRich from '../TourCardRich.svelte';

  export let eyebrow = 'Featured Itineraries';
  export let title = 'Trip Ideas You Can Shape Around You';
  export let subtitle = '';
  export let tours: Tour[] = [];
  export let ctaHref = '/tours';
  export let ctaLabel = 'Browse all itineraries';

  type FilterChip = { key: string; label: string };

  let activeFilter = 'all';

  const categoryKey = (tour: Tour): string => tour.tour_categories?.slug || '';
  const categoryName = (tour: Tour): string => tour.tour_categories?.name || '';
  const titleCase = (value: string): string => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const matchesFilter = (tour: Tour, filter: string): boolean => {
    if (filter === 'all') return true;
    const [kind, value] = filter.split(':', 2);
    if (kind === 'category') return categoryKey(tour) === value;
    if (kind === 'persona') return (tour.persona_tags ?? []).includes(value);
    if (kind === 'tier') return tour.budget_tier === value;
    return false;
  };

  $: list = (tours ?? []).filter(Boolean);
  $: filters = Array.from(
    new Map(
      list.flatMap((tour): Array<[string, FilterChip]> => {
        const chips: Array<[string, FilterChip]> = [];
        if (categoryKey(tour) && categoryName(tour)) {
          const key = `category:${categoryKey(tour)}`;
          chips.push([key, { key, label: categoryName(tour) }]);
        }
        for (const persona of tour.persona_tags ?? []) {
          const key = `persona:${persona}`;
          chips.push([key, { key, label: titleCase(persona) }]);
        }
        if (tour.budget_tier) {
          const key = `tier:${tour.budget_tier}`;
          chips.push([key, { key, label: titleCase(tour.budget_tier) }]);
        }
        return chips;
      })
    ).values()
  );
  $: filteredTours = list.filter((tour) => matchesFilter(tour, activeFilter));
  $: visibleTours = filteredTours.slice(0, 6);
  $: if (activeFilter !== 'all' && !filters.some((filter) => filter.key === activeFilter)) activeFilter = 'all';

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
          <button type="button" aria-pressed={activeFilter === 'all'} class:active={activeFilter === 'all'} class="package-tab" on:click={() => (activeFilter = 'all')}>
            <span class="chip-dot" aria-hidden="true"></span>All trips
          </button>
          {#each filters as filter}
            <button type="button" aria-pressed={activeFilter === filter.key} class:active={activeFilter === filter.key} class="package-tab" on:click={() => (activeFilter = filter.key)}>
              <span class="chip-dot" aria-hidden="true"></span>{filter.label}
            </button>
          {/each}
        </div>
      {/if}

      {#key activeFilter}
        <div class="package-grid mt-8 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {#each visibleTours as tour (tour.slug)}
            <div class="package-card min-w-0">
              <TourCardRich {tour} showShortlist={false} />
            </div>
          {/each}
        </div>
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

  .chip-dot {
    width: 0.375rem;
    height: 0.375rem;
    flex: 0 0 auto;
    border-radius: 999px;
    background: rgb(var(--c-ink) / 0.24);
    transition: background-color 180ms ease, box-shadow 180ms ease;
  }

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

  .package-tab.active .chip-dot {
    background: rgb(var(--c-goldfinch-gold));
    box-shadow: 0 0 0 3px rgb(var(--c-goldfinch-gold) / 0.16);
  }

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
      padding-bottom: 0.75rem;
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
    .package-grid { margin-top: 1.5rem; gap: 0.875rem; }
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
