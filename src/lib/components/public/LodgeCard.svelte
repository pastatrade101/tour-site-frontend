<script lang="ts">
  import { ArrowRight, CalendarDays, MapPin, Sparkles, Star, Tent } from '@lucide/svelte';
  import { t } from '$lib/i18n/ui';
  import { currency, formatUsd } from '$lib/currency';
  import { sourceFor } from '$lib/img';
  import { toMetaText } from '$lib/richText';
  import type { Lodge } from '$lib/types';
  import { enumLabel } from '$lib/accommodationEnums';
  import Img from './Img.svelte';

  export let lodge: Lodge;
  export let feature = false;
  /** Tighter card for the mobile carousels, where height is the scarce axis. */
  export let compact = false;

  const levelLabels: Record<string, string> = {
    BUDGET:'Budget', MID_RANGE:'Mid-range', LUXURY:'Luxury', PREMIUM_LUXURY:'Premium luxury',
    budget: 'Budget',
    mid_range: 'Mid-range',
    luxury: 'Luxury',
    ultra_luxury: 'Ultra-luxury'
  };
  const typeLabels: Record<string, string> = {
    HOTEL:'Hotel', SAFARI_LODGE:'Safari lodge', TENTED_CAMP:'Tented camp', MOBILE_CAMP:'Mobile camp', BEACH_RESORT:'Beach resort', VILLA:'Villa', GUEST_HOUSE:'Guest house', ECO_LODGE:'Eco lodge', BOUTIQUE_HOTEL:'Boutique hotel',
    tented_camp: 'Tented camp',
    lodge: 'Lodge',
    hotel: 'Hotel',
    mobile_camp: 'Mobile camp',
    treehouse: 'Treehouse'
  };

  $: imageUrl = sourceFor(lodge, 700, 'image_url', 'hero_image_url', 'cover_image_url');
  $: priceLabel =
    lodge.price_per_night_from != null
      ? formatUsd(lodge.price_per_night_from, $currency)
      : '';
  $: summary = toMetaText(lodge.why_we_recommend || lodge.description || '', 180);
  $: category = levelLabels[lodge.accommodation_level] ?? enumLabel(lodge.accommodation_level);
  $: propertyType = typeLabels[lodge.lodge_type] ?? enumLabel(lodge.lodge_type);
  // The imported properties carry neither of these, and reserving a row for
  // them left a visible gap under every such card.
  $: hasMeta = Boolean(lodge.recommended_nights || lodge.best_for?.[0]);
  $: score = lodge.romantic_rating != null || lodge.family_rating != null
    ? Math.max(lodge.romantic_rating ?? 0, lodge.family_rating ?? 0).toFixed(1)
    : '';
</script>

<a href={`/accommodation/${lodge.slug}`} class={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-ink/10 bg-surface shadow-[0_12px_34px_rgba(57,61,50,0.07)] transition duration-300 hover:-translate-y-1 hover:border-goldfinch-gold/40 hover:shadow-[0_24px_56px_rgba(57,61,50,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold ${feature ? 'md:grid md:grid-cols-2' : ''}`}>
  <div class={`relative overflow-hidden bg-deep-green ${feature ? 'aspect-[4/3] md:aspect-auto md:min-h-[430px]' : compact ? 'aspect-[3/2]' : 'aspect-[16/11]'}`}>
    {#if imageUrl}
      <Img
        record={lodge}
        fields={['image_url', 'hero_image_url', 'cover_image_url']}
        alt={lodge.name}
        width={feature ? 1200 : 700}
        sizes={feature ? '(min-width: 768px) 50vw, 100vw' : '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 33vw'}
        className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
      />
    {:else}
      <div class="grid h-full min-h-64 place-items-center bg-gradient-to-br from-deep-green to-forest text-white/60"><Tent size={42} strokeWidth={1.2}/></div>
    {/if}
    {#if lodge.is_featured}
      <span class="absolute left-3 top-3 inline-flex items-center gap-1 bg-goldfinch-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-heading shadow">
        <Sparkles size={12} /> Recommended
      </span>
    {/if}
    <span class="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"></span>
    {#if lodge.destinations?.name}
      <span class="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-black/45 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm"><MapPin size={12} class="text-goldfinch-gold"/>{lodge.destinations.name}</span>
    {/if}
  </div>
  <div class={`flex flex-1 flex-col ${feature ? 'justify-center p-7 md:p-10' : compact ? 'p-3.5' : 'p-4 md:p-5'}`}>
    <div class="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.13em]">
      <p class="text-clay">{propertyType}</p>
      <p class="text-forest/65">{category}</p>
    </div>
    <h3 class={`mt-2.5 font-serif font-semibold leading-[1.15] text-heading ${feature ? 'text-3xl md:text-[38px]' : compact ? 'line-clamp-2 text-[17px]' : 'min-h-[2.3em] text-xl'}`}>{lodge.name}</h3>
    {#if summary}
      <p class={`mt-2.5 text-[13px] leading-6 text-ink/65 ${feature ? 'md:text-base md:leading-8' : compact ? 'line-clamp-2' : 'line-clamp-2 min-h-12'}`}>{summary}</p>
    {:else if !feature}
      <p class={`mt-2.5 text-[13px] leading-6 text-ink/50 ${compact ? 'line-clamp-2' : 'min-h-12'}`}>A carefully selected stay that can be included in a private Goldfinch itinerary.</p>
    {/if}

    {#if hasMeta}
    <div class="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-semibold text-forest/75">
      {#if lodge.recommended_nights}<span class="inline-flex items-center gap-1"><CalendarDays size={12}/>{lodge.recommended_nights} recommended night{lodge.recommended_nights === 1 ? '' : 's'}</span>{/if}
      {#if lodge.best_for?.[0]}<span class="border-l border-ink/15 pl-3">Best for {enumLabel(lodge.best_for[0]).toLowerCase()}</span>{/if}
    </div>
    {/if}

    <div class={`mt-auto flex items-center justify-between gap-3 border-t border-ink/10 ${compact ? 'pt-2.5 mt-3' : 'min-h-10 pt-3 mt-3.5'}`}>
      <span class="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.13em] text-forest transition group-hover:text-clay">{$t('cta.explore_stay')} <ArrowRight size={14} class="transition group-hover:translate-x-1"/></span>
      {#if priceLabel || score}<span class="text-right text-[11px] leading-5 text-ink/45">{#if score}<span class="inline-flex items-center gap-1 font-bold text-heading"><Star size={12} fill="currentColor" class="text-goldfinch-gold"/>{score}</span>{/if}{#if priceLabel}<span class="block"><b class="text-heading">{priceLabel}</b> / night</span>{/if}</span>{/if}
    </div>
  </div>
</a>
