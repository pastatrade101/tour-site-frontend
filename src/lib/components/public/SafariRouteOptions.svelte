<script lang="ts">
  /**
   * The route options panel, laid out exactly as the supplied design: route
   * tabs, a wide photo, then one card holding the intro, highlights, a
   * comfort-tabbed price panel, the day-by-day accordion with accommodation
   * folded into day one, and a horizontal closing CTA.
   *
   * The content is not typed twice. A route names real published tours, one
   * per comfort level, and the photo, wording, price, highlights, days and
   * lodges all come from those records — so this page and the tour pages
   * cannot drift, and a route whose tour is unpublished drops out rather than
   * rendering a broken tab.
   */
  import { ArrowRight, Check, ChevronDown, Tent } from '@lucide/svelte';
  import Img from './Img.svelte';
  import RichText from './RichText.svelte';
  import { currency, formatUsd } from '$lib/currency';
  import { parseRouteTour, lines, str } from '$lib/safariPackageBlocks';
  import type { ItineraryDay, Tour } from '$lib/types';

  type RouteRow = { tab?: string; tours?: unknown; best_for?: string; note?: string; stay_note?: string };

  export let routes: RouteRow[] = [];
  export let tours: Tour[] = [];
  export let ctaLabel = 'Send request for this route';
  export let formHref = '#lead-form';

  const tourBySlug = (slug: string) => tours.find((tour) => tour.slug === slug);

  $: resolved = routes
    .map((route) => {
      const comfort = lines(route.tours)
        .map((line) => parseRouteTour(line))
        .map((entry) => ({ ...entry, tour: tourBySlug(entry.slug) }))
        .filter((entry): entry is { label: string; slug: string; tour: Tour } => Boolean(entry.tour))
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

  /** Real lodges on the selected comfort level's itinerary. Absent, the strip hides. */
  $: stayImages = (() => {
    const seen = new Set<string>();
    const out: { src: string; alt: string }[] = [];
    for (const day of daysOf(stayed?.tour)) {
      const lodge = day.lodge as { name?: string; hero_image_url?: string; lodge_images?: { image_url?: string }[] } | undefined;
      if (!lodge) continue;
      const src = lodge.hero_image_url || lodge.lodge_images?.[0]?.image_url;
      if (!src || seen.has(src)) continue;
      seen.add(src);
      out.push({ src, alt: lodge.name ?? 'Accommodation on this route' });
    }
    return out.slice(0, 3);
  })();

  let openDay = 0;
  $: if (activeRoute >= 0) openDay = 0;

  const GOLD =
    'inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-goldfinch-gold px-6 text-[14px] font-bold text-heading transition hover:brightness-105';
  const SUB = 'font-serif text-[20px] font-semibold text-heading md:text-[24px]';
  const BODY = 'text-[14.5px] leading-relaxed text-ink/70';
</script>

{#if resolved.length}
  <!-- Route tabs -->
  <div
    class="-mx-4 mt-8 flex gap-[10px] overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0"
    role="tablist"
    aria-label="Route options"
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
        {item.tab || item.comfort[0].tour.title}
      </button>
    {/each}
  </div>

  {#if route && headTour}
    <!-- Wide photo + panel = one card -->
    <div class="mt-6 overflow-hidden rounded-[12px]">
      {#if headTour.main_image_url}
        <Img
          src={headTour.main_image_url}
          alt={route.tab || headTour.title}
          width={1180}
          sizes="(max-width: 1179px) 100vw, 1180px"
          className="block h-[240px] w-full rounded-t-[12px] object-cover sm:h-[320px] md:h-[360px] lg:h-[430px]"
        />
      {/if}

      <div class="rounded-b-[12px] bg-canvas p-6 sm:p-9 md:p-11 lg:p-14">
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
            <h3 class={SUB}>Tour Highlights</h3>
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
          <h3 class={SUB}>Prices for This Route</h3>
          <p class="mt-3 max-w-[820px] text-[15px] leading-relaxed text-ink/70">
            Pricing depends on accommodation style, travel date, availability and the number of travellers.
            Choose a comfort level below to see the starting structure.
          </p>
          {#if route.comfort.length > 1}
            <div class="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible" role="tablist" aria-label="Price comfort level">
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

          <div class="mt-4 rounded-[12px] border border-ink/[0.16] bg-surface p-6 md:p-10">
            <h4 class="font-serif text-[19px] font-semibold text-heading">{priced?.label}</h4>
            {#if priced?.tour.short_description}
              <p class="mt-2 max-w-[760px] text-[14.5px] leading-relaxed text-ink/70">{priced.tour.short_description}</p>
            {/if}
            {#if priceLabel}<p class="mt-4 text-[14.5px] font-semibold text-clay">From {priceLabel} per person</p>{/if}
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
            <p class="mt-5 text-[13px] italic leading-relaxed text-ink/55">
              Final price is confirmed after checking flights, accommodation availability and your group size.
            </p>
            <a class={`mt-5 ${GOLD}`} href={formHref}>
              Check This Price for My Date
              <ArrowRight size={16} />
            </a>
          </div>
        </div>

        <!-- Day by day, with accommodation folded into day one -->
        {#if days.length}
          <div class="mt-9 border-t border-ink/[0.18] pt-8">
            <h3 class={SUB}>Day by Day Itinerary</h3>
            <div class="mt-4 overflow-hidden rounded-[12px] border border-ink/[0.16] bg-surface">
              {#each days as day, i (i)}
                <div class={i > 0 ? 'border-t border-ink/[0.12]' : ''}>
                  <button
                    class="flex w-full items-center gap-4 px-5 py-5 text-left md:px-8 md:py-7"
                    type="button"
                    aria-expanded={i === openDay}
                    on:click={() => (openDay = i === openDay ? -1 : i)}
                  >
                    <span class="inline-flex h-7 shrink-0 items-center rounded-[8px] bg-deep-green px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-surface">
                      Day {day.day_number ?? i + 1}
                    </span>
                    <span class="font-serif flex-1 text-[16px] font-semibold leading-snug text-heading md:text-[19px]">
                      {day.title ?? ''}
                    </span>
                    <ChevronDown size={20} class={`shrink-0 text-heading transition-transform ${i === openDay ? 'rotate-180' : ''}`} />
                  </button>

                  {#if i === openDay}
                    <div class="px-5 pb-6 md:px-8 md:pb-8">
                      {#if day.description}
                        <RichText value={day.description} className={`mt-2 max-w-[820px] ${BODY}`} />
                      {/if}

                      {#if i === 0 && (route.stayNote || stayImages.length)}
                        <div class="mt-7 border-t border-ink/[0.12] pt-6">
                          <h4 class="font-serif flex items-center gap-2 text-[17px] font-semibold text-heading md:text-[19px]">
                            <Tent size={18} class="text-clay" />
                            Accommodation Options
                          </h4>
                          {#if route.comfort.length > 1}
                            <div class="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible" role="tablist" aria-label="Accommodation comfort level">
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
                          <div class="mt-4 rounded-[12px] border border-ink/[0.12] bg-surface p-5 md:p-8">
                            {#if route.stayNote}
                              <p class={`max-w-[820px] ${BODY}`}>{route.stayNote}</p>
                            {/if}
                            {#if stayImages.length}
                              <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {#each stayImages as image, ii (ii)}
                                  <Img
                                    src={image.src}
                                    alt={image.alt}
                                    width={520}
                                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 48vw, 32vw"
                                    className="h-[160px] w-full rounded-[10px] object-cover md:h-[180px]"
                                  />
                                {/each}
                              </div>
                            {/if}
                            <p class="mt-5 text-[13px] italic leading-relaxed text-ink/55">
                              Final accommodation depends on route choice, travel date, availability and preferred comfort level.
                            </p>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Route CTA — horizontal -->
        <div class="mt-9 flex flex-col gap-4 border-t border-ink/[0.18] pt-8 md:flex-row md:items-center md:justify-between">
          <div class="max-w-[720px]">
            <h3 class="font-serif text-[19px] font-semibold text-heading md:text-[22px]">
              Want This Route Checked for Your Date?
            </h3>
            <p class={`mt-2 ${BODY}`}>
              Share your preferred start date and group size. We'll check flights, accommodation and route
              availability before sending a proposal.
            </p>
          </div>
          <a class={`shrink-0 ${GOLD}`} href={formHref}>
            Send Request
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  {/if}
{/if}
