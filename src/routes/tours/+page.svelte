<script lang="ts">
  import { browser } from '$app/environment';
  import { X } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { placeholderTours } from '$lib/data/placeholders';
  import type { Destination, Tour } from '$lib/types';

  let tours: Tour[] = [];
  let loading = true;
  let error = '';

  // slug -> { id, name } lookups, fetched once to resolve hero filters + label chips.
  const destLookup = new Map<string, { id: string; name: string }>();
  const catLookup = new Map<string, { id: string; name: string }>();
  let lookupsReady = false;

  let activeDestination: { slug: string; name: string } | null = null;
  let activeCategory: { slug: string; name: string } | null = null;

  $: params = $page.url.searchParams;
  $: searchTerm = params.get('search')?.trim() ?? '';
  $: destSlug = params.get('destination')?.trim() ?? '';
  $: catSlug = params.get('category')?.trim() ?? '';
  $: hasFilters = Boolean(searchTerm || destSlug || catSlug);

  const ensureLookups = async () => {
    if (lookupsReady) return;
    try {
      const [dest, cat] = await Promise.all([
        api.destinations.list({ status: 'published', limit: 100 }),
        api.categories.list({ status: 'published', limit: 100 })
      ]);
      for (const item of dest.data.items as Destination[]) {
        if (item.slug) destLookup.set(item.slug, { id: item.id, name: item.name });
      }
      for (const item of cat.data.items as Array<Record<string, unknown>>) {
        if (item.slug) catLookup.set(String(item.slug), { id: String(item.id), name: String(item.name ?? item.slug) });
      }
    } catch {
      // resolution falls back to no filter
    }
    lookupsReady = true;
  };

  const load = async (search: string, dSlug: string, cSlug: string) => {
    loading = true;
    error = '';
    if (dSlug || cSlug) await ensureLookups();

    const dest = dSlug ? destLookup.get(dSlug) : undefined;
    const cat = cSlug ? catLookup.get(cSlug) : undefined;
    activeDestination = dest ? { slug: dSlug, name: dest.name } : null;
    activeCategory = cat ? { slug: cSlug, name: cat.name } : null;

    const query: Record<string, string | number> = { limit: 24 };
    if (search) query.search = search;
    if (dest) query.destination_id = dest.id;
    if (cat) query.category_id = cat.id;

    const filtered = Boolean(search || dest || cat);
    try {
      const response = await api.tours.list(query);
      const items = response.data.items;
      // Fall back to sample tours only when not filtering, so a search shows a true empty state.
      tours = items.length ? items : filtered ? [] : placeholderTours;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tours.';
      tours = filtered ? [] : placeholderTours;
    } finally {
      loading = false;
    }
  };

  // Re-run whenever any query filter changes (hero search + navbar search navigate here).
  $: if (browser) void load(searchTerm, destSlug, catSlug);

  const removeFilter = (key: string) => {
    const next = new URLSearchParams($page.url.searchParams);
    next.delete(key);
    void goto(`/tours${next.toString() ? `?${next}` : ''}`);
  };
  const clearAll = () => void goto('/tours');
</script>

<section class="container-shell py-14">
  <SectionHeader
    eyebrow="Tours"
    title={hasFilters ? 'Matching tours' : 'Tour Packages'}
    description={hasFilters
      ? 'Trips that match your search — adjust the filters below to refine.'
      : 'Explore trusted East Africa tour packages — safaris, Kilimanjaro, gorilla trekking and beaches.'}
  />

  {#if hasFilters}
    <div class="mt-4 flex flex-wrap items-center gap-2">
      <span class="text-sm font-medium text-ink/50">Filters:</span>
      {#if destSlug}
        <button
          class="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-3 py-1 text-sm font-semibold text-forest transition hover:bg-forest/10"
          type="button"
          on:click={() => removeFilter('destination')}
        >
          {activeDestination?.name ?? destSlug}
          <X size={13} />
        </button>
      {/if}
      {#if catSlug}
        <button
          class="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-3 py-1 text-sm font-semibold text-forest transition hover:bg-forest/10"
          type="button"
          on:click={() => removeFilter('category')}
        >
          {activeCategory?.name ?? catSlug}
          <X size={13} />
        </button>
      {/if}
      {#if searchTerm}
        <button
          class="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-3 py-1 text-sm font-semibold text-forest transition hover:bg-forest/10"
          type="button"
          on:click={() => removeFilter('search')}
        >
          “{searchTerm}”
          <X size={13} />
        </button>
      {/if}
      <button class="text-sm font-semibold text-forest underline-offset-2 hover:underline" type="button" on:click={clearAll}>
        Clear all
      </button>
    </div>
  {/if}

  <div class="mt-8">
    {#if loading}
      <LoadingState message="Loading tours..." />
    {:else if error && tours.length === 0}
      <ErrorState message={error} />
    {:else if tours.length === 0}
      <EmptyState
        title="No tours match your filters"
        message="Try a different destination or experience — or plan a custom trip and we'll tailor it to you."
      />
    {:else}
      <div class="grid gap-6 md:grid-cols-3">
        {#each tours as tour}
          <TourCard {tour} />
        {/each}
      </div>
    {/if}
  </div>
</section>
