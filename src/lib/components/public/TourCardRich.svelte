<script lang="ts">
  import { ArrowRight, CalendarDays, Compass, MapPin, Star, Users } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { imgUrl, thumbUrl } from '$lib/img';
  import { tilt } from '$lib/animations';
  import ShortlistButton from './ShortlistButton.svelte';
  import type { Tour } from '$lib/types';

  export let tour: Tour;

  const tierLabels: Record<string, string> = {
    budget: 'Budget',
    mid_range: 'Mid-range',
    'mid-range': 'Mid-range',
    midrange: 'Mid-range',
    luxury: 'Luxury',
    luxury_plus: 'Luxury+',
    'luxury-plus': 'Luxury+',
    ultra_luxury: 'Luxury+'
  };

  $: country = tour.destinations?.country || tour.destinations?.name || '';
  $: comfort = tour.budget_tier ? tierLabels[tour.budget_tier] ?? tour.budget_tier : '';
  $: durationLabel =
    tour.duration_days != null
      ? `${tour.duration_days} day${tour.duration_days === 1 ? '' : 's'}${tour.duration_nights ? `, ${tour.duration_nights} nights` : ''}`
      : 'Custom length';
  $: groupLabel =
    tour.group_size ||
    (tour.group_size_min && tour.group_size_max
      ? `${tour.group_size_min}-${tour.group_size_max} travelers`
      : tour.group_size_max
        ? `Up to ${tour.group_size_max} travelers`
        : '');
  $: stops = [
    ...(tour.start_location ? [`${tour.start_location} start`] : []),
    ...((tour.highlights ?? []).slice(0, 2)),
    ...(tour.end_location ? [`${tour.end_location} finish`] : [])
  ];
  $: destinationLabel = country || tour.destinations?.name || 'East Africa';
  $: highlights = (tour.highlights ?? []).slice(0, 2);

  $: item = {
    slug: tour.slug,
    title: tour.title,
    image_url: tour.main_image_url,
    duration_days: tour.duration_days,
    price_from: tour.price_from,
    currency: tour.currency,
    destination: tour.destinations?.name
  };
</script>

<article class="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-card-hover" use:tilt={{ max: 2 }}>
  <div class="absolute right-3 top-3 z-10">
    <ShortlistButton {item} />
  </div>

  <a href={`/tours/${tour.slug}`} class="flex h-full min-w-0 flex-col" on:click={() => trackEvent('tour_card_click', { tour_id: tour.id, tour_title: tour.title })}>
    <div class="relative aspect-[16/10] overflow-hidden bg-skywash">
      {#if tour.main_image_url}
        <img class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" src={imgUrl(thumbUrl(tour, 'main_image_url'), 760)} alt={tour.title} loading="lazy" decoding="async" />
      {:else}
        <div class="grid h-full w-full place-items-center bg-sand/60 text-forest/35">
          <Compass size={42} strokeWidth={1.8} />
        </div>
      {/if}
      <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-deep-green/90 via-deep-green/30 to-transparent"></div>

      <div class="absolute left-3 top-3 flex max-w-[calc(100%-4.75rem)] flex-wrap gap-1.5">
        {#if tour.is_featured}
          <span class="inline-flex items-center gap-1 rounded-[6px] bg-goldfinch-gold px-2.5 py-1 text-[11px] font-bold text-heading shadow">
            <Star size={11} fill="currentColor" /> Top rated
          </span>
        {/if}
        {#if tour.is_popular}
          <span class="inline-flex items-center rounded-[6px] bg-forest px-2.5 py-1 text-[11px] font-bold text-white shadow">
            Best seller
          </span>
        {/if}
      </div>

      <div class="absolute inset-x-0 bottom-0 p-4">
        <p class="mb-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface/92 px-2.5 py-1 text-xs font-bold text-ink shadow-sm">
          <MapPin size={12} />
          <span class="truncate">{destinationLabel}</span>
        </p>
        <h3 class="line-clamp-2 text-xl font-extrabold leading-tight tracking-normal text-white drop-shadow">
          {tour.title}
        </h3>
      </div>
    </div>

    <div class="flex flex-1 min-w-0 flex-col p-4">
      <div class="flex min-w-0 items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase text-ink/45">From</p>
          <p class="truncate text-xl font-extrabold text-forest">
            {#if tour.price_from}
              {tour.currency ?? 'USD'} {tour.price_from.toLocaleString()}
              <span class="text-xs font-bold text-ink/55">pp</span>
            {:else}
              On request
            {/if}
          </p>
        </div>
        {#if comfort}
          <span class="shrink-0 rounded-full border border-forest/15 bg-forest/5 px-2.5 py-1 text-xs font-bold text-ink/70">{comfort}</span>
        {/if}
      </div>

      <div class="mt-3 grid gap-2 text-sm font-semibold text-ink/70">
        <span class="inline-flex min-w-0 items-center gap-2">
          <CalendarDays size={14} class="shrink-0 text-forest" />
          <span class="truncate">{durationLabel}</span>
        </span>
        {#if groupLabel}
          <span class="inline-flex min-w-0 items-center gap-2">
            <Users size={14} class="shrink-0 text-forest" />
            <span class="truncate">{groupLabel}</span>
          </span>
        {/if}
      </div>

      {#if stops.length}
        <p class="mt-3 line-clamp-2 text-sm leading-6 text-ink/68">
          <span class="font-bold text-ink/75">Route:</span>
          {stops.join(' -> ')}
        </p>
      {:else if tour.short_description}
        <p class="mt-3 line-clamp-2 text-sm leading-6 text-ink/68">{tour.short_description}</p>
      {/if}

      {#if highlights.length}
        <div class="mt-4 flex min-w-0 flex-wrap gap-2">
          {#each highlights as highlight}
            <span class="min-w-0 max-w-full truncate rounded-[8px] bg-sand/45 px-3 py-1.5 text-xs font-bold text-ink/70">
              {highlight}
            </span>
          {/each}
        </div>
      {/if}

      <div class="mt-auto flex min-w-0 items-center justify-between gap-3 border-t border-ink/[0.08] pt-4">
        <span class="min-w-0 truncate text-xs font-bold text-ink/55">{tour.tour_categories?.name ?? 'Tailor-made safari'}</span>
        <span class="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-deep-green px-3 py-1.5 text-sm font-bold text-white transition group-hover:bg-forest">
          View <ArrowRight size={14} />
        </span>
      </div>
    </div>
  </a>
</article>
