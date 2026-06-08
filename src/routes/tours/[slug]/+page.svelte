<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import Button from '$lib/components/public/Button.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import { placeholderTours } from '$lib/data/placeholders';
  import type { Tour } from '$lib/types';

  let tour: Tour | null = null;
  let loading = true;
  let error = '';

  onMount(async () => {
    const slug = $page.params.slug ?? '';
    try {
      const response = await api.tours.get(slug);
      tour = response.data;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tour.';
      tour = placeholderTours.find((item) => item.slug === slug) ?? placeholderTours[0];
    } finally {
      loading = false;
    }
  });
</script>

<section class="container-shell py-14">
  {#if loading}
    <LoadingState message="Loading tour..." />
  {:else if !tour}
    <ErrorState message={error || 'Tour not found.'} />
  {:else}
    <div class="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div class="aspect-[16/10] overflow-hidden rounded-lg bg-skywash">
          {#if tour.main_image_url}
            <img class="h-full w-full object-cover" src={tour.main_image_url} alt={tour.title} />
          {/if}
        </div>
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-clay">{tour.duration_days ?? 1} days</p>
        <h1 class="mt-3 text-4xl font-bold tracking-normal text-ink">{tour.title}</h1>
        <p class="mt-4 text-base leading-7 text-ink/70">{tour.full_description ?? tour.short_description}</p>
        <div class="mt-8">
          <Button href={`/booking/${tour.slug}`}>Request Booking</Button>
        </div>
      </div>
      <div>
        <BookingForm {tour} />
      </div>
    </div>
  {/if}
</section>
