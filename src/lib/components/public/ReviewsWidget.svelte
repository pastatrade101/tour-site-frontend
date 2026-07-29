<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { ExternalLink, Star } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { SITE_URL } from '$lib/config/env';
  import { aggregateRatingLd } from '$lib/seo';
  import JsonLd from './JsonLd.svelte';
  import { fadeUpOnScroll, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import type { Review, ReviewSummary } from '$lib/types';

  // Platform-attributed reviews trust widget. Fully self-hiding: until at least
  // one approved review exists, this renders nothing — so the homepage looks the
  // same as before until content is added in Admin. Also emits AggregateRating
  // JSON-LD (SEO stars) from the live summary.
  export let eyebrow = 'Loved by travellers';
  export let title = 'Real reviews from real safaris';
  export let subtitle = 'Verified ratings from travellers across TripAdvisor, SafariBookings and Google.';
  export let businessName = 'Goldfinch Adventures';

  let summary: ReviewSummary | null = null;
  let reviews: Review[] = [];
  let loaded = false;

  $: siteUrl = SITE_URL || (browser ? window.location.origin : 'https://goldfinch.makutano.co.tz');
  $: hasReviews = Boolean(loaded && summary && summary.count > 0);
  $: rounded = summary ? Math.round(summary.average) : 5;

  const initialsOf = (r: Review) =>
    (r.author_initials && r.author_initials.trim()) ||
    r.author_name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') ||
    '?';

  onMount(async () => {
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

  <section class="bg-sand/40 py-16 md:py-24" use:sectionReveal>
    <div class="container-shell">
      <!-- header -->
      <div class="mx-auto max-w-2xl text-center" use:fadeUpOnScroll={{ y: 14 }}>
        <p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">{eyebrow}</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-heading md:text-[38px]">{title}</h2>
        <p class="mt-4 text-[15px] leading-8 text-ink/70 md:text-lg">{subtitle}</p>
      </div>

      <!-- aggregate + per-platform breakdown -->
      <div
        class="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-6 rounded-[14px] border border-ink/10 bg-surface p-6 shadow-[0_14px_44px_rgba(57,61,50,0.06)] md:flex-row md:justify-between md:gap-10 md:p-8"
        use:fadeUpOnScroll={{ y: 16 }}
      >
        <div class="text-center">
          <div class="text-5xl font-extrabold leading-none text-heading">{summary.average.toFixed(1)}</div>
          <div class="mt-2 flex items-center justify-center gap-0.5" aria-hidden="true">
            {#each Array(5) as _, i}
              <Star size={16} class={i < rounded ? 'text-goldfinch-gold' : 'text-ink/15'} fill={i < rounded ? 'currentColor' : 'none'} />
            {/each}
          </div>
          <div class="mt-1.5 text-xs font-semibold text-ink/60">{summary.count} review{summary.count === 1 ? '' : 's'}</div>
        </div>

        {#if summary.by_platform.length}
          <div class="flex flex-wrap items-center justify-center gap-3">
            {#each summary.by_platform as p}
              <div class="flex items-center gap-2 rounded-full border border-ink/10 bg-canvas px-4 py-2">
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
        <div class="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each reviews as review}
            <article class="flex h-full flex-col gap-4 rounded-[8px] border border-ink/10 bg-surface p-5 shadow-[0_14px_44px_rgba(57,61,50,0.06)] transition hover:border-forest/25 hover:shadow-[0_20px_50px_rgba(57,61,50,0.10)]">
              <div class="flex items-start gap-3">
                {#if review.author_photo_url}
                  <img class="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-ink/10" src={review.author_photo_url} alt={review.author_name} loading="lazy" />
                {:else}
                  <div class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-forest/10 text-sm font-bold text-forest ring-1 ring-forest/15">{initialsOf(review)}</div>
                {/if}
                <div class="min-w-0 flex-1">
                  <p class="truncate font-bold text-ink">{review.author_name}</p>
                  {#if review.country}<p class="truncate text-xs text-ink/70">{review.country}</p>{/if}
                </div>
                <span class="shrink-0 rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-bold text-forest">{review.platform}</span>
              </div>

              <div class="flex items-center gap-0.5" aria-hidden="true">
                {#each Array(5) as _, i}
                  <Star size={15} class={i < review.rating ? 'text-goldfinch-gold' : 'text-ink/15'} fill={i < review.rating ? 'currentColor' : 'none'} />
                {/each}
                <span class="ml-1 text-xs font-semibold text-ink/65">{review.rating}/5</span>
              </div>

              <blockquote class="flex-1 text-sm leading-6 text-ink/70">"{review.message}"</blockquote>

              {#if review.tour_title || review.source_url}
                <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {#if review.tour_title}
                    <span class="min-w-0 truncate text-[11px] font-semibold text-ink/55">{review.tour_title}</span>
                  {:else}
                    <span></span>
                  {/if}
                  {#if review.source_url}
                    <a class="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-forest transition hover:text-heading" href={review.source_url} target="_blank" rel="noopener nofollow">
                      Read on {review.platform} <ExternalLink size={11} />
                    </a>
                  {/if}
                </div>
              {/if}
            </article>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}
