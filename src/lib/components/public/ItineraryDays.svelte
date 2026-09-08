<script lang="ts">
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
  import { ArrowRight, BedDouble, ChevronDown, Compass, MapPin, Utensils } from '@lucide/svelte';
  import Img from './Img.svelte';
  import RichText from './RichText.svelte';
  import type { ItineraryDay } from '$lib/types';

  type Stay = NonNullable<ItineraryDay['lodge']>;
  type MediaImage = { src: string; caption: string; record?: Record<string, unknown>; fields?: string[] };
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
  /** Which day starts open. -1 opens none. */
  export let openIndex = 0;

  const LODGE_TYPES: Record<string, string> = {
    tented_camp: 'Tented camp',
    mobile_camp: 'Mobile camp',
    lodge: 'Lodge',
    hotel: 'Hotel',
    treehouse: 'Treehouse'
  };

  const normaliseLabel = (value: string | null | undefined): string =>
    String(value ?? '')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const stayKey = (stay: Stay | null | undefined): string => String(stay?.id || stay?.slug || '').trim();

  const imageFromStay = (stay: Stay): MediaImage | null => {
    const src = stay.hero_image_url || stay.image_url || '';
    return src
      ? { src, caption: stay.name, record: stay as unknown as Record<string, unknown>, fields: ['hero_image_url', 'image_url', 'cover_image_url'] }
      : null;
  };

  const imageFromLodgeMedia = (row: Record<string, unknown>, stay: Stay): MediaImage | null => {
    const src = String(row.image_url || row.file_url || row.url || '').trim();
    if (!src) return null;
    return { src, caption: String(row.caption || row.alt_text || stay.name), record: row, fields: ['image_url', 'file_url', 'url'] };
  };

  const galleryForStay = (stay: Stay): MediaImage[] => {
    const gallery: MediaImage[] = [];
    const add = (image: MediaImage | null | undefined) => {
      if (!image?.src || gallery.some((item) => item.src === image.src)) return;
      gallery.push(image);
    };
    add(imageFromStay(stay));
    for (const row of stay.lodge_images ?? []) add(imageFromLodgeMedia(row as unknown as Record<string, unknown>, stay));
    for (const image of lodgeMedia[stayKey(stay)] ?? []) add(image);
    return gallery;
  };

  const dayImage = (day: ItineraryDay): MediaImage | null => {
    if (day.image_url) return { src: day.image_url, caption: `Day ${day.day_number}: ${day.title}`, record: day as unknown as Record<string, unknown>, fields: ['image_url'] };
    if (day.lodge?.hero_image_url) return { src: day.lodge.hero_image_url, caption: day.lodge.name, record: day.lodge as unknown as Record<string, unknown>, fields: ['hero_image_url', 'image_url', 'cover_image_url'] };
    if (day.lodge?.image_url) return { src: day.lodge.image_url, caption: day.lodge.name, record: day.lodge as unknown as Record<string, unknown>, fields: ['hero_image_url', 'image_url', 'cover_image_url'] };
    return null;
  };

  /** Only the facts a day actually carries. An absent one is left out, not filled in. */
  const detailsForDay = (day: ItineraryDay): FactCard[] => {
    const stay = day.lodge?.name || day.accommodation || '';
    return [
      day.title ? { icon: MapPin, label: 'Main stop', value: day.title } : null,
      stay ? { icon: BedDouble, label: 'Accommodation', value: stay } : null,
      day.meals ? { icon: Utensils, label: 'Meals', value: day.meals } : null,
      day.activities ? { icon: Compass, label: 'Activities', value: day.activities } : null
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
</script>

{#if sorted.length}
  <div class="tour-day-list space-y-2.5">
    {#each sorted as day, index (day.day_number)}
      {@const image = dayImage(day)}
      {@const details = detailsForDay(day)}
      <details id={`day-${day.day_number}`} class="tour-day-card group overflow-hidden rounded-[12px] border border-ink/10 bg-surface" open={index === openIndex}>
        <summary
          class="tour-day-toggle flex w-full cursor-pointer list-none items-center gap-4 px-4 py-4 text-left marker:content-none md:px-5 [&::-webkit-details-marker]:hidden"
          on:click={animateDayDisclosure}
        >
          <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-deep-green text-[13px] font-bold text-white">
            {day.day_number}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-clay/80">Day {day.day_number}</span>
            <span class="mt-0.5 block font-serif text-[16.5px] font-bold leading-snug text-heading md:text-[18px]">{day.title}</span>
            <span class="mt-0.5 block text-[12.5px] text-ink/55">
              {[day.lodge?.name || day.accommodation || '', day.meals || ''].filter(Boolean).join(' / ')}
            </span>
          </span>
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/60 transition-transform duration-200 group-open:rotate-180">
            <ChevronDown class="h-5 w-5" />
          </span>
        </summary>

        <div class="tour-day-body border-t border-ink/10 px-4 pb-8 pt-6 md:px-8 md:pt-8">
          {#if image}
            <Img
              src={image.record ? '' : image.src}
              record={image.record}
              fields={image.fields ?? []}
              alt={image.caption}
              width={1000}
              sizes="(max-width: 768px) 92vw, 700px"
              className="tour-day-image mb-6 h-[220px] w-full rounded-[12px] object-cover sm:h-[280px] md:mb-8 md:h-[380px]"
            />
          {/if}

          {#if day.description}
            <RichText value={day.description} className="space-y-4 text-[14.5px] leading-[1.65] text-ink/70 md:text-[16px]" />
          {/if}

          {#if details.length}
            <ul class="tour-day-details mb-7 mt-6 rounded-[12px] border border-ink/10 bg-sand/45 p-5 md:p-[22px]">
              {#each details as detail, detailIndex}
                <li class={`flex items-start gap-3 text-[14.5px] leading-[1.55] md:text-[15px] ${detailIndex > 0 ? 'mt-2.5' : ''}`}>
                  <svelte:component this={detail.icon} size={16} class="mt-[2px] shrink-0 text-clay" />
                  <span class="min-w-0 flex-1">
                    <span class="font-semibold text-heading">{detail.label}:</span>
                    <span class="text-ink/70"> {detail.value}</span>
                  </span>
                </li>
              {/each}
            </ul>
          {/if}

          {#if day.lodge}
            {@const stay = day.lodge}
            {@const gallery = galleryForStay(stay)}
            <div class="tour-day-accommodation">
              <div class="mb-3.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink/60 md:text-[11px]">Accommodation - {stay.name}</div>
              <div class="tour-day-accommodation-card overflow-hidden rounded-[12px] border border-ink/10 bg-surface">
                {#if gallery.length}
                  <div class="tour-day-accommodation-gallery grid grid-cols-4 gap-1 overflow-hidden rounded-t-[11px] bg-sand p-1">
                    {#each gallery.slice(0, 4) as image, imageIndex}
                      <div class={`relative aspect-[4/3] min-w-0 overflow-hidden bg-sand ${imageIndex === 0 ? 'rounded-tl-[8px]' : ''} ${imageIndex === Math.min(gallery.length, 4) - 1 ? 'rounded-tr-[8px]' : ''}`}>
                        <Img
                          src={image.record ? '' : image.src}
                          record={image.record}
                          fields={image.fields ?? []}
                          alt={image.caption}
                          width={360}
                          sizes="(max-width: 768px) 23vw, 175px"
                          className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                        />
                        {#if imageIndex === 3 && gallery.length > 4}
                          <div class="pointer-events-none absolute inset-0 grid place-items-center bg-heading/55 px-2 text-center text-xs font-extrabold tracking-wide text-white backdrop-blur-[1px] sm:text-sm">
                            +{gallery.length - 4} {gallery.length - 4 === 1 ? 'photo' : 'photos'}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
                <div class="p-4 md:p-5">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h4 class="font-serif text-[19px] font-semibold leading-snug text-heading">{stay.name}</h4>
                      <p class="mt-1 text-[13px] font-medium text-ink/60">
                        {[LODGE_TYPES[String(stay.lodge_type)] ?? '', stay.accommodation_level ? normaliseLabel(stay.accommodation_level) : '', stay.destinations?.name ?? ''].filter(Boolean).join(' / ')}
                      </p>
                    </div>
                    <a
                      class="inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-ink/10 px-3 py-2 text-[12px] font-bold text-forest transition hover:border-goldfinch-gold hover:text-heading"
                      href={`/accommodation/${stay.slug}`}
                      data-sveltekit-preload-data="hover"
                    >
                      View accommodation <ArrowRight size={13} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </details>
    {/each}
  </div>
{/if}

<style>
  /* Carried over with the markup, so a day card reads the same on a landing
     page as it does on the tour page it came from. */
  @media (max-width: 767px) {
    .tour-day-list {
      display: grid;
      gap: 0.75rem;
    }

    .tour-day-card {
      border-radius: 14px;
    }

    .tour-day-toggle {
      gap: 0.75rem;
      padding: 0.95rem;
    }

    .tour-day-toggle > span:first-child {
      height: 2rem;
      width: 2rem;
      font-size: 0.78rem;
    }

    .tour-day-body {
      padding: 0.9rem 0.9rem 1rem;
    }

    :global(.tour-day-image) {
      aspect-ratio: 16 / 10;
      height: auto;
      margin-bottom: 1rem;
      border-radius: 12px;
    }

    .tour-day-details {
      margin-block: 1rem 1.1rem;
      border-radius: 12px;
      padding: 0.9rem;
    }

    .tour-day-accommodation-card {
      border-radius: 12px;
    }

    .tour-day-accommodation-card :global(.p-4) {
      padding: 0.9rem;
    }

    .tour-day-accommodation-card a {
      width: 100%;
      justify-content: center;
    }
  }
</style>
