<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowLeft,
    ArrowRight,
    BedDouble,
    CalendarDays,
    CheckCircle2,
    Compass,
    FileCheck,
    HeartPulse,
    Image as ImageIcon,
    Info,
    MapPin,
    Phone,
    Plane,
    Route,
    Shield,
    ShieldCheck
  } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal } from '$lib/animations';
  import ActivityCard from '$lib/components/public/ActivityCard.svelte';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ReviewsWidget from '$lib/components/public/ReviewsWidget.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { currency, formatUsd } from '$lib/currency';
  import { imgUrl, thumbUrl, sourceFor, srcsetFor, variantSrc, variantsOf } from '$lib/img';
  import Img from '$lib/components/public/Img.svelte';
  import { hasRichContent, toMetaText } from '$lib/richText';
  import { breadcrumbLd } from '$lib/seo';
  import type { Activity, Destination, FAQ, Lodge, Tour, TourCategory, TripPoint } from '$lib/types';
  import type { DestinationGalleryImage } from './+page.server';
  import type { PageData } from './$types';

  export let data: PageData;

  type GuideBlock = Record<string, unknown>;
  type BlockItem = { title: string; body: string };
  type DisplayImage = { id: string; title: string; caption: string; alt: string; url: string; record?: Record<string, unknown>; fields: string[] };
  type SafetyItem = { icon: 'shield' | 'health' | 'file' | 'phone' | 'security'; title: string; body: string };
  type Icon = typeof MapPin;
  type DestinationTab = { id: string; label: string };
  type PlanningTab = {
    id: string;
    label: string;
    icon: Icon;
    title: string;
    support: string;
    items: BlockItem[];
    tip?: string;
  };
  type HighlightCard = {
    key: string;
    title: string;
    caption: string;
    eyebrow: string;
    image: string;
    record?: Record<string, unknown>;
    fields: string[];
  };
  type LodgeFeatureCard = {
    key: string;
    name: string;
    href: string;
    meta: string;
    summary: string;
    image: string;
    record?: Record<string, unknown>;
    fields: string[];
  };
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

  const DESTINATION_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'why-visit', label: 'Why Visit' },
    { id: 'highlights', label: 'Highlights' },
    { id: 'best-time', label: 'Best Time' },
    { id: 'route-planning', label: 'Routes' },
    { id: 'recommended-trips', label: 'Trips' },
    { id: 'where-to-stay', label: 'Where to Stay' },
    { id: 'travel-tips', label: 'Travel Tips' },
    { id: 'good-to-know', label: 'Good to Know' }
  ];

  const LODGE_TYPES: Record<string, string> = {
    tented_camp: 'Tented camp',
    mobile_camp: 'Mobile camp',
    lodge: 'Lodge',
    hotel: 'Hotel',
    treehouse: 'Treehouse'
  };

  const LODGE_LEVELS: Record<string, string> = {
    budget: 'Budget',
    mid_range: 'Mid-range',
    luxury: 'Luxury',
    ultra_luxury: 'Ultra-luxury'
  };

  let activeTab = DESTINATION_TABS[0].id;
  let activeFaqIndex = -1;
  let activePlanningTab = '';

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value && typeof value === 'object' && !Array.isArray(value));

  const text = (value: unknown) => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
  };

  const normaliseLabel = (value: unknown): string =>
    String(value ?? '')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const unique = (items: Array<string | null | undefined>): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of items) {
      const value = String(item ?? '').trim();
      if (!value || seen.has(value.toLowerCase())) continue;
      seen.add(value.toLowerCase());
      result.push(value);
    }
    return result;
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

  const safetyItemsFor = (destination: Destination | null) => {
    if (!destination) return [] as SafetyItem[];
    const items: SafetyItem[] = [
      { icon: 'shield', title: 'Safety overview', body: text(destination.safety_overview) },
      { icon: 'health', title: 'Health & vaccinations', body: text(destination.health_vaccinations) },
      { icon: 'security', title: 'Security advice', body: text(destination.security_advice) },
      { icon: 'file', title: 'Travel insurance', body: text(destination.travel_insurance_note) },
      { icon: 'phone', title: 'Emergency contacts', body: text(destination.emergency_contacts) }
    ];
    return items.filter((item) => toMetaText(item.body));
  };

  const positiveNumber = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };

  const availableOnly = (tour: Tour) => tour.is_available !== false;

  const tourDuration = (tour: Tour) => {
    if (!tour.duration_days) return '';
    const days = `${tour.duration_days} ${tour.duration_days === 1 ? 'day' : 'days'}`;
    if (!tour.duration_nights) return days;
    return `${days} / ${tour.duration_nights} ${tour.duration_nights === 1 ? 'night' : 'nights'}`;
  };

  const tourPrice = (tour: Tour, currencyState: typeof $currency) =>
    tour.price_from ? `From ${formatUsd(tour.price_from, currencyState)}` : 'Price on request';

  const destinationNamesForTour = (tour: Tour) => {
    const linked = (tour.tour_destinations ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((item) => item.destinations?.name)
      .filter(Boolean) as string[];
    return unique([...(linked.length ? linked : []), tour.destinations?.name]).slice(0, 4).join(' -> ');
  };

  const routeSummaryForTour = (tour: Tour) => {
    if (tour.start_location && tour.end_location) return `${tour.start_location} -> ${tour.end_location}`;
    return destinationNamesForTour(tour) || tour.start_location || tour.end_location || '';
  };

  const durationRangeFromTours = (tours: Tour[]) => {
    const days = tours.map((tour) => positiveNumber(tour.duration_days)).filter((day): day is number => day !== null);
    if (!days.length) return '';
    const min = Math.min(...days);
    const max = Math.max(...days);
    if (min === max) return `${min} ${min === 1 ? 'day' : 'days'}`;
    return `${min}-${max} days`;
  };

  const priceFloorFromTours = (tours: Tour[], currencyState: typeof $currency) => {
    const prices = tours.map((tour) => positiveNumber(tour.price_from)).filter((price): price is number => price !== null);
    return prices.length ? formatUsd(Math.min(...prices), currencyState) : '';
  };

  const blockSearchText = (block: GuideBlock) =>
    [blockTitle(block), blockSubtitle(block), blockBody(block), ...blockItems(block).map((item) => `${item.title} ${item.body}`)]
      .join(' ')
      .toLowerCase();

  const isSeasonGuideBlock = (block: GuideBlock) => {
    const value = blockSearchText(block);
    return /\b(best time|when to visit|season|months?|dry season|green season|migration|rain)\b/.test(value);
  };

  const guideBlockKey = (block: GuideBlock, index: number) =>
    `${index}-${blockTitle(block) || blockSubtitle(block) || blockBody(block).slice(0, 30)}`;

  const highlightCardsFor = (
    destination: Destination | null,
    activities: Activity[],
    visualImages: DisplayImage[],
    guideSections: GuideBlock[]
  ) => {
    if (!destination) return [] as HighlightCard[];
    const cards: HighlightCard[] = [];
    const add = (card: HighlightCard) => {
      if (!card.title || cards.some((item) => item.title.toLowerCase() === card.title.toLowerCase())) return;
      cards.push(card);
    };

    for (const activity of activities) {
      const image = sourceFor(activity, 800, 'image_url', 'hero_image_url');
      add({
        key: `activity-${activity.id}`,
        title: activity.name,
        caption: toMetaText(activity.why_we_recommend || activity.description || '', 150),
        eyebrow: normaliseLabel(activity.category),
        image,
        record: activity as unknown as Record<string, unknown>,
        fields: ['image_url', 'hero_image_url']
      });
    }

    for (const image of visualImages) {
      add({
        key: `image-${image.id}`,
        title: image.title || destination.name,
        caption: toMetaText(image.caption, 150),
        eyebrow: 'Photo',
        image: image.url,
        record: image.record,
        fields: image.fields
      });
    }

    for (const block of guideSections) {
      for (const item of blockItems(block)) {
        add({
          key: `guide-${cards.length}-${item.title}`,
          title: item.title,
          caption: toMetaText(item.body || blockBody(block), 150),
          eyebrow: blockTitle(block) || 'Guide note',
          image: imageFromBlock(block) || sourceFor(destination, 900, 'main_image_url', 'image_url', 'banner_image_url'),
          fields: []
        });
      }
    }

    return cards.filter((card) => card.caption || card.image).slice(0, 6);
  };

  const lodgeFeatureCardsFor = (lodges: Lodge[]) =>
    lodges.slice(0, 6).map((lodge) => {
      const image = sourceFor(lodge, 900, 'image_url', 'hero_image_url');
      const meta = unique([
        LODGE_LEVELS[lodge.accommodation_level] ?? normaliseLabel(lodge.accommodation_level),
        LODGE_TYPES[lodge.lodge_type] ?? normaliseLabel(lodge.lodge_type),
        lodge.destinations?.name
      ]).join(' / ');

      return {
        key: lodge.id,
        name: lodge.name,
        href: `/accommodation/${lodge.slug}`,
        meta,
        summary: toMetaText(lodge.why_we_recommend || lodge.description || '', 150),
        image,
        record: lodge as unknown as Record<string, unknown>,
        fields: ['image_url', 'hero_image_url']
      } satisfies LodgeFeatureCard;
    });

  const planningTabsFor = (destination: Destination | null, tripPoints: TripPoint[], safetyItems: SafetyItem[]) => {
    if (!destination) return [] as PlanningTab[];
    const tabs: PlanningTab[] = [];

    if (tripPoints.length) {
      tabs.push({
        id: 'getting-there',
        label: 'Getting There',
        icon: Plane,
        title: `Getting to ${destination.name}`,
        support: 'Published gateway and transfer notes connected to this destination.',
        items: tripPoints.map((point) => ({
          title: [point.name, point.airport_code].filter(Boolean).join(' / '),
          body: text(point.transfer_info) || text(point.description) || roleLabel(point.role)
        }))
      });
    }

    for (const item of safetyItems) {
      const icon =
        item.icon === 'health' ? HeartPulse : item.icon === 'file' ? FileCheck : item.icon === 'phone' ? Phone : item.icon === 'security' ? Shield : ShieldCheck;
      tabs.push({
        id: item.icon,
        label: item.title.replace(/\s*&\s*/g, ' & '),
        icon,
        title: item.title,
        support: 'This guidance is rendered from the published destination record.',
        items: [{ title: item.title, body: item.body }]
      });
    }

    return tabs;
  };

  const scrollToSection = (id: string) => {
    if (typeof window === 'undefined') return;
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const updateActiveDestinationTab = (tabs: DestinationTab[]) => {
    if (typeof window === 'undefined' || !tabs.length) return;
    const y = window.scrollY + 132;
    let current = tabs[0].id;
    for (const tab of tabs) {
      const el = document.getElementById(tab.id);
      if (el && el.offsetTop <= y) current = tab.id;
    }
    activeTab = current;
  };

  const updateFaqTimeline = () => {
    if (typeof window === 'undefined') return;
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-destination-faq-item]'));
    if (!items.length) {
      activeFaqIndex = -1;
      return;
    }
    const threshold = window.innerHeight * 0.48;
    let reached = -1;
    for (const [index, item] of items.entries()) {
      if (item.getBoundingClientRect().top <= threshold) reached = index;
    }
    activeFaqIndex = reached;
  };

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

  $: destination = data.destination as Destination | null;
  $: relatedTours = (data.relatedTours ?? []) as Tour[];
  $: tourCategories = (data.tourCategories ?? []) as TourCategory[];
  $: otherDestinations = (data.otherDestinations ?? []) as Destination[];
  $: lodges = (data.lodges ?? []) as Lodge[];
  $: activities = (data.activities ?? []) as Activity[];
  $: tripPoints = (data.tripPoints ?? []) as TripPoint[];
  $: galleryImages = (data.galleryImages ?? []) as DestinationGalleryImage[];
  $: faqs = (data.faqs ?? []) as FAQ[];
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
  $: seasonalGuideBlocks = guideSections.filter(isSeasonGuideBlock);
  $: narrativeGuideBlocks = guideSections.filter((block) => !isSeasonGuideBlock(block));
  $: guideFacts = guideFactsBlock ? blockItems(guideFactsBlock) : [];
  $: visualImages = destinationImageItems(destination, galleryImages, locationLabel);
  $: safetyItems = safetyItemsFor(destination);
  $: availableTours = relatedTours.filter(availableOnly);
  $: relevantTourCategories = matchingDestinationCategories(availableTours, tourCategories);
  $: recommendedStay = durationRangeFromTours(availableTours);
  $: tourPriceFloor = priceFloorFromTours(availableTours, $currency);
  $: heroStats = ([
    locationLabel ? { icon: MapPin, label: 'Destination', value: locationLabel } : null,
    recommendedStay ? { icon: CalendarDays, label: 'Trip length', value: recommendedStay } : null,
    availableTours.length ? { icon: Route, label: 'Available trips', value: `${availableTours.length} published ${availableTours.length === 1 ? 'trip' : 'trips'}` } : null,
    destination?.score_budget_from || tourPriceFloor
      ? { icon: Info, label: destination?.score_budget_from ? 'Starting budget' : 'Trips from', value: destination?.score_budget_from ? formatUsd(destination.score_budget_from, $currency) : tourPriceFloor }
      : null
  ].filter(Boolean) as Array<{ icon: Icon; label: string; value: string }>);
  $: heroTags = destination
    ? unique([
        destination.country,
        destination.region,
        destination.is_featured ? 'Featured destination' : '',
        relevantTourCategories[0]?.name,
        recommendedStay
      ]).slice(0, 5)
    : [];
  $: quickFacts = ([
    locationLabel ? { icon: MapPin, label: 'Area', value: locationLabel } : null,
    recommendedStay ? { icon: CalendarDays, label: 'Recommended stay', value: recommendedStay } : null,
    availableTours.length ? { icon: Route, label: 'Works with', value: `${availableTours.length} matching ${availableTours.length === 1 ? 'tour' : 'tours'}` } : null,
    relevantTourCategories.length ? { icon: Compass, label: 'Travel style', value: relevantTourCategories.slice(0, 2).map((item) => item.name).join(' / ') } : null
  ].filter(Boolean) as Array<{ icon: Icon; label: string; value: string }>);
  $: highlightCards = highlightCardsFor(destination, activities, visualImages, narrativeGuideBlocks);
  $: lodgeFeatureCards = lodgeFeatureCardsFor(lodges);
  $: planningTabs = planningTabsFor(destination, tripPoints, safetyItems);
  $: if (planningTabs.length && !planningTabs.some((tab) => tab.id === activePlanningTab)) activePlanningTab = planningTabs[0].id;
  $: activePlanning = planningTabs.find((tab) => tab.id === activePlanningTab) ?? planningTabs[0];
  $: routeRows = availableTours.slice(0, 5).map((tour) => ({
    id: tour.id,
    title: tour.title,
    route: routeSummaryForTour(tour),
    best: unique([tour.tour_categories?.name, tour.experience_type ? normaliseLabel(tour.experience_type) : '', tour.budget_tier ? `${normaliseLabel(tour.budget_tier)} level` : '']).join(' / '),
    href: `/tours/${tour.slug}`
  }));
  $: visibleTabs = DESTINATION_TABS.filter((tab) => {
    if (tab.id === 'why-visit') return narrativeGuideBlocks.length;
    if (tab.id === 'highlights') return highlightCards.length || visualImages.length;
    if (tab.id === 'best-time') return seasonalGuideBlocks.length;
    if (tab.id === 'route-planning') return routeRows.length || tripPoints.length;
    if (tab.id === 'recommended-trips') return availableTours.length;
    if (tab.id === 'where-to-stay') return lodgeFeatureCards.length;
    if (tab.id === 'travel-tips') return planningTabs.length;
    if (tab.id === 'good-to-know') return faqs.length;
    return true;
  });
  $: availableTourListSchema = tourItemListLd(origin, destination, availableTours);
  $: categoryListSchema = categoryItemListLd(origin, destination, relevantTourCategories);
  $: title = destination?.meta_title || (destination ? `${destination.name} Travel Guide` : 'Destination');
  $: description = toMetaText(destination?.meta_description || summary || 'Explore this destination with Goldfinch Adventures.', 170);

  onMount(() => {
    if (destination) trackEvent('destination_page_view', { destination: destination.name });
    const updateActive = () => updateActiveDestinationTab(visibleTabs);

    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('scroll', updateFaqTimeline, { passive: true });
    window.addEventListener('resize', updateActive);
    window.addEventListener('resize', updateFaqTimeline);
    updateActive();
    updateFaqTimeline();

    return () => {
      window.removeEventListener('scroll', updateActive);
      window.removeEventListener('scroll', updateFaqTimeline);
      window.removeEventListener('resize', updateActive);
      window.removeEventListener('resize', updateFaqTimeline);
    };
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
  <div class="destination-page overflow-x-clip">
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

  <section data-hero class="relative isolate overflow-hidden bg-deep-green text-white">
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
      <div class="absolute inset-0 bg-gradient-to-t from-deep-green/25 via-transparent to-deep-green/10" aria-hidden="true"></div>
    {:else}
      <div class="absolute inset-0 bg-deep-green"></div>
    {/if}

    <div class="container-shell relative flex min-h-[560px] flex-col justify-end pb-12 pt-20 md:min-h-[640px] md:pb-16 md:pt-24 lg:min-h-[680px] lg:pb-20">
      <a href="/destinations" class="absolute left-0 top-6 hidden items-center gap-1.5 text-[13px] font-medium text-white/90 transition hover:text-goldfinch-gold md:top-8 md:inline-flex">
        <ArrowLeft class="h-3.5 w-3.5" /> Back to destinations
      </a>

      <div class="destination-hero-copy relative max-w-3xl pb-2 [text-shadow:0_2px_18px_rgba(39,43,34,0.42)] md:pb-4">
        {#if heroTags.length}
          <div class="mb-5 flex flex-wrap gap-1.5">
            {#each heroTags as tag}
              <span class="inline-flex items-center rounded-full border border-white/30 bg-deep-green/35 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                {tag}
              </span>
            {/each}
          </div>
        {/if}
        <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold drop-shadow">Destination guide</span>
        <h1 class="mt-3 font-serif text-3xl font-semibold leading-[1.05] tracking-normal text-white sm:text-4xl md:text-5xl lg:text-[54px]" use:revealHeading>
          {destination.name}
        </h1>
        {#if summary}
          <p class="mt-4 max-w-2xl break-words text-[15px] font-medium leading-relaxed text-white md:text-base">{summary}</p>
        {/if}
        <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a class="inline-flex items-center justify-center gap-2 rounded-[6px] bg-goldfinch-gold px-5 py-3 text-sm font-bold text-heading transition hover:brightness-105" href={`/plan-my-trip?destination=${destination.slug}`} data-cta="destination-detail-hero-primary">
            Plan this destination <ArrowRight size={17} />
          </a>
          {#if availableTours.length}
            <button type="button" class="inline-flex items-center justify-center gap-2 rounded-[6px] border border-white/35 bg-deep-green/30 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-deep-green/45" on:click={() => scrollToSection('recommended-trips')}>
              See matching trips <ArrowRight size={17} />
            </button>
          {/if}
        </div>
        {#if heroStats.length}
          <div class="mt-5 flex max-w-3xl flex-wrap gap-2">
            {#each heroStats as stat}
              <div class="hero-stat-chip inline-flex min-w-[156px] max-w-full flex-1 items-center gap-2 rounded-[9px] border border-white/18 bg-white/[0.13] px-3 py-2.5 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] backdrop-blur-md sm:flex-none">
                <span class="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] bg-goldfinch-gold text-heading">
                  <svelte:component this={stat.icon} size={16} strokeWidth={2.35} />
                </span>
                <span class="min-w-0">
                  <span class="block text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/68">{stat.label}</span>
                  <span class="block text-[13px] font-bold leading-snug text-white md:text-[13.5px]">{stat.value}</span>
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </section>

  {#if quickFacts.length}
    <section class="bg-forest text-white">
      <div class="container-shell grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {#each quickFacts as fact}
          <div class="flex min-h-[92px] items-center gap-3 bg-forest px-4 py-5 lg:flex-1">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-goldfinch-gold text-heading">
              <svelte:component this={fact.icon} size={18} />
            </span>
            <div class="min-w-0">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">{fact.label}</p>
              <p class="mt-1 text-sm font-bold leading-snug text-white">{fact.value}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if visibleTabs.length > 1}
    <div class="sticky top-[70px] z-30 border-b border-ink/10 bg-surface/95 backdrop-blur">
      <div class="container-shell">
        <div class="no-scrollbar flex gap-6 overflow-x-auto py-3 text-[13.5px] font-semibold text-ink/60">
          {#each visibleTabs as tab}
            {@const active = activeTab === tab.id}
            <button
              type="button"
              class={`relative whitespace-nowrap pb-1 transition ${active ? 'text-heading' : 'hover:text-heading'}`}
              on:click={() => scrollToSection(tab.id)}
            >
              {tab.label}
              <span class={`absolute -bottom-0.5 left-0 right-0 h-[2px] transition-opacity ${active ? 'bg-clay opacity-100' : 'opacity-0'}`}></span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <section id="overview" class="scroll-mt-32 bg-canvas py-14 md:py-20">
    <div class="container-shell grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
      <aside class="lg:sticky lg:top-24" use:fadeUpOnScroll={{ y: 14 }}>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Overview</p>
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

        {#if narrativeGuideBlocks.length}
          <div id="why-visit" class="scroll-mt-32 space-y-10">
            {#each narrativeGuideBlocks as block, index}
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

  {#if highlightCards.length}
    <section id="highlights" class="scroll-mt-32 bg-sand/45 py-14 md:py-20">
      <div class="container-shell">
        <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 14 }}>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Highlights</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">Highlights of {destination.name}</h2>
          <p class="mt-3 text-base leading-7 text-ink/65">Cards below are built from published activities, gallery records, and guide notes attached to this destination.</p>
        </div>

        <div class="mt-10 grid grid-cols-1 gap-[22px] md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-9 lg:gap-y-11" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
          {#each highlightCards as card (card.key)}
            <article class="group relative h-[240px] overflow-hidden rounded-[8px] bg-forest shadow-[0_8px_22px_rgba(57,61,50,0.14)] md:h-[230px] lg:h-[240px]">
              {#if card.image}
                <Img
                  record={card.record}
                  fields={card.fields}
                  src={card.record ? '' : card.image}
                  alt={card.title}
                  width={760}
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              {:else}
                <div class="absolute inset-0 grid place-items-center bg-forest/10 text-forest">
                  <ImageIcon size={30} />
                </div>
              {/if}
              <div class="absolute inset-0 bg-gradient-to-b from-deep-green/10 via-deep-green/28 to-deep-green/82 transition duration-300 group-hover:from-deep-green/30 group-hover:via-deep-green/55 group-hover:to-deep-green/92" aria-hidden="true"></div>
              <div class="absolute left-5 right-5 bottom-6 text-center text-white transition-all duration-[280ms] ease-out md:left-6 md:right-6 md:bottom-8 md:group-hover:bottom-1/2 md:group-hover:translate-y-1/2">
                <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold drop-shadow">{card.eyebrow}</p>
                <h3 class="text-[17px] font-bold leading-[1.15] text-white drop-shadow md:text-[19px]">{card.title}</h3>
                {#if card.caption}
                  <p class="mx-auto mt-1.5 max-w-[92%] overflow-hidden text-[13px] leading-[1.35] text-white opacity-100 transition-all duration-[280ms] ease-out md:mt-0 md:max-h-0 md:translate-y-2 md:text-[14px] md:opacity-0 md:group-hover:mt-[10px] md:group-hover:max-h-[120px] md:group-hover:translate-y-0 md:group-hover:opacity-100">
                    {card.caption}
                  </p>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if seasonalGuideBlocks.length}
    <section id="best-time" class="scroll-mt-32 bg-surface py-14 md:py-20">
      <div class="container-shell">
        <div class="max-w-[820px]">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Best Time to Visit</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">When to visit {destination.name}</h2>
          <p class="mt-4 max-w-[820px] text-base leading-relaxed text-ink/65 md:text-lg">
            Seasonal guidance below is rendered from the published guide content for this destination.
          </p>
        </div>

        <div class="mt-10 grid gap-6">
          {#each seasonalGuideBlocks as block, index (guideBlockKey(block, index))}
            <article class="overflow-hidden rounded-[10px] border border-ink/10 bg-canvas shadow-card">
              <div class="grid gap-6 p-5 md:grid-cols-[0.42fr_0.58fr] md:p-7">
                <div>
                  {#if blockSubtitle(block)}
                    <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{blockSubtitle(block)}</p>
                  {/if}
                  <h3 class="mt-2 font-serif text-[22px] font-semibold leading-tight text-heading md:text-[28px]">{blockTitle(block) || 'Seasonal note'}</h3>
                  {#if blockBody(block)}
                    <RichText value={blockBody(block)} className="mt-4 text-[15px] leading-7 text-ink/70" />
                  {/if}
                </div>

                <div class="min-w-0">
                  {#if tableRows(block).length}
                    <div class="-mx-5 overflow-x-auto md:mx-0">
                      <table class="w-full min-w-[640px] border-collapse text-[14px]">
                        {#if tableColumns(block).length}
                          <thead>
                            <tr class="bg-deep-green text-left text-white">
                              {#each tableColumns(block) as column}
                                <th class="px-4 py-3 font-semibold">{column}</th>
                              {/each}
                            </tr>
                          </thead>
                        {/if}
                        <tbody>
                          {#each tableRows(block) as row, rowIndex}
                            <tr class={rowIndex % 2 === 0 ? 'bg-surface' : 'bg-sand/35'}>
                              {#each row as cell}
                                <td class="border-t border-ink/5 px-4 py-3 align-top text-ink/70">{cell}</td>
                              {/each}
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  {:else if blockItems(block).length}
                    <div class="grid gap-3 sm:grid-cols-2">
                      {#each blockItems(block) as item}
                        <div class="rounded-[9px] border border-ink/10 bg-surface p-4">
                          <p class="font-bold text-heading">{item.title}</p>
                          {#if item.body}<p class="mt-2 text-sm leading-6 text-ink/65">{item.body}</p>{/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </article>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if routeRows.length || tripPoints.length}
    <section id="route-planning" class="scroll-mt-32 bg-canvas py-14 md:py-20">
      <div class="container-shell">
        <div class="max-w-[1180px]">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Route Planning</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">How {destination.name} fits into a route</h2>
          <p class="mt-4 max-w-[820px] text-base leading-relaxed text-ink/65 md:text-lg">
            This section uses published trips and gateway records linked to {destination.name}.
          </p>
        </div>

        <div class="mt-10 rounded-[12px] border border-ink/10 bg-sand/45 p-6 shadow-[0_18px_45px_rgba(57,61,50,0.06)] md:mt-12 md:p-10 lg:p-12">
          <div class="grid items-stretch gap-7 md:gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div class="flex flex-col">
              <div class="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-clay/10 md:h-[72px] md:w-[72px]">
                <MapPin class="h-6 w-6 text-clay md:h-7 md:w-7" />
              </div>
              <h3 class="mb-6 mt-5 font-serif text-[22px] font-semibold leading-[1.12] text-heading md:mb-7 md:text-[28px]">
                Match the destination to the right route flow.
              </h3>
              {#if tripPoints.length}
                <div class="space-y-3">
                  {#each tripPoints as point (point.id)}
                    <div class="rounded-[8px] border border-ink/10 bg-surface p-4">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="font-bold text-heading">{point.name}</p>
                        {#if point.airport_code}
                          <span class="rounded-[6px] bg-forest/10 px-2 py-0.5 font-mono text-[11px] font-bold text-forest">{point.airport_code}</span>
                        {/if}
                      </div>
                      <p class="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-clay">{roleLabel(point.role)}</p>
                      {#if point.transfer_info || point.description}
                        <p class="mt-2 text-sm leading-6 text-ink/68">{point.transfer_info || point.description}</p>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else if summary}
                <p class="text-[15.5px] leading-7 text-ink/70 md:text-[17px]">{summary}</p>
              {/if}
            </div>

            {#if routeRows.length}
              <div class="h-full rounded-[12px] border border-ink/10 bg-surface p-6 md:p-8">
                <div class="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-clay md:mb-7 md:text-[12px]">
                  <Route class="h-3.5 w-3.5" />
                  Published route ideas
                </div>
                <ol class="divide-y divide-ink/10">
                  {#each routeRows as row, index (row.id)}
                    <li class="grid grid-cols-[auto_minmax(0,1fr)] gap-4 py-[18px] first:pt-0 last:pb-0">
                      <span class="text-[18px] font-bold leading-none text-clay md:text-[20px]">{index + 1}</span>
                      <div class="min-w-0">
                        <a class="text-[15px] font-bold text-heading transition hover:text-clay md:text-[16px]" href={row.href}>{row.title}</a>
                        {#if row.route}<div class="mt-1 text-[13px] text-ink/65 md:text-[14px]">{row.route}</div>{/if}
                        {#if row.best}<div class="mt-1 text-[13px] text-ink/60 md:text-[14px]"><span class="font-bold text-heading">Style: </span>{row.best}</div>{/if}
                      </div>
                    </li>
                  {/each}
                </ol>
              </div>
            {/if}
          </div>
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

  {#if activities.length || lodgeFeatureCards.length}
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

        {#if lodgeFeatureCards.length}
          <div id="where-to-stay" class="scroll-mt-32">
            <div class="max-w-3xl">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Where to stay</p>
              <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[38px]">Lodges & camps in {destination.name}</h2>
              <p class="mt-3 text-base leading-7 text-ink/65">Published accommodation linked to this destination.</p>
            </div>
            <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
              {#each lodgeFeatureCards as lodge (lodge.key)}
                <article class="group relative aspect-square overflow-hidden rounded-[12px] border border-ink/10 bg-deep-green shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(39,43,34,0.18)] focus-within:-translate-y-0.5 focus-within:shadow-[0_18px_38px_rgba(39,43,34,0.18)]">
                  {#if lodge.image}
                    <Img
                      src={lodge.record ? '' : lodge.image}
                      record={lodge.record}
                      fields={lodge.fields}
                      alt={lodge.name}
                      width={720}
                      sizes="(max-width: 768px) 92vw, 360px"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035] group-focus-within:scale-[1.035]"
                    />
                  {:else}
                    <div class="absolute inset-0 grid place-items-center bg-gradient-to-br from-sand to-forest/25 text-forest">
                      <BedDouble size={30} />
                    </div>
                  {/if}

                  <div class="absolute inset-0 bg-gradient-to-b from-deep-green/22 via-deep-green/22 to-deep-green/96 transition duration-300 group-hover:from-deep-green/35 group-hover:via-deep-green/45 group-hover:to-deep-green/98 group-focus-within:from-deep-green/35 group-focus-within:via-deep-green/45 group-focus-within:to-deep-green/98" aria-hidden="true"></div>
                  <div class="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-deep-green via-deep-green/88 to-transparent" aria-hidden="true"></div>
                  <div class="relative flex h-full flex-col justify-end p-4 text-white md:p-5">
                    {#if lodge.meta}
                      <span class="mb-auto w-fit rounded-full border border-white/25 bg-deep-green/82 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_18px_rgba(15,23,42,0.24)] backdrop-blur">
                        {lodge.meta}
                      </span>
                    {/if}
                    <div>
                      <h3 class="destination-accommodation-title font-serif text-[20px] font-semibold leading-snug text-white drop-shadow md:text-[21px]">{lodge.name}</h3>
                      {#if lodge.summary}<p class="destination-accommodation-summary mt-1 text-[13px] font-semibold leading-5 text-white/90 drop-shadow">{lodge.summary}</p>{/if}
                    </div>
                    <div class="destination-accommodation-extra mt-4 overflow-hidden text-white md:max-h-0 md:opacity-0 md:transition-all md:duration-300 md:group-hover:max-h-32 md:group-hover:opacity-100 md:group-focus-within:max-h-32 md:group-focus-within:opacity-100">
                      <span class="inline-flex items-center gap-1 text-[13px] font-bold text-goldfinch-gold">
                        View accommodation <ArrowRight size={14} />
                      </span>
                    </div>
                    <a class="absolute inset-0 z-10 rounded-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-goldfinch-gold" href={lodge.href} aria-label={`View accommodation ${lodge.name}`} data-sveltekit-preload-data="hover"></a>
                  </div>
                </article>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  {#if planningTabs.length && activePlanning}
    <section id="travel-tips" class="scroll-mt-32 bg-surface py-14 md:py-20">
      <div class="container-shell">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Travel Tips</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">Helpful details for {destination.name}</h2>
          <p class="mt-4 max-w-[820px] text-base leading-relaxed text-ink/65 md:text-lg">
            These tabs are generated from published gateway and safety fields on the destination record.
          </p>

          <div class="mt-8 overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-card md:mt-12 md:rounded-[12px]">
            <div class="flex overflow-x-auto border-b border-ink/10 bg-sand/55 md:grid md:grid-cols-3 md:overflow-visible">
              {#each planningTabs as tab, index}
                {@const isActive = tab.id === activePlanningTab}
                <button
                  type="button"
                  class={`flex shrink-0 items-center justify-center gap-3 whitespace-nowrap px-5 py-4 text-[15px] font-semibold transition-all duration-200 md:px-7 md:py-6 md:text-[17px] ${index < planningTabs.length - 1 ? 'border-r border-ink/10' : ''} ${isActive ? 'border-b-[3px] border-b-clay bg-surface/75 text-clay' : 'text-heading/90 hover:bg-surface/45 hover:text-clay'}`}
                  on:click={() => (activePlanningTab = tab.id)}
                >
                  <svelte:component this={tab.icon} class="h-[22px] w-[22px] md:h-[26px] md:w-[26px]" strokeWidth={1.75} />
                  <span>{tab.label}</span>
                </button>
              {/each}
            </div>

            <div class="p-6 md:p-12 lg:p-14">
              <div class="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                <div class="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-clay/10 md:h-[86px] md:w-[86px]">
                  <svelte:component this={activePlanning.icon} class="h-8 w-8 text-clay md:h-10 md:w-10" strokeWidth={1.6} />
                </div>
                <div class="flex-1">
                  <h3 class="font-serif text-[24px] font-semibold leading-[1.15] text-heading md:text-[30px]">{activePlanning.title}</h3>
                  <p class="mt-2 max-w-[620px] text-[15px] leading-[1.55] text-ink/65 md:text-[17px]">{activePlanning.support}</p>
                </div>
              </div>

              <ul class="mt-8 grid grid-cols-1 gap-y-3.5 md:mt-9 md:grid-cols-2 md:gap-x-16">
                {#each activePlanning.items as item}
                  <li class="flex gap-3 text-[15px] leading-[1.55] text-heading md:text-[16px]">
                    <span aria-hidden="true" class="mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-clay"></span>
                    <span>
                      <span class="font-bold">{item.title}</span>
                      {#if item.body}<span class="text-ink/70"> - {item.body}</span>{/if}
                    </span>
                  </li>
                {/each}
              </ul>

              <div class="mt-9 flex items-start gap-3 rounded-[8px] border border-ink/10 bg-sand/70 px-5 py-4 md:px-6">
                <Info class="mt-[2px] h-[18px] w-[18px] shrink-0 text-clay" strokeWidth={1.75} />
                <p class="text-[14.5px] leading-[1.5] text-heading md:text-[15.5px]">
                  For broader preparation details, read the full safety guide or ask the team in your trip request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <ReviewsWidget
    eyebrow="Traveller stories"
    title="Travellers Who Planned Tanzania With Us"
    subtitle="Real approved reviews from Goldfinch travellers."
  />

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
    <section id="good-to-know" class="scroll-mt-32 border-t border-ink/[0.06] bg-surface py-14 md:py-20">
      <div class="container-shell">
        <div class="max-w-3xl">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">FAQ</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[40px]">Questions about {destination.name}</h2>
          <p class="mt-4 text-base leading-8 text-ink/68">Destination-specific FAQs from the CMS.</p>
        </div>
        <ol class="relative mt-10 md:mt-12">
          {#each faqs as item, index (item.id)}
            {@const faqState = index === activeFaqIndex ? 'is-active' : index < activeFaqIndex ? 'is-complete' : 'is-upcoming'}
            <li data-destination-faq-item class={`faq-timeline-item ${faqState} relative pb-12 pl-14 last:pb-0 md:pl-20`}>
              {#if index < faqs.length - 1}
                <span class="faq-connector pointer-events-none absolute left-4 top-10 bottom-0 w-px md:left-5" aria-hidden="true"></span>
              {/if}
              <span class="faq-number absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full font-serif text-[14px] font-semibold md:h-10 md:w-10 md:text-[15px]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 class="font-serif text-[19px] font-semibold leading-snug text-heading md:text-[22px]">{item.question}</h3>
              <RichText value={item.answer} className="mt-3 text-[15px] leading-relaxed text-heading/85 md:text-[17px]" />
            </li>
          {/each}
        </ol>
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
  .destination-hero-copy {
    isolation: isolate;
  }

  .destination-hero-copy::before {
    content: '';
    position: absolute;
    inset: -1rem -1.1rem -1.15rem -1.1rem;
    z-index: -1;
    border-radius: 12px;
    background:
      linear-gradient(90deg, rgb(var(--c-deep-green) / 0.9), rgb(var(--c-forest) / 0.64) 64%, transparent),
      linear-gradient(180deg, rgb(var(--c-deep-green) / 0.5), rgb(var(--c-deep-green) / 0.84));
    box-shadow: 0 18px 48px rgb(15 23 42 / 0.2);
  }

  .no-scrollbar {
    scrollbar-width: none;
  }

  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .faq-number {
    color: rgb(var(--c-heading));
    background: rgb(var(--c-surface));
    box-shadow: 0 0 0 1px rgb(149 144 125 / 0.35);
    transform: scale(1);
    transition:
      background-color 220ms ease,
      color 220ms ease,
      transform 220ms ease,
      box-shadow 220ms ease;
  }

  .faq-connector {
    overflow: hidden;
    background: rgb(149 144 125 / 0.3);
  }

  .faq-connector::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgb(var(--c-clay));
    transform: scaleY(0);
    transform-origin: top;
    transition: transform 420ms ease;
  }

  .faq-timeline-item.is-complete .faq-number,
  .faq-timeline-item.is-active .faq-number {
    color: white;
    background: rgb(var(--c-clay));
  }

  .faq-timeline-item.is-complete .faq-number {
    box-shadow: 0 0 0 1px rgb(var(--c-clay) / 0.86);
  }

  .faq-timeline-item.is-active .faq-number {
    transform: scale(1.08);
    box-shadow:
      0 12px 26px rgb(170 61 29 / 0.24),
      0 0 0 1px rgb(var(--c-clay)),
      0 0 0 6px rgb(228 169 46 / 0.14);
    animation: faq-number-pop 420ms cubic-bezier(0.2, 0.9, 0.2, 1);
  }

  .faq-timeline-item.is-complete .faq-connector::before {
    transform: scaleY(1);
  }

  .faq-timeline-item.is-active .faq-connector::before {
    transform: scaleY(0.45);
  }

  @keyframes faq-number-pop {
    0% {
      transform: scale(0.92);
    }

    60% {
      transform: scale(1.14);
    }

    100% {
      transform: scale(1.08);
    }
  }

  .destination-accommodation-title,
  .destination-accommodation-summary {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .destination-accommodation-title {
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }

  .destination-accommodation-summary {
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }

  @media (min-width: 768px) {
    .destination-hero-copy::before {
      inset: -1.4rem -2rem -1.5rem -1.6rem;
      border-radius: 14px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .faq-number,
    .faq-connector::before {
      transition: none;
      animation: none;
    }
  }
</style>
