<script lang="ts">
  /**
   * Large magazine-style card for the featured destinations spread.
   *
   * Everything rendered here is real CMS data: `region`, `name`,
   * `short_description`, and the editor-written "At a glance" quick facts read
   * through the helpers in $lib/destinationFacets. No ratings, counts, seasons
   * or prices — none of those exist on a destination.
   *
   * 13 of 19 destinations have no image at all, so the imageless case is the
   * primary design, not a fallback: the photo half becomes a deep-green
   * editorial panel carrying a serif monogram and the region, and the content
   * half widens to take the space back.
   */
  import { ArrowRight } from '@lucide/svelte';
  import { bestFor, pairsWith, recommendedStay, travelStyle } from '$lib/destinationFacets';
  import { imgUrl, thumbUrl } from '$lib/img';
  import type { Destination } from '$lib/types';

  export let destination: Destination;
  /** Position in the featured row — even cards lead with the image, odd cards
   *  flip it, so a column of these reads like facing pages. */
  export let index = 0;

  /** A URL that 404s would otherwise leave a bare green block, so a failed load
   *  falls back to the same editorial panel the imageless destinations get. */
  let imageFailed = false;

  $: flipped = index % 2 === 1;
  $: imageUrl = thumbUrl(destination, 'main_image_url', 'image_url', 'banner_image_url');
  $: imageUrl, (imageFailed = false);
  $: showImage = Boolean(imageUrl) && !imageFailed;
  $: summary = destination.short_description || destination.description || '';
  $: region = destination.region || '';
  $: initial = (destination.name || '').trim().charAt(0).toUpperCase();

  $: facts = [
    { label: 'Best for', value: bestFor(destination) },
    { label: 'Recommended stay', value: recommendedStay(destination) },
    { label: 'Travel style', value: travelStyle(destination) },
    { label: 'Works well with', value: pairsWith(destination) }
  ].filter((fact) => fact.value);

  // With a photograph the split is even. Without one the panel is a slim
  // editorial margin and the words get the room.
  $: columns = showImage
    ? 'lg:grid-cols-2'
    : flipped
      ? 'lg:grid-cols-[0.62fr_0.38fr]'
      : 'lg:grid-cols-[0.38fr_0.62fr]';
  $: visualOrder = flipped ? 'lg:order-2' : 'lg:order-1';
  $: contentOrder = flipped ? 'lg:order-1' : 'lg:order-2';
  $: contentPadding = showImage ? 'lg:p-14' : 'lg:p-16';
</script>

<article
  class="group overflow-hidden rounded-[10px] bg-surface shadow-card transition-shadow duration-300 ease-out hover:shadow-soft"
>
  <a
    class={`grid rounded-[10px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-goldfinch-gold ${columns}`}
    href={`/destinations/${destination.slug}`}
  >
    <!-- Visual half: photograph when the CMS has one, editorial panel when it does not. -->
    <div class={`relative min-w-0 overflow-hidden bg-deep-green lg:min-h-[460px] ${visualOrder}`}>
      {#if showImage}
        <img
          class="aspect-[4/3] h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:aspect-[16/10] lg:aspect-auto"
          src={imgUrl(imageUrl, 1200, 72)}
          srcset={`${imgUrl(imageUrl, 800, 70)} 800w, ${imgUrl(imageUrl, 1200, 72)} 1200w, ${imgUrl(imageUrl, 1600, 72)} 1600w`}
          sizes="(min-width: 1024px) 50vw, 100vw"
          alt=""
          loading="lazy"
          decoding="async"
          on:error={() => (imageFailed = true)}
        />
      {:else}
        <div class="grid min-h-[240px] place-items-center px-8 py-14 sm:min-h-[300px] lg:min-h-[460px] lg:py-20">
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0"
            style="background-image: radial-gradient(105% 78% at 22% 4%, rgb(255 255 255 / 0.13), transparent 62%), radial-gradient(88% 70% at 88% 100%, rgb(212 175 55 / 0.16), transparent 66%);"
          ></div>
          <div class="relative flex flex-col items-center text-center">
            <span class="font-serif text-[86px] font-bold leading-none text-goldfinch-gold/85 sm:text-[104px] lg:text-[120px]">
              {initial}
            </span>
            <span class="mt-7 h-px w-12 bg-goldfinch-gold/50"></span>
            {#if region}
              <span class="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">{region}</span>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- Editorial half -->
    <div class={`flex min-w-0 flex-col justify-center p-7 sm:p-10 ${contentOrder} ${contentPadding}`}>
      {#if region}
        <p class="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-clay">
          <span aria-hidden="true" class="h-px w-7 bg-goldfinch-gold"></span>
          {region}
        </p>
      {/if}

      <h3 class="mt-5 break-words font-serif text-[30px] font-bold leading-[1.08] text-heading sm:text-4xl lg:text-[44px]">
        {destination.name}
      </h3>

      {#if summary}
        <p class="mt-5 line-clamp-3 max-w-[54ch] text-[15px] leading-8 text-ink/70 lg:text-base">{summary}</p>
      {/if}

      {#if facts.length}
        <dl class="mt-9 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {#each facts as fact (fact.label)}
            <div class="min-w-0 border-t border-ink/10 pt-4">
              <dt class="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/45">{fact.label}</dt>
              <dd class="mt-2 break-words font-serif text-[15px] leading-6 text-heading">{fact.value}</dd>
            </div>
          {/each}
        </dl>
      {/if}

      <div class="mt-10">
        <span
          class="inline-flex min-h-[48px] max-w-full items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 py-3 text-center text-sm font-bold text-heading transition duration-200 ease-out group-hover:brightness-105 motion-reduce:transition-none"
        >
          Explore {destination.name}
          <ArrowRight
            size={16}
            strokeWidth={2.4}
            class="transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
        </span>
      </div>
    </div>
  </a>
</article>
