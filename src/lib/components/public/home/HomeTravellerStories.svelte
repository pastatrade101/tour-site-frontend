<script lang="ts">
  import { Star } from '@lucide/svelte';

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
  $: shown = items.slice(0, 8);
  /*
   * Four across is the most the row shows, but the track is built from how many
   * reviews there actually are — a fixed four columns holding three cards
   * leaves a column of empty space and the row reads as though something
   * failed to load.
   */
  $: columns = Math.min(Math.max(shown.length, 1), 4);

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





  /** Initials for the avatar disc — from the reviewer's own name, never faked. */
  const initialsOf = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

  /*
   * Each platform keeps the colour it is known by, so the badge is recognisable
   * at a glance rather than a row of identical grey chips. A platform that is
   * not one of these still gets a badge — a neutral one — because the source of
   * a review matters more than whether we have a brand colour for it.
   */
  const PLATFORM_STYLE: Record<string, string> = {
    tripadvisor: 'bg-[#34E0A1]/18 text-[#0B7A55]',
    safaribookings: 'bg-clay/12 text-clay',
    google: 'bg-[#4285F4]/12 text-[#1A56B8]'
  };
  const platformClass = (platform: string) =>
    PLATFORM_STYLE[platform.trim().toLowerCase().replace(/[^a-z]/g, '')] ?? 'bg-ink/8 text-ink/60';
</script>

{#if items.length}
  <section class="home-traveller-stories py-14 md:py-20">
    <div class="container-shell">
      <div class="text-center">
        {#if eyebrow}
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-goldfinch-gold">{eyebrow}</p>
        {/if}
        <h2 class="mt-4 text-3xl font-extrabold tracking-tight text-heading sm:text-4xl md:text-[42px]">{title}</h2>

        <!-- Stars and the aggregate line are drawn from the real summary. When
             there is no rating to show, the row is absent rather than filled
             in with five stars. -->
        {#if avgStars || avg || sourcesLabel}
          <div class="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[15px] text-ink/60">
            {#if avgStars}
              <span class="inline-flex items-center gap-1 text-goldfinch-gold">
                {#each Array(avgStars) as _, i (i)}
                  <Star class="fill-current" size={19} strokeWidth={0} />
                {/each}
              </span>
            {/if}
            <span>
              {#if avg}{avg.toFixed(1)} average{/if}{#if avg && sourcesLabel} · {/if}{sourcesLabel}
            </span>
          </div>
        {/if}

        {#if subtitle}
          <p class="mx-auto mt-4 max-w-3xl text-[15px] leading-7 text-ink/65">{subtitle}</p>
        {/if}
      </div>

      <!-- Four across on a wide screen, and a swipeable row below that. -->
      <div
        class="story-scroller mt-12 grid auto-cols-[minmax(272px,1fr)] grid-flow-col gap-5 overflow-x-auto pb-2 md:mt-14 lg:grid-flow-row lg:overflow-visible"
        style={`--story-columns: ${columns}`}
      >
        {#each shown as review, index (index)}
          {@const name = nameOf(review)}
          {@const country = countryOf(review)}
          {@const quote = quoteOf(review)}
          {@const stars = starsOf(review.rating)}
          {@const platform = (review.platform ?? '').trim()}
          <article data-review-card class="flex flex-col rounded-[14px] bg-canvas p-6">
            <span class="font-serif text-[34px] leading-none text-goldfinch-gold/45" aria-hidden="true">&rdquo;</span>

            {#if quote}
              <p class="story-quote mt-3 text-[15px] leading-[1.65] text-ink/75">&ldquo;{quote}&rdquo;</p>
            {/if}

            {#if name}
              <div class="mt-5 flex items-center gap-3 border-b border-ink/10 pb-5">
                <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-goldfinch-gold/85 text-[13px] font-bold text-heading">
                  {initialsOf(name)}
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-[15px] font-bold text-heading">{name}</span>
                  {#if country}<span class="block truncate text-[13px] text-ink/50">{country}</span>{/if}
                </span>
              </div>
            {/if}

            <div class="mt-4 flex items-center justify-between gap-3">
              {#if stars}
                <span class="inline-flex items-center gap-0.5 text-goldfinch-gold">
                  {#each Array(stars) as _, i (i)}
                    <Star class="fill-current" size={13} strokeWidth={0} />
                  {/each}
                </span>
              {:else}
                <span></span>
              {/if}
              {#if platform}
                <span class={`shrink-0 rounded-md px-2.5 py-1 text-[11.5px] font-semibold ${platformClass(platform)}`}>{platform}</span>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>
{/if}

<style>
  /* Four lines then an ellipsis, so cards in a row end level however long the
     review runs. */
  .story-quote {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .story-scroller {
    scrollbar-width: none;
    scroll-snap-type: x proximity;
  }
  .story-scroller::-webkit-scrollbar {
    display: none;
  }
  .story-scroller > :global(article) {
    scroll-snap-align: start;
  }
  @media (min-width: 1024px) {
    .story-scroller {
      grid-template-columns: repeat(var(--story-columns, 4), minmax(0, 1fr));
      scroll-snap-type: none;
    }
  }
</style>
