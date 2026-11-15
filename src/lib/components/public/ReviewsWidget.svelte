<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { Star } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { SITE_URL } from '$lib/config/env';
  import { aggregateRatingLd } from '$lib/seo';
  import JsonLd from './JsonLd.svelte';
  import ReviewCards from './ReviewCards.svelte';
  import HomeTravellerStories from './home/HomeTravellerStories.svelte';
  import { fadeUpOnScroll, sectionReveal } from '$lib/animations';
  import type { Review, ReviewSummary } from '$lib/types';

  // Platform-attributed reviews trust widget. Fully self-hiding: until at least
  // one approved review exists, this renders nothing — so the homepage looks the
  // same as before until content is added in Admin. Also emits AggregateRating
  // JSON-LD (SEO stars) from the live summary.
  export let eyebrow = 'Loved by travellers';
  export let title = 'Real reviews from real safaris';
  export let subtitle = 'Verified ratings from travellers across TripAdvisor, SafariBookings and Google.';
  export let businessName = 'Goldfinch Adventures';
  export let summary: ReviewSummary | null = null;
  export let reviews: Review[] = [];
  /**
   * 'stories' draws the homepage's traveller-story cards (short, clamped
   * quotes) instead of this widget's full-text cards, which ran whole review
   * paragraphs down the tour page. Loading and the rating JSON-LD are shared.
   */
  export let variant: 'widget' | 'stories' = 'widget';

  let loaded = Boolean(summary);

  $: siteUrl = SITE_URL || (browser ? window.location.origin : 'https://goldfinch.makutano.co.tz');
  $: hasReviews = Boolean(loaded && summary && summary.count > 0);
  $: rounded = summary ? Math.round(summary.average) : 5;

  onMount(async () => {
    if (loaded) return;
    try {
      const [summaryRes, featuredRes] = await Promise.all([
        api.reviews.summary(),
        api.reviews.list({ status: 'approved', is_featured: true, limit: 6 })
      ]);
      summary = summaryRes.data;
      let items = (featuredRes.data.items ?? []) as Review[];
      if (!items.length) {
        const anyRes = await api.reviews.list({ status: 'approved', limit: 6 });
        items = (anyRes.data.items ?? []) as Review[];
      }
      reviews = items;
    } catch {
      summary = null;
      reviews = [];
    } finally {
      loaded = true;
    }
  });
</script>

{#if hasReviews && summary}
  <JsonLd
    data={aggregateRatingLd({
      name: businessName,
      url: siteUrl,
      ratingValue: summary.average,
      reviewCount: summary.count,
      reviews: reviews.slice(0, 5).map((r) => ({ author: r.author_name, rating: r.rating, body: r.message, datePublished: r.created_at }))
    })}
  />

  {#if variant === 'stories'}
  <HomeTravellerStories {reviews} {summary} {eyebrow} {title} {subtitle} />
  {:else}
  <section class="relative overflow-hidden bg-canvas py-14 md:py-20" use:sectionReveal>
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-forest/20 to-transparent" aria-hidden="true"></div>
    <div class="container-shell">
      <!-- header -->
      <div class="relative mx-auto max-w-2xl text-center" use:fadeUpOnScroll={{ y: 14 }}>
        <p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">{eyebrow}</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-heading md:text-[38px]">{title}</h2>
        <p class="mt-4 text-[15px] leading-8 text-ink/70 md:text-lg">{subtitle}</p>
      </div>

      <!-- aggregate + per-platform breakdown -->
      <div
        class="relative mx-auto mt-10 flex max-w-4xl flex-col items-center gap-6 rounded-[8px] border border-ink/10 bg-surface p-5 shadow-card md:flex-row md:justify-between md:gap-10 md:p-7"
        use:fadeUpOnScroll={{ y: 16 }}
      >
        <div class="text-center md:min-w-36">
          <div class="text-5xl font-extrabold leading-none text-heading">{summary.average.toFixed(1)}</div>
          <div class="mt-2 flex items-center justify-center gap-0.5" aria-hidden="true">
            {#each Array(5) as _, i}
              <Star size={16} class={i < rounded ? 'text-goldfinch-gold' : 'text-ink/15'} fill={i < rounded ? 'currentColor' : 'none'} />
            {/each}
          </div>
          <div class="mt-1.5 text-xs font-semibold text-ink/60">{summary.count} review{summary.count === 1 ? '' : 's'}</div>
        </div>

        {#if summary.by_platform.length}
          <div class="grid w-full gap-2 sm:grid-cols-2 md:flex md:w-auto md:flex-wrap md:justify-center">
            {#each summary.by_platform as p}
              <div class="flex items-center justify-between gap-3 rounded-[8px] border border-ink/10 bg-canvas px-4 py-2">
                <span class="text-sm font-bold text-heading">{p.platform}</span>
                <span class="inline-flex items-center gap-1 text-sm font-semibold text-ink/70">
                  <Star size={13} class="text-goldfinch-gold" fill="currentColor" />{p.average.toFixed(1)}
                </span>
                <span class="text-xs text-ink/50">({p.count})</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- review cards -->
      {#if reviews.length}
        <div class="mt-10">
          <ReviewCards {reviews} total={summary.count} />
        </div>
      {/if}
    </div>
  </section>
  {/if}
{/if}
