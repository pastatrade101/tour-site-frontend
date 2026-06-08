<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import { placeholderDestinations } from '$lib/data/placeholders';
  import type { Destination } from '$lib/types';

  let destinations: Destination[] = placeholderDestinations;
  let loading = true;

  onMount(async () => {
    try {
      const response = await api.destinations.list();
      destinations = response.data.items.length ? response.data.items : placeholderDestinations;
    } finally {
      loading = false;
    }
  });
</script>

<section class="container-shell py-14">
  <SectionHeader eyebrow="Destinations" title="Places to Explore" description="Public destination cards connected to the destinations API." />
  <div class="mt-8">
    {#if loading}
      <LoadingState message="Loading destinations..." />
    {:else}
      <div class="grid gap-6 md:grid-cols-3">
        {#each destinations as destination}
          <DestinationCard {destination} />
        {/each}
      </div>
    {/if}
  </div>
</section>
