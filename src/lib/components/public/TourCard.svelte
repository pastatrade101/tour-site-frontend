<script lang="ts">
  import { ArrowRight, Image as ImageIcon } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { currency, formatUsd } from '$lib/currency';
  import { toPlainText } from '$lib/richText';
  import { getTourDestinations } from '$lib/tourDestinations';
  import type { Tour } from '$lib/types';
  import Img from './Img.svelte';
  import ShortlistButton from './ShortlistButton.svelte';

  type TourCardBadgeType = 'rust' | 'gold' | 'olive' | 'default';

  export let tour: Tour;
  export let showShortlist = true;
  export let whiteSurface = true;
  export let badge: string | null | undefined = undefined;
  export let badgeType: TourCardBadgeType | undefined = undefined;
  export let ctaLabel = 'View trip';
  export let ctaHref = '';

  const badgeStyles: Record<TourCardBadgeType, { background: string; color: string }> = {
    rust: { background: 'rgba(255,255,255,0.95)', color: '#393D32' },
    gold: { background: 'rgba(228,169,46,0.45)', color: '#2D3027' },
    olive: { background: 'rgba(103,103,88,0.55)', color: '#FFFFFF' },
    default: { background: 'rgba(20,20,10,0.4)', color: '#FFFFFF' }
  };

  const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

  const cardTags = (item: Tour): string[] => {
    const destinations = getTourDestinations(item).map((destination) => destination.name);
    if (destinations.length) return unique(destinations).slice(0, 3);

    const fallbacks = [
      item.tour_categories?.name ?? '',
      item.experience_type ?? '',
      ...(item.highlights ?? []).map((highlight) => toPlainText(highlight))
    ];
    return unique(fallbacks).slice(0, 3);
  };

  $: image = tour.main_image_url || tour.banner_image_url || '';
  $: href = ctaHref || `/tours/${tour.slug}`;
  $: duration = tour.duration_days
    ? `${tour.duration_days} ${tour.duration_days === 1 ? 'day' : 'days'}`
    : 'Tailor-made';
  $: resolvedBadge = badge === undefined
    ? tour.is_popular
      ? 'Most Popular 🔥'
      : tour.is_featured
        ? 'Featured'
        : tour.tour_categories?.name || 'Tailor-made'
    : badge;
  $: resolvedBadgeType = badgeType ?? (tour.is_popular ? 'rust' : tour.is_featured ? 'gold' : 'olive');
  $: badgeStyle = badgeStyles[resolvedBadgeType];
  $: tags = cardTags(tour);
  $: hasPrice = typeof tour.price_from === 'number' && tour.price_from > 0;
  $: priceLabel = hasPrice ? formatUsd(tour.price_from, $currency) : '';
  $: shortlistItem = {
    slug: tour.slug,
    title: tour.title,
    image_url: image,
    duration_days: tour.duration_days,
    price_from: tour.price_from,
    currency: tour.currency,
    destination: tags.join(', ')
  };

  function recordClick() {
    trackEvent('tour_card_click', { tour_id: tour.id, tour_title: tour.title });
  }
</script>

<article
  class={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E3DCCB] shadow-[0_8px_24px_-16px_rgba(57,61,50,0.35)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-16px_rgba(57,61,50,0.42)] ${whiteSurface ? 'bg-white' : 'bg-surface'}`}
  data-tour-card
>
  <div class="relative aspect-[4/3] w-full overflow-hidden bg-sand">
    <a href={href} aria-label={`View ${tour.title}`} on:click={recordClick} class="block h-full w-full">
      {#if image}
        <Img
          record={tour}
          fields={['main_image_url', 'banner_image_url']}
          alt={tour.title}
          width={760}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 33vw"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
        />
      {:else}
        <div class="grid h-full w-full place-items-center bg-gradient-to-br from-sand to-ink/10 text-ink/25">
          <ImageIcon size={30} />
        </div>
      {/if}
    </a>

    {#if resolvedBadge}
      <span
        class="pointer-events-none absolute left-3.5 top-3.5 inline-flex max-w-[calc(100%-5rem)] items-center truncate rounded-full border border-white/30 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md"
        style={`background: ${badgeStyle.background}; color: ${badgeStyle.color};`}
      >
        {resolvedBadge}
      </span>
    {/if}

    {#if showShortlist}
      <div class="absolute right-3.5 top-3.5 z-10">
        <ShortlistButton item={shortlistItem} />
      </div>
    {/if}

    <span
      class="pointer-events-none absolute bottom-3.5 right-3.5 inline-flex items-center rounded-full border border-white/25 bg-[rgba(20,20,10,0.5)] px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md"
    >
      {duration}
    </span>
  </div>

  <div class="flex flex-1 flex-col p-5">
    <a href={href} on:click={recordClick} class="transition-colors hover:text-clay">
      <h3 class="font-serif text-xl font-semibold leading-tight text-heading">{tour.title}</h3>
    </a>

    {#if tags.length}
      <div class="mt-2.5 flex flex-wrap gap-1.5">
        {#each tags as tag (tag)}
          <span class="max-w-full truncate rounded-full border border-[#E3DCCB] px-2.5 py-0.5 text-[11px] font-medium text-ink/65">
            {tag}
          </span>
        {/each}
      </div>
    {/if}

    <div class="mt-auto pt-4">
      <div class="flex items-center justify-between gap-3 border-t border-dashed border-[#E3DCCB] pt-4">
        <div class="min-w-0 text-[14px] text-heading">
          {#if hasPrice}
            <span class="text-[11px] uppercase tracking-[0.08em] text-ink/45">From </span>
            <span class="font-serif text-[17px] font-medium">{priceLabel}</span>
          {:else}
            <span class="font-serif text-[17px] font-medium">Tailored quote</span>
          {/if}
        </div>
        <a
          href={href}
          data-cta={`itinerary-${tour.slug}`}
          on:click={recordClick}
          class="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-clay transition-transform hover:translate-x-0.5"
        >
          {ctaLabel}
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  </div>
</article>
