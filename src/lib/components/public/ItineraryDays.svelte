<script lang="ts">
  import { t } from '$lib/i18n/ui';
  /**
   * The day-by-day itinerary — one renderer, wherever days are shown.
   *
   * This was inline markup in the tour page. A landing page needed the same
   * thing, and the choice was to copy a hundred lines or to lift them out; a
   * second copy would have drifted from the first the day either changed.
   *
   * It renders the list only. The heading, the intro and the surrounding
   * section belong to the page, because a tour page and a landing page
   * introduce the same days with different words.
   */
  import { createEventDispatcher } from 'svelte';
  import { ArrowRight, BedDouble, ChevronDown, Compass, MapPin, Utensils } from '@lucide/svelte';
  import DayBadge from './DayBadge.svelte';
  import Img from './Img.svelte';
  import RichText from './RichText.svelte';
  import StayCard from './StayCard.svelte';
  import { loadLodgeMedia, stayKey, type MediaImage } from '$lib/lodgeMedia';
  import { placeOfDay, placesForDays, tidyList } from '$lib/itineraryDisplay';
  import type { ItineraryDay } from '$lib/types';

  // Same shape the tour page used: the constructor type, taken from a concrete
  // icon. `import type { Icon }` gives the instance type, which svelte:component
  // will not accept.
  type Icon = typeof MapPin;
  type FactCard = { icon: Icon; label: string; value: string };

  export let days: ItineraryDay[] = [];
  /**
   * Extra photographs per property, keyed by lodge id or slug. The tour page
   * fetches these; a caller without them still gets the lodge's own images.
   */
  export let lodgeMedia: Record<string, MediaImage[]> = {};
  /**
   * Fetch those photographs here instead, for a caller that has no reason to
   * hold them itself. Off by default so a page that already loads them — the
   * tour page, which also shows them on its accommodation tab — does not ask
   * for the same galleries twice.
   */
  export let autoloadMedia = false;
  /** Which day starts open. -1 opens none. */
  export let openIndex = 0;
  /**
   * "Want to change this day?" with a button, at the foot of an open day. Off
   * unless the page has somewhere for the button to go: it only announces a
   * `plan` event, and what that opens is the page's business.
   */
  export let planCta = false;
  /** Compact visual treatment for the tour detail page; disclosure behavior is shared. */
  export let refined = false;

  const dispatch = createEventDispatcher<{ plan: { day: number } }>();

  /** Galleries fetched here. A prop-supplied one always wins. */
  let fetched: Record<string, MediaImage[]> = {};
  const requested = new Set<string>();
  $: media = { ...fetched, ...lodgeMedia };

  const hydrateMedia = async (list: ItineraryDay[]) => {
    const next = await loadLodgeMedia(
      list.map((day) => day.lodge),
      fetched,
      requested
    );
    if (next !== fetched) fetched = next;
  };

  $: if (autoloadMedia) void hydrateMedia(days ?? []);

  $: dayImage = (day: ItineraryDay): MediaImage | null => {
    if (day.image_url) return { src: day.image_url, caption: `${$t('ui.day')} ${day.day_number}: ${day.title}`, record: day as unknown as Record<string, unknown>, fields: ['image_url'] };
    if (day.lodge?.hero_image_url) return { src: day.lodge.hero_image_url, caption: day.lodge.name, record: day.lodge as unknown as Record<string, unknown>, fields: ['hero_image_url', 'image_url', 'cover_image_url'] };
    if (day.lodge?.image_url) return { src: day.lodge.image_url, caption: day.lodge.name, record: day.lodge as unknown as Record<string, unknown>, fields: ['hero_image_url', 'image_url', 'cover_image_url'] };
    return null;
  };

  const stayOf = (day: ItineraryDay): string => day.lodge?.name || day.accommodation || '';

  /**
   * Only the facts a day actually carries. An absent one is left out, not
   * filled in. The main stop is the place the day is linked to; a day with no
   * linked place falls back to its title, as it always did.
   */
  $: detailsForDay = (day: ItineraryDay): FactCard[] => {
    const stay = stayOf(day);
    const mainStop = day.destination?.name?.trim() || day.title;
    const meals = tidyList(day.meals);
    const activities = tidyList(day.activities);
    return [
      mainStop ? { icon: MapPin, label: $t('ui.main_stop'), value: mainStop } : null,
      stay ? { icon: BedDouble, label: $t('nav.accommodation'), value: stay } : null,
      meals ? { icon: Utensils, label: $t('ui.meals'), value: meals } : null,
      activities ? { icon: Compass, label: $t('ui.activities'), value: activities } : null
    ].filter(Boolean) as FactCard[];
  };

  /** <details> snaps open; this gives it the height transition it should have had. */
  const animateDayDisclosure = async (event: MouseEvent) => {
    const summary = event.currentTarget as HTMLElement;
    const details = summary.closest('details');
    if (!details || details.dataset.animating === 'true') return;

    event.preventDefault();
    const wasOpen = details.open;
    if (!wasOpen) details.open = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      details.open = !wasOpen;
      return;
    }

    const startHeight = wasOpen ? details.offsetHeight : summary.offsetHeight;
    const endHeight = wasOpen ? summary.offsetHeight : details.scrollHeight;
    details.dataset.animating = 'true';
    details.style.overflow = 'hidden';

    const animation = details.animate(
      [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
      { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );

    try {
      await animation.finished;
    } catch {
      // A cancelled animation should still leave the disclosure usable.
    }

    details.style.height = '';
    details.style.overflow = '';
    details.dataset.animating = 'false';
    if (wasOpen) details.open = false;
  };

  $: sorted = [...(days ?? [])].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0));
  /** One colour per place, so the days read as a journey through them. */
  $: places = placesForDays(sorted);
</script>

{#if sorted.length}
  <!-- A key to the colours, only when there is more than one place to tell apart. -->
  {#if places.length > 1}
    <ul class="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink/70">
      {#each places as place (place.key)}
        <li class="inline-flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-[3px]" style={`background:${place.colour}`} aria-hidden="true"></span>{place.name}
        </li>
      {/each}
    </ul>
  {/if}

  <div class="tour-day-list grid gap-3" class:itinerary-refined={refined}>
    {#each sorted as day, index (day.day_number)}
      {@const image = dayImage(day)}
      {@const details = detailsForDay(day)}
      {@const place = placeOfDay(day, places)}
      {@const stay = stayOf(day)}
      {@const meals = tidyList(day.meals)}
      <details
        id={`day-${day.day_number}`}
        class="tour-day-card group overflow-hidden rounded-[16px] border border-ink/10 bg-surface shadow-[0_10px_24px_-18px_rgba(57,61,50,0.6)]"
        style={place ? `--day-colour:${place.colour}` : undefined}
        open={index === openIndex}
      >
        <summary
          class="tour-day-toggle flex w-full cursor-pointer list-none items-center gap-4 py-3 pl-3 pr-4 text-left marker:content-none md:pr-[18px] [&::-webkit-details-marker]:hidden"
          on:click={animateDayDisclosure}
        >
          <DayBadge day={day.day_number} colour={place?.colour ?? ''} />
          <span class="min-w-0 flex-1">
            {#if place}
              <span class="tour-day-place flex items-center gap-1.5 text-[11px] font-bold uppercase leading-tight tracking-[0.1em]">
                <span class="h-2 w-2 shrink-0 rounded-full" aria-hidden="true"></span>{place.name}
              </span>
            {/if}
            <span class="tour-day-title mt-1 block font-serif text-[16.5px] font-bold leading-[1.2] text-heading md:text-[20px]">{day.title}</span>
            {#if meals || stay}
              <span class="tour-day-meta mt-2 flex flex-wrap gap-1.5">
                {#if meals}
                  <span class="tour-day-chip"><Utensils size={13} strokeWidth={2} aria-hidden="true" />{meals}</span>
                {/if}
                {#if stay}
                  <span class="tour-day-chip"><BedDouble size={13} strokeWidth={2} aria-hidden="true" />{stay}</span>
                {/if}
              </span>
            {/if}
          </span>
          <span class="tour-day-chevron grid h-8 w-8 shrink-0 place-items-center rounded-full bg-canvas text-heading transition-transform duration-200 group-open:rotate-180">
            <ChevronDown class="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          </span>
        </summary>

        <div class="tour-day-body border-t border-ink/10 px-4 pb-6 pt-5 md:px-6 md:pb-7 md:pt-6">
          {#if image}
            <!-- 3:2 is the shape the photographs are taken in, so the frame
                 shows the picture rather than a band cut from its middle. -->
            <div class="tour-day-photo relative mb-5 overflow-hidden rounded-[16px] bg-canvas shadow-[0_14px_30px_-20px_rgba(57,61,50,0.7)] md:mb-6">
              <Img
                src={image.record ? '' : image.src}
                record={image.record}
                fields={image.fields ?? []}
                alt={image.caption}
                width={1000}
                sizes="(max-width: 768px) 92vw, 840px"
                pictureClass="block"
                className="aspect-[3/2] w-full object-cover"
              />
              {#if place}
                <span class="tour-day-photo-label absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold leading-none text-[#393D32]">
                  <MapPin size={14} strokeWidth={2} aria-hidden="true" /><span class="truncate">{place.name}</span>
                </span>
              {/if}
            </div>
          {/if}

          {#if day.description}
            <RichText value={day.description} className="tour-day-description space-y-4 text-[14.5px] leading-[1.65] text-ink/70 md:text-[16px]" />
          {/if}

          {#if details.length}
            <ul class="tour-day-details mb-6 mt-5 grid gap-2.5 sm:grid-cols-2">
              {#each details as detail}
                <li class="tour-day-fact flex min-w-0 items-center gap-3 rounded-[14px] border border-ink/10 bg-surface px-3.5 py-3">
                  <span class="tour-day-fact-icon grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] bg-goldfinch-gold text-deep-green">
                    <svelte:component this={detail.icon} size={20} strokeWidth={2} />
                  </span>
                  <span class="min-w-0">
                    <span class="tour-day-fact-label gf-gold-text block text-[11px] font-bold uppercase tracking-[0.1em]">{detail.label}</span>
                    <span class="tour-day-fact-value block text-[14.5px] font-semibold leading-[1.3] text-heading">{detail.value}</span>
                  </span>
                </li>
              {/each}
            </ul>
          {/if}

          {#if day.lodge}
            {@const lodge = day.lodge}
            <StayCard stay={lodge} extra={media[stayKey(lodge)] ?? []} label={`${$t('nav.accommodation')} - ${lodge.name}`} />
          {/if}

          {#if planCta}
            <div class="tour-day-plan mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <p class="text-[14px] text-ink/70">{$t('ui.want_to_change_this_day')}</p>
              <button
                type="button"
                class="tour-day-plan-button inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-goldfinch-gold px-5 py-3 text-[14.5px] font-bold text-heading transition hover:brightness-105 sm:w-auto"
                on:click={() => dispatch('plan', { day: day.day_number })}
              >{$t('ui.plan_this_trip')}<ArrowRight size={16} strokeWidth={2.4} /></button>
            </div>
          {/if}
        </div>
      </details>
    {/each}
  </div>
{/if}

<style>
  /* The place's colour, or the brand rust where a day has no place linked. */
  .tour-day-card {
    --day-colour: rgb(var(--c-clay));
  }

  .tour-day-place {
    color: var(--day-colour);
  }

  .tour-day-place > span {
    background: var(--day-colour);
  }

  .tour-day-chip {
    display: inline-flex;
    max-width: 100%;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    background: rgb(var(--c-canvas));
    padding: 4px 10px;
    color: rgb(var(--c-heading));
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
  }

  .tour-day-chip :global(svg),
  .tour-day-photo-label :global(svg) {
    flex: none;
    color: var(--day-colour);
  }

  /* Carried with the markup, so a day card reads the same on a landing page
     as it does on the tour page it came from. */
  @media (max-width: 767px) {
    .tour-day-card {
      border-radius: 14px;
    }

    .tour-day-toggle {
      gap: 0.75rem;
      padding: 0.6rem 0.75rem 0.6rem 0.6rem;
    }

    .tour-day-body {
      padding: 0.9rem 0.9rem 1rem;
    }
  }

  .itinerary-refined { gap: 0.875rem; container: itinerary-days / inline-size; }
  .itinerary-refined .tour-day-card { border-radius: 14px; border-color: rgb(var(--c-ink) / 0.12); box-shadow: 0 4px 16px -13px rgb(var(--c-deep-green) / 0.3); }
  .itinerary-refined .tour-day-card[open] { border-color: rgb(var(--c-goldfinch-gold) / 0.5); }
  .itinerary-refined .tour-day-toggle { gap: 1rem; padding: 1rem; }
  .itinerary-refined .tour-day-toggle:hover { background: rgb(var(--c-canvas) / 0.45); }
  .itinerary-refined .tour-day-toggle:focus-visible { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: -4px; border-radius: 12px; }
  .itinerary-refined .tour-day-toggle :global(.day-badge) { width: 52px; padding: 8px 3px; border: 0; border-radius: 10px; background: rgb(var(--c-deep-green)); }
  .itinerary-refined .tour-day-toggle :global(.day-badge-top) { padding: 0; background: transparent; color: rgb(var(--c-savanna)); font-size: 10px; font-weight: 500; letter-spacing: 0.06em; }
  .itinerary-refined .tour-day-toggle :global(.day-badge-num) { padding: 4px 0 0; color: white; font-size: 27px; font-weight: 500; line-height: 1.1; }
  .itinerary-refined .tour-day-place { font-size: 10px; font-weight: 600; line-height: 1.5; letter-spacing: 0.06em; }
  .itinerary-refined .tour-day-place > span { width: 6px; height: 6px; }
  .itinerary-refined .tour-day-title { margin-top: 5px; font-size: 20px; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
  .itinerary-refined .tour-day-meta { gap: 0.5rem 1rem; margin-top: 0.625rem; }
  .itinerary-refined .tour-day-chip { align-items: flex-start; gap: 6px; padding: 0; border-radius: 0; background: transparent; color: rgb(var(--c-ink) / 0.74); font-size: 12px; font-weight: 400; line-height: 1.5; }
  .itinerary-refined .tour-day-chip :global(svg) { margin-top: 2px; color: rgb(var(--c-heading) / 0.75); }
  .itinerary-refined .tour-day-chevron { width: 30px; height: 30px; border: 1px solid rgb(var(--c-ink) / 0.12); background: rgb(var(--c-surface)); }
  .itinerary-refined .tour-day-card[open] .tour-day-chevron { border-color: rgb(var(--c-deep-green)); background: rgb(var(--c-deep-green)); color: rgb(var(--c-goldfinch-gold)); }
  .itinerary-refined .tour-day-body { padding: 1.25rem; border-color: rgb(var(--c-ink) / 0.1); }
  .itinerary-refined .tour-day-photo { border-radius: 10px; box-shadow: none; }
  .itinerary-refined :global(.tour-day-description) { font-size: 14px; line-height: 1.8; }
  .itinerary-refined .tour-day-fact { align-items: flex-start; gap: 10px; border-color: transparent; border-radius: 10px; background: rgb(var(--c-canvas) / 0.65); padding: 0.875rem; }
  .itinerary-refined .tour-day-fact-icon { width: 30px; height: 30px; border-radius: 50%; background: rgb(var(--c-sand) / 0.75); }
  .itinerary-refined .tour-day-fact-icon :global(svg) { width: 16px; height: 16px; }
  .itinerary-refined .tour-day-fact-label { color: rgb(var(--c-ink) / 0.66); font-size: 10px; font-weight: 500; letter-spacing: 0; text-transform: none; }
  .itinerary-refined .tour-day-fact-value { margin-top: 3px; font-size: 13px; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
  .itinerary-refined .tour-day-plan { padding-top: 1rem; border-top: 1px solid rgb(var(--c-ink) / 0.1); }
  .itinerary-refined .tour-day-plan-button { min-height: 44px; padding: 0.625rem 1rem; border-radius: 9px; font-size: 13px; font-weight: 600; }
  .itinerary-refined :global(.tour-day-accommodation-card) { border-color: rgb(var(--c-ink) / 0.12); }
  .itinerary-refined :global(.tour-day-accommodation-card a) { min-height: 44px; border-radius: 8px; font-weight: 600; }

  @container itinerary-days (max-width: 480px) {
    .itinerary-refined .tour-day-toggle { align-items: flex-start; gap: 0.75rem; padding: 0.875rem 0.75rem; }
    .itinerary-refined .tour-day-toggle :global(.day-badge) { width: 42px; }
    .itinerary-refined .tour-day-toggle :global(.day-badge-num) { font-size: 24px; }
    .itinerary-refined .tour-day-title { font-size: 18px; }
    .itinerary-refined .tour-day-chevron { width: 26px; height: 26px; }
    .itinerary-refined .tour-day-body { padding: 1rem; }
    .itinerary-refined .tour-day-details { grid-template-columns: minmax(0, 1fr); }
  }
</style>
