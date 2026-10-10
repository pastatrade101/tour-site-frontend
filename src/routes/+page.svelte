<script lang="ts">
  import { t, tp } from '$lib/i18n/ui';
  import enStrings from '$lib/locales/en.json';
  import { page } from '$app/stores';
  import { localeParam } from '$lib/faqEntities';
  import { onMount } from 'svelte';
  import { ArrowRight, MessageCircle } from '@lucide/svelte';
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
  import { resolvePlanHref } from '$lib/planHref';
  import { TRIP_TYPES } from '$lib/tripPlanner';
  import HomeAdvisorNote from '$lib/components/public/home/HomeAdvisorNote.svelte';
  import HomeHowPlanned from '$lib/components/public/home/HomeHowPlanned.svelte';
  import HomeTravellerStories from '$lib/components/public/home/HomeTravellerStories.svelte';
  import PartnerStrip from '$lib/components/public/PartnerStrip.svelte';
  import HomePlanningBand from '$lib/components/public/home/HomePlanningBand.svelte';
  import MigrationCalendar from '$lib/components/public/MigrationCalendar.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import ContentShimmer from '$lib/components/public/ContentShimmer.svelte';
  import { fadeUpOnScroll, homepageMotion, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import { api } from '$lib/api/client';
  import { API_URL } from '$lib/config/env';
  import { cachedJson } from '$lib/cache';
  import { attachResolvedVariantFields, imgUrl, srcsetFor, variantFromMap, variantSrc, type ImageVariantMap } from '$lib/img';
  import { toMetaText } from '$lib/richText';
  import { categoryAudience, categoryHighlights, categoryMeta } from '$lib/categoryFacts';
  import { advisorNoteProps } from '$lib/advisorNote';
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
  /*
   * A CMS field that still holds the site's own stock English ("More
   * experiences", "Best for") is shown in the page's language: several of
   * these labels live in extra_data fields the Translations tab does not
   * cover, so they stayed English on every language. Wording an admin has
   * actually written is shown exactly as written.
   */
  const stockKey = new Map(Object.entries(enStrings as Record<string, string>).map(([key, text]) => [text, key]));
  const localized = (value: string) => {
    const key = stockKey.get(value.trim());
    return key ? $t(key) : value;
  };

  const cms = (key: string, field: keyof HomeSection, fallback: string) => {
    const value = sections[key]?.[field];
    return typeof value === 'string' && value.trim() ? localized(value) : fallback;
  };

  // Same, for a string field inside a section's extra_data (e.g. eyebrows).
  const cmsExtra = (key: string, field: string, fallback: string) => {
    const value = (sections[key]?.extra_data as Record<string, unknown> | undefined)?.[field];
    return typeof value === 'string' && value.trim() ? localized(value) : fallback;
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
  /**
   * How the hero meets its photographs, set in Admin → Homepage → Hero.
   * Unset or unrecognised shows the whole photograph, so a stray value can
   * never crop the first screen.
   */
  const HERO_FITS = ['cover', 'contain', 'scale-down'] as const;
  const heroFit = (value: unknown): (typeof HERO_FITS)[number] | '' => {
    const candidate = String(value ?? '').trim();
    return (HERO_FITS as readonly string[]).includes(candidate)
      ? (candidate as (typeof HERO_FITS)[number])
      : '';
  };
  $: heroImageFit = heroFit(heroExtra.hero_image_fit) || 'contain';
  // The existing "Crop / focus" field. 'center' is the stylesheet default, so
  // it is passed as empty rather than as an override of itself.
  $: heroImagePosition =
    typeof heroExtra.media_position === 'string' && heroExtra.media_position.trim() !== 'center'
      ? heroExtra.media_position.trim()
      : '';

  $: heroCmsSlides = arr<Record<string, unknown>>(heroExtra.hero_slides)
    .map((slide) => ({
      fit: heroFit(slide.image_fit ?? slide.fit),
      imageUrl: String(slide.image_url ?? slide.imageUrl ?? '').trim(),
      label: String(slide.title ?? '').trim(),
      eyebrow: String(slide.eyebrow ?? '').trim(),
      title: String(slide.title ?? '').trim(),
      highlight: String(slide.title_highlight ?? slide.highlight ?? '').trim(),
      description: String(slide.subtitle ?? slide.description ?? '').trim(),
      primaryLabel: String(slide.primary_label ?? slide.primaryLabel ?? '').trim(),
      primaryHref: String(slide.primary_url ?? slide.primaryHref ?? '').trim(),
      secondaryLabel: String(slide.secondary_label ?? slide.secondaryLabel ?? '').trim(),
      secondaryHref: String(slide.secondary_url ?? slide.secondaryHref ?? '').trim()
    }))
    .filter((slide) => slide.imageUrl);
  $: heroSlides = (heroCmsSlides.length
    ? heroCmsSlides
    : [...(data.heroSlides ?? []), { imageUrl: heroImageResolved, label: 'Goldfinch Adventures', href: '/tours' }]
  )
    .filter((slide, index, all) =>
      Boolean(slide.imageUrl) && all.findIndex((candidate) => candidate.imageUrl === slide.imageUrl) === index
    )
    .slice(0, 5);

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

  // Sections read their own record plus `extra_data`. Empty values are dropped
  // so the component's built-in default shows rather than a blank band.
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const clean = (o: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(o).filter((e) => {
        const v = e[1];
        return v != null && !(typeof v === 'string' && !v.trim()) && !(Array.isArray(v) && !v.length);
      })
    );
  $: whyExtra = (sections.why_us?.extra_data ?? {}) as Record<string, unknown>;
  $: faqExtra = (sections.faq?.extra_data ?? {}) as Record<string, unknown>;
  $: howExtra = (sections.how_it_works?.extra_data ?? {}) as Record<string, unknown>;
  $: experiencesExtra = (sections.experiences?.extra_data ?? {}) as Record<string, unknown>;
  // Experiences cards come from published tour categories (real CMS records).
  // short_description is written for exactly this compact card context, so it
  // wins over truncating the long description. Featured categories lead;
  // within each group the API's sort_order holds (Array.sort is stable).
  // meta / tags / bestFor are the category's own columns — duration, fitness
  // level, best months, highlights and who it's for. Each is absent on plenty
  // of records, and the section renders nothing for the ones it does not have
  // rather than filling the gap.
  $: categoryExperienceItems = categories
    .map((c) => ({
      name: String(c.name ?? c.slug ?? ''),
      slug: String(c.slug ?? ''),
      description: toMetaText(c.short_description ?? c.description ?? c.who_its_for ?? '', 170),
      image: String(c.image_url ?? ''),
      href: `/safari-styles/${String(c.slug ?? '')}`,
      meta: categoryMeta(c),
      tags: categoryHighlights(c.highlights),
      bestFor: categoryAudience(c.who_its_for),
      featured: Boolean(c.is_featured)
    }))
    .filter((c) => c.name && c.slug)
    .sort((a, b) => Number(b.featured) - Number(a.featured));
  $: experienceOverrides = arr<Record<string, unknown>>(experiencesExtra.items)
    .map((item) => ({
      name: String(item.name ?? item.slug ?? '').trim(),
      slug: String(item.slug ?? '').trim(),
      description: String(item.description ?? item.short ?? '').trim(),
      image: String(item.image_url ?? item.image ?? '').trim(),
      href: String(item.href ?? '').trim(),
      meta: String(item.meta ?? '').trim(),
      tags: arr<unknown>(item.tags).map(String).filter(Boolean),
      bestFor: arr<unknown>(item.best_for ?? item.bestFor).map(String).filter(Boolean),
      ctaLabel: String(item.cta_label ?? item.ctaLabel ?? '').trim()
    }))
    .filter((item) => item.name && item.slug);
  $: experienceItems = experienceOverrides.length ? experienceOverrides : categoryExperienceItems;

  /**
   * The accreditation logos under the reviews. They live on the `partners`
   * homepage section, which is where the admin's logo editor already writes
   * them — the strip simply had no caller until now. No logos, no strip.
   */
  $: partnerLogos = arr<{ image_url?: string; name?: string; url?: string }>(
    (sections.partners?.extra_data as Record<string, unknown> | undefined)?.logos
  )
    .filter((logo) => String(logo?.image_url ?? '').trim())
    .map((logo) => ({ image_url: String(logo.image_url), name: logo.name, url: logo.url }));

  // "Plan your dream" band bullets — CMS-overridable via extra_data.points,
  // falling back to the current text.
  $: planDreamExtra = (sections.plan_dream?.extra_data ?? {}) as Record<string, unknown>;
  $: planDreamPoints = arr<string>(planDreamExtra.points).length
    ? arr<string>(planDreamExtra.points)
    : [$t('home.plan_point_tailored'), $t('home.plan_point_reply_1_day'), $t('home.plan_point_honest')];
  $: blogCtaText = cms('blog_preview', 'button_text', $t('home.blog_preview_button_text'));
  $: blogCtaUrl = cms('blog_preview', 'button_url', '/blog');
  $: galleryCtaText = cms('gallery_preview', 'button_text', $t('home.gallery_preview_button_text'));
  $: galleryCtaUrl = cms('gallery_preview', 'button_url', '/gallery');
  // Real published gallery images only. Keeping this empty until the deferred
  // CMS request returns avoids loading bundled sample imagery during first paint.
  $: galleryDisplay = galleryItems.length ? (galleryItems as Record<string, unknown>[]) : [];
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
      // The general library only. The homepage should not answer a question
      // about one park to a visitor who has not chosen a destination yet.
      api.faqs.list({ entity_type: 'null', limit: 5, ...localeParam($page.data.locale) }),
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
<main class="home-motion-root bg-surface" use:homepageMotion>
{#if isSectionActive('hero')}
  <HomeHero
    eyebrow={typeof heroExtra.eyebrow === 'string' ? heroExtra.eyebrow : 'Tanzania & East Africa specialists'}
    title={cms('hero', 'title', $t('home.hero_title'))}
    highlight={typeof heroExtra.title_highlight === 'string' ? heroExtra.title_highlight : $t('home.hero_title_highlight')}
    description={cms('hero', 'subtitle', $t('home.hero_subtitle'))}
    imageUrl={heroImageResolved}
    slides={heroSlides}
    imageFit={heroImageFit}
    imagePosition={heroImagePosition}
    primaryCta={{ label: cms('hero', 'button_text', $t('cta.plan_my_trip')), href: cms('hero', 'button_url', '/plan-my-trip') }}
    secondaryCta={{
      label: typeof heroExtra.secondary_cta_text === 'string' ? heroExtra.secondary_cta_text : $t('cta.talk_to_advisor'),
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
    eyebrow={cmsExtra('experiences', 'eyebrow', $t('home.experiences_eyebrow'))}
    title={cms('experiences', 'title', $t('home.experiences_title'))}
    subtitle={cms('experiences', 'subtitle', $t('home.experiences_subtitle'))}
    moreLabel={cmsExtra('experiences', 'more_label', $t('home.experiences_more_label'))}
    bestForLabel={cmsExtra('experiences', 'best_for_label', $t('home.experiences_best_for_label'))}
    primaryCtaPrefix={cmsExtra('experiences', 'primary_cta_prefix', $t('home.experiences_primary_cta_prefix'))}
    primaryCount={Number(experiencesExtra.primary_count) || 6}
    {imageVariants}
  />
{/if}
<!-- 3 · Destinations carousel -->
{#if isSectionActive('featured_destinations') && destinations.length}
  <HomeDestinationsCarousel
    {destinations}
    eyebrow={cmsExtra('featured_destinations', 'eyebrow', $t('home.featured_destinations_eyebrow'))}
    title={cms('featured_destinations', 'title', $t('home.featured_destinations_title'))}
    subtitle={cms('featured_destinations', 'subtitle', $t('home.featured_destinations_subtitle'))}
  />
{:else if isSectionActive('featured_destinations') && deferredLoading}
  <ContentShimmer cards={3} label={$t('ui.loading_featured_destinations')} />
{/if}

<!-- 4 · Featured itineraries -->
{#if isSectionActive('featured_tours') && tours.length}
  <HomeItineraries
    {tours}
    eyebrow={cmsExtra('featured_tours', 'eyebrow', $t('home.featured_tours_eyebrow'))}
    title={cms('featured_tours', 'title', $t('home.featured_tours_title'))}
    subtitle={cms('featured_tours', 'subtitle', $t('home.featured_tours_subtitle'))}
    ctaHref={cms('featured_tours', 'button_url', '/tours')}
    ctaLabel={cms('featured_tours', 'button_text', $t('home.featured_tours_button_text'))}
  />
{:else if isSectionActive('featured_tours') && deferredLoading}
  <ContentShimmer cards={3} label={$t('ui.loading_featured_itineraries')} />
{/if}

<!-- 5 · Why Goldfinch -->
{#if isSectionActive('why_us')}
  <HomeWhyChoose
    eyebrow={cmsExtra('why_us', 'eyebrow', $t('home.why_us_eyebrow'))}
    title={cms('why_us', 'title', $t('home.why_us_title'))}
    subtitle={cms('why_us', 'subtitle', $t('home.why_us_subtitle'))}
    titleHighlight={cmsExtra('why_us', 'title_highlight', $t('home.why_us_title_highlight'))}
    ctaLabel={cms('why_us', 'button_text', $t('home.why_us_button_text'))}
    ctaHref={resolvePlanHref(cms('why_us', 'button_url', '/plan-my-trip'))}
    {...clean({ features: arr(whyExtra.features) })}
  />
{/if}

<!-- 6 · Advisor's note -->
{#if isSectionActive('advisor_note')}
  <!-- Resolved through the shared helper, the same one the tours listing, the
       safari-style pages and About use, so the note reads identically wherever
       a visitor meets it. -->
  <HomeAdvisorNote {...advisorNoteProps(sections)} />
{/if}

<!-- 7 · How your trip is planned -->
{#if isSectionActive('how_it_works')}
  <HomeHowPlanned
    eyebrow={cmsExtra('how_it_works', 'eyebrow', $t('home.how_it_works_eyebrow'))}
    title={cms('how_it_works', 'title', $t('home.how_it_works_title'))}
    subtitle={cms('how_it_works', 'subtitle', $t('home.how_it_works_subtitle'))}
    imageUrl={cms('how_it_works', 'image_url', '')}
    fallbackImageUrl={heroImageResolved}
    captionEyebrow={cmsExtra('how_it_works', 'caption_eyebrow', $t('home.how_it_works_caption_eyebrow'))}
    caption={cmsExtra('how_it_works', 'caption', $t('home.how_it_works_caption'))}
    {...clean({ steps: arr(howExtra.steps) })}
  />
{/if}

<!-- 8 · Traveller stories — real approved reviews only -->
{#if isSectionActive('reviews_section') && reviews.length}
  <HomeTravellerStories
    {reviews}
    summary={reviewSummary}
    eyebrow={cmsExtra('reviews_section', 'eyebrow', $t('home.reviews_section_eyebrow'))}
    title={cms('reviews_section', 'title', $t('home.reviews_section_title'))}
    subtitle={cms('reviews_section', 'subtitle', $t('home.reviews_section_subtitle'))}
  />
{:else if isSectionActive('reviews_section') && deferredLoading}
  <ContentShimmer cards={3} label={$t('ui.loading_traveller_stories')} />
{/if}

<!-- The accreditations, immediately under the reviews they back up. -->
{#if isSectionActive('partners')}
  <PartnerStrip logos={partnerLogos} title={cms('partners', 'title', '')} />
{/if}

<!-- ── Goldfinch-only sections (not in the reference layout) — each stays
     CMS-toggleable so they can be switched off for a pure reference flow. ── -->

<!-- 8d · Serengeti Great Migration calendar (self-hiding until entries exist) -->
{#if migrationEntries.length}
  <MigrationCalendar
    entries={migrationEntries}
    active={sections.migration_section?.is_active !== false}
    eyebrow={cmsExtra('migration_section', 'eyebrow', $t('home.migration_section_eyebrow'))}
    title={cms('migration_section', 'title', $t('home.migration_section_title'))}
    subtitle={cms('migration_section', 'subtitle', $t('home.migration_section_subtitle'))}
    {imageVariants}
  />
{:else if sections.migration_section?.is_active !== false && deferredLoading}
  <ContentShimmer cards={3} label={$t('ui.loading_migration_calendar')} />
{/if}

<!-- 10b · Gallery preview -->
{#if isSectionActive('gallery_preview') && galleryDisplay.length}
<section class="border-y border-ink/10 bg-surface py-14 md:py-20" use:sectionReveal>
  <div class="container-shell">
    <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
      <div class="max-w-2xl" use:fadeUpOnScroll={{ y: 14 }}>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-clay">{cmsExtra('gallery_preview', 'eyebrow', $t('home.gallery_preview_eyebrow'))}</p>
        <h2 class="mt-3 max-w-xl font-serif text-[2rem] font-semibold leading-[1.08] text-heading sm:text-4xl md:text-[42px]">
          {cms('gallery_preview', 'title', $t('home.gallery_preview_title'))}
        </h2>
        <p class="mt-4 max-w-xl text-[15px] leading-7 text-ink/65 md:text-base">
          {cms('gallery_preview', 'subtitle', $t('home.gallery_preview_subtitle'))}
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
  <ContentShimmer cards={3} label={$t('ui.loading_safari_gallery')} />
{/if}

<!-- 11 · Blog — hidden when there are no posts -->
{#if isSectionActive('blog_preview') && posts.length}
<section class="relative overflow-hidden bg-surface py-14 md:py-20" use:sectionReveal>
  <div class="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-surface/70 to-transparent" aria-hidden="true"></div>
  <div class="container-shell">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <SectionHeader eyebrow={cmsExtra('blog_preview', 'eyebrow', $t('home.blog_preview_eyebrow'))} title={cms('blog_preview', 'title', $t('home.blog_preview_title'))} description={cms('blog_preview', 'subtitle', $t('home.blog_preview_subtitle'))} />
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
  <ContentShimmer cards={3} label={$t('ui.loading_latest_stories')} />
{/if}

<!-- 13 · FAQ -->
{#if isSectionActive('faq') && homepageFaqs.length}
  <JsonLd data={faqLd(homepageFaqs.map((f) => ({ q: f.question, a: f.answer })))} />
<section class="home-faq relative overflow-hidden bg-surface py-14 md:py-20" use:sectionReveal>
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-forest/20 to-transparent" aria-hidden="true"></div>
  <div class="container-shell grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
    <div>
      <SectionHeader eyebrow={cmsExtra('faq', 'eyebrow', $t('ui.good_to_know'))} title={cms('faq', 'title', $t('home.faq_title'))} description={cms('faq', 'subtitle', $t('home.faq_subtitle'))} />
      <a class="mt-6 inline-flex h-12 items-center gap-2 rounded-[8px] bg-[#25D366] px-6 font-bold text-white shadow-sm transition hover:brightness-105" href={cms('faq', 'button_url', '/contact')}><MessageCircle size={18} /> {cms('faq', 'button_text', $t('home.faq_button_text'))}</a>
    </div>
    <FAQAccordion faqs={homepageFaqs} />
  </div>
</section>
{:else if isSectionActive('faq') && deferredLoading}
  <ContentShimmer cards={3} label={$t('ui.loading_frequently_asked_questions')} />
{/if}
<!-- 9 · Planning form band (closing section, as in the reference layout) -->
{#if isSectionActive('plan_dream')}
  <HomePlanningBand
    eyebrow={cmsExtra('plan_dream', 'eyebrow', $t('home.plan_dream_eyebrow'))}
    title={cms('plan_dream', 'title', $t('home.plan_dream_title'))}
    subtitle={cms('plan_dream', 'subtitle', $t('home.plan_dream_subtitle'))}
    {...clean({ points: planDreamPoints })}
  >
    <!-- Planning starts on the six-step planner page. The band offers its first
         question here, so a click carries the answer straight into it. -->
    <div class="rounded-[14px] border border-white/15 bg-white/[0.06] p-5 text-white md:p-7">
      <p class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{$t('cta.plan_my_trip')}</p>
      <p class="mt-2 font-serif text-2xl leading-snug text-white md:text-[28px]">{$t('pg_plan_my_trip.trip_type_heading')}</p>
      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        {#each TRIP_TYPES as type (type.id)}
          <a
            href={`/plan-my-trip?experience=${type.id}&from=homepage-band`}
            data-cta="home-band-trip-type"
            class="group rounded-[10px] border border-white/15 bg-white/[0.04] p-4 transition hover:border-goldfinch-gold hover:bg-white/[0.08]"
          >
            <span class="flex items-center justify-between gap-3 text-[15px] font-semibold text-white">
              {$tp(type.label)}
              <ArrowRight size={16} class="shrink-0 text-goldfinch-gold transition group-hover:translate-x-0.5" />
            </span>
            <span class="mt-1 block text-[13px] leading-5 text-white/65">{$tp(type.desc)}</span>
          </a>
        {/each}
      </div>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href="/plan-my-trip?from=homepage-band"
          data-cta="home-band-plan"
          class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 text-sm font-bold text-deep-green transition hover:brightness-105"
        >
          {$t('cta.plan_my_trip')} <ArrowRight size={16} />
        </a>
        <a href="/contact" class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10">
          <MessageCircle size={16} /> {$t('cta.talk_to_advisor')}
        </a>
      </div>
      <p class="mt-4 text-xs text-white/55">{$t('lead.no_payment')}</p>
    </div>
  </HomePlanningBand>
{/if}
</main>

<style>
  /* Shared finishing touches; each section keeps its existing layout and CMS content. */
  .home-motion-root :global(h1), .home-motion-root :global(h2) { text-wrap:balance; }
  .home-motion-root :global(h2) { font-weight:600; line-height:1.13; letter-spacing:-.025em; }
  .home-motion-root :global(p) { text-wrap:pretty; }
  .home-motion-root :global(section:not([data-hero]) > .container-shell) { position:relative; }
  .home-motion-root :global(.home-experiences), .home-motion-root :global(.home-destinations),
  .home-motion-root :global(.home-itineraries), .home-motion-root :global(.home-why-choose),
  .home-motion-root :global(.home-how-planned), .home-motion-root :global(.home-traveller-stories),
  .home-faq { padding-block:clamp(3.5rem,6vw,5.5rem); }
  .home-motion-root :global(.home-destinations), .home-motion-root :global(.home-how-planned) { background:rgb(var(--c-canvas)/.55); }
  .home-motion-root :global(.destination-card) { border-radius:16px; border:1px solid rgb(var(--c-ink)/.1); }
  .home-motion-root :global([data-review-card]) { border:1px solid rgb(var(--c-ink)/.09); background:rgb(var(--c-canvas)/.6); }
  .home-motion-root :global(.home-advisor-note) { padding-block:clamp(2.5rem,5vw,4rem); }
  .home-motion-root :global(.home-planning-band) { border-top:3px solid rgb(var(--c-goldfinch-gold)/.7); }
  .home-motion-root :global(a:focus-visible), .home-motion-root :global(button:focus-visible) { outline:2px solid rgb(var(--c-goldfinch-gold)); outline-offset:4px; }
  .home-faq { background:rgb(var(--c-canvas)/.45); }
  .home-faq :global(.faq-timeline) { padding:28px; border:1px solid rgb(var(--c-ink)/.1); border-radius:16px; background:rgb(var(--c-surface)); }
  @media (min-width:1024px) { .home-motion-root :global(h2) { font-size:clamp(2rem,3vw,2.75rem); } }
  @media (max-width:639px) { .home-faq :global(.faq-timeline) { padding:20px 16px; } }

  :global(.home-motion-ready .home-motion-section) {
    opacity: 1;
    transform: translate3d(0, 16px, 0);
    transition: opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 450ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  :global(.home-motion-ready .home-motion-section.home-motion-visible) { opacity: 1; transform: none; }
  :global(.home-motion-ready .home-motion-card) {
    opacity: 1;
    transform: translate3d(0, 10px, 0);
    transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
    transition-delay: calc(var(--home-card-index, 0) * 40ms);
  }
  :global(.home-motion-ready .home-motion-visible .home-motion-card) { opacity: 1; transform: none; }
  :global(.home-motion-reduced .home-motion-section), :global(.home-motion-reduced .home-motion-card) { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce) {
    :global(.home-motion-ready .home-motion-section), :global(.home-motion-ready .home-motion-card) { opacity: 1; transform: none; transition: none; }
  }
</style>
