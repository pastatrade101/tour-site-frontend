<script lang="ts">
  import { ArrowRight, MapPin } from '@lucide/svelte';
  import { thumbUrl } from '$lib/img';
  import { trackEvent } from '$lib/analytics';
  import type { Destination } from '$lib/types';
  import Img from './Img.svelte';

  // Edge-to-edge mosaic of REAL published destinations: an intro tile plus up
  // to 7 photo tiles. Hovering a tile zooms the photo and reveals a
  // "Request this trip" action. No fabricated ratings or counts.
  export let destinations: Destination[] = [];
  export let eyebrow = 'Where travellers go';
  export let title = 'Top Destinations';
  export let subtitle = 'The parks, peaks and coastlines our guests ask for most — each one a trip we can shape around you.';

  $: tiles = destinations.filter((d) => thumbUrl(d, 'main_image_url', 'image_url', 'banner_image_url')).slice(0, 7);

  // `place` carries the exact destination (e.g. "Serengeti National Park") and
  // `destination` the country, which is what the plan form's country selector
  // matches on — sending only the park slug matched nothing and prefilled nothing.
  const requestHref = (d: Destination) =>
    `/plan-my-trip?place=${encodeURIComponent(d.name)}&destination=${encodeURIComponent(d.country || 'Tanzania')}`;
  const onRequest = (d: Destination) =>
    trackEvent('cta_click', { cta_name: 'Request this trip', cta_location: 'top_destinations', metadata: { destination: d.slug } });
</script>

{#if tiles.length}
  <section class="grid grid-cols-2 md:grid-cols-4" aria-label={title}>
    <!-- intro tile -->
    <div class="relative col-span-2 flex flex-col items-center justify-center gap-3 bg-deep-green px-6 py-10 text-center text-white md:gap-4 md:px-8 md:py-12">
      <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-goldfinch-gold">{eyebrow}</p>
      <h2 class="max-w-sm font-serif text-3xl font-semibold leading-tight md:text-4xl">{title}</h2>
      <p class="max-w-sm text-sm leading-6 text-white/75">{subtitle}</p>
      <a class="mt-1 inline-flex items-center gap-2 rounded-full border border-goldfinch-gold/50 px-5 py-2.5 text-sm font-bold text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-heading" href="/destinations">
        All destinations <ArrowRight size={15} strokeWidth={2.6} />
      </a>
    </div>

    {#each tiles as d (d.id)}
      <a
        class="group relative block aspect-square overflow-hidden bg-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-goldfinch-gold"
        href={requestHref(d)}
        on:click={() => onRequest(d)}
        aria-label={`Request a trip to ${d.name}`}
      >
        <Img
          record={d}
          fields={['main_image_url', 'image_url', 'banner_image_url']}
          alt={d.name}
          width={1000}
          sizes="(max-width: 767px) 50vw, 25vw"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
        />
        <!-- base scrim for the name; deepens on hover -->
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent transition duration-500 group-hover:from-black/85 group-hover:via-black/40" aria-hidden="true"></div>

        <!-- Mobile: a compact arrow badge signals the tile is tappable, instead of
             a full-width pill that wrapped over the title and cluttered the grid. -->
        <span class="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-goldfinch-gold text-heading shadow-md sm:hidden" aria-hidden="true">
          <ArrowRight size={15} strokeWidth={2.8} />
        </span>

        <div class="absolute inset-x-0 bottom-0 p-3.5 sm:p-5">
          {#if d.region || d.country}
            <p class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-goldfinch-gold [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] sm:gap-1.5 sm:text-[11px] sm:tracking-[0.14em]">
              <MapPin size={10} strokeWidth={2.8} class="shrink-0" /> <span class="truncate">{d.region || d.country}</span>
            </p>
          {/if}
          <p class="mt-0.5 line-clamp-2 font-serif text-base font-semibold leading-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:mt-1 sm:text-2xl sm:leading-snug">{d.name}</p>

          <!-- request pill: pointer devices only, revealed on hover -->
          <span class="mt-3 hidden translate-y-2 items-center gap-2 whitespace-nowrap rounded-full bg-goldfinch-gold px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-heading opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:inline-flex">
            Request this trip <ArrowRight size={14} strokeWidth={2.8} class="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </a>
    {/each}
  </section>
{/if}
