<script lang="ts">
  /**
   * The standard destination card for the main grid.
   *
   * Everything on it is real CMS data: `region`, `name`, `short_description`,
   * `is_featured`, and the editor-written "At a glance" quick facts read through
   * the helpers in $lib/destinationFacets. There are no ratings, review counts,
   * trip counts, seasons or prices anywhere in the destination record, so none
   * appear here — "Featured" is the only badge that exists.
   *
   * Only 6 of 19 destinations carry a photograph, so the imageless card is the
   * design, not a fallback: the media band keeps its exact aspect ratio and
   * becomes a warm sand/skywash field holding a serif monogram, a gold rule and
   * the region. The grid never shifts and no card ever looks broken.
   *
   * The region is deliberately rendered once — at the foot of the media band, in
   * the same position whether or not there is a photograph — rather than being
   * repeated as an eyebrow and again in the facts row below it.
   */
  import { ArrowRight, Clock3, MapPin } from '@lucide/svelte';
  import {
    bestFor,
    experiencesOf,
    quickFacts,
    recommendedStay,
    regionOf,
    travelStyle,
    wildlifeOf
  } from '$lib/destinationFacets';
  import { imgUrl, sourceFor } from '$lib/img';
  import { toMetaText } from '$lib/richText';
  import type { Destination } from '$lib/types';

  export let destination: Destination;
  /** Set on the first row of the grid so the above-the-fold images do not lazy-load. */
  export let eager = false;

  // One read of the editor's "At a glance" list — every fact below comes from it.
  $: facts = quickFacts(destination);
  $: hasGlance = Object.keys(facts).length > 0;

  // grid card renders ~420px CSS, so retina needs more than the 600px thumbnail
  $: imageUrl = sourceFor(destination, 900, 'main_image_url', 'image_url', 'banner_image_url');
  $: region = regionOf(destination);
  $: stay = recommendedStay(destination);
  $: style = travelStyle(destination);
  // Short description is populated on all 19; "Best for" is the editor's own
  // one-line summary and is the only honest stand-in if one ever goes missing.
  $: summary = toMetaText((destination.short_description ?? '').trim() || bestFor(destination), 170);
  $: initial = (destination.name ?? '').trim().charAt(0).toUpperCase() || '—';

  // Wildlife reads more specifically than experience, so it leads. Two chips is
  // all a card this size can carry before it turns into a spec sheet.
  $: chips = [
    ...new Map(
      [...wildlifeOf(destination), ...experiencesOf(destination)].map((facet) => [facet.key, facet] as const)
    ).values()
  ].slice(0, 2);
  // A destination whose quick facts match no facet still has a travel style —
  // real editorial text — rather than an empty row.
  $: styleFallback = chips.length === 0 ? style : '';
  // The row (and its hairline) only appears when the quick facts actually
  // produced something to put in it.
  $: showFacts = hasGlance && Boolean(stay || chips.length || styleFallback);
</script>

<a
  class="group flex h-full flex-col overflow-hidden rounded-[10px] bg-surface shadow-card transition duration-300 ease-out hover:-translate-y-1 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-canvas motion-reduce:transition-none motion-reduce:hover:translate-y-0"
  href={`/destinations/${destination.slug}`}
  data-sveltekit-preload-data="hover"
>
  <!-- Media band: identical 4/5 ratio with or without a photograph. -->
  <div class="relative aspect-[4/5] w-full overflow-hidden bg-sand">
    {#if imageUrl}
      <!-- alt="" on purpose: the link itself already reads out the name, region
           and summary, so a repeated caption is noise for a screen reader. -->
      <img
        class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        src={imgUrl(imageUrl, 800, 72)}
        srcset={`${imgUrl(imageUrl, 480, 70)} 480w, ${imgUrl(imageUrl, 800, 72)} 800w, ${imgUrl(imageUrl, 1200, 72)} 1200w`}
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 88vw"
        width="800"
        height="1000"
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      <!-- Soft foot so the region label and the pill stay legible on any photograph. -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
      ></div>
    {:else}
      <div class="absolute inset-0">
        <!-- A cool skywash light from the top-left and a low gold warmth from the
             bottom-right: enough depth that the panel reads as a made thing
             rather than a missing photograph. -->
        <div
          aria-hidden="true"
          class="absolute inset-0"
          style="background-image: radial-gradient(118% 82% at 18% 0%, rgb(232 242 241 / 0.5), transparent 62%), radial-gradient(92% 72% at 94% 100%, rgb(var(--c-goldfinch-gold) / 0.16), transparent 64%);"
        ></div>
        <div class="absolute inset-0 flex flex-col items-center justify-center px-6 pb-10">
          <span
            class="font-serif text-[92px] font-bold leading-none text-forest/30 transition-transform duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:text-[104px]"
          >
            {initial}
          </span>
          <span aria-hidden="true" class="mt-7 h-px w-12 bg-goldfinch-gold/60"></span>
        </div>
      </div>
    {/if}

    {#if destination.is_featured}
      <span
        class="absolute left-4 top-4 rounded-full bg-goldfinch-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-heading"
      >
        Featured
      </span>
    {/if}

    {#if region}
      <p
        class={`absolute inset-x-0 bottom-0 flex items-center gap-2 px-5 pb-4 text-[10px] font-bold uppercase tracking-[0.18em] ${imageUrl ? 'text-white/85' : 'text-ink/55'}`}
      >
        <MapPin size={12} strokeWidth={2.5} class={imageUrl ? 'shrink-0 text-goldfinch-gold' : 'shrink-0 text-forest/70'} />
        <span class="truncate">{region}</span>
      </p>
    {/if}
  </div>

  <!-- Editorial block -->
  <div class="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
    <h3
      class="break-words font-serif text-[21px] font-bold leading-[1.15] text-heading transition-colors duration-300 ease-out group-hover:text-forest motion-reduce:transition-none"
    >
      {destination.name}
    </h3>

    {#if summary}
      <p class="mt-2.5 line-clamp-2 text-sm leading-6 text-ink/65">{summary}</p>
    {/if}

    {#if showFacts}
      <!-- Quick facts only: recommended stay, then the facets its own "Best for"
           and "Travel style" text matches. Nothing derived, nothing invented. -->
      <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink/10 pt-4">
        {#if stay}
          <span class="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-ink/60">
            <Clock3 size={13} strokeWidth={2.2} class="shrink-0 text-forest/70" />
            <span class="truncate">{stay}</span>
          </span>
        {/if}
        {#each chips as chip (chip.key)}
          <span
            class="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-sand/70 px-2.5 py-1 text-[11px] font-semibold text-ink/70"
          >
            <span aria-hidden="true" class="text-[11px] leading-none">{chip.icon}</span>
            <span class="truncate">{chip.label}</span>
          </span>
        {/each}
        {#if styleFallback}
          <span
            class="inline-flex min-w-0 items-center rounded-full bg-sand/70 px-2.5 py-1 text-[11px] font-semibold text-ink/70"
          >
            <span class="truncate">{styleFallback}</span>
          </span>
        {/if}
      </div>
    {/if}

    <!-- Always present for keyboard and touch; the arrow is what moves on hover. -->
    <span
      class="mt-auto flex items-center gap-2.5 pt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-forest"
    >
      View guide
      <span
        class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sand/70 text-forest transition duration-300 ease-out group-hover:translate-x-1 group-hover:bg-goldfinch-gold group-hover:text-heading group-focus-visible:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      >
        <ArrowRight size={13} strokeWidth={2.5} />
      </span>
    </span>
  </div>
</a>
