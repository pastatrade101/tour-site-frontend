<script lang="ts">
  import { ArrowRight, MapPin } from '@lucide/svelte';
  import { toMetaText } from '$lib/richText';
  import Img from '../Img.svelte';
  import type { Destination } from '$lib/types';

  export let eyebrow = 'Top Destinations';
  export let title = 'The Places That Shape the Journey';
  export let subtitle =
    'Some places are best for wildlife. Others are better for beaches, culture, trekking or quiet time after safari. The right Tanzania trip depends on how these places fit together.';
  export let destinations: Destination[] = [];

  $: cards = destinations.slice(0, 8);
  const metaOf = (destination: Destination): string => destination.region || destination.country || '';
  const blurbOf = (destination: Destination): string =>
    toMetaText(destination.short_description || destination.description || '', 170);
</script>

{#if cards.length}
  <section class="home-destinations py-14 md:py-16 lg:py-20">
    <div class="container-shell">
      <div class="max-w-[920px]">
        {#if eyebrow}
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{eyebrow}</p>
        {/if}
        {#if title}
          <h2 class="mt-3 font-serif text-3xl leading-[1.08] text-heading sm:text-4xl lg:text-[46px]">{title}</h2>
        {/if}
        {#if subtitle}
          <p class="mt-4 max-w-[820px] text-[15px] leading-relaxed text-ink/70 md:text-[17px]">{subtitle}</p>
        {/if}
      </div>

      <div class="destination-grid mt-8 md:mt-10 lg:mt-12">
        {#each cards as destination, index (destination.id ?? destination.slug)}
          <a
            href={`/destinations/${destination.slug}`}
            class:destination-lead={index === 0}
            class:destination-wide={index === 5}
            class="destination-card group relative min-w-0 overflow-hidden rounded-[8px] bg-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2"
            aria-label={`Explore ${destination.name}`}
          >
            <Img
              record={destination}
              fields={['main_image_url', 'image_url', 'banner_image_url']}
              alt={destination.name}
              width={index === 0 || index === 5 ? 1200 : 720}
              sizes={index === 0 || index === 5
                ? '(max-width: 767px) 82vw, (max-width: 1023px) 50vw, 50vw'
                : '(max-width: 767px) 82vw, (max-width: 1023px) 50vw, 25vw'}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
            />
            <div class="destination-scrim absolute inset-0" aria-hidden="true"></div>

            <span class="destination-arrow absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-heading shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true">
              <ArrowRight size={17} class="-rotate-45" strokeWidth={2.2} />
            </span>

            <div class="destination-copy absolute inset-x-0 bottom-0 p-4 text-white md:p-5">
              {#if metaOf(destination)}
                <p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold">
                  <MapPin size={12} strokeWidth={2.5} />
                  <span class="truncate">{metaOf(destination)}</span>
                </p>
              {/if}
              <h3 class="mt-1 font-serif text-xl font-semibold leading-tight md:text-[22px]">{destination.name}</h3>
              {#if blurbOf(destination)}
                <p class="destination-description mt-2 max-w-[390px] text-[13px] leading-relaxed text-white/85">
                  {blurbOf(destination)}
                </p>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}

<style>
  .destination-grid {
    display: flex;
    gap: 0.875rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .destination-grid::-webkit-scrollbar {
    display: none;
  }

  .destination-card {
    width: min(82vw, 310px);
    height: 270px;
    flex: 0 0 auto;
    scroll-snap-align: start;
  }

  .destination-scrim {
    background: linear-gradient(180deg, rgb(20 24 18 / 0.04) 28%, rgb(20 24 18 / 0.82) 100%);
  }

  .destination-description {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  @media (max-width: 767px) {
    .home-destinations h2 {
      width: 100%;
      font-size: clamp(1.9rem, 8vw, 2.35rem);
      text-wrap: balance;
    }

    .destination-arrow {
      right: 0.75rem;
      top: 0.75rem;
      width: 2.25rem;
      height: 2.25rem;
    }
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    .destination-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      overflow: visible;
    }

    .destination-card {
      width: auto;
      height: 300px;
    }
  }

  @media (min-width: 1024px) {
    .destination-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      grid-template-rows: repeat(3, 225px);
      gap: 1rem;
      overflow: visible;
    }

    .destination-card {
      width: auto;
      height: auto;
    }

    .destination-lead {
      grid-column: span 2;
      grid-row: span 2;
    }

    .destination-wide {
      grid-column: span 2;
    }

    .destination-card:not(.destination-lead):not(.destination-wide) .destination-description {
      display: none;
    }

    .destination-lead .destination-copy,
    .destination-wide .destination-copy {
      padding: 1.5rem;
    }

    .destination-lead h3,
    .destination-wide h3 {
      font-size: 1.75rem;
    }
  }

  @media (min-width: 1280px) {
    .destination-grid {
      grid-template-rows: repeat(3, 245px);
      gap: 1.125rem;
    }
  }
</style>
