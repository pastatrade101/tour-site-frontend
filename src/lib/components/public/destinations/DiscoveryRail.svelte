<script lang="ts">
  /**
   * DiscoveryRail — a horizontal, swipeable collection of destinations used for
   * the editorial discovery sections ("Featured by our specialists", "Classic
   * safari country", …).
   *
   * Everything shown comes from the collection passed in: a title, a blurb and
   * the destinations themselves. No counts, badges, ratings or seasons are
   * derived here — the card owns whatever it can honestly say about a place.
   *
   * Mobile is the primary design: the rail bleeds to the screen edge, snaps
   * card by card, and always leaves a partial card peeking so the gesture is
   * discoverable. The previous/next buttons are a desktop affordance layered on
   * top, and they only appear when there is genuinely something to scroll to.
   */
  import { onDestroy, tick } from 'svelte';
  import { ArrowRight, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { fadeUpOnScroll, prefersReducedMotion } from '$lib/animations';
  import DestinationCardPremium from './DestinationCardPremium.svelte';
  import type { Destination } from '$lib/types';

  export let title = '';
  export let blurb = '';
  export let destinations: Destination[] = [];
  export let viewAllHref = '';

  let railEl: HTMLUListElement | null = null;
  let hasOverflow = false;
  let atStart = true;
  let atEnd = false;

  /** Sub-pixel scroll positions and zoom rounding never land exactly on 0 or max. */
  const EDGE_TOLERANCE = 4;

  /** Stable across SSR and hydration, so `aria-labelledby` never points at nothing. */
  const idFrom = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  $: railKey = idFrom(title) || 'collection';
  $: headingId = `rail-${railKey}-title`;
  $: railId = `rail-${railKey}-track`;
  $: railLabel = `${title || 'Destinations'}: ${destinations.length} ${
    destinations.length === 1 ? 'destination' : 'destinations'
  }. Use the left and right arrow keys to scroll.`;

  const measure = () => {
    if (!railEl) return;
    const maxScroll = railEl.scrollWidth - railEl.clientWidth;
    hasOverflow = maxScroll > EDGE_TOLERANCE;
    atStart = railEl.scrollLeft <= EDGE_TOLERANCE;
    atEnd = railEl.scrollLeft >= maxScroll - EDGE_TOLERANCE;
  };

  /** Scroll and resize both fire far faster than the buttons need updating, and
   *  every measure reads layout — coalesce them into one read per frame. */
  let measureFrame = 0;

  const queueMeasure = () => {
    if (!browser || measureFrame) return;
    measureFrame = requestAnimationFrame(() => {
      measureFrame = 0;
      measure();
    });
  };

  onDestroy(() => {
    if (browser && measureFrame) cancelAnimationFrame(measureFrame);
  });

  /** Re-measure once the new cards are in the DOM. */
  const scheduleMeasure = () => {
    if (!browser) return;
    void tick().then(measure);
  };

  $: if (railEl && destinations) scheduleMeasure();

  /** One card plus one gap — read off the live layout so the CSS stays the
   *  single source of truth for card width at each breakpoint. */
  const cardStep = () => {
    if (!railEl) return 0;
    const first = railEl.children[0] as HTMLElement | undefined;
    if (!first) return railEl.clientWidth;
    const second = railEl.children[1] as HTMLElement | undefined;
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
  };

  const behavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

  const nudge = (direction: 1 | -1) => {
    if (!railEl) return;
    railEl.scrollBy({ left: direction * cardStep(), behavior: behavior() });
  };

  const jumpTo = (left: number) => {
    if (!railEl) return;
    railEl.scrollTo({ left, behavior: behavior() });
  };

  /** Arrow/Home/End only when the rail itself holds focus — once a card link is
   *  focused those keys belong to the link and the page, not to us. */
  const onRailKeydown = (event: KeyboardEvent) => {
    if (!railEl || event.target !== railEl) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      nudge(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nudge(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      jumpTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      jumpTo(railEl.scrollWidth);
    }
  };
</script>

<svelte:window on:resize={queueMeasure} />

{#if destinations.length}
  <section class="py-10 md:py-14" aria-labelledby={headingId}>
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-x-10 gap-y-5" use:fadeUpOnScroll={{ y: 14 }}>
        <div class="max-w-[620px]">
          <h2
            id={headingId}
            class="font-serif text-[26px] font-semibold leading-[1.15] tracking-tight text-heading sm:text-[30px] md:text-[34px]"
          >
            {title}
          </h2>
          {#if blurb}
            <p class="mt-3 text-[15px] leading-relaxed text-ink/65 md:text-base">{blurb}</p>
          {/if}
        </div>

        <div class="flex items-center gap-3">
          {#if viewAllHref}
            <a
              class="group inline-flex h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-forest transition duration-200 hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              href={viewAllHref}
            >
              <span class="underline decoration-goldfinch-gold/45 decoration-2 underline-offset-[6px]">View all</span>
              <ArrowRight size={15} class="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </a>
          {/if}

          {#if hasOverflow}
            <div class="hidden items-center gap-2 lg:flex">
              <button
                type="button"
                class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-surface text-heading transition duration-200 hover:border-goldfinch-gold/60 hover:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-ink/15 disabled:hover:bg-surface"
                aria-label={`Scroll ${title || 'this collection'} backwards`}
                aria-controls={railId}
                disabled={atStart}
                on:click={() => nudge(-1)}
              >
                <ChevronLeft size={18} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-surface text-heading transition duration-200 hover:border-goldfinch-gold/60 hover:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-ink/15 disabled:hover:bg-surface"
                aria-label={`Scroll ${title || 'this collection'} forwards`}
                aria-controls={railId}
                disabled={atEnd}
                on:click={() => nudge(1)}
              >
                <ChevronRight size={18} strokeWidth={1.75} />
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- A scrollable region must be reachable by keyboard, which means a
           tabindex on a list. The label and the arrow-key handling above are
           what make that focus stop useful. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y-no-noninteractive-tabindex -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y-no-noninteractive-element-interactions -->
      <ul
        bind:this={railEl}
        id={railId}
        class="gf-rail -mx-6 mt-7 flex snap-x snap-mandatory scroll-pl-6 gap-4 overflow-x-auto overscroll-x-contain px-6 pb-6 pt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-goldfinch-gold md:gap-6 lg:-mx-2 lg:scroll-pl-2 lg:px-2"
        tabindex="0"
        aria-label={railLabel}
        on:scroll={queueMeasure}
        on:keydown={onRailKeydown}
      >
        {#each destinations as destination (destination.id || destination.slug || destination.name)}
          <li class="w-[78vw] max-w-[300px] shrink-0 snap-start sm:w-[300px] md:w-[340px] md:max-w-none [&>*]:h-full">
            <DestinationCardPremium {destination} />
          </li>
        {/each}
      </ul>
    </div>
  </section>
{/if}

<style>
  /* The peeking card is the scroll affordance — a scrollbar would only add
     chrome to an otherwise clean editorial band. */
  .gf-rail {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .gf-rail::-webkit-scrollbar {
    display: none;
  }
</style>
