<script lang="ts">
  /**
   * Featured destinations as a swipeable rail of cinematic overlay cards.
   *
   * Every chip on a card comes from that destination's own "At a glance" quick
   * facts — recommended stay and its wildlife/experience facets. There is no
   * season chip and no rating: the CMS holds no month or ratings data, and the
   * badge is the real `is_featured` flag rather than an invented popularity rank.
  */
  import { ArrowRight, ChevronLeft, ChevronRight, Clock } from '@lucide/svelte';
  import { sourceFor } from '$lib/img';
  import { recommendedStay, regionOf, wildlifeOf, experiencesOf } from '$lib/destinationFacets';
  import type { Destination } from '$lib/types';
  import Img from '../Img.svelte';

  export let destinations: Destination[] = [];
  export let title = 'Featured destinations';
  export let viewAllHref = '#all-destinations';

  let rail: HTMLElement;
  let atStart = true;
  let atEnd = false;

  const imageOf = (destination: Destination) =>
    // 300px card at 2x DPR = 600px, exactly the thumbnail width, so the small
    // file is used here rather than pulling a multi-megabyte original.
    sourceFor(destination, 600, 'main_image_url', 'image_url', 'banner_image_url');

  const chipsOf = (destination: Destination) => {
    const chips: { icon: string; label: string }[] = [];
    const stay = recommendedStay(destination);
    if (stay) chips.push({ icon: '', label: stay });
    const tag = wildlifeOf(destination)[0] ?? experiencesOf(destination)[0];
    if (tag) chips.push({ icon: tag.icon, label: tag.label });
    return chips;
  };

  const updateEdges = () => {
    if (!rail) return;
    atStart = rail.scrollLeft <= 4;
    atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  };

  const nudge = (direction: 1 | -1) => {
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.min(rail.clientWidth * 0.8, 380), behavior: 'smooth' });
  };
</script>

{#if destinations.length}
  <section class="featured-destinations-rail" aria-label={title}>
    <div class="featured-rail-head flex items-end justify-between gap-4">
      <p class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">
        <span class="h-3 w-[3px] rounded-full bg-goldfinch-gold" aria-hidden="true"></span>
        {title}
      </p>
      <div class="flex items-center gap-3">
        <a
          class="inline-flex items-center gap-1.5 text-xs font-bold text-ink/60 transition hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          href={viewAllHref}
        >
          View all destinations <ArrowRight size={14} />
        </a>
        <div class="hidden gap-1.5 md:flex">
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full border border-ink/12 bg-surface text-ink transition hover:border-goldfinch-gold hover:text-heading disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
            aria-label="Scroll left"
            disabled={atStart}
            on:click={() => nudge(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full border border-ink/12 bg-surface text-ink transition hover:border-goldfinch-gold hover:text-heading disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
            aria-label="Scroll right"
            disabled={atEnd}
            on:click={() => nudge(1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>

    <div
      class="featured-rail-track -mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0"
      bind:this={rail}
      on:scroll={updateEdges}
    >
      {#each destinations as destination, index (destination.id)}
        {@const image = imageOf(destination)}
        <a
          class="featured-rail-card group relative block aspect-[4/5] w-[268px] shrink-0 snap-start overflow-hidden rounded-[10px] bg-forest shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(57,61,50,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 md:w-[300px]"
          href={`/destinations/${destination.slug}`}
          data-sveltekit-preload-data="hover"
        >
          {#if image}
            <Img
              record={destination}
              fields={['main_image_url', 'image_url', 'banner_image_url']}
              alt=""
              width={600}
              height={750}
              sizes="300px"
              eager={index < 2}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
            />
          {:else}
            <!-- 13 of 19 destinations have no photograph; this keeps the rail
                 looking deliberate instead of showing an empty frame. -->
            <span class="absolute inset-0 bg-gradient-to-br from-deep-green via-forest to-deep-green" aria-hidden="true"></span>
            <span class="absolute inset-0 grid place-items-center font-serif text-6xl text-white/12" aria-hidden="true">
              {destination.name.charAt(0)}
            </span>
          {/if}

          <span class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" aria-hidden="true"></span>

          {#if destination.is_featured}
            <span class="absolute left-3 top-3 rounded-[6px] bg-goldfinch-gold px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-heading">
              Featured
            </span>
          {/if}

          <span class="absolute inset-x-0 bottom-0 p-4 text-white">
            <span class="block font-serif text-xl font-bold leading-tight">{destination.name}</span>
            {#if regionOf(destination)}
              <span class="mt-0.5 block text-xs font-semibold text-white/70">{regionOf(destination)}</span>
            {/if}
            <span class="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-bold text-white/85">
              {#each chipsOf(destination) as chip}
                <span class="inline-flex items-center gap-1">
                  {#if chip.icon}
                    <span aria-hidden="true">{chip.icon}</span>
                  {:else}
                    <Clock size={12} aria-hidden="true" />
                  {/if}
                  {chip.label}
                </span>
              {/each}
            </span>
          </span>
        </a>
      {/each}
    </div>
  </section>
{/if}

<style>
  @media (max-width: 767px) {
    .featured-rail-head {
      align-items: center;
      gap: 0.75rem;
    }

    .featured-rail-head p {
      font-size: 0.66rem;
      letter-spacing: 0.14em;
    }

    .featured-rail-head a {
      font-size: 0.72rem;
      white-space: nowrap;
    }

    .featured-rail-track {
      margin-top: 0.75rem;
      margin-inline: -16px;
      padding-inline: 16px;
      scroll-padding-inline: 16px;
      gap: 0.75rem;
    }

    .featured-rail-card {
      width: min(72vw, 260px);
      border-radius: 14px;
    }
  }

  @media (min-width: 640px) and (max-width: 767px) {
    .featured-rail-card {
      width: min(38vw, 260px);
    }
  }
</style>
