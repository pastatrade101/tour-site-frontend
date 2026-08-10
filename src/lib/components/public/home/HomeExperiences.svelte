<script lang="ts">
  import { ArrowRight, Compass, Plane, Heart, Waves, Users, Sparkles, Mountain, TreePine, Camera, MapPin } from '@lucide/svelte';
  import Img from '../Img.svelte';
  import type { ImageVariantMap } from '$lib/img';

  // "What Kind of Tanzania Trip Are You Imagining?" — an interactive list of
  // experience types (Goldfinch tour categories) on the left, with a large
  // preview panel on the right. Everything renders from `items`; nothing is
  // fabricated. Optional per-item `tags` / `bestFor` / `short` are shown only
  // when the CMS actually supplies them.
  type ExperienceItem = {
    name: string;
    slug: string;
    description?: string;
    image?: string;
    href?: string;
    short?: string;
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
  export let secondaryCtaLabel = 'View Safari Itineraries';
  export let secondaryCtaHref = '#featured-itineraries';

  // Fixed icon rotation — assigned by index so each card gets a sensible mark.
  const icons = [Compass, Plane, Heart, Waves, Users, Sparkles, Mountain, TreePine, Camera, MapPin];
  const iconAt = (i: number) => icons[i % icons.length];

  let activeIndex = 0;
  $: if (activeIndex >= items.length) activeIndex = 0;
  $: primary = items.slice(0, 6);
  $: secondary = items.slice(6);
  $: active = items[activeIndex] ?? items[0];
  $: activeHref = active ? active.href || (active.slug ? `/tours/${active.slug}` : '') : '';
</script>

{#if items.length}
  <section id="experiences" class="home-experiences py-20 scroll-mt-20 bg-surface">
    <div class="container-shell">
      <div class="home-experiences-head max-w-[1180px] mx-auto text-center">
        <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">
          {eyebrow}
        </span>
        <h2 class="font-serif mt-3 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[40px]">
          {title}
        </h2>
        <p class="mt-3 max-w-[820px] mx-auto text-base leading-relaxed text-ink/70">
          {subtitle}
        </p>
      </div>

      <div class="home-experiences-layout mt-8 grid min-w-0 max-w-full gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start">
        <!-- Left: interactive experience list (~35%) -->
        <div class="min-w-0 max-w-full overflow-hidden sm:overflow-visible flex flex-col gap-3">
          <div class="home-experience-tabs flex flex-col space-y-3">
            {#each primary as opt, i (opt.slug || i)}
              <button
                type="button"
                on:click={() => (activeIndex = i)}
                aria-pressed={activeIndex === i}
                class="home-experience-tab group relative grid w-full max-w-full grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-3 rounded-xl px-5 py-4 text-left transition-all sm:grid-cols-[44px_minmax(0,1fr)_24px]"
                style={activeIndex === i
                  ? 'background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-goldfinch-gold) / 0.35); box-shadow: inset 3px 0 0 0 rgb(var(--c-goldfinch-gold)), 0 6px 20px -4px rgb(var(--c-ink) / 0.14), -10px 0 24px -14px rgb(var(--c-goldfinch-gold) / 0.45);'
                  : 'background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-ink) / 0.08); box-shadow: 0 2px 8px -2px rgb(var(--c-ink) / 0.08);'}
              >
                <span
                  class="flex h-10 w-10 items-center justify-center rounded-md border bg-surface sm:h-11 sm:w-11 {activeIndex === i
                    ? 'border-goldfinch-gold'
                    : 'border-ink/10'}"
                >
                  <svelte:component this={iconAt(i)} strokeWidth={1.5} size={18} class="text-goldfinch-gold" />
                </span>
                <span class="min-w-0">
                  <span class="font-serif block text-[15px] font-medium leading-tight text-heading md:text-base">
                    {opt.name}
                  </span>
                  {#if opt.short || opt.description}
                    <!-- no `block` here: line-clamp needs display:-webkit-box, which `block` would override -->
                    <span class="mt-1 line-clamp-3 text-[14px] leading-snug text-ink/70 break-words">
                      {opt.short || opt.description}
                    </span>
                  {/if}
                </span>
                <ArrowRight
                  class="h-4 w-4 justify-self-end transition-transform duration-200 {activeIndex === i
                    ? 'text-goldfinch-gold translate-x-1'
                    : 'text-ink/50 group-hover:text-goldfinch-gold group-hover:translate-x-1'}"
                />
              </button>
            {/each}
          </div>

          <!-- More experiences -->
          {#if secondary.length}
            <details class="group rounded-xl border border-ink/10 bg-surface/70 px-3 py-2 text-sm">
              <summary class="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold uppercase tracking-[0.12em] text-ink/70">
                {moreLabel}
                <ArrowRight class="h-4 w-4 transition-transform group-open:rotate-90" />
              </summary>
              <ul class="mt-2 flex flex-col gap-1">
                {#each secondary as opt, j (opt.slug || j)}
                  <li>
                    <button
                      type="button"
                      on:click={() => (activeIndex = j + 6)}
                      class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors {activeIndex === j + 6
                        ? 'bg-sand'
                        : 'hover:bg-sand/60'}"
                    >
                      <svelte:component this={iconAt(j + 6)} size={16} strokeWidth={1.5} class="text-ink/70" />
                      <span class="font-serif text-[14px] text-heading">{opt.name}</span>
                    </button>
                  </li>
                {/each}
              </ul>
            </details>
          {/if}
        </div>

        <!-- Right: dynamic preview panel (~65%) -->
        {#if active}
          <div class="home-experience-preview flex min-w-0 max-w-full flex-col overflow-hidden">
            <div class="home-experience-image relative aspect-[3/2] w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-sand">
              {#if active.image}
                {#key active.image}
                  <Img
                    src={active.image}
                    variantsMap={imageVariants}
                    alt={active.name}
                    width={1200}
                    sizes="(max-width: 479px) calc(100vw - 32px), (max-width: 767px) calc(100vw - 48px), (max-width: 1024px) 100vw, 65vw"
                    pictureClass="block h-full w-full max-w-full"
                    className="exp-fade block h-full w-full max-w-full object-cover will-change-[opacity,transform]"
                  />
                {/key}
              {/if}
              <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent"></div>
              {#if active.tags?.length}
                <div class="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 p-4">
                  {#each active.tags as t (t)}
                    <span
                      class="rounded-full px-3.5 py-1.5 text-[11px] font-medium text-white"
                      style="background: rgba(20,25,20,0.55); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2);"
                    >
                      {t}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
            <div class="flex flex-1 flex-col pt-6">
              {#if active.bestFor?.length}
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                    {bestForLabel}
                  </span>
                  <div class="flex flex-wrap gap-1.5">
                    {#each active.bestFor as b (b)}
                      <span class="rounded-full border border-ink/10 bg-transparent px-2.5 py-0.5 text-[11px] font-medium text-heading">
                        {b}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}

              <h3 class="font-serif mt-4 text-2xl leading-tight text-heading md:text-[26px]">
                {active.name}
              </h3>
              {#if active.description}
                <p class="mt-3 text-[15px] leading-relaxed text-ink/85">
                  {active.description}
                </p>
              {/if}

              <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                {#if activeHref}
                  <a
                    href={activeHref}
                    data-cta={`experience-${active.slug}-primary`}
                    class="inline-flex items-center justify-center gap-2 rounded-md bg-goldfinch-gold px-5 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-goldfinch-gold/85"
                  >
                    {active.ctaLabel || `${primaryCtaPrefix} ${active.name}`}
                    <ArrowRight class="h-4 w-4" />
                  </a>
                {/if}
                {#if secondaryCtaLabel && secondaryCtaHref}
                  <a
                    href={secondaryCtaHref}
                    data-cta={`experience-${active.slug}-secondary`}
                    class="inline-flex items-center justify-center gap-2 rounded-md border border-ink/15 bg-surface/70 px-5 py-2.5 text-sm font-semibold text-heading backdrop-blur-sm transition-colors hover:bg-surface"
                  >
                    {secondaryCtaLabel}
                  </a>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </section>
{/if}

<style>
  /* Matches the source's fade-in-0 / zoom-in-95 / duration-300 entry on the
     preview image each time the active experience changes. */
  :global(.exp-fade) {
    animation: exp-fade-in 300ms ease-out both;
  }
  @keyframes exp-fade-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @media (max-width: 639px) {
    .home-experiences {
      padding-block: 3.25rem;
      background: rgb(var(--c-surface));
      max-width: 100vw;
      overflow-x: clip;
    }

    .home-experiences :global(.container-shell) {
      width: calc(100vw - 32px);
      max-width: 430px;
      min-width: 0;
    }

    .home-experiences-head {
      margin-inline: 0;
      text-align: left;
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

    .home-experiences-layout {
      margin-top: 1.5rem;
      gap: 1rem;
      min-width: 0;
    }

    .home-experience-tabs {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(236px, 78%);
      gap: 0.75rem;
      margin-inline: -16px;
      overflow-x: auto;
      padding-inline: 16px;
      padding-bottom: 0.35rem;
      scroll-padding-inline: 16px;
      scroll-snap-type: x mandatory;
      -ms-overflow-style: none;
      scrollbar-width: none;
      max-width: calc(100vw - 32px);
    }

    .home-experience-tabs::-webkit-scrollbar {
      display: none;
    }

    .home-experience-tab {
      min-height: 126px;
      align-items: start;
      grid-template-columns: 38px minmax(0, 1fr);
      padding: 1rem;
      scroll-snap-align: start;
    }

    .home-experience-tab > :global(svg:last-child) {
      display: none;
    }

    .home-experience-image {
      aspect-ratio: 16 / 9;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      height: auto;
      border-radius: 12px;
      border: 1px solid rgb(var(--c-ink) / 0.1);
      background: rgb(var(--c-sand));
    }

    .home-experience-preview {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
    }

    .home-experience-image :global(img) {
      display: block;
      width: 100%;
      max-width: 100%;
      object-fit: cover;
      object-position: center center;
    }

    .home-experience-image :global(picture) {
      display: block;
      height: 100%;
      width: 100%;
      max-width: 100%;
    }

    .home-experience-image :global(.exp-fade) {
      transform: none;
    }

    .home-experience-preview > :global(div:last-child) {
      padding-top: 1rem;
    }

    .home-experience-preview h3 {
      margin-top: 0.75rem;
      font-size: 1.45rem;
      line-height: 1.08;
    }

    .home-experience-preview p {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 4;
      line-clamp: 4;
    }
  }
  @media (min-width: 480px) and (max-width: 767px) {
    .home-experiences :global(.container-shell) {
      width: calc(100vw - 48px);
      max-width: none;
    }

    .home-experience-tabs {
      max-width: calc(100vw - 48px);
    }
  }
  @media (min-width: 640px) and (max-width: 767px) {
    .home-experiences {
      padding-block: 4rem;
      max-width: 100vw;
      overflow-x: clip;
    }

    .home-experiences-head {
      margin-inline: 0;
      text-align: left;
    }

    .home-experiences-layout {
      margin-top: 1.75rem;
      gap: 1.25rem;
      min-width: 0;
    }

    .home-experience-tabs {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
      margin-inline: 0;
      max-width: 100%;
      overflow: visible;
      padding: 0;
      scroll-snap-type: none;
    }

    .home-experience-tab {
      min-height: 118px;
      align-items: start;
      grid-template-columns: 40px minmax(0, 1fr);
      padding: 1rem;
    }

    .home-experience-tab > :global(svg:last-child) {
      display: none;
    }

    .home-experience-image {
      aspect-ratio: 16 / 9;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      border-radius: 14px;
      border: 1px solid rgb(var(--c-ink) / 0.1);
    }

    .home-experience-preview {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
    }

    .home-experience-image :global(picture),
    .home-experience-image :global(img) {
      display: block;
      height: 100%;
      width: 100%;
      max-width: 100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.exp-fade) {
      animation: none;
    }
  }
</style>
