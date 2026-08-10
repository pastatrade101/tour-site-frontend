<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowRight,
    CalendarDays,
    Camera,
    CheckCircle2,
    Compass,
    FileCheck,
    HeartPulse,
    Image as ImageIcon,
    Info,
    MapPin,
    Phone,
    Plane,
    Quote,
    Shield,
    ShieldCheck,
    Star
  } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal } from '$lib/animations';
  import ActivityCard from '$lib/components/public/ActivityCard.svelte';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { currency, formatUsd } from '$lib/currency';
  import { imgUrl, thumbUrl, sourceFor, srcsetFor, variantSrc, variantsOf } from '$lib/img';
  import Img from '$lib/components/public/Img.svelte';
  import { hasRichContent, toMetaText } from '$lib/richText';
  import { breadcrumbLd } from '$lib/seo';
  import type { Activity, Destination, FAQ, Lodge, Review, Tour, TourCategory, TripPoint } from '$lib/types';
  import type { DestinationGalleryImage } from './+page.server';
  import type { PageData } from './$types';

  export let data: PageData;

  type GuideBlock = Record<string, unknown>;
  type BlockItem = { title: string; body: string };
  type DisplayImage = { id: string; title: string; caption: string; alt: string; url: string; record?: Record<string, unknown>; fields: string[] };
  type Fact = { icon: 'map' | 'compass' | 'calendar' | 'budget' | 'camera' | 'star'; label: string; value: string };
  type SafetyItem = { icon: 'shield' | 'health' | 'file' | 'phone' | 'security'; title: string; body: string };
  type DestinationTourCategory = {
    id: string;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    imageRecord?: Record<string, unknown>;
    imageFields: string[];
    tourCount: number;
    minPrice: number | null;
    minDays: number | null;
    maxDays: number | null;
  };

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value && typeof value === 'object' && !Array.isArray(value));

  const text = (value: unknown) => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
  };

  const firstParagraph = (value: unknown) => toMetaText(value, 230);

  const dateLabel = (value: unknown) => {
    const raw = text(value);
    if (!raw) return '';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
  };

  const scoreLabel = (value: unknown) => {
    const score = Number(value);
    if (!Number.isFinite(score) || score <= 0) return '';
    return score <= 5 ? `${score.toFixed(score % 1 ? 1 : 0)}/5` : String(Math.round(score));
  };

  const blockTitle = (block: GuideBlock) =>
    text(block.title) || text(block.heading) || text(block.question) || text(block.name);

  const blockSubtitle = (block: GuideBlock) => text(block.subtitle) || text(block.eyebrow) || text(block.kicker);

  const blockBody = (block: GuideBlock) =>
    text(block.body) || text(block.text) || text(block.content) || text(block.description) || text(block.answer);

  const blockCaption = (block: GuideBlock) => text(block.caption) || text(block.alt_text);

  const imageFromBlock = (block: GuideBlock) => {
    const direct = text(block.image_url) || text(block.image);
    if (direct) return direct;
    if (isRecord(block.image)) return text(block.image.url) || text(block.image.image_url) || text(block.image.src);
    return '';
  };

  const toBlockItems = (value: unknown): BlockItem[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === 'string') return { title: item.trim(), body: '' };
        if (!isRecord(item)) return { title: '', body: '' };
        const title = text(item.title) || text(item.label) || text(item.name) || text(item.heading);
        const body = text(item.body) || text(item.text) || text(item.description) || text(item.value);
        return title ? { title, body } : body ? { title: body, body: '' } : { title: '', body: '' };
      })
      .filter((item) => item.title || item.body);
  };

  const blockItems = (block: GuideBlock) =>
    [...toBlockItems(block.items), ...toBlockItems(block.facts), ...toBlockItems(block.highlights)].slice(0, 8);

  const tableColumns = (block: GuideBlock) => toBlockItems(block.columns).map((item) => item.title);

  const tableRows = (block: GuideBlock) => {
    if (!Array.isArray(block.rows)) return [];
    return block.rows
      .map((row) => {
        if (Array.isArray(row)) return row.map(text).filter(Boolean);
        if (isRecord(row)) return Object.values(row).map(text).filter(Boolean);
        return [text(row)].filter(Boolean);
      })
      .filter((row) => row.length);
  };

  const destinationImageItems = (destination: Destination | null, galleryImages: DestinationGalleryImage[], locationLabel: string) => {
    if (!destination) return [] as DisplayImage[];
    const seen = new Set<string>();
    const images: DisplayImage[] = [];

    const add = (url: string, title: string, caption = '', alt = title, record?: Record<string, unknown>, fields: string[] = []) => {
      const normalized = url.trim();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      images.push({
        id: `${images.length}-${normalized}`,
        title,
        caption,
        alt,
        url: normalized,
        record,
        fields
      });
    };

    for (const item of galleryImages) {
      if (item.media_type && item.media_type !== 'image') continue;
      add(
        text(item.image_url),
        text(item.title) || text(item.alt_text) || destination.name,
        text(item.caption),
        text(item.alt_text) || text(item.title) || destination.name,
        item as Record<string, unknown>,
        ['image_url']
      );
    }

    add(sourceFor(destination, 2000, 'main_image_url'), destination.name, locationLabel, destination.name, destination as Record<string, unknown>, ['main_image_url']);
    add(sourceFor(destination, 2000, 'image_url'), destination.name, locationLabel, destination.name, destination as Record<string, unknown>, ['image_url']);
    add(sourceFor(destination, 2000, 'banner_image_url'), destination.name, locationLabel, destination.name, destination as Record<string, unknown>, ['banner_image_url']);

    return images;
  };

  const destinationFacts = (destination: Destination | null, currencyState: typeof $currency) => {
    if (!destination) return [] as Fact[];
    const facts: Fact[] = [];
    const region = [destination.region, destination.country].filter(Boolean).join(', ') || destination.location || '';
    const budget = destination.score_budget_from ? formatUsd(destination.score_budget_from, currencyState) : '';
    const reviewed = dateLabel(destination.guide_reviewed_at);
    const wildlife = scoreLabel(destination.score_wildlife);
    const photography = scoreLabel(destination.score_photography);

    if (destination.country) facts.push({ icon: 'map', label: 'Country', value: destination.country });
    if (region) facts.push({ icon: 'compass', label: 'Area', value: region });
    if (budget) facts.push({ icon: 'budget', label: 'Starting budget', value: budget });
    if (wildlife) facts.push({ icon: 'star', label: 'Wildlife score', value: wildlife });
    if (photography) facts.push({ icon: 'camera', label: 'Photography score', value: photography });
    if (reviewed) facts.push({ icon: 'calendar', label: 'Guide reviewed', value: reviewed });

    return facts.slice(0, 5);
  };

  const safetyItemsFor = (destination: Destination | null) => {
    if (!destination) return [] as SafetyItem[];
    return [
      { icon: 'shield', title: 'Safety overview', body: text(destination.safety_overview) },
      { icon: 'health', title: 'Health & vaccinations', body: text(destination.health_vaccinations) },
      { icon: 'security', title: 'Security advice', body: text(destination.security_advice) },
      { icon: 'file', title: 'Travel insurance', body: text(destination.travel_insurance_note) },
      { icon: 'phone', title: 'Emergency contacts', body: text(destination.emergency_contacts) }
    ].filter((item) => toMetaText(item.body));
  };

  const positiveNumber = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };

  const availableOnly = (tour: Tour) => tour.is_available !== false;

  const matchingDestinationCategories = (tours: Tour[], categories: TourCategory[]) => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const bySlug = new Map(categories.map((category) => [category.slug, category]));
    const grouped = new Map<
      string,
      {
        category?: TourCategory;
        name: string;
        slug: string;
        id: string;
        tours: Tour[];
      }
    >();

    for (const tour of tours) {
      const embedded = tour.tour_categories;
      const category = (tour.category_id ? byId.get(tour.category_id) : undefined) || (embedded?.slug ? bySlug.get(embedded.slug) : undefined);
      const slug = text(category?.slug) || text(embedded?.slug);
      const name = text(category?.name) || text(embedded?.name);
      if (!slug || !name) continue;

      const existing = grouped.get(slug);
      if (existing) {
        existing.tours.push(tour);
      } else {
        grouped.set(slug, {
          category,
          name,
          slug,
          id: text(category?.id) || text(tour.category_id) || slug,
          tours: [tour]
        });
      }
    }

    return Array.from(grouped.values())
      .map(({ category, name, slug, id, tours }) => {
        const prices = tours.map((tour) => positiveNumber(tour.price_from)).filter((price): price is number => price !== null);
        const days = tours.map((tour) => positiveNumber(tour.duration_days)).filter((day): day is number => day !== null);
        const firstTourWithImage = tours.find((tour) => sourceFor(tour, 2000, 'main_image_url', 'banner_image_url'));
        const categoryImage = thumbUrl(category as Record<string, unknown> | undefined, 'image_url', 'icon_url');

        return {
          id,
          name,
          slug,
          description: toMetaText(text(category?.description) || text(category?.who_its_for), 170),
          imageUrl: categoryImage || sourceFor(firstTourWithImage, 2000, 'main_image_url', 'banner_image_url'),
          imageRecord: categoryImage
            ? (category as unknown as Record<string, unknown>)
            : (firstTourWithImage as unknown as Record<string, unknown> | undefined),
          imageFields: categoryImage ? ['image_url', 'icon_url'] : ['main_image_url', 'banner_image_url'],
          tourCount: tours.length,
          minPrice: prices.length ? Math.min(...prices) : null,
          minDays: days.length ? Math.min(...days) : null,
          maxDays: days.length ? Math.max(...days) : null
        } satisfies DestinationTourCategory;
      })
      .sort((a, b) => b.tourCount - a.tourCount || a.name.localeCompare(b.name))
      .slice(0, 6);
  };

  const destinationToursHref = (destination: Destination, category?: DestinationTourCategory) => {
    const params = new URLSearchParams({ destination: destination.slug });
    if (category) params.set('category', category.slug);
    return `/tours?${params.toString()}`;
  };

  const dayRangeLabel = (category: DestinationTourCategory) => {
    if (!category.minDays) return '';
    if (!category.maxDays || category.minDays === category.maxDays) {
      return `${category.minDays} ${category.minDays === 1 ? 'day' : 'days'}`;
    }
    return `${category.minDays}-${category.maxDays} days`;
  };

  const categoryTourLabel = (category: DestinationTourCategory) =>
    `${category.tourCount} available ${category.tourCount === 1 ? 'tour' : 'tours'}`;

  const absoluteUrl = (origin: string, path: string) => {
    if (!origin) return path;
    try {
      return new URL(path, origin).toString();
    } catch {
      return path;
    }
  };

  const tourItemListLd = (origin: string, destination: Destination | null, tours: Tour[]) => {
    if (!destination || !tours.length) return null as Record<string, unknown> | null;
    return {
      '@type': 'ItemList',
      name: `Available ${destination.name} tours`,
      description: `Published tour packages available for ${destination.name}.`,
      itemListElement: tours.slice(0, 12).map((tour, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: tour.title,
        url: absoluteUrl(origin, `/tours/${tour.slug}`)
      }))
    };
  };

  const categoryItemListLd = (origin: string, destination: Destination | null, categories: DestinationTourCategory[]) => {
    if (!destination || !categories.length) return null as Record<string, unknown> | null;
    return {
      '@type': 'ItemList',
      name: `${destination.name} tour categories`,
      description: `Tour categories with available packages for ${destination.name}.`,
      itemListElement: categories.map((category, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: category.name,
        url: absoluteUrl(origin, destinationToursHref(destination, category))
      }))
    };
  };

  const roleLabel = (role: TripPoint['role']) =>
    role === 'start' ? 'Trips start here' : role === 'end' ? 'Trips end here' : 'Start & end point';

  const reviewInitials = (review: Review) =>
    review.author_initials ||
    review.author_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') ||
    '?';

  $: destination = data.destination as Destination | null;
  $: relatedTours = (data.relatedTours ?? []) as Tour[];
  $: tourCategories = (data.tourCategories ?? []) as TourCategory[];
  $: otherDestinations = (data.otherDestinations ?? []) as Destination[];
  $: lodges = (data.lodges ?? []) as Lodge[];
  $: activities = (data.activities ?? []) as Activity[];
  $: tripPoints = (data.tripPoints ?? []) as TripPoint[];
  $: galleryImages = (data.galleryImages ?? []) as DestinationGalleryImage[];
  $: faqs = (data.faqs ?? []) as FAQ[];
  $: reviews = (data.reviews ?? []) as Review[];
  $: origin = data.origin ?? '';

  $: heroImage = destination ? sourceFor(destination, 2000, 'banner_image_url', 'main_image_url', 'image_url') : '';
  $: mainImage = destination ? sourceFor(destination, 2000, 'main_image_url', 'image_url', 'banner_image_url') : '';
  $: heroVariants = variantsOf(destination, 'banner_image_url', 'main_image_url', 'image_url');
  $: heroPreloadType = heroVariants?.avif ? 'image/avif' : heroVariants ? 'image/webp' : undefined;
  $: heroPreloadSrcset = heroVariants ? srcsetFor(heroVariants, heroVariants.avif ? 'avif' : 'webp') : '';
  $: heroPreloadHref =
    variantSrc(heroVariants, 2000, heroVariants?.avif ? 'avif' : 'webp') || imgUrl(heroImage, 1800, 72);
  $: locationLabel = destination
    ? [destination.region, destination.country].filter(Boolean).join(', ') || destination.location || ''
    : '';
  $: summary = destination ? toMetaText(destination.short_description || destination.description || '', 230) : '';
  $: hasIntro = destination ? hasRichContent(destination.description) : false;
  $: guideBlocks = destination && Array.isArray(destination.guide) ? (destination.guide.filter(isRecord) as GuideBlock[]) : [];
  $: visibleGuideBlocks = guideBlocks
    .filter((block) => blockTitle(block) || blockBody(block) || blockItems(block).length || tableRows(block).length)
    .slice(0, 6);
  // A block that is only a list of facts ("At a glance") is reference material,
  // not reading material: it belongs beside the article in the sticky rail, not
  // interrupting the prose. Everything else reads top to bottom.
  $: guideFactsBlock = visibleGuideBlocks.find((block) => blockItems(block).length && !blockBody(block)) ?? null;
  $: guideSections = visibleGuideBlocks.filter((block) => block !== guideFactsBlock);
  $: guideFacts = guideFactsBlock ? blockItems(guideFactsBlock) : [];
  $: visualImages = destinationImageItems(destination, galleryImages, locationLabel);
  $: facts = destinationFacts(destination, $currency);
  $: safetyItems = safetyItemsFor(destination);
  $: availableTours = relatedTours.filter(availableOnly);
  $: relevantTourCategories = matchingDestinationCategories(availableTours, tourCategories);
  $: availableTourListSchema = tourItemListLd(origin, destination, availableTours);
  $: categoryListSchema = categoryItemListLd(origin, destination, relevantTourCategories);
  $: hasPlanning = safetyItems.length > 0 || tripPoints.length > 0;
  $: title = destination?.meta_title || (destination ? `${destination.name} Travel Guide` : 'Destination');
  $: description = toMetaText(destination?.meta_description || summary || 'Explore this destination with Goldfinch Adventures.', 170);

  onMount(() => {
    if (destination) trackEvent('destination_page_view', { destination: destination.name });
  });
</script>

<svelte:head>
  <title>{title} | Goldfinch Adventures</title>
  <meta name="description" content={description} />
  {#if destination?.og_image_url || heroImage}
    <meta property="og:image" content={destination?.og_image_url || heroImage} />
  {/if}
  {#if heroImage}
    <link
      rel="preload"
      as="image"
      href={heroPreloadHref}
      imagesrcset={heroPreloadSrcset || undefined}
      imagesizes="100vw"
      type={heroPreloadType}
      fetchpriority="high"
    />
  {/if}
</svelte:head>

{#if !destination}
  <section class="container-shell py-20">
    <ErrorState message="Destination not found." />
  </section>
{:else}
  <div class="destination-page overflow-x-hidden">
    <JsonLd
      data={breadcrumbLd(origin, [
        { name: 'Home', path: '/' },
        { name: 'Destinations', path: '/destinations' },
        { name: destination.name, path: `/destinations/${destination.slug}` }
      ])}
    />
    {#if availableTourListSchema}
      <JsonLd data={availableTourListSchema} />
    {/if}
    {#if categoryListSchema}
      <JsonLd data={categoryListSchema} />
    {/if}

  <section class="relative min-h-[560px] overflow-hidden bg-deep-green text-white md:min-h-[640px]">
    {#if heroImage}
      <Img
        record={destination}
        fields={['banner_image_url', 'main_image_url', 'image_url']}
        alt=""
        width={2000}
        sizes="100vw"
        eager
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-r from-deep-green via-deep-green/78 to-deep-green/20"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-transparent to-black/25"></div>
    {:else}
      <div class="absolute inset-0 bg-deep-green"></div>
    {/if}

    <div class="container-shell relative flex min-h-[560px] flex-col justify-end pb-10 pt-28 md:min-h-[640px] md:pb-14">
      <nav class="mb-auto flex flex-wrap items-center gap-2 pt-4 text-sm font-medium text-white/70">
        <a class="transition hover:text-white" href="/">Home</a>
        <span class="text-white/35">/</span>
        <a class="transition hover:text-white" href="/destinations">Destinations</a>
        <span class="text-white/35">/</span>
        <span class="text-white">{destination.name}</span>
      </nav>

      <div class="max-w-4xl min-w-0">
        {#if locationLabel}
          <p class="inline-flex items-center gap-2 rounded-[8px] border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold backdrop-blur">
            <MapPin size={13} strokeWidth={2.5} />
            {locationLabel}
          </p>
        {/if}
        <h1 class="mt-5 text-4xl font-extrabold leading-[1.02] tracking-normal md:text-6xl lg:text-7xl" use:revealHeading>
          {destination.name}
        </h1>
        {#if summary}
          <p class="mt-5 max-w-2xl break-words text-base font-medium leading-8 text-white/84 md:text-lg">{summary}</p>
        {/if}
        <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 text-sm font-bold text-heading shadow-lg shadow-black/10 transition hover:brightness-105 sm:w-auto" href={`/plan-my-trip?destination=${destination.slug}`}>
            Plan this destination <ArrowRight size={17} />
          </a>
          {#if availableTours.length}
            <a class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-white/35 bg-white/8 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 sm:w-auto" href="#recommended-trips">
              See matching trips <ArrowRight size={17} />
            </a>
          {/if}
        </div>
      </div>
    </div>
  </section>

  {#if facts.length}
    <section class="bg-forest text-white">
      <div class="container-shell grid gap-px bg-white/10 sm:grid-cols-2 lg:flex">
        {#each facts as fact}
          <div class="flex min-h-[92px] items-center gap-3 bg-forest px-4 py-5 lg:flex-1">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-goldfinch-gold text-heading">
              {#if fact.icon === 'map'}
                <MapPin size={18} />
              {:else if fact.icon === 'compass'}
                <Compass size={18} />
              {:else if fact.icon === 'calendar'}
                <CalendarDays size={18} />
              {:else if fact.icon === 'budget'}
                <Info size={18} />
              {:else if fact.icon === 'camera'}
                <Camera size={18} />
              {:else}
                <Star size={18} />
              {/if}
            </span>
            <div class="min-w-0">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">{fact.label}</p>
              <p class="mt-1 truncate text-sm font-bold text-white">{fact.value}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <section class="bg-canvas py-14 md:py-20">
    <div class="container-shell grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
      <aside class="lg:sticky lg:top-24" use:fadeUpOnScroll={{ y: 14 }}>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Destination guide</p>
        <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[42px]">About {destination.name}</h2>
        {#if summary}
          <p class="mt-4 text-base leading-8 text-ink/70">{summary}</p>
        {/if}
        {#if mainImage}
          <div class="mt-7 overflow-hidden rounded-[8px] bg-skywash shadow-soft">
            <Img
              record={destination}
              fields={['main_image_url', 'image_url', 'banner_image_url']}
              alt={destination.name}
              width={900}
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        {/if}

        {#if guideFacts.length}
          <dl class="mt-7 overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-card">
            <p class="border-b border-ink/10 bg-sand/45 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/55">
              {(guideFactsBlock && blockTitle(guideFactsBlock)) || 'At a glance'}
            </p>
            {#each guideFacts as fact}
              <div class="flex items-baseline justify-between gap-4 border-b border-ink/10 px-4 py-3 last:border-b-0">
                <dt class="shrink-0 text-[13px] font-semibold text-ink/55">{fact.title.replace(/:$/, '')}</dt>
                <dd class="text-right text-[13px] font-bold text-heading">{fact.body || '—'}</dd>
              </div>
            {/each}
          </dl>
        {/if}
      </aside>

      <div class="space-y-10">
        {#if hasIntro}
          <article class="border-b border-ink/10 pb-10">
            <RichText value={destination.description} className="prose-destination max-w-none text-[15px] leading-8 text-ink/72" />
          </article>
        {/if}

        {#if guideSections.length}
          <div class="space-y-10">
            {#each guideSections as block, index}
              <!-- Single measured column. The old layout split every section into
                   1fr + 300px for an image and alternated the side, but a guide
                   section rarely has its own image, so it mostly rendered prose
                   squeezed against an empty gutter that flipped left to right.
                   Images now sit inline under the heading instead. -->
              <article class="border-b border-ink/10 pb-10 last:border-b-0 last:pb-0">
                <div>
                  {#if blockSubtitle(block)}
                    <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{blockSubtitle(block)}</p>
                  {/if}
                  {#if blockTitle(block)}
                    <h3 class="mt-2 flex items-baseline gap-3 text-2xl font-bold leading-tight text-heading">
                      <span class="shrink-0 font-serif text-base font-semibold italic text-goldfinch-gold">{String(index + 1).padStart(2, '0')}</span>
                      <span>{blockTitle(block)}</span>
                    </h3>
                  {/if}
                  {#if blockBody(block)}
                    <RichText value={blockBody(block)} className="mt-4 max-w-[68ch] text-[15px] leading-8 text-ink/72" />
                  {/if}

                  {#if blockItems(block).length}
                    <div class="mt-5 grid gap-3 sm:grid-cols-2">
                      {#each blockItems(block) as item}
                        <div class="rounded-[8px] border border-ink/10 bg-surface p-4 shadow-card">
                          <p class="flex items-start gap-2 text-sm font-bold text-heading">
                            <CheckCircle2 size={15} class="mt-0.5 shrink-0 text-forest" />
                            {item.title}
                          </p>
                          {#if item.body}
                            <p class="mt-2 text-sm leading-6 text-ink/65">{item.body}</p>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}

                  {#if tableRows(block).length}
                    <div class="mt-5 overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-card">
                      {#if tableColumns(block).length}
                        <div class="grid bg-sand/45 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/55" style={`grid-template-columns: repeat(${tableColumns(block).length}, minmax(0, 1fr));`}>
                          {#each tableColumns(block) as column}
                            <span class="px-4 py-3">{column}</span>
                          {/each}
                        </div>
                      {/if}
                      {#each tableRows(block) as row}
                        <div class="grid border-t border-ink/10 text-sm leading-6 text-ink/70" style={`grid-template-columns: repeat(${Math.max(row.length, 1)}, minmax(0, 1fr));`}>
                          {#each row as cell}
                            <span class="px-4 py-3">{cell}</span>
                          {/each}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>

                {#if imageFromBlock(block)}
                  <figure class="mt-6">
                    <div class="overflow-hidden rounded-[8px] bg-skywash shadow-soft">
                      <Img
                        src={imageFromBlock(block)}
                        alt={blockCaption(block) || blockTitle(block) || destination.name}
                        width={1100}
                        sizes="(max-width: 1024px) 92vw, 62vw"
                        aspect="16/9"
                        className="aspect-[16/9] w-full object-cover transition duration-700 hover:scale-[1.04]"
                      />
                    </div>
                    {#if blockCaption(block)}
                      <figcaption class="mt-2 text-xs leading-5 text-ink/50">{blockCaption(block)}</figcaption>
                    {/if}
                  </figure>
                {/if}
              </article>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </section>

  {#if visualImages.length}
    <section class="bg-sand/45 py-14 md:py-20">
      <div class="container-shell">
        <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 14 }}>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Gallery</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">{destination.name} in pictures</h2>
          <p class="mt-3 text-base leading-7 text-ink/65">Published images connected to this destination.</p>
        </div>

        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
          {#each visualImages.slice(0, 6) as image, index (image.id)}
            <a class={`group relative block overflow-hidden rounded-[8px] bg-forest shadow-card ring-1 ring-black/10 ${index === 0 ? 'lg:row-span-2' : ''}`} href="/gallery">
              <Img
                record={image.record}
                fields={image.fields}
                src={image.record ? '' : image.url}
                alt={image.alt}
                width={index === 0 ? 1100 : 760}
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
                eager={index === 0}
                className={`w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06] ${index === 0 ? 'aspect-[4/5] lg:h-full' : 'aspect-[4/3]'}`}
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-transparent opacity-80 transition group-hover:opacity-95"></div>
              <div class="absolute inset-x-0 bottom-0 p-4 text-white transition duration-300 group-hover:-translate-y-1">
                <p class="inline-flex items-center gap-1.5 rounded-[6px] bg-black/45 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/80 backdrop-blur">
                  <ImageIcon size={12} /> Photo
                </p>
                <h3 class="mt-3 text-lg font-bold leading-tight text-white">{image.title}</h3>
                {#if image.caption}
                  <p class="mt-2 line-clamp-2 max-h-0 text-sm leading-6 text-white/82 opacity-0 transition-all duration-300 group-hover:max-h-20 group-hover:opacity-100">{image.caption}</p>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if availableTours.length}
    <section id="recommended-trips" class="bg-canvas py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div class="max-w-3xl">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Available tours</p>
            <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">Available {destination.name} tour packages</h2>
            <p class="mt-3 text-base leading-7 text-ink/65">
              Published tour packages currently linked to {destination.name}, grouped by the matching CMS tour styles below.
            </p>
          </div>
          <a class="inline-flex h-11 items-center gap-2 rounded-[8px] border border-ink/10 bg-surface px-5 text-sm font-bold text-forest shadow-sm transition hover:border-forest/25 hover:text-heading" href={destinationToursHref(destination)}>
            View all available tours <ArrowRight size={15} />
          </a>
        </div>

        {#if relevantTourCategories.length}
          <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
            {#each relevantTourCategories as category (category.id)}
              <a
                class="group flex h-full flex-col overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:border-forest/25 hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-forest/30"
                href={destinationToursHref(destination, category)}
                aria-label={`View ${category.name} tours in ${destination.name}`}
              >
                <div class="relative aspect-[16/10] overflow-hidden bg-skywash">
                  {#if category.imageUrl}
                    <Img
                      record={category.imageRecord}
                      fields={category.imageFields}
                      src={category.imageRecord ? '' : category.imageUrl}
                      alt={category.name}
                      width={520}
                      sizes="(max-width: 768px) 92vw, (max-width: 1280px) 45vw, 31vw"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
                    />
                  {:else}
                    <div class="grid h-full place-items-center bg-forest/8 text-forest">
                      <Compass size={34} />
                    </div>
                  {/if}
                  <span class="absolute left-3 top-3 rounded-[6px] bg-white/92 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-forest shadow-sm backdrop-blur">
                    {categoryTourLabel(category)}
                  </span>
                </div>
                <div class="flex min-w-0 flex-1 flex-col p-5">
                  <div class="flex flex-wrap items-center gap-2">
                    {#if dayRangeLabel(category)}
                      <span class="rounded-[6px] bg-sand/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/56">
                        {dayRangeLabel(category)}
                      </span>
                    {/if}
                  </div>
                  <h3 class="mt-4 text-xl font-bold leading-tight text-heading">{category.name}</h3>
                  {#if category.description}
                    <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/68">{toMetaText(category.description, 170)}</p>
                  {/if}
                  <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5 text-sm">
                    <span class="font-semibold text-forest">
                      {#if category.minPrice}
                        From {formatUsd(category.minPrice, $currency)}
                      {:else}
                        Price on request
                      {/if}
                    </span>
                    <span class="inline-flex items-center gap-1 font-bold text-heading">
                      View style <ArrowRight size={14} class="transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        {/if}

        <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.05 }}>
          {#each availableTours as tour (tour.id)}
            <TourCard {tour} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if activities.length || lodges.length}
    <section class="border-y border-ink/[0.06] bg-sand/35 py-14 md:py-20">
      <div class="container-shell grid gap-12">
        {#if activities.length}
          <div>
            <div class="max-w-3xl">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Things to do</p>
              <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[38px]">Experiences in {destination.name}</h2>
              <p class="mt-3 text-base leading-7 text-ink/65">Published activities linked to this destination.</p>
            </div>
            <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
              {#each activities as activity (activity.id)}
                <ActivityCard {activity} />
              {/each}
            </div>
          </div>
        {/if}

        {#if lodges.length}
          <div>
            <div class="max-w-3xl">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Where to stay</p>
              <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[38px]">Lodges & camps in {destination.name}</h2>
              <p class="mt-3 text-base leading-7 text-ink/65">Published accommodation linked to this destination.</p>
            </div>
            <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
              {#each lodges as lodge (lodge.id)}
                <LodgeCard {lodge} />
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  {#if hasPlanning}
    <section class="bg-canvas py-14 md:py-20">
      <div class="container-shell grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div use:fadeUpOnScroll={{ y: 14 }}>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Planning details</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">Useful details for {destination.name}</h2>
          <p class="mt-4 text-base leading-8 text-ink/68">This section renders practical destination fields from the CMS.</p>
          <a class="mt-6 inline-flex h-11 items-center gap-2 rounded-[8px] border border-ink/10 bg-surface px-5 text-sm font-bold text-forest shadow-sm transition hover:border-forest/25 hover:text-heading" href="/safety">
            Full safety guide <ArrowRight size={15} />
          </a>
        </div>

        <div class="grid gap-5">
          {#if tripPoints.length}
            <div class="rounded-[8px] border border-ink/10 bg-surface p-5 shadow-card">
              <div class="flex items-center gap-3">
                <span class="grid h-10 w-10 place-items-center rounded-[8px] bg-forest/10 text-forest"><Plane size={18} /></span>
                <h3 class="text-xl font-bold text-heading">Getting there</h3>
              </div>
              <div class="mt-5 grid gap-3">
                {#each tripPoints as point (point.id)}
                  <div class="rounded-[8px] bg-sand/35 p-4">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="font-bold text-heading">{point.name}</p>
                      {#if point.airport_code}
                        <span class="rounded-[6px] bg-forest/10 px-2 py-0.5 font-mono text-[11px] font-bold text-forest">{point.airport_code}</span>
                      {/if}
                    </div>
                    <p class="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-clay">{roleLabel(point.role)}</p>
                    {#if point.transfer_info}
                      <p class="mt-2 text-sm leading-6 text-ink/68">{point.transfer_info}</p>
                    {:else if point.description}
                      <p class="mt-2 text-sm leading-6 text-ink/68">{point.description}</p>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if safetyItems.length}
            <div class="grid gap-3 sm:grid-cols-2">
              {#each safetyItems as item}
                <div class="rounded-[8px] border border-ink/10 bg-surface p-5 shadow-card">
                  <span class="grid h-10 w-10 place-items-center rounded-[8px] bg-sand/70 text-forest">
                    {#if item.icon === 'shield'}
                      <ShieldCheck size={18} />
                    {:else if item.icon === 'health'}
                      <HeartPulse size={18} />
                    {:else if item.icon === 'file'}
                      <FileCheck size={18} />
                    {:else if item.icon === 'phone'}
                      <Phone size={18} />
                    {:else}
                      <Shield size={18} />
                    {/if}
                  </span>
                  <h3 class="mt-4 text-lg font-bold text-heading">{item.title}</h3>
                  <RichText value={item.body} className="mt-2 text-sm leading-6 text-ink/68" />
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </section>
  {/if}

  {#if reviews.length}
    <section class="border-y border-ink/[0.06] bg-sand/35 py-14 md:py-20">
      <div class="container-shell">
        <div class="max-w-3xl">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Traveller reviews</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">What travellers say</h2>
          <p class="mt-3 text-base leading-7 text-ink/65">Featured approved reviews from the CMS.</p>
        </div>

        <div class="mt-8 grid gap-5 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.05 }}>
          {#each reviews as review (review.id)}
            <article class="relative flex h-full flex-col rounded-[8px] border border-ink/10 bg-surface p-5 shadow-card">
              <Quote size={30} class="absolute right-5 top-5 text-sand" />
              <div class="flex items-center gap-3">
                {#if review.author_photo_url}
                  <Img
                    record={review}
                    fields={['author_photo_url']}
                    alt={review.author_name}
                    width={120}
                    height={120}
                    className="h-11 w-11 rounded-[8px] object-cover"
                  />
                {:else}
                  <span class="grid h-11 w-11 place-items-center rounded-[8px] bg-forest/10 text-sm font-bold text-forest">{reviewInitials(review)}</span>
                {/if}
                <div class="min-w-0">
                  <p class="truncate font-bold text-heading">{review.author_name}</p>
                  <p class="truncate text-xs text-ink/55">{[review.country, review.platform].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <div class="mt-4 flex items-center gap-1 text-goldfinch-gold">
                {#each Array(5) as _, i}
                  <Star size={15} fill={i < Math.round(review.rating) ? 'currentColor' : 'none'} class={i < Math.round(review.rating) ? 'text-goldfinch-gold' : 'text-ink/20'} />
                {/each}
              </div>
              <p class="mt-4 flex-1 text-sm leading-7 text-ink/70">"{review.message}"</p>
            </article>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if otherDestinations.length}
    <section class="bg-canvas py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div class="max-w-3xl">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Keep exploring</p>
            <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">More destinations</h2>
            <p class="mt-3 text-base leading-7 text-ink/65">Other published destinations from the CMS.</p>
          </div>
          <a class="inline-flex h-11 items-center gap-2 rounded-[8px] border border-ink/10 bg-surface px-5 text-sm font-bold text-forest shadow-sm transition hover:border-forest/25 hover:text-heading" href="/destinations">
            All destinations <ArrowRight size={15} />
          </a>
        </div>
        <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.05 }}>
          {#each otherDestinations as item (item.id)}
            <DestinationCard destination={item} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if faqs.length}
    <section class="border-t border-ink/[0.06] bg-sand/35 py-14 md:py-20">
      <div class="container-shell grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">FAQ</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">Questions about {destination.name}</h2>
          <p class="mt-4 text-base leading-8 text-ink/68">Destination-specific FAQs from the CMS.</p>
        </div>
        <FAQAccordion {faqs} />
      </div>
    </section>
  {/if}

  <section class="bg-deep-green py-14 text-white md:py-20">
    <div class="container-shell text-center">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-goldfinch-gold">Plan with a local specialist</p>
      <h2 class="mx-auto mt-3 max-w-3xl text-3xl font-bold leading-tight md:text-[42px]">Plan your {destination.name} safari with local support</h2>
      <p class="mx-auto mt-4 max-w-2xl break-words text-base leading-8 text-white/72">
        Share your dates, interests, and comfort level so the team can shape the right route around {destination.name}.
      </p>
      <div class="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <a class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 text-sm font-bold text-heading shadow-lg shadow-black/10 transition hover:brightness-105 sm:w-auto" href={`/plan-my-trip?destination=${destination.slug}`}>
          Start planning <ArrowRight size={17} />
        </a>
        <a class="inline-flex h-12 w-full items-center justify-center rounded-[8px] border border-white/25 px-6 text-sm font-bold text-white transition hover:bg-white/10 sm:w-auto" href="/contact">
          Contact us
        </a>
      </div>
    </div>
  </section>
  </div>
{/if}

<style>
  :global(.destination-page .container-shell) {
    width: calc(100vw - 48px);
    max-width: 1320px;
  }

  @media (max-width: 480px) {
    :global(.destination-page .container-shell) {
      width: calc(100vw - 32px);
    }
  }
</style>
