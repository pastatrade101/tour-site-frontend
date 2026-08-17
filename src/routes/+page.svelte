<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Check, MessageCircle } from '@lucide/svelte';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import type { GalleryCardItem } from '$lib/components/public/GalleryCard.svelte';
  import GalleryViewer from '$lib/components/public/GalleryViewer.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import { faqLd } from '$lib/seo';
  import HomeHero from '$lib/components/public/home/HomeHero.svelte';
  import HomeExperiences from '$lib/components/public/home/HomeExperiences.svelte';
  import HomeDestinationsCarousel from '$lib/components/public/home/HomeDestinationsCarousel.svelte';
  import HomeItineraries from '$lib/components/public/home/HomeItineraries.svelte';
  import HomeWhyChoose from '$lib/components/public/home/HomeWhyChoose.svelte';
  import HomeAdvisorNote from '$lib/components/public/home/HomeAdvisorNote.svelte';
  import HomeHowPlanned from '$lib/components/public/home/HomeHowPlanned.svelte';
  import HomeTravellerStories from '$lib/components/public/home/HomeTravellerStories.svelte';
  import HomePlanningBand from '$lib/components/public/home/HomePlanningBand.svelte';
  import SeasonsBand from '$lib/components/public/SeasonsBand.svelte';
  import ImpactBand from '$lib/components/public/ImpactBand.svelte';
  import MigrationCalendar from '$lib/components/public/MigrationCalendar.svelte';
  import LeadCaptureForm from '$lib/components/public/LeadCaptureForm.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import ContentShimmer from '$lib/components/public/ContentShimmer.svelte';
  import { fadeUpOnScroll, homepageMotion, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import { api } from '$lib/api/client';
  import { API_URL } from '$lib/config/env';
  import { cachedJson } from '$lib/cache';
  import { attachResolvedVariantFields, imgUrl, srcsetFor, variantFromMap, variantSrc, type ImageVariantMap } from '$lib/img';
  import { toMetaText } from '$lib/richText';
  import type { BlogPost, Destination, FAQ, MigrationEntry, Review, ReviewSummary, Tour } from '$lib/types';
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

  const deferredItems = <T,>(result: PromiseSettledResult<{ data?: { items?: T[] } }>) =>
    result.status === 'fulfilled' ? result.value?.data?.items ?? [] : [];

  const deferredValue = <T,>(result: PromiseSettledResult<{ data?: T }>) =>
    result.status === 'fulfilled' ? result.value?.data ?? null : null;

  const imageText = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : '');

  const collectImageUrls = (urls: Set<string>, rows: Array<Record<string, unknown>>, fields: string[]) => {
    for (const row of rows) {
      for (const field of fields) {
        const value = imageText(row[field]);
        if (value) urls.add(value);
      }
    }
  };

  const deferUntilIdle = (fn: () => void) => {
    if (typeof window === 'undefined') return;
    const idle = (window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number })
      .requestIdleCallback;
    if (idle) idle(() => fn(), { timeout: 1200 });
    else window.setTimeout(fn, 350);
  };

  const resolveDeferredImageVariants = async (urls: Set<string>): Promise<ImageVariantMap> => {
    const list = [...urls].slice(0, 100);
    if (!list.length) return {};
    try {
      const query = new URLSearchParams({ urls: list.join(',') });
      const res = await cachedJson<{ data?: ImageVariantMap }>(`${API_URL}/public/image-variants?${query}`);
      return res.data ?? {};
    } catch {
      return {};
    }
  };

  // Real CMS content only — no fabricated placeholder fallbacks. Initial SSR is
  // intentionally limited to the hero/homepage config and category chips; lower
  // landing sections hydrate from cached client requests after first paint.
  let tours: Tour[] = data.tours ?? [];
  let destinations: Destination[] = data.destinations ?? [];
  let posts: BlogPost[] = data.posts ?? [];
  let faqs: FAQ[] = data.faqs ?? [];
  let reviewSummary: ReviewSummary | null = data.reviewSummary ?? null;
  let reviews: Review[] = data.reviews ?? [];
  let migrationEntries: MigrationEntry[] = data.migrationEntries ?? [];
  let galleryItems: GalleryCardItem[] = (data.galleryItems ?? []) as GalleryCardItem[];
  let categories: Record<string, unknown>[] = (data.categories ?? []) as Record<string, unknown>[];
  let imageVariants: ImageVariantMap = (data.imageVariants ?? {}) as ImageVariantMap;
  let deferredLoading = true;
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
  // Resolved during SSR, so the hero paints the slides it will keep. Deriving
  // them from `tours`/`destinations` meant they were empty on the first paint
  // and arrived a moment later, replacing the picture under the visitor.
  //
  // The CMS background stays as the last candidate: it is what the hero shows
  // when there is no published tour or destination photograph to show instead,
  // and it drops out on its own as soon as there is.
  $: heroSlides = [...(data.heroSlides ?? []), { imageUrl: heroImageResolved, label: 'Goldfinch Adventures', href: '/tours' }]
    .filter((slide, index, all) =>
      Boolean(slide.imageUrl) && all.findIndex((candidate) => candidate.imageUrl === slide.imageUrl) === index
    )
    .slice(0, 3);

  // Preload whatever the hero will actually paint first. This pointed at the
  // CMS background regardless, so once the slides came from real tours the
  // browser was told to prioritise an image the page never displayed, and the
  // LCP image itself went unhinted.
  $: heroLeadImage = heroSlides[0]?.imageUrl || heroImageResolved;
  $: heroVariants = variantFromMap(heroLeadImage, imageVariants);
  $: heroPreloadType = heroVariants?.avif ? 'image/avif' : heroVariants ? 'image/webp' : undefined;
  $: heroPreloadSrcset = heroVariants ? srcsetFor(heroVariants, heroVariants.avif ? 'avif' : 'webp') : '';
  $: heroPreloadHref =
    variantSrc(heroVariants, 1800, heroVariants?.avif ? 'avif' : 'webp') || imgUrl(heroLeadImage, 1800, 72);

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
  $: advisorExtra = (sections.advisor_note?.extra_data ?? {}) as Record<string, unknown>;
  $: howExtra = (sections.how_it_works?.extra_data ?? {}) as Record<string, unknown>;
  // Experiences cards come from published tour categories (real CMS records).
  $: experienceItems = categories
    .map((c) => ({
      name: String(c.name ?? c.slug ?? ''),
      slug: String(c.slug ?? ''),
      description: toMetaText(c.description ?? c.who_its_for ?? '', 170),
      image: String(c.image_url ?? ''),
      href: `/safari-styles/${String(c.slug ?? '')}`
    }))
    .filter((c) => c.name && c.slug);
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
  // Real published gallery images only. Keeping this empty until the deferred
  // CMS request returns avoids loading bundled sample imagery during first paint.
  $: galleryDisplay = galleryItems.length ? (galleryItems as Record<string, unknown>[]) : [];
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

  const loadDeferredHomeSections = async () => {
    try {
    const [
      tourResult,
      destinationResult,
      postResult,
      faqResult,
      reviewSummaryResult,
      featuredReviewResult,
      allReviewResult,
      migrationResult,
      galleryResult
    ] = await Promise.allSettled([
      api.tours.list({ status: 'published', limit: 6 }),
      api.destinations.list({ status: 'published', limit: 8 }),
      api.blog.list({ limit: 3 }),
      api.faqs.list({ limit: 5 }),
      api.reviews.summary(),
      api.reviews.list({ status: 'approved', is_featured: true, limit: 6 }),
      api.reviews.list({ status: 'approved', limit: 6 }),
      api.migrationCalendar.list({ is_published: true, limit: 24 }),
      api.gallery.list({ status: 'published', media_type: 'image', limit: 7 })
    ]);

    const nextTours = deferredItems<Tour>(tourResult);
    const nextDestinations = deferredItems<Destination>(destinationResult);
    const nextPosts = deferredItems<BlogPost>(postResult);
    const nextFaqs = deferredItems<FAQ>(faqResult);
    const nextReviewSummary = deferredValue<ReviewSummary>(reviewSummaryResult);
    const featuredReviews = deferredItems<Review>(featuredReviewResult);
    const fallbackReviews = deferredItems<Review>(allReviewResult);
    const nextMigrationEntries = deferredItems<MigrationEntry>(migrationResult);
    const nextGalleryItems = deferredItems<Record<string, unknown>>(galleryResult);

    const urls = new Set<string>();
    collectImageUrls(urls, nextTours as Array<Record<string, unknown>>, ['main_image_url', 'banner_image_url', 'image_url']);
    collectImageUrls(urls, nextDestinations as Array<Record<string, unknown>>, ['main_image_url', 'image_url', 'banner_image_url']);
    collectImageUrls(urls, nextPosts as Array<Record<string, unknown>>, ['featured_image_url']);
    collectImageUrls(urls, nextMigrationEntries as Array<Record<string, unknown>>, ['image_url']);
    collectImageUrls(urls, nextGalleryItems, ['image_url']);

    const variants = await resolveDeferredImageVariants(urls);
    attachResolvedVariantFields(nextTours as Array<Record<string, any>>, variants, [
      'main_image_url',
      'banner_image_url',
      'image_url'
    ]);
    attachResolvedVariantFields(nextDestinations as Array<Record<string, any>>, variants, [
      'main_image_url',
      'image_url',
      'banner_image_url'
    ]);
    attachResolvedVariantFields(nextPosts as Array<Record<string, any>>, variants, ['featured_image_url']);
    attachResolvedVariantFields(nextMigrationEntries as Array<Record<string, any>>, variants, ['image_url']);
    attachResolvedVariantFields(nextGalleryItems as Array<Record<string, any>>, variants, ['image_url']);

    imageVariants = { ...imageVariants, ...variants };
    tours = nextTours;
    destinations = nextDestinations;
    posts = nextPosts;
    faqs = nextFaqs;
    reviewSummary = nextReviewSummary;
    reviews = featuredReviews.length ? featuredReviews : fallbackReviews;
    migrationEntries = nextMigrationEntries;
    galleryItems = nextGalleryItems as GalleryCardItem[];
    } finally {
      deferredLoading = false;
    }
  };

  onMount(() => {
    deferUntilIdle(() => void loadDeferredHomeSections());
  });
</script>

<svelte:head>
  <link
    rel="preload"
    as="image"
    href={heroPreloadHref}
    imagesrcset={heroPreloadSrcset || undefined}
    imagesizes="100vw"
    type={heroPreloadType}
    fetchpriority="high"
  />
</svelte:head>

<!-- ─────────────────────────────────────────────────────────────────────────
     Homepage spine — section order and UI ported from the Safari Connect
     reference build. Every section stays CMS-gated and renders only real data.
     ───────────────────────────────────────────────────────────────────────── -->

<!-- 1 · Hero -->
<main class="home-motion-root" use:homepageMotion>
{#if isSectionActive('hero')}
  <HomeHero
    eyebrow={typeof heroExtra.eyebrow === 'string' ? heroExtra.eyebrow : 'Tanzania & East Africa specialists'}
    title={cms('hero', 'title', 'Plan your African safari,')}
    highlight={typeof heroExtra.title_highlight === 'string' ? heroExtra.title_highlight : 'your way.'}
    description={cms('hero', 'subtitle', 'Great Migration river crossings, honest safari, Kilimanjaro and Zanzibar advice — planned around you by Tanzanian local experts.')}
    imageUrl={heroImageResolved}
    slides={heroSlides}
    primaryCta={{ label: cms('hero', 'button_text', 'Plan My Trip'), href: cms('hero', 'button_url', '/plan-my-trip') }}
    secondaryCta={{
      label: typeof heroExtra.secondary_cta_text === 'string' ? heroExtra.secondary_cta_text : 'Talk to a Travel Advisor',
      href: typeof heroExtra.secondary_cta_url === 'string' ? heroExtra.secondary_cta_url : '/contact'
    }}
    trustPoints={arr(heroExtra.trust_points)}
    experiences={experienceItems.map((e) => ({ label: e.name, slug: e.slug }))}
    {imageVariants}
  />
{/if}

<!-- 2 · Experiences — real published tour categories -->
{#if isSectionActive('experiences') && experienceItems.length}
  <HomeExperiences
    items={experienceItems}
    eyebrow={cmsExtra('experiences', 'eyebrow', 'Ways to Travel')}
    title={cms('experiences', 'title', 'What Kind of Tanzania Trip Are You Imagining?')}
    subtitle={cms('experiences', 'subtitle', "You do not need to know the perfect route yet. Start with the experience that feels closest to your trip, and we'll help connect the right places, timing, lodges, transfers and pace.")}
    {imageVariants}
  />
{/if}
<!-- 3 · Destinations carousel -->
{#if isSectionActive('featured_destinations') && destinations.length}
  <HomeDestinationsCarousel
    {destinations}
    eyebrow={cmsExtra('featured_destinations', 'eyebrow', 'Top Destinations')}
    title={cms('featured_destinations', 'title', 'The Places That Shape the Journey')}
    subtitle={cms('featured_destinations', 'subtitle', 'Some places are best for wildlife. Others are better for beaches, scenery or culture. We help you combine them in the right order.')}
  />
{:else if isSectionActive('featured_destinations') && deferredLoading}
  <ContentShimmer cards={3} label="Loading featured destinations" />
{/if}

<!-- 4 · Featured itineraries -->
{#if isSectionActive('featured_tours') && tours.length}
  <HomeItineraries
    {tours}
    eyebrow={cmsExtra('featured_tours', 'eyebrow', 'Featured Itineraries')}
    title={cms('featured_tours', 'title', 'Trip Ideas You Can Shape Around You')}
    subtitle={cms('featured_tours', 'subtitle', 'These are not rigid packages. They are starting points — useful examples of how safari, beach, Kilimanjaro, culture and seasonal wildlife routes can be built around your travel dates.')}
    ctaHref={cms('featured_tours', 'button_url', '/tours')}
    ctaLabel={cms('featured_tours', 'button_text', 'Browse all itineraries')}
  />
{:else if isSectionActive('featured_tours') && deferredLoading}
  <ContentShimmer cards={3} label="Loading featured itineraries" />
{/if}

<!-- 5 · Why Goldfinch -->
{#if isSectionActive('why_us')}
  <HomeWhyChoose
    eyebrow={cmsExtra('why_us', 'eyebrow', 'Why Goldfinch')}
    title={cms('why_us', 'title', 'A Local Team to Help You Make Sense of Tanzania')}
    subtitle={cms('why_us', 'subtitle', 'Tanzania has many possible routes. That is the good part — and also the confusing part. We help you understand what fits your dates, budget and pace.')}
    {...clean({ features: arr(whyExtra.features) })}
  />
{/if}

<!-- 6 · Advisor's note -->
{#if isSectionActive('advisor_note')}
  <HomeAdvisorNote
    eyebrow={cmsExtra('advisor_note', 'eyebrow', "An Advisor's Note")}
    title={cms('advisor_note', 'title', 'The Trip Is Won or Lost in the Planning Details')}
    body={cms('advisor_note', 'subtitle', 'Most travel mistakes happen before arrival. The wrong route, too many one-night stops, poor lodge locations or badly timed transfers can make even a beautiful trip feel tiring.')}
    {...clean({
      columns: arr<{ title: string; items: string[] }>(advisorExtra.columns),
      footnote: typeof advisorExtra.footnote === 'string' ? advisorExtra.footnote : ''
    })}
  />
{/if}

<!-- 7 · How your trip is planned -->
{#if isSectionActive('how_it_works')}
  <HomeHowPlanned
    eyebrow={cmsExtra('how_it_works', 'eyebrow', 'How Your Trip Is Planned')}
    title={cms('how_it_works', 'title', 'Simple Planning. Clear Routes. Local Support.')}
    subtitle={cms('how_it_works', 'subtitle', "You do not need to arrive with a finished itinerary. Share the basics, and we'll help turn the idea into a route that makes sense.")}
    {...clean({ steps: arr(howExtra.steps) })}
  />
{/if}

<!-- 8 · Traveller stories — real approved reviews only -->
{#if isSectionActive('reviews_section') && reviews.length}
  <HomeTravellerStories
    {reviews}
    summary={reviewSummary}
    eyebrow={cmsExtra('reviews_section', 'eyebrow', 'Traveller Stories')}
    title={cms('reviews_section', 'title', 'Travellers Who Planned Tanzania With Us')}
    subtitle={cms('reviews_section', 'subtitle', 'Real guests, real routes and the planning details that made their trips work.')}
  />
{:else if isSectionActive('reviews_section') && deferredLoading}
  <ContentShimmer cards={3} label="Loading traveller stories" />
{/if}

<!-- ── Goldfinch-only sections (not in the reference layout) — each stays
     CMS-toggleable so they can be switched off for a pure reference flow. ── -->

<!-- 8c · Best times to visit -->
{#if isSectionActive('seasons')}
  <SeasonsBand {...seasonsProps} />
{/if}

<!-- 8d · Serengeti Great Migration calendar (self-hiding until entries exist) -->
{#if migrationEntries.length}
  <MigrationCalendar
    entries={migrationEntries}
    active={sections.migration_section?.is_active !== false}
    eyebrow={cmsExtra('migration_section', 'eyebrow', 'Great Migration')}
    title={cms('migration_section', 'title', 'Where the herds are, month by month')}
    subtitle={cms('migration_section', 'subtitle', 'Plan around the river crossings and calving season with our month-by-month guide.')}
    {imageVariants}
  />
{:else if sections.migration_section?.is_active !== false && deferredLoading}
  <ContentShimmer cards={3} label="Loading migration calendar" />
{/if}

<!-- 10b · Gallery preview -->
{#if isSectionActive('gallery_preview') && galleryDisplay.length}
<section class="border-y border-ink/10 bg-sand/35 py-14 md:py-20" use:sectionReveal>
  <div class="container-shell">
    <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
      <div class="max-w-2xl" use:fadeUpOnScroll={{ y: 14 }}>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-clay">{cmsExtra('gallery_preview', 'eyebrow', 'Field notes in frames')}</p>
        <h2 class="mt-3 max-w-xl font-serif text-[2rem] font-semibold leading-[1.08] text-heading sm:text-4xl md:text-[42px]">
          {cms('gallery_preview', 'title', 'See the journeys before you choose')}
        </h2>
        <p class="mt-4 max-w-xl text-[15px] leading-7 text-ink/65 md:text-base">
          {cms('gallery_preview', 'subtitle', 'Real published gallery moments from safaris, climbs, coast stays and the places our team knows well.')}
        </p>
      </div>
      <div class="shrink-0" use:fadeUpOnScroll={{ y: 14, delay: 0.08 }}>
        <a class="group inline-flex min-h-11 items-center gap-2 border-b border-clay/35 text-sm font-bold text-clay transition hover:border-clay hover:text-heading" href={galleryCtaUrl}>
          {galleryCtaText} <ArrowRight size={16} strokeWidth={2.6} />
        </a>
      </div>
    </div>

    <div class="mt-8 md:mt-10">
      <GalleryViewer images={galleryDisplay.slice(0, 8)} mosaic minimal {imageVariants} />
    </div>
  </div>
</section>
{:else if isSectionActive('gallery_preview') && deferredLoading}
  <ContentShimmer cards={3} label="Loading safari gallery" />
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
{:else if isSectionActive('blog_preview') && deferredLoading}
  <ContentShimmer cards={3} label="Loading latest stories" />
{/if}

<!-- 12 · Impact -->
{#if isSectionActive('impact')}
  <ImpactBand {...impactProps} {imageVariants} />
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
{:else if isSectionActive('faq') && deferredLoading}
  <ContentShimmer cards={3} label="Loading frequently asked questions" />
{/if}
<!-- 9 · Planning form band (closing section, as in the reference layout) -->
{#if isSectionActive('plan_dream')}
  <HomePlanningBand
    eyebrow={cmsExtra('plan_dream', 'eyebrow', 'Start Planning')}
    title={cms('plan_dream', 'title', 'Tell Us the Tanzania Trip You Have in Mind')}
    subtitle={cms('plan_dream', 'subtitle', "Share your travel dates, group size and the experiences you are considering. We'll help you understand the best route, timing, pace and logistics.")}
    {...clean({ points: planDreamPoints })}
  >
    <LeadCaptureForm compact title={cms('plan_dream', 'button_text', 'Start your trip plan')} />
  </HomePlanningBand>
{/if}
</main>

<style>
  :global(.home-motion-ready .home-motion-section) {
    opacity: 1;
    transform: translate3d(0, 34px, 0);
    transition: opacity 800ms cubic-bezier(0.16, 1, 0.3, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  :global(.home-motion-ready .home-motion-section.home-motion-visible) { opacity: 1; transform: translate3d(0, 0, 0); }
  :global(.home-motion-ready .home-motion-card) {
    opacity: 1;
    transform: translate3d(0, 22px, 0) scale(0.985);
    transition: opacity 650ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 350ms ease, border-color 350ms ease;
    transition-delay: calc(100ms + var(--home-card-index, 0) * 65ms);
  }
  :global(.home-motion-ready .home-motion-visible .home-motion-card) { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  @media (hover: hover) and (pointer: fine) {
    :global(.home-motion-ready .home-motion-visible .home-motion-card:hover) {
      transform: translate3d(0, -6px, 0) scale(1.008);
      box-shadow: 0 22px 55px rgb(25 35 25 / 0.12);
    }
  }
  :global(.home-motion-reduced .home-motion-section), :global(.home-motion-reduced .home-motion-card) { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce) {
    :global(.home-motion-ready .home-motion-section), :global(.home-motion-ready .home-motion-card) { opacity: 1; transform: none; transition: none; }
  }
</style>
