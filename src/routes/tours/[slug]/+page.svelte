<script lang="ts">
  import { ArrowRight, Check, MessageCircle, Sparkles } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import { publicSettings, settingText } from '$lib/settings';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import EmailItineraryCapture from '$lib/components/public/EmailItineraryCapture.svelte';
  import ShortlistButton from '$lib/components/public/ShortlistButton.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { placeholderTours } from '$lib/data/placeholders';
  import type { BlogPost, Tour } from '$lib/types';

  let tour: Tour | null = null;
  let loading = true;
  let error = '';

  // Shortlist item for the save button.
  $: shortlistItem = tour
    ? {
        slug: tour.slug,
        title: tour.title,
        image_url: tour.main_image_url,
        duration_days: tour.duration_days,
        price_from: tour.price_from,
        currency: tour.currency,
        destination: (tour as unknown as { destinations?: { name?: string } }).destinations?.name
      }
    : null;

  // WhatsApp deep-link pre-filled with the trip name (spec §7).
  $: waDigits = (settingText($publicSettings, 'whatsapp_number') || '+255 700 000 000').replace(/\D/g, '');
  $: waHref = tour
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi Goldfinch, I'm interested in the ${tour.title}. Can you help me plan it?`)}`
    : '#';

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
        <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1">
          <p class="text-sm font-semibold uppercase tracking-[0.16em] text-clay">{tour.duration_days ?? 1} days</p>
          {#if tour.price_from}
            <p class="text-sm text-ink/55">
              from
              <span class="text-lg font-extrabold text-deep-green">{tour.currency ?? 'USD'} {tour.price_from.toLocaleString()}</span>
              <span class="text-ink/45">/ person</span>
            </p>
          {/if}
        </div>
        <h1 class="mt-2 text-4xl font-bold tracking-normal text-ink">{tour.title}</h1>
        <p class="mt-4 text-base leading-7 text-ink/70">{tour.full_description ?? tour.short_description}</p>

        <!-- primary action + WhatsApp (spec §4.4 A) -->
        <div class="mt-7 grid gap-3 sm:max-w-md">
          <a
            class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-deep-green shadow-sm transition hover:brightness-105"
            href={`/plan-my-trip?tour=${tour.slug}`}
          >
            <Sparkles size={18} strokeWidth={2.4} /> Plan This Trip
          </a>
          <a
            class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 font-semibold text-white shadow-sm transition hover:brightness-105"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} strokeWidth={2.2} /> Chat on WhatsApp
          </a>
          {#if shortlistItem}
            <ShortlistButton item={shortlistItem} variant="full" />
          {/if}
        </div>

        <!-- "a starting point, tailored to you" (spec §4.4 C) -->
        <div class="mt-6 flex items-start gap-3 rounded-2xl border border-goldfinch-gold/30 bg-savanna/20 p-4">
          <Sparkles size={20} class="mt-0.5 shrink-0 text-goldfinch-gold" />
          <p class="text-sm leading-6 text-ink/75">
            <span class="font-semibold text-ink">A starting point, tailored to you.</span>
            This itinerary is a sample — a Goldfinch specialist will adapt it to your dates, pace and interests.
          </p>
        </div>

        <!-- trust strip (spec §4.4 B) -->
        <div class="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {#each ['Local experts', 'Customizable itinerary', 'No-pressure planning', 'Secure enquiry'] as point}
            <span class="inline-flex items-center gap-1.5 text-sm font-medium text-ink/65">
              <span class="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Check size={11} strokeWidth={3} /></span>
              {point}
            </span>
          {/each}
        </div>

        <!-- low-commitment capture (spec §7) -->
        <div class="mt-6 sm:max-w-md">
          <EmailItineraryCapture tourTitle={tour.title} />
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
