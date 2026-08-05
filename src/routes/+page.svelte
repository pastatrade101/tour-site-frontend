<script lang="ts">
  import { ArrowRight, Check, MessageCircle } from '@lucide/svelte';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import type { GalleryCardItem } from '$lib/components/public/GalleryCard.svelte';
  import GalleryViewer from '$lib/components/public/GalleryViewer.svelte';
  import { SAMPLE_GALLERY } from '$lib/data/sampleGallery';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import { faqLd } from '$lib/seo';
  import HeroSection from '$lib/components/public/HeroSection.svelte';
  import IntroBand from '$lib/components/public/IntroBand.svelte';
  import TopDestinations from '$lib/components/public/TopDestinations.svelte';
  import WhyGoldfinch from '$lib/components/public/WhyGoldfinch.svelte';
  import SeasonsBand from '$lib/components/public/SeasonsBand.svelte';
  import ImpactBand from '$lib/components/public/ImpactBand.svelte';
  import MigrationCalendar from '$lib/components/public/MigrationCalendar.svelte';
  import ReviewsWidget from '$lib/components/public/ReviewsWidget.svelte';
  import LeadCaptureForm from '$lib/components/public/LeadCaptureForm.svelte';
  import PartnerStrip from '$lib/components/public/PartnerStrip.svelte';
  import PlanningProcess from '$lib/components/public/PlanningProcess.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TestimonialCard from '$lib/components/public/TestimonialCard.svelte';
  import PriceRangeBlock from '$lib/components/public/PriceRangeBlock.svelte';
  import TourPackages from '$lib/components/public/TourPackages.svelte';
  import { fadeUpOnScroll, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import { imgUrl } from '$lib/img';
  import type { BlogPost, Destination, FAQ, MigrationEntry, Review, ReviewSummary, Testimonial, Tour } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

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

  // Real CMS content only — no fabricated placeholder fallbacks. Above-the-fold
  // (tours, destinations, hero config) is SSR-loaded in +page.ts; below-the-fold
  // lists are also SSR-loaded independently. Any empty list hides its section.
  let tours: Tour[] = data.tours ?? [];
  let destinations: Destination[] = data.destinations ?? [];
  let posts: BlogPost[] = data.posts ?? [];
  let testimonials: Testimonial[] = data.testimonials ?? [];
  let faqs: FAQ[] = data.faqs ?? [];
  let reviewSummary: ReviewSummary | null = data.reviewSummary ?? null;
  let reviews: Review[] = data.reviews ?? [];
  let migrationEntries: MigrationEntry[] = data.migrationEntries ?? [];
  let galleryItems: GalleryCardItem[] = (data.galleryItems ?? []) as GalleryCardItem[];
  let sections: Record<string, HomeSection> = Object.fromEntries(
    (data.homeSections as unknown as HomeSection[]).map((s) => [s.section_key, s])
  );

  // CMS lookup with a safe fallback so the existing design never breaks.
  const cms = (key: string, field: keyof HomeSection, fallback: string) => {
    const value = sections[key]?.[field];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };

  // Same, for a string field inside a section's extra_data (e.g. eyebrows).
  const cmsExtra = (key: string, field: string, fallback: string) => {
    const value = (sections[key]?.extra_data as Record<string, unknown> | undefined)?.[field];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };
  const isSectionActive = (key: string) => sections[key]?.is_active !== false;

  $: heroExtra = (sections.hero?.extra_data ?? {}) as Record<string, unknown>;
  $: heroImageResolved = cms('hero', 'image_url', '/images/surf-hero.jpg');
  $: heroSlides = destinations
    .map((d) => d.banner_image_url || d.main_image_url || d.image_url || '')
    .filter(Boolean)
    .slice(0, 5);

  const hexToRgba = (hex: string, alpha: number) => {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!match) return `rgba(57,61,50,${alpha})`;
    const n = parseInt(match[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  };

  // Final CTA background (image/video + overlay), all editable from Admin → Homepage.
  $: ctaExtra = (sections.final_cta?.extra_data ?? {}) as Record<string, unknown>;
  $: ctaImage = typeof sections.final_cta?.image_url === 'string' ? sections.final_cta.image_url : '';
  $: ctaVideo = typeof ctaExtra.background_video === 'string' ? ctaExtra.background_video : '';
  $: ctaPosition = typeof ctaExtra.media_position === 'string' ? ctaExtra.media_position : 'center';
  $: ctaImageResolved = ctaImage || heroImageResolved;
  $: ctaOverlayColor = typeof ctaExtra.overlay_color === 'string' ? ctaExtra.overlay_color : '#393D32';
  $: ctaOverlayOpacity = typeof ctaExtra.overlay_opacity === 'number' ? ctaExtra.overlay_opacity : 0.7;
  $: ctaOverlayStyle =
    ctaExtra.overlay_gradient !== false
      ? `background:linear-gradient(135deg, ${hexToRgba(ctaOverlayColor, ctaOverlayOpacity)}, ${hexToRgba(ctaOverlayColor, ctaOverlayOpacity * 0.55)})`
      : `background:${hexToRgba(ctaOverlayColor, ctaOverlayOpacity)}`;

  // Partner / company logo strip (managed in Admin → Homepage → "partners").
  $: partnersExtra = (sections.partners?.extra_data ?? {}) as Record<string, unknown>;
  $: partnerLogos = (Array.isArray(partnersExtra.logos) ? partnersExtra.logos : []) as Array<{
    image_url: string;
    name?: string;
    url?: string;
  }>;
  $: partnersActive = sections.partners?.is_active !== false;

  // Typical-cost rows, CMS-overridable (cost_ranges → extra_data.ranges).
  $: costRanges = (() => {
    const r = (sections.cost_ranges?.extra_data as Record<string, unknown> | undefined)?.ranges;
    return Array.isArray(r) ? (r as Array<{ label: string; from: string; note?: string }>) : [];
  })();

  // ── New reference sections — all editable in Admin → Homepage. Each reads its
  // section (title/subtitle/image/button) + `extra_data` (eyebrow + arrays like
  // stats/features/seasons/points). Empty values are dropped so the component's
  // built-in defaults show, keeping every section editable but never blank.
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const clean = (o: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(o).filter((e) => {
        const v = e[1];
        return v != null && !(typeof v === 'string' && !v.trim()) && !(Array.isArray(v) && !v.length);
      })
    );
  $: introExtra = (sections.intro?.extra_data ?? {}) as Record<string, unknown>;
  $: whyExtra = (sections.why_us?.extra_data ?? {}) as Record<string, unknown>;
  $: seasonsExtra = (sections.seasons?.extra_data ?? {}) as Record<string, unknown>;
  $: impactExtra = (sections.impact?.extra_data ?? {}) as Record<string, unknown>;
  $: featuredToursExtra = (sections.featured_tours?.extra_data ?? {}) as Record<string, unknown>;
  $: faqExtra = (sections.faq?.extra_data ?? {}) as Record<string, unknown>;
  $: introProps = clean({
    eyebrow: introExtra.eyebrow,
    title: sections.intro?.title,
    body: sections.intro?.subtitle,
    stats: arr(introExtra.stats),
    cert: arr(introExtra.cert_items).length
      ? { title: (introExtra.cert_title as string) || 'Conservation & community', items: arr(introExtra.cert_items) }
      : undefined
  });
  $: whyProps = clean({ eyebrow: whyExtra.eyebrow, title: sections.why_us?.title, subtitle: sections.why_us?.subtitle, features: arr(whyExtra.features) });
  $: seasonsProps = clean({ eyebrow: seasonsExtra.eyebrow, title: sections.seasons?.title, subtitle: sections.seasons?.subtitle, seasons: arr(seasonsExtra.seasons) });
  $: impactProps = clean({
    eyebrow: impactExtra.eyebrow,
    title: sections.impact?.title,
    body: sections.impact?.subtitle,
    points: arr(impactExtra.points),
    imageUrl: sections.impact?.image_url,
    badge: impactExtra.badge,
    badgeLabel: impactExtra.badge_label,
    primaryCta: sections.impact?.button_text,
    primaryCtaUrl: sections.impact?.button_url
  });
  $: tourProps = clean({
    eyebrow: featuredToursExtra.eyebrow,
    title: sections.featured_tours?.title,
    subtitle: sections.featured_tours?.subtitle,
    buttonText: sections.featured_tours?.button_text,
    buttonUrl: sections.featured_tours?.button_url
  });

  // "Plan your dream" band bullets + Final-CTA trust chips — CMS-overridable via
  // extra_data.points / extra_data.trust_points, falling back to the current text.
  $: planDreamExtra = (sections.plan_dream?.extra_data ?? {}) as Record<string, unknown>;
  $: planDreamPoints = arr<string>(planDreamExtra.points).length
    ? arr<string>(planDreamExtra.points)
    : ['Fully tailored to your dates & budget', 'A reply within one business day', 'Honest advice, never a hard sell'];
  $: ctaTrustPoints = arr<string>(ctaExtra.trust_points).length
    ? arr<string>(ctaExtra.trust_points)
    : ['Local experts', 'No payment to plan', 'Honest, tailored advice'];
  $: destinationCtaText = cms('featured_destinations', 'button_text', 'All destinations');
  $: destinationCtaUrl = cms('featured_destinations', 'button_url', '/destinations');
  $: processCtaText = cms('how_it_works', 'button_text', 'Start planning');
  $: processCtaUrl = cms('how_it_works', 'button_url', '/plan-my-trip');
  $: blogCtaText = cms('blog_preview', 'button_text', 'View all');
  $: blogCtaUrl = cms('blog_preview', 'button_url', '/blog');
  $: galleryCtaText = cms('gallery_preview', 'button_text', 'View gallery');
  $: galleryCtaUrl = cms('gallery_preview', 'button_url', '/gallery');
  // Real published gallery images, or a sample set so the section never sits empty.
  $: galleryDisplay = galleryItems.length ? (galleryItems as Record<string, unknown>[]) : SAMPLE_GALLERY;
  $: ctaSecondaryText = cmsExtra('final_cta', 'secondary_cta_text', 'Talk to a Travel Advisor');
  $: ctaSecondaryUrl = cmsExtra('final_cta', 'secondary_cta_url', '/contact');
  $: homepageFaqRows = arr<Record<string, unknown>>(faqExtra.faqs)
    .map((faq, index) => ({
      id: typeof faq.id === 'string' && faq.id.trim() ? faq.id : `homepage-faq-${index}`,
      question: typeof faq.question === 'string' ? faq.question.trim() : '',
      answer: typeof faq.answer === 'string' ? faq.answer.trim() : ''
    }))
    .filter((faq) => faq.question && faq.answer);
  $: homepageFaqs = homepageFaqRows.length ? homepageFaqRows : faqs;
</script>

<svelte:head>
  <link rel="preload" as="image" href={imgUrl(heroImageResolved, 1800, 72)} fetchpriority="high" />
</svelte:head>

{#if isSectionActive('hero')}
  <HeroSection
    overlay={heroExtra.overlay_opacity === undefined || heroExtra.overlay_opacity === null || heroExtra.overlay_opacity === '' ? 44 : (Number(heroExtra.overlay_opacity) || 0) * 100}
    eyebrow={typeof heroExtra.eyebrow === 'string' ? heroExtra.eyebrow : 'Tanzania & East Africa specialists'}
    title={cms('hero', 'title', 'Tailor-Made East Africa Safaris')}
    highlight={typeof heroExtra.title_highlight === 'string' ? heroExtra.title_highlight : 'Planned by Local Experts'}
    description={cms('hero', 'subtitle', 'Great Migration river crossings, honest safari, Kilimanjaro and Zanzibar advice — planned around you by Tanzanian local experts.')}
    imageUrl={heroImageResolved}
    imageUrls={heroSlides}
    primaryCta={cms('hero', 'button_text', 'Plan My Trip')}
    primaryCtaUrl={cms('hero', 'button_url', '/plan-my-trip')}
    secondaryCta={typeof heroExtra.secondary_cta_text === 'string' ? heroExtra.secondary_cta_text : 'Talk to a Travel Advisor'}
    secondaryCtaUrl={typeof heroExtra.secondary_cta_url === 'string' ? heroExtra.secondary_cta_url : '/contact'}
  />
{/if}

<!-- 2 · Intro + stats -->
{#if isSectionActive('intro')}
  <IntroBand {...introProps} />
{/if}

<!-- 2b · Top destinations mosaic — real destinations, hidden when empty -->
{#if isSectionActive('top_destinations') && destinations.length}
  <TopDestinations
    {destinations}
    eyebrow={cmsExtra('top_destinations', 'eyebrow', 'Where travellers go')}
    title={cms('top_destinations', 'title', 'Top Destinations')}
    subtitle={cms('top_destinations', 'subtitle', 'The parks, peaks and coastlines our guests ask for most — each one a trip we can shape around you.')}
  />
{/if}

<!-- 3 · Destinations — hidden when there are no destinations -->
{#if isSectionActive('featured_destinations') && destinations.length}
<section class="relative overflow-hidden bg-surface py-14 md:py-20" use:sectionReveal>
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-goldfinch-gold/35 to-transparent" aria-hidden="true"></div>
  <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-canvas/70 to-transparent" aria-hidden="true"></div>
  <div class="container-shell">
    <div class="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="max-w-2xl">
        <p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">{cmsExtra('featured_destinations', 'eyebrow', 'Keep exploring')}</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-heading md:text-[38px]">
          {cms('featured_destinations', 'title', 'More destinations')}
        </h2>
        <p class="mt-4 text-[15px] leading-8 text-ink/70 md:text-lg">
          {cms('featured_destinations', 'subtitle', 'Handpicked places across Tanzania, from the Serengeti to the coast.')}
        </p>
      </div>
      <a class="hidden shrink-0 items-center gap-2 rounded-[8px] border border-goldfinch-gold/40 bg-surface px-5 py-2.5 text-sm font-bold text-clay shadow-sm transition hover:bg-goldfinch-gold hover:text-heading sm:inline-flex" href={destinationCtaUrl}>
        {destinationCtaText} <ArrowRight size={15} strokeWidth={2.4} />
      </a>
    </div>
    <div class="relative mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3" use:staggeredCardReveal>
      {#each destinations.slice(0, 6) as destination}
        <DestinationCard {destination} />
      {/each}
    </div>
    <div class="mt-10 flex justify-center sm:hidden">
      <a class="inline-flex h-12 items-center gap-2 rounded-[8px] bg-deep-green px-7 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-sm transition hover:bg-forest" href={destinationCtaUrl}>
        {destinationCtaText} <ArrowRight size={16} />
      </a>
    </div>
  </div>
</section>
{/if}

<!-- 4 · Your Safari, Your Way -->
{#if isSectionActive('why_us')}
  <WhyGoldfinch {...whyProps} />
{/if}

<!-- 5 · Top Tour Packages — hidden when there are no tours -->
{#if isSectionActive('featured_tours') && tours.length}
  <TourPackages {tours} {...tourProps} />
{/if}

<!-- 6 · Typical cost — hidden when there are no CMS price ranges -->
{#if sections.cost_ranges?.is_active !== false && costRanges.length}
<section class="relative overflow-hidden bg-sand/40 py-14 md:py-20" use:sectionReveal>
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-goldfinch-gold/25 to-transparent" aria-hidden="true"></div>
  <div class="container-shell">
    <PriceRangeBlock
      title={cms('cost_ranges', 'title', 'What trips typically cost')}
      subtitle={cms('cost_ranges', 'subtitle', 'A confident brand is upfront about price — here are honest starting points by trip type.')}
      ranges={costRanges}
    />
  </div>
</section>
{/if}

<!-- 7 · Best times to visit -->
{#if isSectionActive('seasons')}
  <SeasonsBand {...seasonsProps} />
{/if}

<!-- 7b · Serengeti Great Migration calendar (self-hiding until published entries exist) -->
<MigrationCalendar
  active={sections.migration_section?.is_active !== false}
  entries={migrationEntries}
  eyebrow={cmsExtra('migration_section', 'eyebrow', 'Great Migration')}
  title={cms('migration_section', 'title', 'Follow the herds, month by month')}
  subtitle={cms('migration_section', 'subtitle', 'Where the wildebeest and zebra roam across the Serengeti through the year — so you can plan your safari around the action.')}
/>

<!-- 8 · Plan your dream (dark form band) -->
{#if isSectionActive('plan_dream')}
<section class="relative overflow-hidden bg-deep-green py-14 text-white md:py-20" use:sectionReveal>
  <div class="pointer-events-none absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.6px); background-size: 28px 28px;" aria-hidden="true"></div>
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-goldfinch-gold/35 to-transparent" aria-hidden="true"></div>
  <div class="container-shell relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
    <div class="max-w-xl">
      <p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">{cmsExtra('plan_dream', 'eyebrow', 'Plan your dream trip')}</p>
      <h2 class="mt-3 text-3xl font-semibold leading-tight text-white md:text-[38px]">{cms('plan_dream', 'title', 'Plan Your Dream Tanzania Safari')}</h2>
      <p class="mt-4 leading-8 text-white/80">{cms('plan_dream', 'subtitle', 'Tell us a few details and a local specialist will craft a confident, tailor-made plan — with no pressure and no payment to start.')}</p>
      <div class="mt-7 grid gap-3">
        {#each planDreamPoints as point}
          <div class="flex items-center gap-3 text-white/85">
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-goldfinch-gold/25 text-goldfinch-gold"><Check size={13} strokeWidth={3} /></span>
            {point}
          </div>
        {/each}
      </div>
    </div>
    <LeadCaptureForm title={cmsExtra('plan_dream', 'form_title', 'Safari details')} compact />
  </div>
</section>
{/if}

<!-- 9 · Our Process -->
{#if isSectionActive('how_it_works')}
<section class="relative overflow-hidden bg-canvas py-14 md:py-20" use:sectionReveal>
  <div class="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-surface/70 to-transparent" aria-hidden="true"></div>
  <div class="container-shell">
    <PlanningProcess
      title={cms('how_it_works', 'title', 'Our Process')}
      subtitle={cms('how_it_works', 'subtitle', 'A calm, transparent process — no pressure, and no payment to start.')}
    />
    <div class="mt-12 flex justify-center">
      <a class="inline-flex h-12 items-center gap-2 rounded-[8px] bg-goldfinch-gold px-7 font-bold text-heading shadow-sm transition hover:brightness-105" href={processCtaUrl}>{processCtaText} <ArrowRight size={18} /></a>
    </div>
  </div>
</section>
{/if}

<!-- 9b · Platform reviews trust widget + AggregateRating JSON-LD (self-hiding until approved reviews exist) -->
{#if isSectionActive('reviews_section')}
  <ReviewsWidget
    summary={reviewSummary}
    reviews={reviews}
    eyebrow={cmsExtra('reviews_section', 'eyebrow', 'Loved by travellers')}
    title={cms('reviews_section', 'title', 'Real reviews from real safaris')}
    subtitle={cms('reviews_section', 'subtitle', 'Verified ratings from travellers across TripAdvisor, SafariBookings and Google.')}
  />
{/if}

<!-- 10 · Reviews — hidden when there are no testimonials -->
{#if isSectionActive('testimonials') && testimonials.length}
<section class="relative overflow-hidden bg-surface py-14 md:py-20" use:sectionReveal>
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-goldfinch-gold/25 to-transparent" aria-hidden="true"></div>
  <div class="container-shell">
    <div class="mx-auto max-w-2xl text-center" use:fadeUpOnScroll={{ y: 14 }}>
      <p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">{cmsExtra('testimonials', 'eyebrow', 'Loved by travellers')}</p>
      <h2 class="mt-3 text-3xl font-semibold tracking-normal text-heading md:text-[38px]">
        {cms('testimonials', 'title', '200+ Verified Reviews')}
      </h2>
      <p class="mx-auto mt-4 max-w-xl text-[15px] leading-8 text-ink/70 md:text-lg">
        {cms('testimonials', 'subtitle', 'Real stories from travellers who planned their trip with confidence.')}
      </p>
    </div>
    <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
      {#each testimonials as testimonial}
        <TestimonialCard {testimonial} />
      {/each}
    </div>
  </div>
</section>
{/if}

{#if partnersActive}
  <PartnerStrip logos={partnerLogos} title={cms('partners', 'title', 'Trusted by leading travel partners')} />
{/if}

<!-- 10b · Gallery preview -->
{#if isSectionActive('gallery_preview') && galleryDisplay.length}
<section class="relative overflow-hidden bg-deep-green py-14 text-white md:py-20" use:sectionReveal>
  <div class="pointer-events-none absolute inset-0 opacity-[0.07]" style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.5px); background-size: 30px 30px;" aria-hidden="true"></div>
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-goldfinch-gold/45 to-transparent" aria-hidden="true"></div>
  <div class="container-shell relative">
    <div class="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
      <div class="max-w-xl" use:fadeUpOnScroll={{ y: 14 }}>
        <p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">{cmsExtra('gallery_preview', 'eyebrow', 'Field notes in frames')}</p>
        <h2 class="mt-3 text-3xl font-semibold leading-tight text-white md:text-[42px]">
          {cms('gallery_preview', 'title', 'See the journeys before you choose')}
        </h2>
        <p class="mt-4 text-[15px] leading-8 text-white/75 md:text-lg">
          {cms('gallery_preview', 'subtitle', 'Real published gallery moments from safaris, climbs, coast stays and the places our team knows well.')}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3 lg:justify-end" use:fadeUpOnScroll={{ y: 14, delay: 0.08 }}>
        <span class="inline-flex items-center gap-2 rounded-[8px] bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur"><span class="h-1.5 w-1.5 rounded-full bg-goldfinch-gold"></span>{galleryDisplay.length} featured image{galleryDisplay.length === 1 ? '' : 's'}</span>
        <a class="inline-flex h-11 items-center gap-2 rounded-[8px] bg-goldfinch-gold px-5 text-sm font-extrabold text-heading shadow-sm transition hover:brightness-105" href={galleryCtaUrl}>
          {galleryCtaText} <ArrowRight size={16} strokeWidth={2.6} />
        </a>
      </div>
    </div>

    <div class="mt-9">
      <GalleryViewer images={galleryDisplay.slice(0, 8)} dark mosaic />
    </div>
  </div>
</section>
{/if}

<!-- 11 · Blog — hidden when there are no posts -->
{#if isSectionActive('blog_preview') && posts.length}
<section class="relative overflow-hidden bg-canvas py-14 md:py-20" use:sectionReveal>
  <div class="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-surface/70 to-transparent" aria-hidden="true"></div>
  <div class="container-shell">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <SectionHeader eyebrow={cmsExtra('blog_preview', 'eyebrow', 'Stories')} title={cms('blog_preview', 'title', 'Latest Stories & Guides')} description={cms('blog_preview', 'subtitle', 'Tips, guides and inspiration from our East Africa specialists.')} />
      <a class="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-ink/10 bg-surface px-4 text-sm font-semibold text-forest shadow-sm transition hover:border-forest/25 hover:text-heading" href={blogCtaUrl}>{blogCtaText} <ArrowRight size={16} /></a>
    </div>
    <div class="mt-8 grid gap-5 md:grid-cols-3" use:staggeredCardReveal>
      {#each posts as post}
        <BlogCard {post} />
      {/each}
    </div>
  </div>
</section>
{/if}

<!-- 12 · Impact -->
{#if isSectionActive('impact')}
  <ImpactBand {...impactProps} />
{/if}

<!-- 13 · FAQ -->
{#if isSectionActive('faq') && homepageFaqs.length}
  <JsonLd data={faqLd(homepageFaqs.map((f) => ({ q: f.question, a: f.answer })))} />
<section class="relative overflow-hidden bg-surface py-14 md:py-20" use:sectionReveal>
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-forest/20 to-transparent" aria-hidden="true"></div>
  <div class="container-shell grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
    <div>
      <SectionHeader eyebrow={cmsExtra('faq', 'eyebrow', 'Good to know')} title={cms('faq', 'title', 'Tanzania Safari FAQs')} description={cms('faq', 'subtitle', 'Honest answers to the questions travellers ask most.')} />
      <a class="mt-6 inline-flex h-12 items-center gap-2 rounded-[8px] bg-[#25D366] px-6 font-bold text-white shadow-sm transition hover:brightness-105" href={cms('faq', 'button_url', '/contact')}><MessageCircle size={18} /> {cms('faq', 'button_text', 'Ask us on WhatsApp')}</a>
    </div>
    <FAQAccordion faqs={homepageFaqs} />
  </div>
</section>
{/if}

{#if isSectionActive('final_cta') && (sections.final_cta?.title || sections.final_cta?.button_text)}
  <section class="relative w-full overflow-hidden text-white" use:sectionReveal>
    <!-- background media layer (admin-configurable: video > image > brand gradient) -->
    {#if ctaVideo}
      <!-- svelte-ignore a11y-media-has-caption -->
      <video class="absolute inset-0 h-full w-full object-cover" style={`object-position:${ctaPosition}`} src={ctaVideo} poster={imgUrl(ctaImageResolved, 1800)} autoplay muted loop playsinline></video>
    {:else}
      <img class="absolute inset-0 h-full w-full object-cover" style={`object-position:${ctaPosition}`} src={imgUrl(ctaImageResolved, 1800)} alt="" loading="lazy" decoding="async" />
    {/if}

    <!-- green overlay so the photo shows through but the text stays crisp -->
    <div class="absolute inset-0" style={ctaOverlayStyle}></div>

    <div
      class="pointer-events-none absolute inset-0 opacity-[0.06]"
      style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.6px); background-size: 26px 26px;"
    ></div>

    <div class="container-shell relative py-14 text-center md:py-20" use:fadeUpOnScroll={{ y: 18 }}>
      <div class="mx-auto max-w-3xl">
        <p class="font-serif text-xl italic text-savanna">{cmsExtra('final_cta', 'eyebrow', 'Start Your Journey')}</p>

        <h2 class="mt-5 text-3xl font-extrabold leading-[1.1] tracking-normal md:text-[44px]">
          {cms('final_cta', 'title', 'Ready to Plan Your East Africa Adventure?')}
        </h2>

        <p class="mx-auto mt-4 max-w-xl text-[15px] font-medium leading-7 text-white/75 md:text-lg">
          {cms('final_cta', 'subtitle', 'Talk to a local expert and travel with confidence — no payment needed to start planning.')}
        </p>

        <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            class="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-7 text-sm font-bold text-heading shadow-lg shadow-goldfinch-gold/20 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green sm:w-auto md:h-[52px] md:text-base"
            href={cms('final_cta', 'button_url', '/plan-my-trip')}
          >
            {cms('final_cta', 'button_text', 'Plan My Trip')}
            <ArrowRight size={18} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-white/25 bg-surface/5 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto md:h-[52px] md:text-base"
            href={ctaSecondaryUrl}
          >
            <MessageCircle size={17} strokeWidth={2.4} />
            {ctaSecondaryText}
          </a>
        </div>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-white/70">
          {#each ctaTrustPoints as point}
            <span class="inline-flex items-center gap-2">
              <span class="grid h-5 w-5 place-items-center rounded-[5px] bg-goldfinch-gold/20 text-goldfinch-gold">
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
