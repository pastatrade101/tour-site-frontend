<script lang="ts">
  import { ArrowRight, BedDouble, Clock, MapPin } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { imgUrl, thumbUrl } from '$lib/img';
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

  $: comfort = tour.budget_tier ? (tierLabels[tour.budget_tier] ?? tour.budget_tier) : '';
  $: durationLabel = tour.duration_days ? `${tour.duration_days} day${tour.duration_days === 1 ? '' : 's'}` : '';
  // "N places" only when the itinerary genuinely lists that many stops; otherwise
  // fall back to the destination name. Nothing here is invented. ("places" rather
  // than "parks" because a route can also list forests, beaches or towns.)
  $: placeCount = (tour.highlights ?? []).length;
  $: parksLabel = placeCount > 1 ? `${placeCount} places` : tour.destinations?.name || '';
  $: meta = [durationLabel, parksLabel, comfort].filter(Boolean);

  // Badge comes from a real flag only.
  $: badge = tour.is_popular ? 'Most requested' : tour.is_featured ? 'Featured' : '';
  $: badgeTone = tour.is_popular ? 'bg-clay text-white' : 'bg-goldfinch-gold text-heading';

  $: hasPrice = typeof tour.price_from === 'number' && tour.price_from > 0;
  $: priceLabel = hasPrice ? `${tour.currency ?? 'USD'} ${Number(tour.price_from).toLocaleString()}` : '';

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

<article
  class="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[14px] border border-ink/10 bg-sand/40 shadow-[0_10px_30px_rgba(57,61,50,0.07)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(57,61,50,0.14)]"
>
  <div class="absolute right-3 top-3 z-10">
    <ShortlistButton {item} />
  </div>

  <a
    href={`/tours/${tour.slug}`}
    class="flex h-full min-w-0 flex-col"
    on:click={() => trackEvent('tour_card_click', { tour_id: tour.id, tour_title: tour.title })}
  >
    <!-- image -->
    <div class="relative aspect-[16/11] w-full overflow-hidden bg-forest">
      {#if tour.main_image_url}
        <img
          class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          src={imgUrl(thumbUrl(tour, 'main_image_url'), 760)}
          alt={tour.title}
          loading="lazy"
          decoding="async"
        />
      {:else}
        <div class="grid h-full w-full place-items-center bg-gradient-to-br from-forest to-deep-green text-white/30">
          <MapPin size={26} />
        </div>
      {/if}

      {#if badge}
        <span class={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] shadow-sm ${badgeTone}`}>
          {badge}
        </span>
      {/if}
    </div>

    <!-- body -->
    <div class="flex flex-1 flex-col px-5 pb-5 pt-4">
      <h3 class="font-serif text-[19px] font-semibold leading-snug text-heading">{tour.title}</h3>

      {#if meta.length}
        <div class="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-ink/65">
          {#each meta as m, i (m)}
            {#if i > 0}<span class="text-ink/25" aria-hidden="true">·</span>{/if}
            <span class="inline-flex items-center gap-1.5">
              {#if i === 0}
                <Clock size={14} class="text-ink/45" />
              {:else if i === 1}
                <MapPin size={14} class="text-ink/45" />
              {:else}
                <BedDouble size={14} class="text-ink/45" />
              {/if}
              {m}
            </span>
          {/each}
        </div>
      {/if}

      <div class="mt-auto flex items-end justify-between gap-3 border-t border-ink/10 pt-4">
        <div class="min-w-0">
          {#if hasPrice}
            <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">From</p>
            <p class="text-[17px] font-extrabold leading-tight text-heading">
              {priceLabel} <span class="text-xs font-semibold text-ink/55">p.p.</span>
            </p>
          {:else}
            <p class="text-sm font-bold text-heading">Price on request</p>
          {/if}
        </div>

        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-ink/15 bg-surface px-4 py-2.5 text-sm font-bold text-heading transition group-hover:border-goldfinch-gold group-hover:bg-goldfinch-gold"
        >
          View Tour <ArrowRight size={15} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  </a>
</article>
