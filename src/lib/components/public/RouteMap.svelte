<script lang="ts">
  /**
   * WHERE YOU GO — the route of a tour, drawn on the map of Tanzania.
   *
   * The map itself (lib/geo/TanzaniaMap.svelte, lib/geo/basemap.ts and
   * static/geo/tz-basemap.json) started as a copy of the Makutano Journeys
   * marketplace's and is now this site's own. It stays generic — a map of
   * Tanzania that draws pins and a journey. Everything Goldfinch-specific lives
   * here: the brand palette, the type tokens the map expects its host page to
   * define, the legend, the pin cards, the zoom and the translated labels.
   *
   * Built from the ITINERARY rather than the tour's destination list, because
   * only the itinerary knows the order and the nights.
   */
  import { onMount, untrack } from 'svelte';
  import { ArrowRight, BedDouble, Minus, Plus, X } from '@lucide/svelte';
  import TanzaniaMap from '$lib/geo/TanzaniaMap.svelte';
  import { zoomProjection, type BasemapDoc, type MapMarker, type Zoom } from '$lib/geo/basemap';
  import type { ItineraryDay } from '$lib/types';
  import { t } from '$lib/i18n/ui';
  import { clampZoom, countryProjection, routeViews } from '$lib/routeFocus';

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
    /** The itinerary days spent here — what the pin's card describes. */
    days: ItineraryDay[];
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
        prev.days.push(day);
        continue;
      }
      out.push({
        name: place.name,
        slug: place.slug ?? null,
        lat,
        lng,
        first: day.day_number,
        last: day.day_number,
        mode: day.travel_mode ?? null,
        days: [day]
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

  /*
   * The basemap is fetched once and cached by the browser for every tour, rather
   * than shipped inside each page's data. If it fails the section removes itself:
   * a map is an illustration of the itinerary below it, never a substitute.
   */
  let basemap = $state<BasemapDoc | null>(null);
  let failed = $state(false);

  /*
   * ── Zoom ──────────────────────────────────────────────────────────────────
   * The page opens on the whole country while every pin and label stays clear
   * of the others, and fitted to the route as soon as two would overlap
   * (lib/routeFocus.ts). From there + and − step through fixed levels: three
   * in, and out as far as the whole country. Every level is centred on the
   * route, and each step glides rather than jumps.
   */
  const base = $derived(basemap ? countryProjection(basemap) : null);
  const views = $derived(
    basemap ? routeViews(markers.map((m) => ({ lat: m.lat, lng: m.lng, badge: m.badge ?? '' })), basemap) : null
  );
  let level = $state(0);
  /** The view on screen — between two levels while a zoom is gliding. */
  let shown = $state<Zoom | null>(null);
  /** The reader dragged the map, so a further zoom-in stays where they looked. */
  let panned = false;
  let glide = 0;

  // A new route (another tour, another language's labels) opens on its own view.
  $effect(() => {
    if (!views) return;
    untrack(() => {
      cancelAnimationFrame(glide);
      level = views.start;
      shown = views.levels[views.start];
      panned = false;
    });
  });
  $effect(() => () => cancelAnimationFrame(glide));

  const GLIDE_MS = 420;
  const ease = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

  /** Scale on a log curve, so every step of the glide feels the same size. */
  const glideTo = (target: Zoom) => {
    cancelAnimationFrame(glide);
    const from = shown;
    if (!from || !base || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      shown = target;
      return;
    }
    const b = base;
    const [x0, y0] = b(from.center);
    const [x1, y1] = b(target.center);
    const [s0, s1] = [Math.log(from.scale), Math.log(target.scale)];
    const t0 = performance.now();
    const tick = (now: number) => {
      const e = ease(Math.min(1, (now - t0) / GLIDE_MS));
      shown = { scale: Math.exp(s0 + (s1 - s0) * e), center: b.invert([x0 + (x1 - x0) * e, y0 + (y1 - y0) * e]) };
      if (e < 1) glide = requestAnimationFrame(tick);
    };
    glide = requestAnimationFrame(tick);
  };

  const zoomBy = (step: -1 | 1) => {
    if (!views || !base) return;
    const next = Math.min(Math.max(level + step, 0), views.levels.length - 1);
    if (next === level) return;
    level = next;
    openKey = null;
    let target = views.levels[next];
    if (next <= views.start) panned = false;
    else if (panned && shown) target = clampZoom(base, { scale: target.scale, center: shown.center });
    glideTo(target);
  };

  /*
   * Past the opening view the route no longer fits, so the map can be dragged.
   * Only then: at the opening view there is nothing hidden to drag to, and on a
   * phone a map that grabs every swipe would stop the page from scrolling.
   */
  const pannable = $derived(!!views && level > views.start);
  let drag: { id: number; x: number; y: number } | null = $state(null);

  const onPanStart = (event: PointerEvent) => {
    if (!pannable || event.button !== 0) return;
    cancelAnimationFrame(glide);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onPanMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id || !shown || !base || !frame) return;
    // Screen pixels → map units at this magnification.
    const unit = (frame.width / base.width) * shown.scale;
    const [x, y] = base(shown.center);
    const center = base.invert([x - (event.clientX - drag.x) / unit, y - (event.clientY - drag.y) / unit]);
    drag = { id: drag.id, x: event.clientX, y: event.clientY };
    shown = clampZoom(base, { scale: shown.scale, center });
    panned = true;
  };
  const onPanEnd = (event: PointerEvent) => {
    if (drag?.id === event.pointerId) drag = null;
  };

  /*
   * ── The pin cards ─────────────────────────────────────────────────────────
   * The map draws the pins but offers no click on them, so this component lays
   * its own invisible buttons exactly over the drawn pins — same projection,
   * same box as the rendered <svg> — and opens a card beside the one clicked.
   *
   * One button per PLACE, not per stop: a tour that returns to Ngorongoro draws
   * both visits on the same spot, so its card lists both.
   */
  type Place = { key: string; name: string; lat: number; lng: number; visits: Stop[] };
  const places = $derived.by(() => {
    const byKey = new Map<string, Place>();
    for (const stop of stops) {
      const key = `${stop.lat},${stop.lng}`;
      const seen = byKey.get(key);
      if (seen) seen.visits.push(stop);
      else byKey.set(key, { key, name: stop.name, lat: stop.lat, lng: stop.lng, visits: [stop] });
    }
    return [...byKey.values()];
  });

  /** "flight from Zanzibar,\nTarangire game drive" → ["Flight from Zanzibar", "Tarangire game drive"]. */
  const activitiesOf = (visit: Stop): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const day of visit.days) {
      const text = String(day.activities ?? '').replace(/<[^>]*>/g, '\n');
      for (const raw of text.split(/\n|;|•/)) {
        const line = raw.replace(/^[\s,.\-–*]+|[\s,.]+$/g, '');
        if (!line || seen.has(line.toLowerCase())) continue;
        seen.add(line.toLowerCase());
        out.push(line.charAt(0).toUpperCase() + line.slice(1));
      }
    }
    return out;
  };

  /** Where they sleep, once per property, linked when it has a page. */
  const staysOf = (visit: Stop): Array<{ name: string; slug: string | null }> => {
    const seen = new Set<string>();
    const out: Array<{ name: string; slug: string | null }> = [];
    for (const day of visit.days) {
      const name = String(day.lodge?.name ?? day.accommodation ?? '').trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      out.push({ name, slug: day.lodge?.slug ?? null });
    }
    return out;
  };

  const projection = $derived(base && shown ? zoomProjection(base, shown) : null);

  // The rendered <svg>'s box inside the stage, kept current as the page resizes.
  let stage = $state<HTMLDivElement | null>(null);
  let frame = $state<{ left: number; top: number; width: number; height: number } | null>(null);
  $effect(() => {
    if (!stage || !basemap) return;
    const measure = () => {
      const svg = stage?.querySelector('.route__map svg');
      if (!stage || !svg) return;
      const outer = stage.getBoundingClientRect();
      const box = svg.getBoundingClientRect();
      frame = { left: box.left - outer.left, top: box.top - outer.top, width: box.width, height: box.height };
    };
    const frameId = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  });

  const pinAt = (place: Place) => {
    if (!projection || !frame) return { x: 0, y: 0 };
    const [x, y] = projection([place.lng, place.lat]);
    return { x: (x / projection.width) * frame.width, y: (y / projection.height) * frame.height };
  };

  /** Zoomed in, some pins are off the map — no button, and no card, for those. */
  const inFrame = (pin: { x: number; y: number }) =>
    !!frame && pin.x >= 0 && pin.x <= frame.width && pin.y >= 0 && pin.y <= frame.height;

  let openKey = $state<string | null>(null);
  const openPlace = $derived(places.find((place) => place.key === openKey) ?? null);

  /** Beside its pin, flipped above it in the lower half, never off the map's sides. */
  const cardStyle = $derived.by(() => {
    if (!openPlace || !frame) return '';
    const pin = pinAt(openPlace);
    const width = Math.min(300, frame.width - 16);
    const left = Math.min(Math.max(pin.x - width / 2, 8), frame.width - width - 8);
    const vertical = pin.y > frame.height / 2 ? `bottom:${frame.height - pin.y + 20}px` : `top:${pin.y + 20}px`;
    return `left:${left}px;width:${width}px;${vertical}`;
  });

  // Escape or a click anywhere else closes the card.
  $effect(() => {
    if (!openKey) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') openKey = null;
    };
    const onPointer = (event: PointerEvent) => {
      if (stage && !stage.contains(event.target as Node)) openKey = null;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  });

  /** Opens that day in "Day by day" below and brings it into view. */
  const showDay = (dayNumber: number) => {
    openKey = null;
    const day = document.getElementById(`day-${dayNumber}`);
    if (day instanceof HTMLDetailsElement) day.open = true;
    day?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      <div class="route__stage" bind:this={stage}>
        <!-- Dragging is a pointer shortcut. Every zoom level is centred on the route,
             and the legend and "Day by day" list every stop for the keyboard. -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="route__map"
          class:is-pannable={pannable}
          class:is-dragging={!!drag}
          onpointerdown={onPanStart}
          onpointermove={onPanMove}
          onpointerup={onPanEnd}
          onpointercancel={onPanEnd}
        >
          {#if basemap}
            <TanzaniaMap
              {basemap}
              {markers}
              route
              zoom={shown ?? undefined}
              width={640}
              ariaLabel={title ? `${$t('ui.route_heading')}: ${title}` : $t('ui.route_heading')}
            />
          {:else}
            <!-- Holds the height so the page does not jump when the map lands. -->
            <div class="route__skeleton" aria-hidden="true"></div>
          {/if}
        </div>

        {#if projection && frame}
          <!-- Over the map, not inside its clipped frame, so a card near an edge is never cut off. -->
          <div class="route__hits" style="left:{frame.left}px;top:{frame.top}px;width:{frame.width}px;height:{frame.height}px">
            {#each places as place (place.key)}
              {@const pin = pinAt(place)}
              {#if inFrame(pin)}
                <button
                  type="button"
                  class="route__hit"
                  class:is-open={openKey === place.key}
                  style="left:{pin.x}px;top:{pin.y}px"
                  aria-expanded={openKey === place.key}
                  aria-label="{place.visits.map(dayLabel).join(', ')} · {place.name}"
                  onclick={() => (openKey = openKey === place.key ? null : place.key)}
                ></button>
              {/if}
            {/each}

            {#if views && views.levels.length > 1}
              <div class="route__zoom">
                <button
                  type="button"
                  aria-label={$t('ui.zoom_in')}
                  title={$t('ui.zoom_in')}
                  disabled={level >= views.levels.length - 1}
                  onclick={() => zoomBy(1)}
                >
                  <Plus size={18} strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  aria-label={$t('ui.zoom_out')}
                  title={$t('ui.zoom_out')}
                  disabled={level <= 0}
                  onclick={() => zoomBy(-1)}
                >
                  <Minus size={18} strokeWidth={2.25} />
                </button>
              </div>
            {/if}

            {#if openPlace && inFrame(pinAt(openPlace))}
              <div class="route__card" role="dialog" aria-label={openPlace.name} style={cardStyle}>
                <button type="button" class="route__card-close" aria-label={$t('ui.close')} onclick={() => (openKey = null)}>
                  <X size={16} />
                </button>
                <p class="route__card-place">{openPlace.name}</p>
                {#each openPlace.visits as visit (visit.first)}
                  {@const activities = activitiesOf(visit)}
                  {@const stays = staysOf(visit)}
                  <div class="route__visit">
                    <p class="route__card-day">{dayLabel(visit)}</p>
                    {#if activities.length}
                      <ul class="route__acts">
                        {#each activities.slice(0, 5) as activity (activity)}<li>{activity}</li>{/each}
                      </ul>
                    {/if}
                    {#each stays as stay (stay.name)}
                      <p class="route__stay">
                        <BedDouble size={15} aria-hidden="true" />
                        {#if stay.slug}<a href="/accommodation/{stay.slug}">{stay.name}</a>{:else}<span>{stay.name}</span>{/if}
                      </p>
                    {/each}
                    <button type="button" class="route__see" onclick={() => showDay(visit.first)}>
                      {$t('ui.route_see_day')} <ArrowRight size={14} />
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
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

  .route__map.is-pannable {
    cursor: grab;
    touch-action: none;
  }
  .route__map.is-dragging {
    cursor: grabbing;
  }

  /* ── Zoom ──────────────────────────────────────────────────────────────── */
  .route__zoom {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 4;
    display: grid;
    overflow: hidden;
    border: 1px solid rgb(var(--c-ink) / 0.12);
    border-radius: 10px;
    background: rgb(var(--c-surface));
    box-shadow: 0 6px 16px rgb(39 43 34 / 0.12);
    pointer-events: auto;
  }
  .route__zoom button {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    padding: 0;
    border: 0;
    background: transparent;
    color: rgb(var(--c-heading));
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }
  .route__zoom button + button {
    border-top: 1px solid rgb(var(--c-ink) / 0.1);
  }
  .route__zoom button:hover:not(:disabled) {
    background: rgb(var(--c-canvas));
    color: rgb(var(--c-clay));
  }
  .route__zoom button:focus-visible {
    outline: 2px solid rgb(var(--c-clay));
    outline-offset: -2px;
  }
  .route__zoom button:disabled {
    color: rgb(var(--c-ink) / 0.25);
    cursor: default;
  }

  /* ── Pin cards ─────────────────────────────────────────────────────────── */
  .route__stage {
    position: relative;
  }
  .route__hits {
    position: absolute;
    pointer-events: none;
  }
  .route__hit {
    position: absolute;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
    transform: translate(-50%, -50%);
    transition: box-shadow 0.15s ease;
  }
  .route__hit:hover,
  .route__hit.is-open {
    box-shadow: 0 0 0 3px rgb(var(--c-clay) / 0.35);
  }
  .route__hit:focus-visible {
    outline: 2px solid rgb(var(--c-clay));
    outline-offset: 2px;
  }

  .route__card {
    position: absolute;
    z-index: 5;
    max-height: 340px;
    overflow-y: auto;
    padding: 16px 18px 14px;
    border: 1px solid rgb(var(--c-ink) / 0.1);
    border-radius: 12px;
    background: rgb(var(--c-surface));
    box-shadow: 0 18px 40px rgb(39 43 34 / 0.18);
    pointer-events: auto;
    animation: route-card-in 0.16s ease-out;
  }
  @keyframes route-card-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }
  .route__card-close {
    position: absolute;
    top: 8px;
    right: 8px;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: rgb(var(--c-ink) / 0.55);
    cursor: pointer;
  }
  .route__card-close:hover {
    background: rgb(var(--c-canvas));
    color: rgb(var(--c-heading));
  }
  .route__card-place {
    margin: 0 28px 2px 0;
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
    color: rgb(var(--c-heading));
  }
  .route__visit + .route__visit {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgb(var(--c-ink) / 0.1);
  }
  .route__card-day {
    margin: 4px 0 6px;
    color: rgb(var(--c-clay));
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .route__acts {
    display: grid;
    gap: 4px;
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
  }
  .route__acts li {
    position: relative;
    padding-left: 14px;
    font-size: 13.5px;
    line-height: 1.45;
    color: rgb(var(--c-ink) / 0.8);
  }
  .route__acts li::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 0.62em;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgb(var(--c-goldfinch-gold));
  }
  .route__stay {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0 0 8px;
    font-size: 13.5px;
    font-weight: 600;
    color: rgb(var(--c-heading));
  }
  .route__stay :global(svg) {
    flex-shrink: 0;
    color: rgb(var(--c-clay));
  }
  .route__stay a {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: rgb(var(--c-ink) / 0.25);
    text-underline-offset: 3px;
  }
  .route__stay a:hover {
    color: rgb(var(--c-clay));
  }
  .route__see {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0;
    border: 0;
    background: none;
    color: rgb(var(--c-clay));
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .route__see:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
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
    .route__skeleton,
    .route__card {
      animation: none;
    }
  }
</style>
