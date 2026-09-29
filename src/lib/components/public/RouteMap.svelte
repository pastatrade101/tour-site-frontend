<script lang="ts">
  /**
   * WHERE YOU GO — the route of a tour, drawn on the map of Tanzania.
   *
   * The map itself (lib/geo/TanzaniaMap.svelte, lib/geo/basemap.ts and
   * static/geo/tz-basemap.json) is copied VERBATIM from the Makutano Journeys
   * marketplace, so an improvement there reaches this site as a plain copy.
   * Everything Goldfinch-specific lives here instead: the brand palette, the
   * type tokens the map expects its host page to define, the legend, and the
   * translated labels. Do not edit the copied files; edit this one.
   *
   * Built from the ITINERARY rather than the tour's destination list, because
   * only the itinerary knows the order and the nights.
   */
  import { onMount } from 'svelte';
  import TanzaniaMap from '$lib/geo/TanzaniaMap.svelte';
  import type { BasemapDoc, MapMarker } from '$lib/geo/basemap';
  import type { ItineraryDay } from '$lib/types';
  import { t } from '$lib/i18n/ui';

  interface Props {
    days: ItineraryDay[];
    title?: string;
  }
  let { days, title = '' }: Props = $props();

  type Stop = {
    name: string;
    slug: string | null;
    lat: number;
    lng: number;
    first: number;
    last: number;
    /** How the traveller REACHED this stop, from the day that arrives at it. */
    mode: 'DRIVE' | 'FLY' | 'BOAT' | null;
  };

  /**
   * One stop per place, in travelling order.
   *
   * Consecutive days at the same place collapse into one stop carrying a day
   * RANGE — three nights in the Serengeti is one pin reading "Days 2-4", which is
   * how a person describes it. A day with no linked place, or a place with no
   * coordinates yet, is skipped rather than guessed: a pin in the wrong park on
   * a page a traveller books from is worse than a missing one.
   */
  const stops = $derived.by(() => {
    const out: Stop[] = [];
    const ordered = [...(days ?? [])].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0));
    for (const day of ordered) {
      const place = day.destination;
      // Finite, not merely present: PostgREST returns numeric as a string, and
      // an empty string would otherwise become 0 — a pin in the Gulf of Guinea.
      const lat = place?.latitude == null || place.latitude === '' ? NaN : Number(place.latitude);
      const lng = place?.longitude == null || place.longitude === '' ? NaN : Number(place.longitude);
      if (!place || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const prev = out[out.length - 1];
      if (prev && prev.slug === place.slug && prev.lat === lat && prev.lng === lng) {
        prev.last = day.day_number;
        continue;
      }
      out.push({
        name: place.name,
        slug: place.slug ?? null,
        lat,
        lng,
        first: day.day_number,
        last: day.day_number,
        mode: day.travel_mode ?? null
      });
    }
    return out;
  });

  const dayLabel = (s: Stop) =>
    s.first === s.last
      ? `${$t('ui.route_day')} ${s.first}`
      : `${$t('ui.route_days')} ${s.first}–${s.last}`;

  const markers = $derived<MapMarker[]>(
    stops.map((s, i) => ({
      lat: s.lat,
      lng: s.lng,
      badge: dayLabel(s),
      kind: i === 0 ? 'start' : i === stops.length - 1 ? 'end' : 'stop',
      // The leg INTO this stop is drawn in this mode's dash pattern.
      mode: s.mode ?? undefined
    }))
  );

  /**
   * The whole country, not fitted to the stops — so a reader can tell whether
   * a route runs along the coast or across the middle. Only a route confined to
   * one small area (a Zanzibar-only trip) is zoomed, because at country scale
   * its pins would land on top of one another.
   */
  const focus = $derived.by((): 'country' | 'markers' => {
    if (stops.length < 2) return 'country';
    const span = Math.max(
      Math.max(...stops.map((s) => s.lat)) - Math.min(...stops.map((s) => s.lat)),
      Math.max(...stops.map((s) => s.lng)) - Math.min(...stops.map((s) => s.lng))
    );
    return span < 0.9 ? 'markers' : 'country';
  });

  /*
   * The basemap is fetched once and cached by the browser for every tour, rather
   * than shipped inside each page's data. If it fails the section removes itself:
   * a map is an illustration of the itinerary below it, never a substitute.
   */
  let basemap = $state<BasemapDoc | null>(null);
  let failed = $state(false);
  onMount(() => {
    if (!stops.length) return;
    fetch('/geo/tz-basemap.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((doc: BasemapDoc) => (basemap = doc))
      .catch(() => (failed = true));
  });
</script>

{#if stops.length && !failed}
  <section id="route" class="tour-section route scroll-mt-32" aria-labelledby="route-heading">
    <p class="route__eyebrow">{$t('ui.route_eyebrow')}</p>
    <h2 id="route-heading" class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">
      {$t('ui.route_heading')}
    </h2>

    <div class="route__grid">
      <div class="route__map">
        {#if basemap}
          <TanzaniaMap
            {basemap}
            {markers}
            route
            {focus}
            width={640}
            ariaLabel={title ? `${$t('ui.route_heading')}: ${title}` : $t('ui.route_heading')}
          />
        {:else}
          <!-- Holds the height so the page does not jump when the map lands. -->
          <div class="route__skeleton" aria-hidden="true"></div>
        {/if}
      </div>

      <ol class="route__legend">
        {#each stops as stop, i (stop.slug + ':' + stop.first)}
          <li class="route__stop">
            <span
              class="route__dot"
              class:is-start={i === 0}
              class:is-end={i === stops.length - 1 && stops.length > 1}
              aria-hidden="true"
            ></span>
            <span class="route__day">{dayLabel(stop)}</span>
            {#if stop.slug}
              <a class="route__place" href="/destinations/{stop.slug}">{stop.name}</a>
            {:else}
              <span class="route__place">{stop.name}</span>
            {/if}
          </li>
        {/each}
      </ol>
    </div>
  </section>
{/if}

<style>
  .route {
    /*
     * The map's palette, from Goldfinch's own brand variables so the admin
     * Branding page recolours the route along with everything else. The copied
     * map reads these; it ships no colours of its own that matter.
     */
    --map-sea: #eaf1f3;
    --map-land: #e3e6dc;
    --map-land-hover: #d5dacd;
    --map-land-active: #ecd3c9;
    --map-land-active-edge: rgb(var(--c-clay));
    --map-land-active-hover: #e3c2b6;
    --map-water: #cfe0e7;
    --map-water-edge: #bcd3dc;
    --map-border: #ffffff;
    --map-outline: #a7aea2;
    --map-route: rgb(var(--c-clay));
    --map-pin: rgb(var(--c-clay));
    --map-pin-start: #3d6b52;
    --map-pin-end: rgb(var(--c-forest));
    --map-label: rgb(var(--c-ink) / 0.82);
    --map-label-muted: rgb(var(--c-ink) / 0.55);
    --map-radius: 10px;
    --mk-accent: rgb(var(--c-clay));

    /*
     * The four type tokens the copied map reads WITHOUT a fallback. Undefined,
     * the declaration is invalid and the pin labels inherit the page's body size
     * — "Day 2" at 16px sitting on top of the pin beside it.
     */
    --fs-tiny: 10px;
    --fs-label: 12px;
    --fs-meta: 13px;
    --fw-bold: 700;
  }

  /* Dark mode keeps the brand accents and darkens the geography, so the map
     does not sit on a dark page as a pale rectangle. */
  :global(html.dark) .route {
    --map-sea: #1e2320;
    --map-land: #2c312a;
    --map-land-hover: #353b32;
    --map-water: #25302f;
    --map-water-edge: #2f3b3a;
    --map-border: #191b16;
    --map-outline: #555c50;
  }

  .route__eyebrow {
    margin: 0 0 6px;
    color: rgb(var(--c-clay));
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .route__grid {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
    gap: 32px;
    align-items: start;
    margin-top: 24px;
  }

  .route__map {
    overflow: hidden;
    border: 1px solid rgb(var(--c-ink) / 0.1);
    border-radius: 12px;
    background: var(--map-sea);
  }

  .route__skeleton {
    width: 100%;
    aspect-ratio: 1 / 1;
    background: linear-gradient(100deg, var(--map-sea) 30%, var(--map-land) 50%, var(--map-sea) 70%);
    background-size: 200% 100%;
    animation: route-shimmer 1.4s ease-in-out infinite;
  }
  @keyframes route-shimmer {
    to {
      background-position-x: -200%;
    }
  }

  .route__legend {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .route__stop {
    display: grid;
    grid-template-columns: 18px 72px minmax(0, 1fr);
    align-items: baseline;
    gap: 14px;
    padding: 16px 0;
    border-bottom: 1px solid rgb(var(--c-ink) / 0.1);
  }
  .route__stop:first-child {
    padding-top: 4px;
  }
  .route__stop:last-child {
    border-bottom: 0;
  }

  /* Matches the pin it stands for: green start, rust stops, dark finish. */
  .route__dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--map-pin);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--map-pin) 18%, transparent);
    align-self: center;
  }
  .route__dot.is-start {
    background: var(--map-pin-start);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--map-pin-start) 18%, transparent);
  }
  .route__dot.is-end {
    background: var(--map-pin-end);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--map-pin-end) 18%, transparent);
  }

  .route__day {
    color: rgb(var(--c-clay));
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .route__place {
    color: rgb(var(--c-heading));
    font-size: 17px;
    font-weight: 600;
    line-height: 1.35;
    text-decoration: none;
  }
  a.route__place:hover {
    color: rgb(var(--c-clay));
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  a.route__place:focus-visible {
    outline: 2px solid rgb(var(--c-clay));
    outline-offset: 3px;
    border-radius: 2px;
  }

  @media (max-width: 767.98px) {
    .route__grid {
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .route__stop {
      grid-template-columns: 16px 64px minmax(0, 1fr);
      gap: 12px;
      padding: 13px 0;
    }
    .route__place {
      font-size: 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .route__skeleton {
      animation: none;
    }
  }
</style>
