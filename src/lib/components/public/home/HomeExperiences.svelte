<script lang="ts">
  import { ArrowRight, Check } from '@lucide/svelte';
  import Img from '../Img.svelte';
  import type { ImageVariantMap } from '$lib/img';

  /**
   * "Ways to Travel" — the experience picker below the hero.
   *
   * Two ways into the same choice: a tab strip for people reading, and a grid
   * of photographs for people looking. Both drive one detail card, so whichever
   * a visitor uses, the answer appears in the same place.
   *
   * Everything renders from `items`, which are published tour categories.
   * Nothing here is invented — a category with no duration shows no duration,
   * one with no highlights shows no chips, and the card simply gets shorter.
   */
  type ExperienceItem = {
    name: string;
    slug: string;
    description?: string;
    image?: string;
    href?: string;
    short?: string;
    /** "3–10 days · Easy · Jan–Feb, Jun–Oct", pre-formatted by the caller. */
    meta?: string;
    tags?: string[];
    bestFor?: string[];
    ctaLabel?: string;
  };

  export let eyebrow = 'Experiences';
  export let title = 'What Kind of Tanzania Trip Are You Imagining?';
  export let subtitle =
    "You do not need to know the perfect route yet. Start with the experience that feels closest to your trip, and we'll help connect the right places, timing, lodges, transfers and pace.";
  export let items: ExperienceItem[] = [];
  export let imageVariants: ImageVariantMap = {};
  export let moreLabel = 'More experiences';
  export let bestForLabel = 'Best for';
  export let primaryCtaPrefix = 'Explore';

  /** Six in the strip and the photo grid; the rest are named underneath. */
  const PRIMARY_COUNT = 6;

  let activeIndex = 0;
  $: if (activeIndex >= items.length) activeIndex = 0;

  $: primary = items.slice(0, PRIMARY_COUNT);
  $: secondary = items.slice(PRIMARY_COUNT);
  $: active = items[activeIndex] ?? items[0];

  $: activeHref = active ? active.href || (active.slug ? `/safari-styles/${active.slug}` : '') : '';
  $: activeBlurb = active ? active.short || active.description || '' : '';
  $: activeTags = (active?.tags ?? []).filter(Boolean);
  $: activeBestFor = (active?.bestFor ?? []).map((entry) => entry.trim()).filter(Boolean);
  $: metaParts = (active?.meta ?? '')
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);

  /*
   * Initials in circles only make sense for a list of short audience labels,
   * which is how `who_its_for` is written now — one per line. Older records
   * hold a single sentence, and a sentence gets one letter and reads as a
   * mistake, so prose renders as prose.
   */
  $: bestForAsList = activeBestFor.length > 1 && activeBestFor.every((entry) => entry.length <= 44);
  $: bestForShown = activeBestFor.slice(0, 3);
</script>

{#if items.length}
  <section id="experiences" class="home-experiences scroll-mt-20 bg-surface py-14 md:py-20">
    <div class="container-shell">
      <div class="home-experiences-head mx-auto max-w-[720px] text-center">
        <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{eyebrow}</span>
        <h2 class="font-serif mt-3 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[40px]">
          {title}
        </h2>
        <p class="mt-3 text-base leading-relaxed text-ink/70">{subtitle}</p>
      </div>

      <!-- The strip scrolls rather than wrapping, so the row stays one line at
           every width. `w-max` inside the scroller is what lets it centre when
           it fits and still scroll from the first item when it does not. -->
      <div class="exp-tabs mt-8 overflow-x-auto border-b border-ink/15 pb-px">
        <div class="mx-auto flex w-max items-center gap-6 sm:gap-7">
          {#each primary as opt, i (opt.slug || i)}
            <button
              type="button"
              on:click={() => (activeIndex = i)}
              aria-pressed={activeIndex === i}
              class="shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm transition-colors {activeIndex === i
                ? 'border-goldfinch-gold font-semibold text-heading'
                : 'border-transparent font-medium text-ink/65 hover:text-heading'}"
            >
              {opt.name}
            </button>
          {/each}
        </div>
      </div>

      <div class="mt-9 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-stretch">
        {#if active}
          <div class="flex min-w-0 flex-col rounded-[20px] border border-ink/15 bg-surface p-5 sm:p-6 lg:min-h-[430px]">
            <h3 class="font-serif text-[26px] font-bold leading-tight text-heading sm:text-[30px] lg:text-[34px]">
              {active.name}
            </h3>

            {#if metaParts.length}
              <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/50">
                {#each metaParts as part, i (part)}
                  <span class="flex items-center gap-2">
                    {part}
                    {#if i < metaParts.length - 1}<span class="text-ink/40">·</span>{/if}
                  </span>
                {/each}
              </div>
            {/if}

            {#if activeBlurb}
              <p class="mt-3.5 text-[15px] leading-relaxed text-ink/70">{activeBlurb}</p>
            {/if}

            {#if activeTags.length}
              <div class="mt-4 flex flex-wrap gap-1.5">
                {#each activeTags as tag (tag)}
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3.5 py-2 text-[13px] font-medium text-heading">
                    <Check class="h-3 w-3 shrink-0 text-clay" />
                    {tag}
                  </span>
                {/each}
              </div>
            {/if}

            {#if activeHref}
              <a
                href={activeHref}
                data-cta={`experience-${active.slug}-primary`}
                class="mt-5 inline-flex w-fit items-center justify-center gap-2 rounded-md bg-goldfinch-gold px-6 py-3 text-base font-semibold text-heading transition-colors hover:bg-goldfinch-gold/85"
              >
                {active.ctaLabel || `${primaryCtaPrefix} ${active.name}`}
                <ArrowRight class="h-4 w-4" />
              </a>
            {/if}

            {#if activeBestFor.length}
              <!-- Holds the footer against the bottom of a tall card without
                   collapsing the gap when the content already fills it. -->
              <div class="grow" aria-hidden="true"></div>
              <div class="mt-6 flex items-center gap-2.5 border-t border-dashed border-ink/15 pt-4">
                {#if bestForAsList}
                  <span class="flex shrink-0">
                    {#each bestForShown as entry, i (entry)}
                      <span
                        class="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-xs font-semibold first:ml-0 {i % 2 === 0
                          ? 'bg-goldfinch-gold text-heading'
                          : 'bg-clay text-white'}"
                      >
                        {entry.charAt(0)}
                      </span>
                    {/each}
                  </span>
                  <p class="text-sm leading-snug text-ink/70">
                    {bestForLabel}
                    <span class="font-semibold text-heading">{bestForShown.join(', ').toLowerCase()}</span>
                  </p>
                {:else}
                  <p class="text-sm leading-snug text-ink/70">
                    {bestForLabel}
                    <span class="font-semibold text-heading">{activeBestFor.join(' ')}</span>
                  </p>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Two rows that divide the column's height rather than fixing their
             own, so the photographs finish level with the card instead of
             leaving a band of empty space under them. -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-rows-2">
          {#each primary as opt, i (opt.slug || i)}
            <button
              type="button"
              on:click={() => (activeIndex = i)}
              aria-pressed={activeIndex === i}
              class="exp-tile group relative aspect-[4/3] overflow-hidden rounded-2xl transition-all duration-300 lg:aspect-auto lg:min-h-[190px] {activeIndex === i
                ? 'exp-tile-active z-10 scale-[1.04] ring-4 ring-goldfinch-gold/70'
                : ''}"
            >
              {#if opt.image}
                <Img
                  src={opt.image}
                  variantsMap={imageVariants}
                  alt={opt.name}
                  width={520}
                  sizes="(max-width: 639px) 45vw, (max-width: 1023px) 31vw, 22vw"
                  pictureClass="block h-full w-full"
                  className={`h-full w-full object-cover transition-all duration-300 ${
                    activeIndex === i
                      ? 'scale-105 opacity-100 saturate-100'
                      : 'scale-100 opacity-55 saturate-[0.5] group-hover:opacity-80 group-hover:saturate-75'
                  }`}
                />
              {:else}
                <span class="block h-full w-full bg-sand"></span>
              {/if}
              <span class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"></span>
              <span class="absolute inset-x-2.5 bottom-2.5 text-left text-[13px] font-semibold leading-tight text-white sm:text-sm md:text-base">
                {opt.name}
              </span>
            </button>
          {/each}
        </div>
      </div>

      {#if secondary.length}
        <p class="mt-5 text-center text-[13px] leading-6 text-ink/50">
          {moreLabel}:
          {#each secondary as opt, i (opt.slug || i)}<span
              ><button
                type="button"
                on:click={() => (activeIndex = i + PRIMARY_COUNT)}
                class="underline-offset-2 hover:underline {activeIndex === i + PRIMARY_COUNT
                  ? 'font-semibold text-heading'
                  : 'font-medium text-clay'}">{opt.name}</button
              >{#if i < secondary.length - 1}<span class="px-2 text-ink/40">·</span>{/if}</span
            >{/each}
        </p>
      {/if}
    </div>
  </section>
{/if}

<style>
  /* The strip is scrollable, but a visible scrollbar under the tabs reads as
     a broken border rather than an affordance. */
  .exp-tabs {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .exp-tabs::-webkit-scrollbar {
    display: none;
  }

  /* Brand-token glow: a Tailwind arbitrary value cannot carry the runtime
     colour variable the Branding page rewrites, so it lives here. */
  .exp-tile-active {
    box-shadow: 0 0 28px rgb(var(--c-goldfinch-gold) / 0.5);
  }

  /* The browser's default outline is a dark ring, which disappears against a
     photograph — and these tiles are all photograph. */
  .exp-tile:focus-visible,
  .exp-tabs button:focus-visible {
    outline: 2px solid rgb(var(--c-goldfinch-gold));
    outline-offset: 2px;
  }

  @media (max-width: 639px) {
    .home-experiences {
      padding-block: 3.25rem;
      max-width: 100vw;
      overflow-x: clip;
    }

    .home-experiences-head h2 {
      font-size: clamp(1.85rem, 8vw, 2.25rem);
      line-height: 1.06;
      text-wrap: balance;
    }

    .home-experiences-head p {
      font-size: 0.95rem;
      line-height: 1.65;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .exp-tile,
    .exp-tile :global(img) {
      transition: none;
    }
    .exp-tile-active {
      transform: none;
    }
  }
</style>
