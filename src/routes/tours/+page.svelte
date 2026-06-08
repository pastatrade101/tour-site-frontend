<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { placeholderTours } from '$lib/data/placeholders';
  import type { Tour } from '$lib/types';

  let tours: Tour[] = [];
  let loading = true;
  let error = '';

  $: searchTerm = $page.url.searchParams.get('search')?.trim() ?? '';

  const load = async (search: string) => {
    loading = true;
    error = '';
    try {
      const response = await api.tours.list(search ? { search, limit: 24 } : { limit: 24 });
      const items = response.data.items;
      // Fall back to sample tours only when not searching, so a search shows a true empty state.
      tours = items.length ? items : search ? [] : placeholderTours;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tours.';
      tours = search ? [] : placeholderTours;
    } finally {
      loading = false;
    }
  };

  // Re-run whenever the ?search= query changes (navbar search navigates here).
  $: if (browser) void load(searchTerm);
</script>

<section class="container-shell py-14">
  <SectionHeader
    eyebrow="Tours"
    title={searchTerm ? `Search results for “${searchTerm}”` : 'Tour Packages'}
    description={searchTerm ? 'Showing tours that match your search.' : 'Explore trusted East Africa tour packages — safaris, Kilimanjaro, gorilla trekking and beaches.'}
  />
  <div class="mt-8">
    {#if loading}
      <LoadingState message="Loading tours..." />
    {:else if error && tours.length === 0}
      <ErrorState message={error} />
    {:else if tours.length === 0}
      <EmptyState title={searchTerm ? `No tours match “${searchTerm}”` : 'No tours yet'} message={searchTerm ? 'Try a different search, or browse all tours.' : undefined} />
    {:else}
      <div class="grid gap-6 md:grid-cols-3">
        {#each tours as tour}
          <TourCard {tour} />
        {/each}
      </div>
    {/if}
  </div>
</section>
