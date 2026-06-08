<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import { placeholderDestinations } from '$lib/data/placeholders';
  import type { Destination } from '$lib/types';

  let destination: Destination | null = null;
  let loading = true;
  let error = '';

  $: heroImage = destination
    ? destination.banner_image_url || destination.main_image_url || destination.image_url || ''
    : '';

  onMount(async () => {
    const slug = $page.params.slug ?? '';
    try {
      const response = await api.destinations.get(slug);
      destination = response.data;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load destination.';
      destination = placeholderDestinations.find((item) => item.slug === slug) ?? placeholderDestinations[0];
    } finally {
      loading = false;
    }
  });
</script>

<section class="container-shell py-14">
  {#if loading}
    <LoadingState message="Loading destination..." />
  {:else if !destination}
    <ErrorState message={error || 'Destination not found.'} />
  {:else}
    <div class="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.16em] text-clay">{destination.country}</p>
        <h1 class="mt-3 text-4xl font-bold tracking-normal text-ink">{destination.name}</h1>
        <p class="mt-4 text-base leading-7 text-ink/70">{destination.description}</p>
      </div>
      <div class="aspect-[4/3] overflow-hidden rounded-lg bg-skywash shadow-soft">
        {#if heroImage}
          <img class="h-full w-full object-cover" src={heroImage} alt={destination.name} />
        {/if}
      </div>
    </div>
  {/if}
</section>
