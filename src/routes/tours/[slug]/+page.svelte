<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import Button from '$lib/components/public/Button.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { placeholderTours } from '$lib/data/placeholders';
  import type { BlogPost, Tour } from '$lib/types';

  let tour: Tour | null = null;
  let loading = true;
  let error = '';

  // Relevant content for onward navigation (loaded best-effort after the tour).
  let relatedTours: Tour[] = [];
  let recentPosts: BlogPost[] = [];

  const loadRelated = async (current: Tour) => {
    const destId = (current as unknown as { destination_id?: string | null }).destination_id ?? null;

    const [tourRes, postRes] = await Promise.allSettled([
      api.tours.list(destId ? { destination_id: destId, limit: 7 } : { limit: 7 }),
      api.blog.list({ limit: 3 })
    ]);

    if (tourRes.status === 'fulfilled') {
      let items = (tourRes.value.data.items ?? []).filter(
        (item) => item.id !== current.id && item.slug !== current.slug
      );
      // If this destination only has the current tour, fall back to any tours.
      if (!items.length && destId) {
        const fallback = await api.tours.list({ limit: 7 }).catch(() => null);
        items = (fallback?.data.items ?? []).filter(
          (item) => item.id !== current.id && item.slug !== current.slug
        );
      }
      relatedTours = items.slice(0, 3);
    }
    if (postRes.status === 'fulfilled') {
      recentPosts = postRes.value.data.items ?? [];
    }
  };

  const load = async (slug: string) => {
    loading = true;
    error = '';
    relatedTours = [];
    recentPosts = [];
    try {
      const response = await api.tours.get(slug);
      tour = response.data;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tour.';
      tour = placeholderTours.find((item) => item.slug === slug) ?? placeholderTours[0];
    } finally {
      loading = false;
    }

    if (tour) void loadRelated(tour);
  };

  // The component is reused across /tours/[slug] navigations, so a one-shot
  // onMount would leave the page stale. Re-load whenever the slug changes.
  $: slug = $page.params.slug ?? '';
  $: if (browser && slug) void load(slug);
</script>

<section class="container-shell py-14">
  {#if loading}
    <LoadingState message="Loading tour..." />
  {:else if !tour}
    <ErrorState message={error || 'Tour not found.'} />
  {:else}
    <nav class="mb-6 flex items-center gap-2 text-sm">
      <a class="font-medium text-ink/55 transition hover:text-forest" href="/tours">Tours</a>
      <span class="text-ink/30">/</span>
      <span class="font-medium text-ink/80">{tour.title}</span>
    </nav>

    <div class="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div class="aspect-[16/10] overflow-hidden rounded-lg bg-skywash">
          {#if tour.main_image_url}
            <img class="h-full w-full object-cover" src={tour.main_image_url} alt={tour.title} />
          {/if}
        </div>
        <p class="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-clay">{tour.duration_days ?? 1} days</p>
        <h1 class="mt-3 text-4xl font-bold tracking-normal text-ink">{tour.title}</h1>
        <p class="mt-4 text-base leading-7 text-ink/70">{tour.full_description ?? tour.short_description}</p>
        <div class="mt-8">
          <Button href={`/booking/${tour.slug}`}>Request Booking</Button>
        </div>
      </div>
      <div>
        <BookingForm {tour} />
      </div>
    </div>
  {/if}
</section>

{#if tour && !loading}
  <!-- More tours -->
  {#if relatedTours.length}
    <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="You might also like"
            title="More tours"
            description="Other trusted trips travellers book with us."
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-deep-green"
            href="/tours"
          >
            Browse all tours <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each relatedTours as item (item.id)}
            <TourCard tour={item} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Recent stories -->
  {#if recentPosts.length}
    <section class="py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Stories &amp; guides"
            title="From the journal"
            description="Travel inspiration, tips and stories from the field."
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-deep-green"
            href="/blog"
          >
            Read the blog <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each recentPosts as post (post.id)}
            <BlogCard {post} />
          {/each}
        </div>
      </div>
    </section>
  {/if}
{/if}
