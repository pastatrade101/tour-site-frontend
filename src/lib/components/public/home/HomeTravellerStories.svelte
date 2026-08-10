<script lang="ts">
  import { ArrowLeft, ArrowRight, Camera, Star } from '@lucide/svelte';
  import Img from '../Img.svelte';
  import type { ImageVariantMap } from '$lib/img';

  // Traveller stories / verified reviews carousel. Renders ONLY from props:
  // if there are no usable reviews the whole section disappears. Star rows and
  // the aggregate line come from real numbers only — nothing is invented.
  type StoryReview = {
    author_name?: string | null;
    client_name?: string | null;
    country?: string | null;
    client_country?: string | null;
    rating?: number | null;
    title?: string | null;
    message?: string | null;
    comment?: string | null;
    created_at?: string | null;
  };

  export let eyebrow = 'What Travellers Say';
  export let title = 'Verified Reviews from Tanzania Travellers';
  export let sourcesLabel = 'TripAdvisor · SafariBookings · Google';
  export let reviews: StoryReview[] = [];
  // "Moments from our travellers" marquee — real published gallery images only.
  export let photosLabel = 'Moments from our travellers';
  export let photos: { src: string; caption: string }[] = [];
  export let imageVariants: ImageVariantMap = {};
  $: marquee = photos.filter((p) => p?.src);

  export let summary: { average?: number | null; total?: number | null } | null = null;
  export let moreLabel = 'Read More Reviews';
  export let moreHref = '#reviews';
  export let ctaLabel = 'Plan Your Trip';
  export let ctaHref = '#lead-form';

  let scrollerEl: HTMLDivElement;
  let activeIndex = 0;

  const nameOf = (r: StoryReview) => (r.author_name || r.client_name || '').trim();
  const countryOf = (r: StoryReview) => (r.country || r.client_country || '').trim();
  const quoteOf = (r: StoryReview) => (r.message || r.comment || '').trim();
  const titleOf = (r: StoryReview) => (r.title || '').trim();

  // Whole stars, only when a real numeric rating exists (never defaulted to 5).
  const starsOf = (rating: number | null | undefined) => {
    const n = typeof rating === 'number' && isFinite(rating) ? Math.round(rating) : 0;
    return n > 0 ? Math.min(n, 5) : 0;
  };

  const dateLabel = (value: string | null | undefined) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  $: items = reviews.filter((r) => quoteOf(r) || nameOf(r));

  $: avg =
    summary && typeof summary.average === 'number' && isFinite(summary.average) && summary.average > 0
      ? summary.average
      : null;
  $: total =
    summary && typeof summary.total === 'number' && isFinite(summary.total) && summary.total > 0
      ? Math.round(summary.total)
      : null;
  $: avgStars = avg ? starsOf(avg) : 0;
  $: hasSummaryLine = Boolean(avg || total || sourcesLabel);

  const step = (fallbackRatio = 1) => {
    if (!scrollerEl) return 0;
    const card = scrollerEl.querySelector<HTMLElement>('[data-review-card]');
    return card ? card.offsetWidth + 24 : scrollerEl.clientWidth * fallbackRatio;
  };

  const scrollByDir = (dir: 1 | -1) => {
    if (!scrollerEl) return;
    scrollerEl.scrollBy({ left: dir * step(0.85), behavior: 'smooth' });
  };

  const onScroll = () => {
    if (!scrollerEl) return;
    const s = step();
    if (!s) return;
    activeIndex = Math.round(scrollerEl.scrollLeft / s);
  };

  const scrollToIndex = (i: number) => {
    if (!scrollerEl) return;
    scrollerEl.scrollTo({ left: i * step(), behavior: 'smooth' });
  };
</script>

{#if items.length}
  <section class="py-14 md:py-20">
    <div class="container-shell">
      <div class="flex items-end justify-between gap-6">
        <div class="max-w-[1180px]">
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">{eyebrow}</span>
            </div>
          {/if}
          <h2 class="font-serif mt-3 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[44px]">
            {title}
          </h2>
          {#if hasSummaryLine}
            <div class="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink/70">
              {#if avgStars}
                <span class="inline-flex items-center gap-0.5 text-goldfinch-gold">
                  {#each Array(avgStars) as _, i (i)}
                    <Star class="h-4 w-4 fill-current" size={16} strokeWidth={2} />
                  {/each}
                </span>
              {/if}
              {#if avg}
                <span class="font-semibold text-heading">{avg.toFixed(1)} average</span>
              {/if}
              {#if avg && total}
                <span>·</span>
              {/if}
              {#if total}
                <span>from {total} {total === 1 ? 'review' : 'reviews'}</span>
              {/if}
              {#if (avg || total) && sourcesLabel}
                <span>·</span>
              {/if}
              {#if sourcesLabel}
                <span>{sourcesLabel}</span>
              {/if}
            </div>
          {/if}
        </div>
        <div class="hidden sm:flex gap-2">
          <button
            type="button"
            aria-label="Previous reviews"
            on:click={() => scrollByDir(-1)}
            class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-ink/10 bg-surface hover:bg-sand"
          >
            <ArrowLeft class="h-4 w-4" size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Next reviews"
            on:click={() => scrollByDir(1)}
            class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-ink/10 bg-surface hover:bg-sand"
          >
            <ArrowRight class="h-4 w-4" size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        bind:this={scrollerEl}
        on:scroll={onScroll}
        aria-label="Traveller reviews"
        role="region"
        class="no-scrollbar mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2"
      >
        {#each items as r, i (i)}
          <article
            data-review-card
            class="review-card flex h-full min-h-[280px] w-[85%] shrink-0 snap-start flex-col rounded-lg border border-ink/10 bg-surface p-6 sm:w-[calc((100%-24px)/2)] lg:w-[calc((100%-48px)/3)]"
          >
            <div class="flex items-center justify-between">
              {#if starsOf(r.rating)}
                <span class="inline-flex items-center gap-0.5 text-goldfinch-gold">
                  {#each Array(starsOf(r.rating)) as _, s (s)}
                    <Star class="h-4 w-4 fill-current" size={16} strokeWidth={2} />
                  {/each}
                </span>
              {/if}
              {#if dateLabel(r.created_at)}
                <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70">
                  {dateLabel(r.created_at)}
                </span>
              {/if}
            </div>
            {#if quoteOf(r)}
              <blockquote class="mt-4 flex-1 font-serif text-lg leading-snug text-heading">
                "{quoteOf(r)}"
              </blockquote>
            {/if}
            {#if nameOf(r) || titleOf(r)}
              <div class="mt-5 border-t border-ink/10 pt-4 text-sm">
                {#if nameOf(r)}
                  <div class="font-semibold text-heading">
                    {nameOf(r)}{countryOf(r) ? ` · ${countryOf(r)}` : ''}
                  </div>
                {/if}
                {#if titleOf(r)}
                  <div class="text-ink/70">{titleOf(r)}</div>
                {/if}
              </div>
            {/if}
          </article>
        {/each}
      </div>

      <div class="mt-6 flex justify-center gap-1.5">
        {#each items as _, i (i)}
          <button
            type="button"
            aria-label={`Go to review ${i + 1}`}
            on:click={() => scrollToIndex(i)}
            class={`h-1.5 rounded-full transition-all ${
              i === activeIndex ? 'w-6 bg-clay' : 'w-1.5 bg-ink/10 hover:bg-ink/40'
            }`}
          ></button>
        {/each}
      </div>

      {#if (moreLabel && moreHref) || (ctaLabel && ctaHref)}
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          {#if moreLabel && moreHref}
            <a
              href={moreHref}
              class="inline-flex items-center justify-center rounded-md border border-ink/10 bg-surface px-5 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-sand"
            >
              {moreLabel}
            </a>
          {/if}
          {#if ctaLabel && ctaHref}
            <a
              href={ctaHref}
              data-cta="reviews-plan"
              class="inline-flex items-center justify-center rounded-md bg-deep-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest"
            >
              {ctaLabel}
            </a>
          {/if}
        </div>
      {/if}
    </div>

    {#if marquee.length}
      <div class="traveller-marquee relative left-1/2 right-1/2 mt-12 w-screen -translate-x-1/2 md:mt-14">
        <div class="container-shell">
          <div class="flex items-center gap-2">
            <Camera size={16} class="text-clay" aria-hidden="true" />
            <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay">{photosLabel}</span>
          </div>
        </div>

        <div class="relative mt-5 w-screen overflow-hidden">
          <ul class="traveller-marquee__track flex w-max gap-5 md:gap-6">
            {#each [...marquee, ...marquee] as p, i (i)}
              <li class="relative h-[240px] w-[190px] shrink-0 overflow-hidden rounded-[12px] shadow-[0_12px_28px_rgba(57,61,50,0.10)] md:h-[300px] md:w-[240px]">
                <Img
                  src={p.src}
                  variantsMap={imageVariants}
                  alt={p.caption}
                  width={480}
                  sizes="240px"
                  className="h-full w-full object-cover"
                />
                <div class="pointer-events-none absolute inset-0" aria-hidden="true" style="background: linear-gradient(180deg, rgba(20,24,18,0) 45%, rgba(20,24,18,0.72) 100%)"></div>
                {#if p.caption}
                  <div class="absolute inset-x-0 bottom-0 p-3">
                    <div class="text-[13px] font-bold text-white md:text-[14.5px]">{p.caption}</div>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  @keyframes traveller-marquee-scroll {
    0% { transform: translate3d(0, 0, 0); }
    100% { transform: translate3d(-50%, 0, 0); }
  }
  .traveller-marquee__track {
    animation: traveller-marquee-scroll 60s linear infinite;
    will-change: transform;
  }
  @media (max-width: 767px) {
    .traveller-marquee__track { animation-duration: 70s; }
  }
  .traveller-marquee:hover .traveller-marquee__track {
    animation-play-state: paused;
  }
  @media (prefers-reduced-motion: reduce) {
    .traveller-marquee__track { animation: none; overflow-x: auto; }
  }

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
</style>
