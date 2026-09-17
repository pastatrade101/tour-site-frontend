<script lang="ts">
  import { t } from '$lib/i18n/ui';
  /**
   * The property card that sits under an itinerary day: four photographs, the
   * name, what kind of place it is and where, and a way through to its page.
   *
   * Lifted out of ItineraryDays so the safari-package routes panel shows the
   * same card for the property an editor selected, rather than the single
   * thumbnail it used to draw.
   */
  import { ArrowRight } from '@lucide/svelte';
  import Img from './Img.svelte';
  import { galleryForStay, type MediaImage, type Stay } from '$lib/lodgeMedia';

  export let stay: Stay;
  /** Photographs fetched separately for this property. */
  export let extra: MediaImage[] = [];
  /** The small line above the card. Empty renders none. */
  export let label = '';

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

  $: gallery = galleryForStay(stay, extra);
  $: shown = gallery.slice(0, 4);
  $: summary = [
    LODGE_TYPES[String(stay.lodge_type)] ?? '',
    stay.accommodation_level ? normaliseLabel(stay.accommodation_level) : '',
    stay.destinations?.name ?? ''
  ]
    .filter(Boolean)
    .join(' / ');
</script>

<div class="tour-day-accommodation">
  {#if label}
    <div class="mb-3.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink/60 md:text-[11px]">{label}</div>
  {/if}
  <div class="tour-day-accommodation-card overflow-hidden rounded-[12px] border border-ink/10 bg-surface">
    {#if shown.length}
      <!-- As many columns as there are photographs. A property with one photo
           used to leave three empty cells in a four-column grid. -->
      <div
        class="tour-day-accommodation-gallery grid gap-1 overflow-hidden rounded-t-[11px] bg-sand p-1"
        style={`grid-template-columns: repeat(${shown.length}, minmax(0, 1fr));`}
      >
        {#each shown as image, imageIndex}
          <div class={`relative min-w-0 overflow-hidden bg-sand ${shown.length === 1 ? 'aspect-[16/9]' : 'aspect-[4/3]'} ${imageIndex === 0 ? 'rounded-tl-[8px]' : ''} ${imageIndex === shown.length - 1 ? 'rounded-tr-[8px]' : ''}`}>
            <Img
              src={image.record ? '' : image.src}
              record={image.record}
              fields={image.fields ?? []}
              alt={image.caption}
              width={shown.length === 1 ? 900 : 360}
              sizes={shown.length === 1 ? '(max-width: 768px) 92vw, 700px' : '(max-width: 768px) 23vw, 175px'}
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
          {#if summary}<p class="mt-1 text-[13px] font-medium text-ink/60">{summary}</p>{/if}
        </div>
        {#if stay.slug}
          <a
            class="inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-ink/10 px-3 py-2 text-[12px] font-bold text-forest transition hover:border-goldfinch-gold hover:text-heading"
            href={`/accommodation/${stay.slug}`}
            data-sveltekit-preload-data="hover"
          >{$t('ui.view_accommodation')}<ArrowRight size={13} />
          </a>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /* Carried over with the markup from ItineraryDays: on a phone the card sits
     tighter and the link runs the full width, so it is a tappable bar rather
     than a small target in the corner. */
  @media (max-width: 767px) {
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
