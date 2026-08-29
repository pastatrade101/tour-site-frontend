<script lang="ts">
  import { ArrowLeft, ArrowRight, MapPin, Star } from '@lucide/svelte';
  import Img from '../Img.svelte';

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
    platform?: string | null;
    source_url?: string | null;
    author_photo_url?: string | null;
    tour_title?: string | null;
    tours?: {
      id?: string;
      title?: string;
      slug?: string;
      main_image_url?: string | null;
      banner_image_url?: string | null;
    } | null;
  };

  export let eyebrow = 'What Travellers Say';
  export let title = 'Verified Reviews from Tanzania Travellers';
  export let subtitle = '';
  export let sourcesLabel = 'TripAdvisor · SafariBookings · Google';
  export let reviews: StoryReview[] = [];
  export let summary: { average?: number | null; count?: number | null; total?: number | null } | null = null;

  let scrollerEl: HTMLDivElement;
  let activeIndex = 0;

  const nameOf = (r: StoryReview) => (r.author_name || r.client_name || '').trim();
  const countryOf = (r: StoryReview) => (r.country || r.client_country || '').trim();
  const quoteOf = (r: StoryReview) => (r.message || r.comment || '').trim();
  const titleOf = (r: StoryReview) => (r.title || '').trim();
  const sourceUrlOf = (r: StoryReview) => (r.source_url || '').trim();
  const tourTitleOf = (r: StoryReview) => (r.tours?.title || r.tour_title || titleOf(r)).trim();
  const cardImageOf = (r: StoryReview) => r.author_photo_url || r.tours?.main_image_url || r.tours?.banner_image_url || '';

  const countryCodes: Record<string, string> = {
    australia: 'AU', austria: 'AT', belgium: 'BE', brazil: 'BR', canada: 'CA', china: 'CN',
    denmark: 'DK', finland: 'FI', france: 'FR', germany: 'DE', india: 'IN', ireland: 'IE',
    italy: 'IT', japan: 'JP', kenya: 'KE', netherlands: 'NL', 'new zealand': 'NZ', norway: 'NO',
    portugal: 'PT', singapore: 'SG', 'south africa': 'ZA', spain: 'ES', sweden: 'SE',
    switzerland: 'CH', tanzania: 'TZ', 'united arab emirates': 'AE', 'united kingdom': 'GB',
    uk: 'GB', 'united states': 'US', 'united states of america': 'US', usa: 'US'
  };
  const countryFlag = (country: string) => {
    const code = countryCodes[country.trim().toLowerCase()];
    return code ? [...code].map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('') : '';
  };

  // Whole stars, only when a real numeric rating exists (never defaulted to 5).
  const starsOf = (rating: number | null | undefined) => {
    const n = typeof rating === 'number' && isFinite(rating) ? Math.round(rating) : 0;
    return n > 0 ? Math.min(n, 5) : 0;
  };

  $: items = reviews.filter((r) => quoteOf(r) || nameOf(r));

  $: avg =
    summary && typeof summary.average === 'number' && isFinite(summary.average) && summary.average > 0
      ? summary.average
      : null;
  $: summaryTotal = summary?.total ?? summary?.count ?? null;
  $: total =
    typeof summaryTotal === 'number' && isFinite(summaryTotal) && summaryTotal > 0
      ? Math.round(summaryTotal)
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
  <section class="home-traveller-stories py-14 md:py-20">
    <div class="container-shell">
      <div class="home-traveller-head text-center">
        <div class="mx-auto max-w-[1180px]">
          {#if eyebrow}
            <div class="inline-flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-[0.22em] text-goldfinch-gold">{eyebrow}</span>
            </div>
          {/if}
          <h2 class="font-serif mt-5 text-3xl leading-[1.08] tracking-tight text-heading sm:text-4xl md:text-[52px]">
            {title}
          </h2>
          {#if subtitle}
            <p class="mx-auto mt-6 max-w-5xl text-base leading-7 text-ink/70 md:text-lg">{subtitle}</p>
          {/if}
          {#if hasSummaryLine && (avg || total)}
            <div class="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-ink/70">
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
        <div class="mt-9 hidden justify-end gap-2 sm:flex">
          <button
            type="button"
            aria-label="Previous reviews"
            on:click={() => scrollByDir(-1)}
            class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-ink/15 bg-surface hover:bg-sand"
          >
            <ArrowLeft class="h-4 w-4" size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Next reviews"
            on:click={() => scrollByDir(1)}
            class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-ink/15 bg-surface hover:bg-sand"
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
        class="no-scrollbar mt-5 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3"
      >
        {#each items as r, i (i)}
          <article
            data-review-card
            class="review-card flex h-full min-h-[490px] w-[88%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-sm sm:w-[calc((100%-24px)/2)] lg:w-[calc((100%-48px)/3)]"
          >
            {#if cardImageOf(r)}
              <div class="h-56 overflow-hidden bg-sand md:h-64">
                <Img record={r} fields={['author_photo_url']} src={cardImageOf(r)} alt={tourTitleOf(r) || `Safari reviewed by ${nameOf(r)}`} width={800} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 88vw" className="h-full w-full object-cover" />
              </div>
            {/if}
            <div class="flex flex-1 flex-col p-6">
            <div class="flex items-center justify-between gap-4">
              {#if r.platform}
                {#if sourceUrlOf(r)}
                  <a
                    href={sourceUrlOf(r)}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={`Read ${nameOf(r) || 'this'} review on ${r.platform}`}
                    class={`rounded-full border px-3 py-1 text-xs font-bold transition hover:brightness-95 ${r.platform === 'Google' ? 'border-blue-200 bg-blue-50 text-blue-600' : r.platform === 'TripAdvisor' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-800'}`}
                  >{r.platform}</a>
                {:else}
                  <span class={`rounded-full border px-3 py-1 text-xs font-bold ${r.platform === 'Google' ? 'border-blue-200 bg-blue-50 text-blue-600' : r.platform === 'TripAdvisor' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-800'}`}>{r.platform}</span>
                {/if}
              {:else}<span></span>{/if}
              {#if starsOf(r.rating)}
                <span class="inline-flex items-center gap-0.5 text-goldfinch-gold">
                  {#each Array(starsOf(r.rating)) as _, s (s)}
                    <Star class="h-4 w-4 fill-current" size={16} strokeWidth={2} />
                  {/each}
                </span>
              {/if}
            </div>
            {#if quoteOf(r)}
              <blockquote class="mt-5 flex-1 font-serif text-xl leading-snug text-heading">
                "{quoteOf(r)}"
              </blockquote>
            {/if}
            {#if nameOf(r) || tourTitleOf(r)}
              <div class="mt-5 flex items-center gap-3 border-t border-ink/10 pt-4 text-sm">
                {#if countryFlag(countryOf(r))}
                  <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-ink/10 bg-white text-2xl" aria-hidden="true">{countryFlag(countryOf(r))}</span>
                {:else}
                  <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-ink/10 bg-sand text-ink/55"><MapPin size={18} /></span>
                {/if}
                <div class="min-w-0">
                {#if nameOf(r)}
                  <div class="truncate font-semibold text-heading">
                    {nameOf(r)}{countryOf(r) ? ` · ${countryOf(r)}` : ''}
                  </div>
                {/if}
                {#if tourTitleOf(r)}
                  <div class="truncate text-ink/70">{tourTitleOf(r)}</div>
                {/if}
                </div>
              </div>
            {/if}
            </div>
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

    </div>

  </section>
{/if}

<style>
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 767px) {
    .home-traveller-stories {
      padding-block: 3.25rem;
      background: rgb(var(--c-canvas));
    }

    .home-traveller-head {
      display: block;
    }

    .home-traveller-head h2 {
      font-size: clamp(1.85rem, 8vw, 2.25rem);
      line-height: 1.08;
      text-wrap: balance;
    }

    .review-card {
      min-height: 250px;
      width: min(82%, 310px);
    }

    .review-card blockquote {
      font-size: 1.02rem;
      line-height: 1.35;
    }

  }
</style>
