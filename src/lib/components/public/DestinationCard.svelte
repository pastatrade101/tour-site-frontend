<script lang="ts">
  import { ArrowRight, MapPin } from '@lucide/svelte';
  import { currency, formatUsd } from '$lib/currency';
  import { imgUrl, thumbUrl, sourceFor } from '$lib/img';
  import type { Destination } from '$lib/types';

  export let destination: Destination;
  export let href = `/destinations/${destination.slug}`;

  $: imageUrl = sourceFor(destination, 800, 'main_image_url', 'image_url', 'banner_image_url');
  $: summary = destination.short_description || destination.description || '';
  $: locationLabel = [destination.region, destination.country].filter(Boolean).join(', ') || destination.location || '';
  $: budgetLabel = destination.score_budget_from ? formatUsd(destination.score_budget_from, $currency) : '';
</script>

<article class="group flex h-full flex-col overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-card-hover">
  <a {href} class="flex h-full flex-col">
    <!-- image -->
    <div class="relative aspect-[4/3] overflow-hidden bg-skywash">
      {#if imageUrl}
        <img class="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105" src={imgUrl(imageUrl, 800)} alt={destination.name} loading="lazy" decoding="async" />
      {:else}
        <div class="grid h-full w-full place-items-center bg-gradient-to-br from-sand to-savanna/50 text-forest/40"><MapPin size={30} /></div>
      {/if}
      {#if destination.country}
        <span class="absolute left-3 top-3 rounded-[6px] bg-ink/75 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">{destination.country}</span>
      {/if}
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent"></div>
    </div>

    <!-- body -->
    <div class="flex flex-1 flex-col p-5">
      {#if destination.region}
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-clay">{destination.region}</p>
      {/if}
      <h3 class="mt-1.5 font-serif text-xl font-bold tracking-normal text-ink">{destination.name}</h3>
      {#if summary}
        <p class="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">{summary}</p>
      {/if}

      {#if locationLabel}
        <p class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest">
          <MapPin size={14} strokeWidth={2.4} />
          {locationLabel}
        </p>
      {/if}

      <div class="mt-auto pt-5">
        {#if destination.score_budget_from}
          <p class="mb-3 text-sm text-ink/60">Starting budget <span class="font-bold text-clay">{budgetLabel}</span></p>
        {/if}
        <span class="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[8px] bg-deep-green px-4 text-xs font-bold text-white transition group-hover:bg-forest">
          View destination <ArrowRight size={14} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  </a>
</article>
