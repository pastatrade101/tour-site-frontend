<script lang="ts">
  import { locale, t } from '$lib/i18n/ui';
  import { Star } from '@lucide/svelte';
  import ReviewCards from '../ReviewCards.svelte';

  // Traveller stories: a heading, the real average, and the review cards.
  // Renders ONLY from props: with no usable reviews the whole section
  // disappears. The star row and the aggregate line come from real numbers
  // only — nothing is invented. The cards themselves are ReviewCards, the one
  // review card the site has.
  type StoryReview = {
    id?: string | null;
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
  const quoteOf = (r: StoryReview) => (r.message || r.comment || '').trim();

  // Whole stars, only when a real numeric rating exists (never defaulted to 5).
  const starsOf = (rating: number | null | undefined) => {
    const n = typeof rating === 'number' && isFinite(rating) ? Math.round(rating) : 0;
    return n > 0 ? Math.min(n, 5) : 0;
  };

  $: items = reviews.filter((r) => quoteOf(r) || nameOf(r));
  // Six fills two rows of three; the rest are behind "View more reviews".
  $: shown = items.slice(0, 6);

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
              {#if avg}{$t('ui.rating_average').replace('{n}', avg.toLocaleString($locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))}{/if}{#if avg && sourcesLabel} · {/if}{sourcesLabel}
            </span>
          </div>
        {/if}

        {#if subtitle}
          <p class="mx-auto mt-4 max-w-3xl text-[15px] leading-7 text-ink/65">{subtitle}</p>
        {/if}
      </div>

      <div class="mt-12 md:mt-14">
        <ReviewCards reviews={shown} total={total ?? 0} />
      </div>
    </div>
  </section>
{/if}
