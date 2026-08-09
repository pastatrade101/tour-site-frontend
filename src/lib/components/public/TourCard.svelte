<script lang="ts">
  import { trackEvent } from '$lib/analytics';
  import { imgUrl, thumbUrl, sourceFor } from '$lib/img';
  import { tilt } from '$lib/animations';
  import { currency, formatUsd } from '$lib/currency';
  import { Image as ImageIcon } from '@lucide/svelte';
  import { toMetaText } from '$lib/richText';
  import { getTourDestinationLabel } from '$lib/tourDestinations';
  import ShortlistButton from './ShortlistButton.svelte';
  import type { Tour } from '$lib/types';

  export let tour: Tour;

  $: tourImage = sourceFor(tour, 700, 'main_image_url', 'banner_image_url');
  $: destinationLabel = getTourDestinationLabel(tour, 2);
  $: item = {
    slug: tour.slug,
    title: tour.title,
    image_url: tourImage,
    duration_days: tour.duration_days,
    price_from: tour.price_from,
    currency: tour.currency,
    destination: destinationLabel
  };
  $: priceLabel = tour.price_from ? formatUsd(tour.price_from, $currency) : '';
  $: summary = toMetaText(tour.short_description || tour.full_description || '', 190);
</script>

<article class="group relative flex h-full flex-col overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(57,61,50,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(57,61,50,0.16)]" use:tilt={{ max: 5 }}>
  <div class="absolute right-3 top-3 z-10">
    <ShortlistButton {item} />
  </div>
  <a href={`/tours/${tour.slug}`} class="flex h-full flex-col" on:click={() => trackEvent('tour_card_click', { tour_id: tour.id, tour_title: tour.title })}>
    <div class="aspect-[4/3] overflow-hidden bg-skywash">
      {#if tourImage}
        <img class="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110" src={imgUrl(tourImage, 700)} alt={tour.title} loading="lazy" decoding="async" />
      {:else}
        <div class="grid h-full w-full place-items-center bg-skywash text-forest/35">
          <ImageIcon size={30} />
        </div>
      {/if}
    </div>
    <div class="flex flex-1 flex-col p-5">
      <p class="text-sm font-semibold text-clay">{tour.duration_days ? `${tour.duration_days} ${tour.duration_days === 1 ? 'day' : 'days'}` : 'Customisable itinerary'}</p>
      <h3 class="mt-2 text-xl font-bold tracking-normal text-ink">{tour.title}</h3>
      {#if summary}<p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{summary}</p>{/if}
      <div class="mt-auto flex items-center justify-between pt-5 text-sm">
        <span class="font-semibold text-forest">{#if priceLabel}From {priceLabel}{:else}Price on request{/if}</span>
        <span class="font-semibold text-ink">View</span>
      </div>
    </div>
  </a>
</article>
