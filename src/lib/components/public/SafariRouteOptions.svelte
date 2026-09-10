<script lang="ts">
  /**
   * The route options on a safari-package page: one tab per route, and within a
   * route one tab per comfort level.
   *
   * Nothing here is typed twice. A route names real published tours, and the
   * photo, wording, price, highlights and day-by-day all come from those
   * records — so this page and the tour pages cannot drift apart, and a route
   * whose tour is unpublished or renamed simply drops out instead of rendering
   * a broken tab.
   *
   * The state lives in this component rather than the block renderer because
   * each route needs its own selected comfort level, and a parent cannot hold
   * per-iteration state for an {#each}.
   */
  import { ArrowRight, Check } from '@lucide/svelte';
  import Img from './Img.svelte';
  import ItineraryDays from './ItineraryDays.svelte';
  import RichText from './RichText.svelte';
  import { currency, formatUsd } from '$lib/currency';
  import { parseRouteTour, lines, str } from '$lib/safariPackageBlocks';
  import type { ItineraryDay, Tour } from '$lib/types';

  type RouteRow = { tab?: string; tours?: unknown; best_for?: string; note?: string };

  export let routes: RouteRow[] = [];
  export let tours: Tour[] = [];
  export let ctaLabel = 'Send request for this route';
  /** Where the enquiry band is, so a route CTA can jump to it. */
  export let formHref = '#lead-form';

  const tourBySlug = (slug: string) => tours.find((tour) => tour.slug === slug);

  /**
   * A route resolved against the tour records. Comfort levels with no matching
   * published tour are dropped, and a route left with none disappears entirely
   * rather than becoming an empty tab.
   */
  $: resolved = routes
    .map((route) => {
      const comfort = lines(route.tours)
        .map((line) => parseRouteTour(line))
        .map((entry) => ({ ...entry, tour: tourBySlug(entry.slug) }))
        .filter((entry): entry is { label: string; slug: string; tour: Tour } => Boolean(entry.tour))
        .map((entry) => ({ ...entry, label: entry.label || entry.tour.title }));
      return { tab: str(route.tab), bestFor: str(route.best_for), note: str(route.note), comfort };
    })
    .filter((route) => route.comfort.length);

  let activeRoute = 0;
  /** Selected comfort level per route, so switching tabs does not reset the others. */
  let activeComfort: number[] = [];
  $: if (resolved.length && activeComfort.length !== resolved.length) activeComfort = resolved.map(() => 0);
  $: if (activeRoute >= resolved.length) activeRoute = 0;

  $: route = resolved[activeRoute];
  $: picked = route?.comfort[activeComfort[activeRoute] ?? 0] ?? route?.comfort[0];
  $: tour = picked?.tour;
  $: days = [...((tour?.itinerary_days ?? []) as ItineraryDay[])].sort(
    (a, b) => (a.day_number ?? 0) - (b.day_number ?? 0)
  );
  $: highlights = (tour?.highlights ?? []).map(String).filter((item) => item.trim());
  // Same conversion every price on the site goes through, so a route reads in
  // whatever currency the visitor picked.
  $: price = tour?.price_from ? formatUsd(tour.price_from, $currency) : '';

  let openDay = 0;
  // A different route means a different itinerary, so the disclosure starts over.
  $: if (activeRoute >= 0) openDay = 0;

  const TAB = 'shrink-0 rounded-[10px] border px-5 py-3 text-sm font-semibold transition';
</script>

{#if resolved.length}
  <div class="mt-8">
    <!-- Route tabs -->
    <div class="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:px-0" role="tablist" aria-label="Route options">
      {#each resolved as item, i (i)}
        <button
          class={`${TAB} ${i === activeRoute ? 'border-deep-green bg-deep-green text-white' : 'border-ink/10 bg-canvas text-heading hover:bg-sand/60'}`}
          type="button"
          role="tab"
          aria-selected={i === activeRoute}
          on:click={() => (activeRoute = i)}
        >
          {item.tab || item.comfort[0].tour.title}
        </button>
      {/each}
    </div>

    {#if route && tour}
      <div class="mt-6 overflow-hidden rounded-[16px]">
        {#if tour.main_image_url}
          <Img
            src={tour.main_image_url}
            alt={route.tab || tour.title}
            width={1180}
            sizes="(max-width: 1023px) 100vw, 1180px"
            className="block h-[240px] w-full object-cover sm:h-[320px] md:h-[400px]"
          />
        {/if}

        <div class="bg-canvas p-6 sm:p-9 md:p-11">
          <h3 class="font-serif text-2xl font-semibold leading-snug text-heading md:text-[28px]">
            {route.tab || tour.title}
          </h3>
          <div class="my-5 h-px w-full bg-ink/15"></div>

          {#if tour.short_description}
            <p class="max-w-[880px] text-[15px] leading-relaxed text-ink/70">{tour.short_description}</p>
          {/if}
          {#if route.note}
            <p class="mt-3 max-w-[880px] text-[15px] leading-relaxed text-ink/70">{route.note}</p>
          {/if}
          {#if route.bestFor}
            <p class="mt-5 text-[14.5px] font-semibold text-heading">Best for: {route.bestFor}</p>
          {/if}

          <a
            class="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-goldfinch-gold px-6 text-sm font-bold text-heading transition hover:brightness-105"
            href={formHref}
          >
            {ctaLabel}
            <ArrowRight size={16} />
          </a>

          {#if highlights.length}
            <div class="mt-9 border-t border-ink/15 pt-8">
              <h4 class="font-serif text-xl font-semibold text-heading md:text-2xl">Trip highlights</h4>
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

          <!-- Comfort levels: each one is its own published tour, so the price
               and the itinerary below change with it. -->
          {#if route.comfort.length > 1 || price}
            <div class="mt-9 border-t border-ink/15 pt-8">
              <h4 class="font-serif text-xl font-semibold text-heading md:text-2xl">Comfort level and price</h4>
              {#if route.comfort.length > 1}
                <div class="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible" role="tablist" aria-label="Comfort level">
                  {#each route.comfort as level, i (i)}
                    <button
                      class={`h-11 shrink-0 rounded-[10px] border px-5 text-sm font-semibold transition ${
                        i === (activeComfort[activeRoute] ?? 0)
                          ? 'border-deep-green bg-deep-green text-white'
                          : 'border-ink/15 bg-surface text-heading hover:bg-sand/60'
                      }`}
                      type="button"
                      role="tab"
                      aria-selected={i === (activeComfort[activeRoute] ?? 0)}
                      on:click={() => (activeComfort[activeRoute] = i)}
                    >
                      {level.label}
                    </button>
                  {/each}
                </div>
              {/if}

              <div class="mt-4 rounded-[12px] border border-ink/12 bg-surface p-6 md:p-8">
                <a class="font-serif text-lg font-semibold text-heading hover:underline" href={`/tours/${tour.slug}`}>
                  {tour.title}
                </a>
                {#if price}<p class="mt-3 text-[14.5px] font-semibold text-clay">From {price} per person</p>{/if}
                {#if tour.duration_days}
                  <p class="mt-1 text-sm text-ink/60">
                    {tour.duration_days} day{tour.duration_days === 1 ? '' : 's'}{tour.duration_nights ? ` · ${tour.duration_nights} night${tour.duration_nights === 1 ? '' : 's'}` : ''}
                  </p>
                {/if}
                <p class="mt-5 text-[13px] italic leading-relaxed text-ink/55">
                  Final price is confirmed after checking flights, accommodation availability and your group size.
                </p>
              </div>
            </div>
          {/if}

          {#if days.length}
            <div class="mt-9 border-t border-ink/15 pt-8">
              <h4 class="font-serif text-xl font-semibold text-heading md:text-2xl">Day by day</h4>
              <div class="mt-4">
                <ItineraryDays {days} openIndex={openDay} />
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}
