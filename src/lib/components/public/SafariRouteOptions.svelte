<script lang="ts">
  import { t } from '$lib/i18n/ui';
  /**
   * The route options panel, laid out exactly as the supplied design: route
   * tabs, a wide photo, then one card holding the intro, highlights, a
   * comfort-tabbed price panel, where you sleep, the day-by-day itinerary and
   * a horizontal closing CTA.
   *
   * The days are drawn by ItineraryDays — the same component the tour pages
   * use. This panel had its own accordion: a title, a paragraph, and nothing
   * else. No main stop, no meals, no activities, and a property reduced to one
   * thumbnail tucked inside day one. Two renderers for one thing, and the
   * thinner one was the version a landing page showed first.
   *
   * The content is not typed twice. A route names real published tours, one
   * per comfort level, and the photo, wording, price, highlights, days and
   * lodges all come from those records — so this page and the tour pages
   * cannot drift, and a route whose tour is unpublished drops out rather than
   * rendering a broken tab.
   */
  import { ArrowRight, Check, Tent } from '@lucide/svelte';
  import Img from './Img.svelte';
  import ItineraryDays from './ItineraryDays.svelte';
  import RichText from './RichText.svelte';
  import StayCard from './StayCard.svelte';
  import { currency, formatUsd } from '$lib/currency';
  import { enumLabel } from '$lib/accommodationEnums';
  import { loadLodgeMedia, stayKey, type MediaImage, type Stay } from '$lib/lodgeMedia';
  import { parseRouteTour, lines, str } from '$lib/safariPackageBlocks';
  import type { ItineraryDay, Lodge, Tour } from '$lib/types';

  type RouteRow = { tab?: string; tours?: unknown; comforts?: unknown; best_for?: string; note?: string; stay_note?: string };
  type ResolvedComfort = { label: string; slug: string; tour: Tour; lodges: Lodge[] };
  type ResolvedRoute = { tab: string; bestFor: string; note: string; stayNote: string; comfort: ResolvedComfort[] };

  export let routes: RouteRow[] = [];
  export let tours: Tour[] = [];
  export let lodges: Lodge[] = [];
  export let ctaLabel = 'Send request for this route';
  export let formHref = '#lead-form';

  const tourBySlug = (slug: string) => tours.find((tour) => tour.slug === slug);

  const selectedLodges = (ids: unknown) =>
    (Array.isArray(ids) ? ids.map(String) : []).map((id) => lodges.find((lodge) => lodge.id === id)).filter((lodge): lodge is Lodge => Boolean(lodge));

  let resolved: ResolvedRoute[] = [];
  $: resolved = routes
    .map((route) => {
      const selected = Array.isArray(route.comforts) ? (route.comforts as Record<string, unknown>[]) : [];
      const comfortSource = selected.length
        ? selected.map((entry) => ({
            label: enumLabel(str(entry.accommodation_level) || 'Accommodation'),
            slug: str(entry.tour_slug),
            lodges: selectedLodges(entry.accommodation_ids)
          }))
        : lines(route.tours).map((line) => ({ ...parseRouteTour(line), lodges: [] as Lodge[] }));
      const comfort = comfortSource
        .map((entry) => ({ ...entry, tour: tourBySlug(entry.slug) }))
        .filter((entry): entry is { label: string; slug: string; tour: Tour; lodges: Lodge[] } => Boolean(entry.tour))
        .map((entry) => ({ ...entry, label: entry.label || entry.tour.title }));
      return {
        tab: str(route.tab),
        bestFor: str(route.best_for),
        note: str(route.note),
        stayNote: str(route.stay_note),
        comfort
      };
    })
    .filter((route) => route.comfort.length);

  let activeRoute = 0;
  /** Price and accommodation carry their own selection, exactly as the design does. */
  let priceLevel: number[] = [];
  let stayLevel: number[] = [];
  $: if (resolved.length && priceLevel.length !== resolved.length) {
    priceLevel = resolved.map(() => 0);
    stayLevel = resolved.map(() => 0);
  }
  $: if (activeRoute >= resolved.length) activeRoute = 0;

  $: route = resolved[activeRoute];
  $: headTour = route?.comfort[0]?.tour;
  $: priced = route?.comfort[priceLevel[activeRoute] ?? 0] ?? route?.comfort[0];
  $: stayed = route?.comfort[stayLevel[activeRoute] ?? 0] ?? route?.comfort[0];

  const daysOf = (tour: Tour | undefined) =>
    [...((tour?.itinerary_days ?? []) as ItineraryDay[])].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0));

  $: days = daysOf(priced?.tour);
  $: highlights = (headTour?.highlights ?? []).map(String).filter((item) => item.trim());
  $: priceLabel = priced?.tour?.price_from ? formatUsd(priced.tour.price_from, $currency) : '';

  /**
   * The property an editor selected for this comfort tab.
   *
   * One per tab, which is what the editor now offers. Pages saved while it
   * accepted several still hold them, so the first is taken rather than all —
   * the alternative is a page that contradicts the form that produced it until
   * someone happens to re-save it.
   *
   * There is no longer a fallback list assembled from the tour's itinerary:
   * the day cards below show the property each day stays at, so repeating them
   * up here said the same thing twice.
   */
  $: selectedStays = (stayed?.lodges ?? []).slice(0, 1) as unknown as Stay[];

  /**
   * Photographs for the selected property, so its card carries the same
   * four-up gallery the itinerary days do rather than one thumbnail. The day
   * cards fetch their own — this is only the editor's pick, which is not on
   * any itinerary.
   */
  let stayMedia: Record<string, MediaImage[]> = {};
  const requestedStays = new Set<string>();

  const hydrateStayMedia = async (list: Stay[]) => {
    const next = await loadLodgeMedia(list, stayMedia, requestedStays);
    if (next !== stayMedia) stayMedia = next;
  };

  $: void hydrateStayMedia(selectedStays);

  const GOLD =
    'route-cta inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-goldfinch-gold px-6 text-[14px] font-bold text-heading transition hover:brightness-105';
  const SUB = 'font-serif text-[20px] font-semibold text-heading md:text-[24px]';
  const BODY = 'text-[14.5px] leading-relaxed text-ink/70';
</script>

{#if resolved.length}
  <!-- Route tabs -->
  <div
    class="route-tabs -mx-4 mt-8 flex gap-[10px] overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0"
    role="tablist"
    aria-label={$t('ui.route_options')}
  >
    {#each resolved as item, i (i)}
      <button
        class={`shrink-0 rounded-[10px] border px-5 py-[13px] text-[14.5px] font-semibold tracking-[0.015em] transition md:px-7 md:py-[15px] md:text-[15.5px] ${
          i === activeRoute
            ? 'border-deep-green bg-deep-green text-surface'
            : 'border-ink/10 bg-canvas text-heading hover:bg-sand/70'
        }`}
        type="button"
        role="tab"
        aria-selected={i === activeRoute}
        on:click={() => (activeRoute = i)}
      >
        {item.tab || item.comfort[0]?.tour.title}
      </button>
    {/each}
  </div>

  {#if route && headTour}
    <!-- Wide photo + panel = one card -->
    <div class="route-card mt-6 overflow-hidden rounded-[12px]">
      {#if headTour.main_image_url}
        <Img
          src={headTour.main_image_url}
          alt={route.tab || headTour.title}
          width={1180}
          sizes="(max-width: 1179px) 100vw, 1180px"
          className="route-photo block h-[240px] w-full rounded-t-[12px] object-cover sm:h-[320px] md:h-[360px] lg:h-[430px]"
        />
      {/if}

      <div class="route-panel rounded-b-[12px] bg-canvas p-6 sm:p-9 md:p-11 lg:p-14">
        <h3 class="font-serif text-[22px] font-semibold leading-snug text-heading md:text-[28px]">
          {route.tab || headTour.title}
        </h3>
        <div class="my-5 h-px w-full bg-ink/[0.18] md:my-6"></div>

        {#if headTour.short_description}
          <p class="max-w-[880px] text-[15px] leading-relaxed text-ink/70">{headTour.short_description}</p>
        {/if}
        {#if route.note}
          <p class="mt-3 max-w-[880px] text-[15px] leading-relaxed text-ink/70">{route.note}</p>
        {/if}
        {#if route.bestFor}
          <p class="mt-5 text-[14.5px] font-semibold text-heading">Best for: {route.bestFor}</p>
        {/if}
        <a class={`mt-6 ${GOLD}`} href={formHref}>
          {ctaLabel}
          <ArrowRight size={16} />
        </a>

        <!-- Tour highlights -->
        {#if highlights.length}
          <div class="mt-9 border-t border-ink/[0.18] pt-8">
            <h3 class={SUB}>{$t('ui.tour_highlights')}</h3>
            <ul class="mt-4 grid gap-x-8 gap-y-2.5 md:grid-cols-2">
              {#each highlights as item, i (i)}
                <li class="flex gap-2.5 text-[14.5px] leading-snug text-heading">
                  <Check size={16} class="mt-[3px] shrink-0 text-clay" />
                  <RichText value={item} />
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Prices for this route -->
        <div class="mt-9 border-t border-ink/[0.18] pt-8">
          <h3 class={SUB}>{$t('ui.prices_for_this_route')}</h3>
          <p class="mt-3 max-w-[820px] text-[15px] leading-relaxed text-ink/70">
            Pricing depends on accommodation style, travel date, availability and the number of travellers.
            Choose a comfort level below to see the starting structure.
          </p>
          {#if route.comfort.length > 1}
            <div class="comfort-tabs -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible" role="tablist" aria-label={$t('ui.price_comfort_level')}>
              {#each route.comfort as level, i (i)}
                <button
                  class={`h-11 shrink-0 rounded-[10px] border px-5 text-[14px] font-semibold tracking-[0.02em] transition ${
                    i === (priceLevel[activeRoute] ?? 0)
                      ? 'border-deep-green bg-deep-green text-surface'
                      : 'border-ink/[0.16] bg-surface text-heading hover:bg-sand/70'
                  }`}
                  type="button"
                  role="tab"
                  aria-selected={i === (priceLevel[activeRoute] ?? 0)}
                  on:click={() => (priceLevel[activeRoute] = i)}
                >
                  {level.label}
                </button>
              {/each}
            </div>
          {/if}

          <div class="route-price mt-4 rounded-[12px] border border-ink/[0.16] bg-surface p-6 md:p-10">
            <h4 class="font-serif text-[19px] font-semibold text-heading">{priced?.label}</h4>
            {#if priced?.tour.short_description}
              <p class="mt-2 max-w-[760px] text-[14.5px] leading-relaxed text-ink/70">{priced.tour.short_description}</p>
            {/if}
            {#if priceLabel}<p class="route-price-value mt-4 text-[14.5px] font-semibold text-clay">From {priceLabel} per person</p>{/if}
            <div class="mt-5 grid gap-2 sm:grid-cols-2">
              {#if priced?.tour.duration_days}
                <div class="flex gap-2 text-[14px] leading-snug text-heading">
                  <Check size={15} class="mt-[3px] shrink-0 text-clay" />
                  <span>{priced.tour.duration_days} day{priced.tour.duration_days === 1 ? '' : 's'}{priced.tour.duration_nights ? `, ${priced.tour.duration_nights} night${priced.tour.duration_nights === 1 ? '' : 's'}` : ''}</span>
                </div>
              {/if}
              {#if priced?.tour.start_location}
                <div class="flex gap-2 text-[14px] leading-snug text-heading">
                  <Check size={15} class="mt-[3px] shrink-0 text-clay" />
                  <span>Starts {priced.tour.start_location}</span>
                </div>
              {/if}
              {#if priced?.tour.group_size}
                <div class="flex gap-2 text-[14px] leading-snug text-heading">
                  <Check size={15} class="mt-[3px] shrink-0 text-clay" />
                  <span>{priced.tour.group_size}</span>
                </div>
              {/if}
              {#if priced?.tour.difficulty_level}
                <div class="flex gap-2 text-[14px] leading-snug text-heading">
                  <Check size={15} class="mt-[3px] shrink-0 text-clay" />
                  <span>{priced.tour.difficulty_level}</span>
                </div>
              {/if}
            </div>
            <p class="mt-5 text-[13px] italic leading-relaxed text-ink/55">{$t('ui.final_price_is_confirmed_after')}</p>
            <a class={`mt-5 ${GOLD}`} href={formHref}>{$t('ui.check_this_price_for_my')}<ArrowRight size={16} />
            </a>
          </div>
        </div>

        <!-- Where you sleep: the property an editor chose for this comfort
             level, shown with its own photographs. No list assembled from the
             itinerary any more — the day cards below carry those lodges, and
             printing them twice said the same thing in two voices. -->
        {#if route.stayNote || selectedStays.length}
          <div class="mt-9 border-t border-ink/[0.18] pt-8">
            <h3 class={`${SUB} flex items-center gap-2`}>
              <Tent size={18} class="text-clay" />{$t('ui.accommodation_options')}
            </h3>
            {#if route.comfort.length > 1}
              <div class="comfort-tabs -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible" role="tablist" aria-label={$t('ui.accommodation_comfort_level')}>
                {#each route.comfort as level, li (li)}
                  <button
                    class={`h-11 shrink-0 rounded-[10px] border px-5 text-[14px] font-semibold tracking-[0.02em] transition ${
                      li === (stayLevel[activeRoute] ?? 0)
                        ? 'border-deep-green bg-deep-green text-surface'
                        : 'border-ink/[0.16] bg-canvas text-heading hover:bg-sand/70'
                    }`}
                    type="button"
                    role="tab"
                    aria-selected={li === (stayLevel[activeRoute] ?? 0)}
                    on:click={() => (stayLevel[activeRoute] = li)}
                  >
                    {level.label}
                  </button>
                {/each}
              </div>
            {/if}
            {#if route.stayNote}
              <p class={`mt-4 max-w-[820px] ${BODY}`}>{route.stayNote}</p>
            {/if}
            {#if selectedStays.length}
              <div class="mt-5 grid gap-5 lg:grid-cols-2">
                {#each selectedStays as stay (stayKey(stay))}
                  <StayCard {stay} extra={stayMedia[stayKey(stay)] ?? []} />
                {/each}
              </div>
            {/if}
            <p class="mt-5 text-[13px] italic leading-relaxed text-ink/55">{$t('ui.final_accommodation_depends_on_route')}</p>
          </div>
        {/if}

        <!-- Day by day, through the renderer the tour pages use. The days,
             their facts and the property each one stays at are the linked
             tour's own records, so this panel and that tour cannot disagree. -->
        {#if days.length}
          <div class="mt-9 border-t border-ink/[0.18] pt-8">
            <h3 class={SUB}>{$t('ui.day_by_day_itinerary')}</h3>
            <div class="route-itinerary mt-4">
              <ItineraryDays {days} autoloadMedia />
            </div>
          </div>
        {/if}

        <!-- Route CTA — horizontal -->
        <div class="mt-9 flex flex-col gap-4 border-t border-ink/[0.18] pt-8 md:flex-row md:items-center md:justify-between">
          <div class="max-w-[720px]">
            <h3 class="font-serif text-[19px] font-semibold text-heading md:text-[22px]">{$t('ui.want_this_route_checked_for')}</h3>
            <p class={`mt-2 ${BODY}`}>
              Share your preferred start date and group size. We'll check flights, accommodation and route
              availability before sending a proposal.
            </p>
          </div>
          <a class={`shrink-0 ${GOLD}`} href={formHref}>{$t('ui.send_request')}<ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .route-tabs button:focus-visible, .comfort-tabs button:focus-visible, .route-cta:focus-visible {
    outline: 2px solid rgb(var(--c-clay)); outline-offset: -3px;
  }
  @media (max-width: 767px) {
    .route-tabs, .comfort-tabs { scroll-snap-type: x proximity; scrollbar-width: thin; scrollbar-color: rgb(var(--c-clay) / 0.4) transparent; }
    .route-tabs button, .comfort-tabs button { min-height: 48px; scroll-snap-align: start; }
    .route-tabs button { max-width: 85vw; white-space: normal; text-align: left; font-size: 13px; }
    .route-card { margin-top: 18px; overflow: visible; border: 0; border-radius: 0; }
    .route-card :global(.route-photo) { height: auto; aspect-ratio: 4 / 3; border-radius: 16px; }
    .route-panel { padding: 20px 0 0; border-radius: 0; background: transparent; }
    .route-cta { width: 100%; min-height: 48px; height: auto; gap: 8px; padding: 12px; font-size: 13px; text-align: center; color: #272b22; }
    .route-cta :global(svg) { flex-shrink: 0; }
    .route-price { padding: 16px 0 0; border: 0; border-top: 1px solid rgb(var(--c-ink) / 0.12); border-radius: 0; background: transparent; }
    .route-price-value { font-size: 19px; line-height: 1.4; }
    .comfort-tabs button { padding-inline: 14px; font-size: 13px; }
  }
</style>
