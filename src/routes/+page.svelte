<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Check, MessageCircle, Sparkles } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import HeroSection from '$lib/components/public/HeroSection.svelte';
  import PopularActivitiesSlider from '$lib/components/public/PopularActivitiesSlider.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TestimonialCard from '$lib/components/public/TestimonialCard.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { fadeUpOnScroll, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import { placeholderDestinations, placeholderFaqs, placeholderPosts, placeholderTestimonials, placeholderTours } from '$lib/data/placeholders';
  import type { BlogPost, Destination, FAQ, Testimonial, Tour } from '$lib/types';

  type HomeSection = {
    button_text?: string | null;
    button_url?: string | null;
    content?: string | null;
    extra_data?: Record<string, unknown> | null;
    image_url?: string | null;
    is_active?: boolean;
    section_key: string;
    subtitle?: string | null;
    title?: string | null;
  };

  let tours: Tour[] = placeholderTours;
  let destinations: Destination[] = placeholderDestinations;
  let posts: BlogPost[] = placeholderPosts;
  let testimonials: Testimonial[] = placeholderTestimonials;
  let faqs: FAQ[] = placeholderFaqs;
  let sections: Record<string, HomeSection> = {};

  // CMS lookup with a safe fallback so the existing design never breaks.
  const cms = (key: string, field: keyof HomeSection, fallback: string) => {
    const value = sections[key]?.[field];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };

  $: heroExtra = (sections.hero?.extra_data ?? {}) as Record<string, unknown>;

  onMount(async () => {
    try {
      const [tourResponse, destinationResponse, postResponse, testimonialResponse, faqResponse, homepageResponse] = await Promise.all([
        api.tours.list({ limit: 3 }),
        api.destinations.list({ limit: 3 }),
        api.blog.list({ limit: 3 }),
        api.testimonials.list({ limit: 3 }),
        api.faqs.list({ limit: 5 }),
        api.homepage.get()
      ]);

      tours = tourResponse.data.items.length ? tourResponse.data.items : placeholderTours;
      destinations = destinationResponse.data.items.length ? destinationResponse.data.items : placeholderDestinations;
      posts = postResponse.data.items.length ? postResponse.data.items : placeholderPosts;
      testimonials = testimonialResponse.data.items.length ? testimonialResponse.data.items : placeholderTestimonials;
      faqs = faqResponse.data.items.length ? faqResponse.data.items : placeholderFaqs;

      const sectionList = (homepageResponse.data ?? []) as unknown as HomeSection[];
      sections = Object.fromEntries(sectionList.map((section) => [section.section_key, section]));
    } catch {
      tours = placeholderTours;
      destinations = placeholderDestinations;
      posts = placeholderPosts;
      testimonials = placeholderTestimonials;
      faqs = placeholderFaqs;
      sections = {};
    }
  });
</script>

<HeroSection
  title={cms('hero', 'title', 'Plan East Africa With Confidence')}
  description={cms('hero', 'subtitle', 'Honest safari, Kilimanjaro, gorilla trekking and beach advice from local experts.')}
  imageUrl={cms('hero', 'image_url', '/images/surf-hero.jpg')}
  primaryCta={cms('hero', 'button_text', 'Plan My Trip')}
  secondaryCta={typeof heroExtra.secondary_cta_text === 'string' ? heroExtra.secondary_cta_text : 'Talk to a Travel Advisor'}
  secondaryCtaUrl={typeof heroExtra.secondary_cta_url === 'string' ? heroExtra.secondary_cta_url : '/contact'}
/>

<PopularActivitiesSlider />

<section class="container-shell py-14 md:py-20" use:sectionReveal>
  <div class="mx-auto max-w-2xl text-center" use:fadeUpOnScroll={{ y: 14 }}>
    <h2 class="text-3xl font-extrabold tracking-normal text-[#111111] md:text-[40px]">{cms('featured_tours', 'title', 'Discounts & Offers')}</h2>
    <p class="mt-3 text-[15px] font-medium leading-7 text-[#555555] md:text-lg">
      {cms('featured_tours', 'subtitle', 'A curated list of the most popular travel packages based on different destinations')}
    </p>
  </div>
  <div class="mt-8 grid gap-6 md:grid-cols-3" use:staggeredCardReveal>
    {#each tours as tour}
      <TourCard {tour} />
    {/each}
  </div>
</section>

<section class="bg-white py-14" use:sectionReveal>
  <div class="container-shell">
    <SectionHeader eyebrow="Places" title={cms('featured_destinations', 'title', 'Destinations')} description={cms('featured_destinations', 'subtitle', 'Destination content can be managed from the CMS.')} />
    <div class="mt-8 grid gap-6 md:grid-cols-3" use:staggeredCardReveal>
      {#each destinations as destination}
        <DestinationCard {destination} />
      {/each}
    </div>
  </div>
</section>

<section class="container-shell py-14" use:sectionReveal>
  <SectionHeader eyebrow="Stories" title={cms('blog_preview', 'title', 'Latest Blog Posts')} description={cms('blog_preview', 'subtitle', 'Blog posts are pulled from the backend when available.')} />
  <div class="mt-8 grid gap-6 md:grid-cols-3" use:staggeredCardReveal>
    {#each posts as post}
      <BlogCard {post} />
    {/each}
  </div>
</section>

<section class="bg-white py-14" use:sectionReveal>
  <div class="container-shell grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
    <SectionHeader eyebrow="Guest Notes" title={cms('testimonials', 'title', 'Testimonials and FAQs')} description={cms('testimonials', 'subtitle', 'Starter modules for trust content and common questions.')} />
    <div class="grid gap-6">
      {#each testimonials as testimonial}
        <TestimonialCard {testimonial} />
      {/each}
      <FAQAccordion {faqs} />
    </div>
  </div>
</section>

{#if sections.final_cta?.is_active !== false && (sections.final_cta?.title || sections.final_cta?.button_text)}
  <section class="container-shell py-14 md:py-20" use:sectionReveal>
    <div
      class="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-deep-green via-forest to-deep-green px-6 py-14 text-white shadow-[0_30px_80px_rgba(15,47,36,0.28)] sm:px-10 md:px-16 md:py-[72px]"
      use:fadeUpOnScroll={{ y: 18 }}
    >
      <!-- decorative depth -->
      <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/25 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-savanna/15 blur-3xl"></div>
      <div class="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/10"></div>
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.06]"
        style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.6px); background-size: 26px 26px;"
      ></div>

      <div class="relative mx-auto max-w-3xl text-center">
        <span class="inline-flex items-center gap-2 rounded-full border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">
          <Sparkles size={14} strokeWidth={2.4} />
          Start Your Journey
        </span>

        <h2 class="mt-5 text-3xl font-extrabold leading-[1.1] tracking-normal md:text-[44px]">
          {cms('final_cta', 'title', 'Ready to Plan Your East Africa Adventure?')}
        </h2>

        <p class="mx-auto mt-4 max-w-xl text-[15px] font-medium leading-7 text-white/75 md:text-lg">
          {cms('final_cta', 'subtitle', 'Talk to a local expert and travel with confidence — no payment needed to start planning.')}
        </p>

        <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            class="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-goldfinch-gold px-7 text-sm font-bold text-deep-green shadow-lg shadow-goldfinch-gold/20 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green sm:w-auto md:h-[52px] md:text-base"
            href={cms('final_cta', 'button_url', '/plan-my-trip')}
          >
            {cms('final_cta', 'button_text', 'Plan My Trip')}
            <ArrowRight size={18} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto md:h-[52px] md:text-base"
            href="/contact"
          >
            <MessageCircle size={17} strokeWidth={2.4} />
            Talk to a Travel Advisor
          </a>
        </div>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-white/70">
          {#each ['Local experts', 'No payment to plan', 'Honest, tailored advice'] as point}
            <span class="inline-flex items-center gap-2">
              <span class="grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold/20 text-goldfinch-gold">
                <Check size={12} strokeWidth={3} />
              </span>
              {point}
            </span>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}
