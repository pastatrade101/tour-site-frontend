<script lang="ts">
  import { ArrowRight, MapPin } from '@lucide/svelte';
  import { imgUrl, thumbUrl } from '$lib/img';
  import { trackEvent } from '$lib/analytics';
  import type { Destination } from '$lib/types';

  // Edge-to-edge mosaic of REAL published destinations: an intro tile plus up
  // to 7 photo tiles. Hovering a tile zooms the photo and reveals a
  // "Request this trip" action. No fabricated ratings or counts.
  export let destinations: Destination[] = [];
  export let eyebrow = 'Where travellers go';
  export let title = 'Top Destinations';
  export let subtitle = 'The parks, peaks and coastlines our guests ask for most — each one a trip we can shape around you.';

  $: tiles = destinations.filter((d) => thumbUrl(d, 'main_image_url', 'image_url', 'banner_image_url')).slice(0, 7);

  const requestHref = (d: Destination) => `/plan-my-trip?destination=${encodeURIComponent(d.slug)}`;
  const onRequest = (d: Destination) =>
    trackEvent('cta_click', { cta_name: 'Request this trip', cta_location: 'top_destinations', metadata: { destination: d.slug } });
</script>

{#if tiles.length}
  <section class="grid grid-cols-2 md:grid-cols-4" aria-label={title}>
    <!-- intro tile -->
    <div class="relative col-span-2 flex min-h-[260px] flex-col items-center justify-center gap-4 bg-deep-green px-8 py-12 text-center text-white md:min-h-0">
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
        <img
          class="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
          src={imgUrl(thumbUrl(d, 'main_image_url', 'image_url', 'banner_image_url'), 700)}
          alt={d.name}
          loading="lazy"
          decoding="async"
        />
        <!-- base scrim for the name; deepens on hover -->
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent transition duration-500 group-hover:from-black/85 group-hover:via-black/40" aria-hidden="true"></div>

        <div class="absolute inset-x-0 bottom-0 p-5">
          {#if d.region || d.country}
            <p class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
              <MapPin size={11} strokeWidth={2.8} /> {d.region || d.country}
            </p>
          {/if}
          <p class="mt-1 font-serif text-2xl font-semibold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">{d.name}</p>

          <!-- request pill: always visible on touch, revealed on hover for pointers -->
          <span class="mt-3 inline-flex translate-y-0 items-center gap-2 rounded-full bg-goldfinch-gold px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-heading opacity-100 shadow-lg transition-all duration-300 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
            Request this trip <ArrowRight size={14} strokeWidth={2.8} class="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </a>
    {/each}
  </section>
{/if}
