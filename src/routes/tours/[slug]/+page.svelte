<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import {
    ArrowLeft,
    ArrowRight,
    BedDouble,
    CalendarDays,
    Check,
    ChevronDown,
    Compass,
    MapPin,
    Minus,
    Route,
    Users,
    Utensils,
    Wallet,
    X
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { trackEvent } from '$lib/analytics';
  import { currency, formatUsd } from '$lib/currency';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import Img from '$lib/components/public/Img.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ReviewsWidget from '$lib/components/public/ReviewsWidget.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import SpecialistCard from '$lib/components/public/SpecialistCard.svelte';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import { toMetaText } from '$lib/richText';
  import { getTourDestinationLabel, getTourDestinations } from '$lib/tourDestinations';
  import type { BlogPost, FAQ, ItineraryDay, Tour, TravelStyle } from '$lib/types';

  type Icon = typeof CalendarDays;
  type FactCard = { icon: Icon; label: string; value: string };
  type SnapshotRow = { day: string; place: string; highlights: string; hotel: string };
  type Stay = NonNullable<ItineraryDay['lodge']>;
  type MediaImage = {
    src: string;
    caption: string;
    record?: Record<string, unknown>;
    fields?: string[];
  };
  type AccommodationBlock = {
    key: string;
    label: string;
    dayLabel: string;
    summary: string;
    href?: string;
    gallery: MediaImage[];
  };

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'day-by-day', label: 'Day by Day' },
    { id: 'accommodation', label: 'Accommodation' },
    { id: 'prices', label: 'Prices' },
    { id: 'inclusions', label: 'Inclusions' },
    { id: 'good-to-know', label: 'Good to Know' }
  ];

  const LODGE_TYPES: Record<string, string> = {
    tented_camp: 'Tented camp',
    mobile_camp: 'Mobile camp',
    lodge: 'Lodge',
    hotel: 'Hotel',
    treehouse: 'Treehouse'
  };

  const PRICE_TYPE_LABELS: Record<string, string> = {
    per_person: 'Per person',
    per_group: 'Per group',
    per_child: 'Per child',
    single_supplement: 'Single supplement',
    upgrade: 'Upgrade',
    discount: 'Discount'
  };

  const formatPublishedRate = (amount: number, currencyCode: string): string => {
    const code = String(currencyCode || 'USD').trim().toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
      }).format(amount);
    } catch {
      return `${code} ${Number(amount).toLocaleString()}`;
    }
  };

  let tour: Tour | null = null;
  let loading = true;
  let error = '';
  let loadedSlug = '';
  let sheetOpen = false;
  let specialistOpen = false;
  let activeTab = TABS[0].id;
  let activeFaqIndex = -1;
  let tabsAnchor: HTMLDivElement;
  let tabsPinned = false;

  let relatedTours: Tour[] = [];
  let recentPosts: BlogPost[] = [];
  let faqs: FAQ[] = [];
  let travelStyles: TravelStyle[] = [];
  let lodgeMedia: Record<string, MediaImage[]> = {};

  const normaliseLabel = (value: string | null | undefined): string =>
    String(value ?? '')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const personaKey = (value: string | null | undefined): string =>
    String(value ?? '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

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

  const shortText = (value: string | null | undefined, length = 140): string => toMetaText(value ?? '', length).trim();

  const durationOf = (item: Tour | null): string => {
    if (!item?.duration_days) return '';
    const days = `${item.duration_days} day${item.duration_days === 1 ? '' : 's'}`;
    if (!item.duration_nights) return days;
    return `${days} / ${item.duration_nights} night${item.duration_nights === 1 ? '' : 's'}`;
  };

  const groupSizeOf = (item: Tour | null): string => {
    if (!item) return '';
    if (item.group_size_min && item.group_size_max) return `${item.group_size_min}-${item.group_size_max} people`;
    if (item.group_size_max) return `Up to ${item.group_size_max} people`;
    return item.group_size ?? '';
  };

  const routeOf = (item: Tour | null): string => {
    if (!item) return '';
    if (item.start_location && item.end_location) return `${item.start_location} -> ${item.end_location}`;
    return item.start_location || item.end_location || '';
  };

  const dayListLabel = (days: number[]): string => {
    const sorted = [...new Set(days)].sort((a, b) => a - b);
    return `${sorted.length === 1 ? 'Day' : 'Days'} ${sorted.join(', ')}`;
  };

  const stayKey = (stay: Stay | null | undefined): string => String(stay?.id || stay?.slug || '').trim();

  const imageFromStay = (stay: Stay): MediaImage | null => {
    const src = stay.hero_image_url || stay.image_url || '';
    return src
      ? {
          src,
          caption: stay.name,
          record: stay as unknown as Record<string, unknown>,
          fields: ['hero_image_url', 'image_url']
        }
      : null;
  };

  const imageFromLodgeMedia = (row: Record<string, unknown>, stay: Stay): MediaImage | null => {
    const src = String(row.image_url || row.file_url || row.url || '').trim();
    if (!src) return null;
    return {
      src,
      caption: String(row.caption || row.alt_text || stay.name),
      record: row,
      fields: ['image_url', 'file_url', 'url']
    };
  };

  const galleryForStay = (stay: Stay): MediaImage[] => {
    const gallery: MediaImage[] = [];
    const add = (image: MediaImage | null | undefined) => {
      if (!image?.src || gallery.some((item) => item.src === image.src)) return;
      gallery.push(image);
    };
    add(imageFromStay(stay));
    for (const image of lodgeMedia[stayKey(stay)] ?? []) add(image);
    return gallery;
  };

  const dayImage = (day: ItineraryDay): MediaImage | null => {
    if (day.image_url) return { src: day.image_url, caption: `Day ${day.day_number}: ${day.title}`, record: day as unknown as Record<string, unknown>, fields: ['image_url'] };
    if (day.lodge?.hero_image_url) return { src: day.lodge.hero_image_url, caption: day.lodge.name, record: day.lodge as unknown as Record<string, unknown>, fields: ['hero_image_url', 'image_url'] };
    if (day.lodge?.image_url) return { src: day.lodge.image_url, caption: day.lodge.name, record: day.lodge as unknown as Record<string, unknown>, fields: ['hero_image_url', 'image_url'] };
    return null;
  };

  const detailsForDay = (day: ItineraryDay): FactCard[] => {
    const stay = day.lodge?.name || day.accommodation || '';
    return [
      day.title ? { icon: MapPin, label: 'Main stop', value: day.title } : null,
      stay ? { icon: BedDouble, label: 'Accommodation', value: stay } : null,
      day.meals ? { icon: Utensils, label: 'Meals', value: day.meals } : null,
      day.activities ? { icon: Compass, label: 'Activities', value: day.activities } : null
    ].filter(Boolean) as FactCard[];
  };

  const scrollToSection = (id: string) => {
    if (!browser) return;
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const animateDayDisclosure = async (event: MouseEvent) => {
    const summary = event.currentTarget as HTMLElement;
    const details = summary.closest('details');
    if (!details || details.dataset.animating === 'true') return;

    event.preventDefault();
    const wasOpen = details.open;
    if (!wasOpen) details.open = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      details.open = !wasOpen;
      return;
    }

    const startHeight = wasOpen ? details.offsetHeight : summary.offsetHeight;
    const endHeight = wasOpen ? summary.offsetHeight : details.scrollHeight;
    details.dataset.animating = 'true';
    details.style.overflow = 'hidden';

    const animation = details.animate(
      [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
      { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );

    try {
      await animation.finished;
    } catch {
      // A cancelled animation should still leave the disclosure usable.
    }

    if (wasOpen) details.open = false;
    details.style.removeProperty('overflow');
    delete details.dataset.animating;
  };

  const openPlanner = (location: string) => {
    trackEvent('cta_click', { cta_name: 'Plan This Trip', cta_location: location, tour_id: tour?.id, tour_title: tour?.title });
    if (browser && window.matchMedia('(max-width: 1023px)').matches) {
      sheetOpen = true;
      return;
    }
    scrollToSection('plan-this-trip');
    const el = document.getElementById('plan-this-trip');
    el?.classList.add('ring-2', 'ring-goldfinch-gold');
    window.setTimeout(() => el?.classList.remove('ring-2', 'ring-goldfinch-gold'), 1400);
  };

  const closeSheet = () => {
    sheetOpen = false;
  };

  const closeOverlays = () => {
    sheetOpen = false;
    specialistOpen = false;
  };

  const updateFaqTimeline = () => {
    if (!browser) return;
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-faq-item]'));
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

  $: slug = $page.params.slug ?? '';
  $: origin = $page.url.origin;
  $: destinationLabel = getTourDestinationLabel(tour, 4);
  $: destinations = getTourDestinations(tour);
  $: itineraryDays = [...(tour?.itinerary_days ?? [])].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0));
  $: inclusions = [...(tour?.tour_inclusions ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  $: exclusions = [...(tour?.tour_exclusions ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  $: highlights = tour?.highlights?.filter(Boolean) ?? [];
  $: heroImage = tour?.main_image_url || tour?.banner_image_url || '';
  $: durationLabel = durationOf(tour);
  $: groupSize = groupSizeOf(tour);
  $: routeLabel = routeOf(tour);
  $: priceLabel = tour?.price_from ? formatUsd(tour.price_from, $currency) : '';
  $: priceFromLabel = priceLabel ? `From ${priceLabel} per person` : 'On request';
  $: tourSpecialist = tour?.specialist?.name ? tour.specialist : null;
  $: heroStats = ([
    durationLabel ? { icon: CalendarDays, label: 'Duration', value: durationLabel } : null,
    destinationLabel ? { icon: MapPin, label: 'Destination', value: destinationLabel } : null,
    { icon: Wallet, label: priceLabel ? 'Starting from' : 'Price', value: priceFromLabel }
  ].filter(Boolean) as FactCard[]);
  $: tourDescription = tour?.full_description || tour?.short_description || '';
  $: metaDescription = tour ? shortText(tour.meta_description || tour.short_description || tour.full_description, 170) : '';
  $: categoryLabel = tour?.tour_categories?.name || normaliseLabel(tour?.experience_type);
  $: attachedTravelStyles = travelStyles.filter((style) =>
    (tour?.persona_tags ?? []).map(personaKey).includes(personaKey(style.persona))
  );
  $: bestFor = tour
    ? unique([
        ...(tour.persona_tags ?? []).map(normaliseLabel),
        tour.tour_categories?.name,
        tour.experience_type ? normaliseLabel(tour.experience_type) : '',
        tour.budget_tier ? `${normaliseLabel(tour.budget_tier)} comfort` : ''
      ])
    : [];
  $: tripFacts = tour
    ? ([
        routeLabel ? { icon: Route, label: 'Start / End', value: routeLabel } : null,
        groupSize ? { icon: Users, label: 'Group size', value: groupSize } : null,
        tour.difficulty_level ? { icon: Compass, label: 'Difficulty', value: normaliseLabel(tour.difficulty_level) } : null,
        tour.minimum_age ? { icon: Check, label: 'Minimum age', value: `${tour.minimum_age}+` } : null
      ].filter(Boolean) as FactCard[])
    : [];
  $: snapshotRows = itineraryDays.map((day) => ({
    day: `Day ${day.day_number}`,
    place: day.title,
    highlights: shortText(day.activities || day.description, 120),
    hotel: day.lodge?.name || day.accommodation || ''
  })) as SnapshotRow[];
  $: accommodationBlocks = (() => {
    const linked = new Map<string, { stay: Stay; days: number[] }>();

    for (const day of itineraryDays) {
      if (day.lodge) {
        const key = stayKey(day.lodge);
        if (!key) continue;
        const existing = linked.get(key);
        if (existing) existing.days.push(day.day_number);
        else linked.set(key, { stay: day.lodge, days: [day.day_number] });
        continue;
      }
    }

    const blocks: AccommodationBlock[] = [];
    for (const [key, item] of linked) {
      const summary = unique([
        LODGE_TYPES[String(item.stay.lodge_type)] ?? '',
        item.stay.accommodation_level ? normaliseLabel(item.stay.accommodation_level) : '',
        item.stay.destinations?.name ?? ''
      ]).join(' / ');
      blocks.push({
        key,
        label: item.stay.name,
        dayLabel: dayListLabel(item.days),
        summary,
        href: item.stay.slug ? `/accommodation/${item.stay.slug}` : undefined,
        gallery: galleryForStay(item.stay)
      });
    }
    return blocks;
  })();
  $: visibleTabs = TABS.filter((tab) => tab.id !== 'accommodation' || accommodationBlocks.length);
  $: publishedPriceOptions = [...(tour?.tour_price_options ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  $: priceRows = publishedPriceOptions.length
    ? publishedPriceOptions.map((option) => ({
        label: option.title || option.label || PRICE_TYPE_LABELS[option.price_type] || 'Rate',
        value: formatPublishedRate(option.price, option.currency || tour?.currency || 'USD'),
        note: [PRICE_TYPE_LABELS[option.price_type] || normaliseLabel(option.price_type), option.description]
          .filter(Boolean)
          .join(' - ')
      }))
    : [{
        label: 'Starting price',
        value: priceFromLabel,
        note: tour?.price_from
          ? 'Final pricing depends on dates and confirmed availability.'
          : 'Your specialist will quote this from live availability.'
      }];
  $: pricingSeasons = [...(tour?.tour_pricing_seasons ?? [])]
    .filter((season) => season.status === 'ACTIVE')
    .sort((a,b)=>(a.sort_order??0)-(b.sort_order??0))
    .map((season)=>({...season,group_prices:[...(season.group_prices??[])].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0))}));
  $: groupColumns = [...new Map(pricingSeasons.flatMap((season)=>season.group_prices).map((price)=>[`${price.minimum_travelers}:${price.maximum_travelers??''}`,price])).values()]
    .sort((a,b)=>a.minimum_travelers-b.minimum_travelers);
  const groupLabel=(price:{minimum_travelers:number;maximum_travelers?:number|null})=>price.minimum_travelers===1&&price.maximum_travelers===1?'Solo':price.maximum_travelers===null||price.maximum_travelers===undefined?`${price.minimum_travelers}+ people`:`${price.minimum_travelers} people`;
  const groupRate=(season:NonNullable<Tour['tour_pricing_seasons']>[number],key:string)=>{
    const price=season.group_prices.find((item)=>`${item.minimum_travelers}:${item.maximum_travelers??''}`===key);
    if(!price||price.price_status==='NOT_AVAILABLE')return {label:'Not available',amount:''};
    if(price.price_status==='ON_REQUEST'||price.price==null)return {label:'On request',amount:''};
    return {label:'From',amount:formatPublishedRate(Number(price.price),season.currency)};
  };
  $: mediaImages = (() => {
    if (!tour) return [] as MediaImage[];
    const images: MediaImage[] = [];
    const add = (image: MediaImage | null | undefined) => {
      if (!image?.src || images.some((item) => item.src === image.src)) return;
      images.push(image);
    };
    add(heroImage ? { src: heroImage, caption: tour.title, record: tour as unknown as Record<string, unknown>, fields: ['main_image_url', 'banner_image_url'] } : null);
    for (const day of itineraryDays) {
      add(dayImage(day));
      if (day.lodge) for (const image of galleryForStay(day.lodge)) add(image);
    }
    return images.slice(0, 10);
  })();
  $: touristTripLd = tour
    ? {
        '@type': 'TouristTrip',
        name: tour.title,
        description: shortText(tour.short_description ?? tour.full_description, 300),
        ...(heroImage ? { image: heroImage } : {}),
        ...(tour.price_from
          ? { offers: { '@type': 'Offer', price: tour.price_from, priceCurrency: tour.currency ?? 'USD' } }
          : {}),
        url: `${origin}/tours/${tour.slug}`
      }
    : null;
  $: breadcrumbLd = tour
    ? {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Tours', item: `${origin}/tours` },
          { '@type': 'ListItem', position: 3, name: tour.title, item: `${origin}/tours/${tour.slug}` }
        ]
      }
    : null;

  const loadRelated = async (current: Tour) => {
    const destId = current.destination_id ?? null;
    const [tourRes, postRes, faqRes] = await Promise.allSettled([
      api.tours.list(destId ? { destination_id: destId, limit: 7 } : { limit: 7 }),
      api.blog.list({ limit: 3 }),
      api.faqs.list({ status: 'published', limit: 8 })
    ]);

    if (tourRes.status === 'fulfilled') {
      let items = (tourRes.value.data.items ?? []).filter((item) => item.id !== current.id && item.slug !== current.slug);
      if (!items.length && destId) {
        const fallback = await api.tours.list({ limit: 7 }).catch(() => null);
        items = (fallback?.data.items ?? []).filter((item) => item.id !== current.id && item.slug !== current.slug);
      }
      relatedTours = items.slice(0, 3);
    }
    if (postRes.status === 'fulfilled') recentPosts = postRes.value.data.items ?? [];
    if (faqRes.status === 'fulfilled') {
      faqs = faqRes.value.data.items ?? [];
      requestAnimationFrame(updateFaqTimeline);
    }
  };

  const loadLodgeMedia = async (current: Tour) => {
    const stays = new Map<string, Stay>();
    for (const day of current.itinerary_days ?? []) {
      if (!day.lodge?.id) continue;
      const key = stayKey(day.lodge);
      if (key) stays.set(key, day.lodge);
    }
    if (!stays.size) {
      lodgeMedia = {};
      return;
    }

    const results = await Promise.allSettled(
      [...stays.entries()].map(async ([key, stay]) => {
        const response = await api.lodges.media(stay.id);
        const images = (response.data.images ?? [])
          .map((row) => imageFromLodgeMedia(row, stay))
          .filter(Boolean) as MediaImage[];
        return [key, images.slice(0, 6)] as const;
      })
    );

    const next: Record<string, MediaImage[]> = {};
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value[1].length) next[result.value[0]] = result.value[1];
    }
    lodgeMedia = next;
  };

  const load = async (nextSlug: string) => {
    loading = true;
    error = '';
    tour = null;
    relatedTours = [];
    recentPosts = [];
    faqs = [];
    travelStyles = [];
    lodgeMedia = {};
    activeFaqIndex = -1;
    sheetOpen = false;
    specialistOpen = false;

    try {
      const stylesRequest = api.travelStyles.list({ status: 'published', limit: 100 }).catch(() => null);
      const response = await api.tours.get(nextSlug);
      tour = response.data;
      travelStyles = (await stylesRequest)?.data.items ?? [];
      void loadRelated(response.data);
      void loadLodgeMedia(response.data);
      trackEvent('tour_page_view', {
        tour_id: response.data.id,
        tour_title: response.data.title,
        destination: getTourDestinationLabel(response.data, 4) || response.data.destinations?.name
      });
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tour.';
    } finally {
      loading = false;
    }
  };

  $: if (browser && slug && slug !== loadedSlug) {
    loadedSlug = slug;
    void load(slug);
  }

  $: if (browser) document.body.style.overflow = sheetOpen || specialistOpen ? 'hidden' : '';

  onMount(() => {
    const updateTabsPinned = () => {
      tabsPinned = window.innerWidth < 1024 && Boolean(tabsAnchor) && tabsAnchor.getBoundingClientRect().top <= 70;
    };

    const updateActiveTab = () => {
      const y = window.scrollY + 130;
      let current = visibleTabs[0]?.id ?? TABS[0].id;
      for (const tab of visibleTabs) {
        const el = document.getElementById(tab.id);
        if (el && el.offsetTop <= y) current = tab.id;
      }
      activeTab = current;
    };

    window.addEventListener('scroll', updateActiveTab, { passive: true });
    window.addEventListener('scroll', updateTabsPinned, { passive: true });
    window.addEventListener('scroll', updateFaqTimeline, { passive: true });
    window.addEventListener('resize', updateActiveTab);
    window.addEventListener('resize', updateTabsPinned);
    window.addEventListener('resize', updateFaqTimeline);
    updateActiveTab();
    updateTabsPinned();
    updateFaqTimeline();

    return () => {
      window.removeEventListener('scroll', updateActiveTab);
      window.removeEventListener('scroll', updateTabsPinned);
      window.removeEventListener('scroll', updateFaqTimeline);
      window.removeEventListener('resize', updateActiveTab);
      window.removeEventListener('resize', updateTabsPinned);
      window.removeEventListener('resize', updateFaqTimeline);
      document.body.style.overflow = '';
    };
  });
</script>

<svelte:head>
  {#if tour}
    <title>{tour.seo_title || tour.meta_title || tour.title} | Goldfinch Adventures</title>
    {#if metaDescription}<meta name="description" content={metaDescription} />{/if}
    <link rel="canonical" href={`${origin}/tours/${tour.slug}`} />
  {/if}
</svelte:head>

{#if loading}
  <div class="tour-detail-skeleton bg-[#fbfaf6]" aria-busy="true" aria-label="Loading tour itinerary">
    <section class="relative min-h-[390px] overflow-hidden bg-deep-green md:min-h-[460px]">
      <div class="skeleton-shimmer absolute inset-0 opacity-20"></div>
      <div class="container-shell relative flex min-h-[390px] flex-col justify-end pb-9 md:min-h-[460px] md:pb-12">
        <div class="skeleton-shimmer h-3 w-28 rounded-full bg-white/15"></div>
        <div class="skeleton-shimmer mt-5 h-10 w-[min(82%,46rem)] rounded-md bg-white/15 md:h-14"></div>
        <div class="mt-6 grid max-w-2xl grid-cols-3 gap-3">
          {#each Array(3) as _}<div class="skeleton-shimmer h-[70px] bg-white/15"></div>{/each}
        </div>
      </div>
    </section>

    <div class="border-b border-ink/10 bg-white/90">
      <div class="container-shell flex gap-6 py-4">
        {#each Array(5) as _, index}<div class={`skeleton-shimmer h-3 rounded-full ${index === 1 ? 'w-20' : 'w-16'}`}></div>{/each}
      </div>
    </div>

    <div class="container-shell grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <main class="space-y-10">
        {#each Array(3) as _, index}
          <section class="rounded-[12px] border border-ink/[0.07] bg-white p-5 md:p-7">
            <div class="skeleton-shimmer h-3 w-24 rounded-full"></div>
            <div class={`skeleton-shimmer mt-4 h-8 rounded-md ${index === 1 ? 'w-4/5' : 'w-3/5'}`}></div>
            <div class="skeleton-shimmer mt-5 h-4 w-full rounded-full"></div>
            <div class="skeleton-shimmer mt-3 h-4 w-11/12 rounded-full"></div>
            <div class="skeleton-shimmer mt-3 h-4 w-2/3 rounded-full"></div>
          </section>
        {/each}
      </main>
      <aside class="hidden lg:block">
        <div class="rounded-[14px] border border-ink/[0.07] bg-white p-6">
          <div class="skeleton-shimmer h-5 w-1/2 rounded-md"></div>
          <div class="skeleton-shimmer mt-5 h-11 w-full rounded-md"></div>
          <div class="skeleton-shimmer mt-3 h-11 w-full rounded-md"></div>
          <div class="skeleton-shimmer mt-5 h-12 w-full rounded-md"></div>
        </div>
      </aside>
    </div>
  </div>
{:else if !tour}
  <section class="container-shell py-16">
    <ErrorState message={error || 'Tour not found.'} />
  </section>
{:else}
  <section data-hero class="tour-detail-hero relative isolate overflow-hidden bg-deep-green">
    {#if heroImage}
      <Img
        record={tour}
        fields={['main_image_url', 'banner_image_url']}
        alt=""
        width={1800}
        sizes="100vw"
        eager
        className="tour-detail-hero-image absolute inset-0 h-full w-full object-cover"
      />
    {/if}
    <div class="tour-detail-hero-overlay absolute inset-0 bg-deep-green/45" aria-hidden="true"></div>
    <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,54,48,0.92)_0%,rgba(26,54,48,0.68)_50%,rgba(26,54,48,0.18)_100%)]" aria-hidden="true"></div>
    <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-deep-green/65 to-transparent" aria-hidden="true"></div>

    <div class="tour-detail-hero-shell container-shell relative flex min-h-[390px] flex-col justify-end pb-8 pt-16 md:min-h-[460px] md:pb-12 md:pt-20 lg:pb-14">
      <a href="/tours" class="absolute left-0 top-6 hidden items-center gap-1.5 text-[13px] font-medium text-white/90 transition hover:text-goldfinch-gold md:top-8 md:inline-flex">
        <ArrowLeft class="h-3.5 w-3.5" /> Back to tours
      </a>

      <div class="tour-hero-copy relative w-full max-w-4xl [text-shadow:0_2px_18px_rgba(39,43,34,0.42)]">
        {#if categoryLabel}
          <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold drop-shadow">{categoryLabel}</span>
        {/if}
        <h1 class="mt-3 w-full max-w-none font-serif text-3xl font-semibold leading-[1.05] tracking-normal text-white sm:text-4xl md:text-5xl lg:text-[54px]">
          {tour.title}
        </h1>
        <div class="tour-hero-actions mt-6 flex">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-[6px] bg-goldfinch-gold px-5 py-3 text-sm font-bold text-heading transition hover:brightness-105"
            on:click={() => openPlanner('hero')}
          >
            Plan This Trip
          </button>
        </div>
        {#if heroStats.length}
          <div class="tour-hero-stats mt-5 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
            {#each heroStats as stat}
              <div class="hero-stat-chip flex min-w-0 items-center gap-2.5 border-l-2 border-goldfinch-gold/70 bg-deep-green/45 px-3 py-2.5 text-white backdrop-blur-md">
                <span class="grid h-8 w-8 shrink-0 place-items-center text-goldfinch-gold">
                  <svelte:component this={stat.icon} size={16} strokeWidth={2.35} />
                </span>
                <span class="min-w-0">
                  <span class="block text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/80">{stat.label}</span>
                  <span class="block text-[13px] font-extrabold leading-snug text-white md:text-[13.5px]">{stat.value}</span>
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </section>

  <div class="tour-page-canvas bg-[#fbfaf6]">
  <div bind:this={tabsAnchor} class="h-px" aria-hidden="true"></div>
  {#if tabsPinned}<div class="h-[49px] lg:hidden" aria-hidden="true"></div>{/if}
  <div class:tour-detail-tabs-pinned={tabsPinned} class="tour-detail-tabs border-b border-ink/10 bg-[#fbfaf6]/95 backdrop-blur">
    <div class="container-shell">
      <div class="tour-detail-tablist no-scrollbar flex gap-6 overflow-x-auto py-3 text-[13.5px] font-semibold text-ink/60">
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

  <div class="tour-detail-content container-shell">
    <div class="tour-detail-layout grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
      <main class="tour-detail-main min-w-0 space-y-10 md:space-y-16">
        <section id="overview" class="tour-section scroll-mt-32">
          <div class="section-label">
            <span></span>
            <p>Overview</p>
          </div>
          <h2 class="mt-3 font-serif text-[28px] font-semibold leading-tight text-heading sm:text-[32px] md:text-[38px]">About This Safari</h2>
          {#if tourDescription}
            <RichText value={tourDescription} className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink/70" />
          {/if}

          {#if tripFacts.length}
            <div class="tour-facts-grid mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {#each tripFacts as fact}
                <div class="rounded-[10px] border border-ink/10 bg-sand/30 p-3.5">
                  <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/70">
                    <svelte:component this={fact.icon} size={13} />
                    {fact.label}
                  </span>
                  <p class="mt-1 text-sm font-bold text-heading">{fact.value}</p>
                </div>
              {/each}
            </div>
          {/if}

          <button
            type="button"
            class="mt-5 inline-flex items-center gap-1 text-[14px] font-semibold text-clay transition hover:text-heading"
            on:click={() => openPlanner('overview-customize')}
          >
            Customize this route <ArrowRight size={14} />
          </button>
        </section>

        {#if snapshotRows.length}
          <section class="tour-section">
            <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Safari Snapshot</h2>
            <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">A quick look at the published route, day by day.</p>

            <div class="mt-6 hidden overflow-hidden rounded-t-[10px] border border-ink/10 md:block">
              <table class="w-full border-collapse text-[14px]">
                <thead>
                  <tr class="bg-deep-green text-left text-white">
                    <th class="w-[92px] min-w-[92px] whitespace-nowrap px-4 py-3 font-semibold">Day</th>
                    <th class="px-4 py-3 font-semibold">Place</th>
                    <th class="px-4 py-3 font-semibold">Highlights</th>
                    <th class="px-4 py-3 font-semibold">Hotel Options</th>
                  </tr>
                </thead>
                <tbody>
                  {#each snapshotRows as row, index}
                    <tr class={index % 2 === 0 ? 'bg-surface' : 'bg-sand/35'}>
                      <td class="w-[92px] min-w-[92px] whitespace-nowrap border-t border-ink/5 px-4 py-3 align-top font-semibold text-heading">{row.day}</td>
                      <td class="border-t border-ink/5 px-4 py-3 align-top font-semibold text-clay">{row.place}</td>
                      <td class="border-t border-ink/5 px-4 py-3 align-top text-ink/70">{row.highlights || 'Published details on request'}</td>
                      <td class="border-t border-ink/5 px-4 py-3 align-top text-ink/70">{row.hotel || 'Confirmed when quoted'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            <div class="tour-snapshot-mobile mt-6 space-y-3 md:hidden">
              {#each snapshotRows as row}
                <div class="rounded-[12px] border border-ink/10 bg-surface p-5">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/60">{row.day}</div>
                  <div class="mt-2 font-serif text-[17px] font-semibold leading-snug text-clay">{row.place}</div>
                  {#if row.highlights}<p class="mt-2 text-[14px] leading-relaxed text-heading">{row.highlights}</p>{/if}
                  {#if row.hotel}<p class="mt-2 text-[13.5px] leading-relaxed text-ink/65">{row.hotel}</p>{/if}
                </div>
              {/each}
            </div>
          </section>
        {/if}

        {#if tour.customization_options?.length}
          <section class="tour-section">
            <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Ways to Customize This Trip</h2>
            {#if tour.customization_intro}
              <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">{tour.customization_intro}</p>
            {/if}
          <ul class="tour-customize-list mt-6 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {#each tour.customization_options as item}
              <li class="flex items-start gap-2 text-[14.5px] text-heading">
                <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold"></span>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
          <button
            type="button"
            class="mt-6 inline-flex items-center justify-center rounded-[6px] bg-goldfinch-gold px-5 py-2.5 text-[14px] font-bold text-heading transition hover:brightness-105"
            on:click={() => openPlanner('customize')}
          >
            Customize This Trip <ArrowRight size={15} />
          </button>
          </section>
        {/if}

        <section id="day-by-day" class="tour-section scroll-mt-32">
          <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Day by Day</h2>
          <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">
            This is the published itinerary for this tour. The planning team can adjust it around your dates and preferred pace.
          </p>

          {#if itineraryDays.length}
            <div class="tour-day-list mt-6 space-y-2.5">
              {#each itineraryDays as day, index (day.day_number)}
                {@const image = dayImage(day)}
                {@const details = detailsForDay(day)}
                <details id={`day-${day.day_number}`} class="tour-day-card group overflow-hidden rounded-[12px] border border-ink/10 bg-surface" open={index === 0}>
                  <summary class="tour-day-toggle flex w-full cursor-pointer list-none items-center gap-4 px-4 py-4 text-left marker:content-none md:px-5 [&::-webkit-details-marker]:hidden" on:click={animateDayDisclosure}>
                    <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-deep-green text-[13px] font-bold text-white">
                      {day.day_number}
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-clay/80">Day {day.day_number}</span>
                      <span class="mt-0.5 block font-serif text-[16.5px] font-bold leading-snug text-heading md:text-[18px]">{day.title}</span>
                      <span class="mt-0.5 block text-[12.5px] text-ink/55">
                        {[day.lodge?.name || day.accommodation || '', day.meals || ''].filter(Boolean).join(' / ')}
                      </span>
                    </span>
                    <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/60 transition-transform duration-200 group-open:rotate-180">
                      <ChevronDown class="h-5 w-5" />
                    </span>
                  </summary>

                    <div class="tour-day-body border-t border-ink/10 px-4 pb-8 pt-6 md:px-8 md:pt-8">
                      {#if image}
                        <Img
                          src={image.record ? '' : image.src}
                          record={image.record}
                          fields={image.fields ?? []}
                          alt={image.caption}
                          width={1000}
                          sizes="(max-width: 768px) 92vw, 700px"
                          className="tour-day-image mb-6 h-[220px] w-full rounded-[12px] object-cover sm:h-[280px] md:mb-8 md:h-[380px]"
                        />
                      {/if}

                      {#if day.description}
                        <RichText value={day.description} className="space-y-4 text-[14.5px] leading-[1.65] text-ink/70 md:text-[16px]" />
                      {/if}

                      {#if details.length}
                        <ul class="tour-day-details mb-7 mt-6 rounded-[12px] border border-ink/10 bg-sand/45 p-5 md:p-[22px]">
                          {#each details as detail, detailIndex}
                            <li class={`flex items-start gap-3 text-[14.5px] leading-[1.55] md:text-[15px] ${detailIndex > 0 ? 'mt-2.5' : ''}`}>
                              <svelte:component this={detail.icon} size={16} class="mt-[2px] shrink-0 text-clay" />
                              <span class="min-w-0 flex-1">
                                <span class="font-semibold text-heading">{detail.label}:</span>
                                <span class="text-ink/70"> {detail.value}</span>
                              </span>
                            </li>
                          {/each}
                        </ul>
                      {/if}

                      {#if day.lodge}
                        {@const stay = day.lodge}
                        {@const gallery = galleryForStay(stay)}
                        <div class="tour-day-accommodation">
                          <div class="mb-3.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink/60 md:text-[11px]">Accommodation - {stay.name}</div>
                          <div class="tour-day-accommodation-card overflow-hidden rounded-[12px] border border-ink/10 bg-surface">
                            {#if gallery.length}
                              <div class="tour-day-accommodation-gallery grid grid-cols-4 gap-1 overflow-hidden rounded-t-[11px] bg-sand p-1">
                                {#each gallery.slice(0, 4) as image, imageIndex}
                                  <div class={`relative aspect-[4/3] min-w-0 overflow-hidden bg-sand ${imageIndex === 0 ? 'rounded-tl-[8px]' : ''} ${imageIndex === Math.min(gallery.length, 4) - 1 ? 'rounded-tr-[8px]' : ''}`}>
                                    <Img
                                      src={image.record ? '' : image.src}
                                      record={image.record}
                                      fields={image.fields ?? []}
                                      alt={image.caption}
                                      width={360}
                                      sizes="(max-width: 768px) 23vw, 175px"
                                      className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                                    />
                                    {#if imageIndex === 3 && gallery.length > 4}
                                      <div class="pointer-events-none absolute inset-0 grid place-items-center bg-heading/55 px-2 text-center text-xs font-extrabold tracking-wide text-white backdrop-blur-[1px] sm:text-sm">
                                        +{gallery.length - 4} {gallery.length - 4 === 1 ? 'photo' : 'photos'}
                                      </div>
                                    {/if}
                                  </div>
                                {/each}
                              </div>
                            {/if}
                            <div class="p-4 md:p-5">
                              <div class="flex flex-wrap items-start justify-between gap-3">
                                <div class="min-w-0">
                                  <h4 class="font-serif text-[19px] font-semibold leading-snug text-heading">{stay.name}</h4>
                                  <p class="mt-1 text-[13px] font-medium text-ink/60">
                                    {[LODGE_TYPES[String(stay.lodge_type)] ?? '', stay.accommodation_level ? normaliseLabel(stay.accommodation_level) : '', stay.destinations?.name ?? ''].filter(Boolean).join(' / ')}
                                  </p>
                                </div>
                                <a
                                  class="inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-ink/10 px-3 py-2 text-[12px] font-bold text-forest transition hover:border-goldfinch-gold hover:text-heading"
                                  href={`/accommodation/${stay.slug}`}
                                  data-sveltekit-preload-data="hover"
                                >
                                  View accommodation <ArrowRight size={13} />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      {/if}
                    </div>
                </details>
              {/each}
            </div>
          {:else}
            <div class="mt-6 rounded-[12px] border border-ink/10 bg-sand/35 p-5 text-[14px] leading-6 text-ink/70">
              The day-by-day itinerary has not been published for this tour yet. Send a request and the team will share the current route.
            </div>
          {/if}
        </section>

        {#if accommodationBlocks.length}
          <section id="accommodation" class="tour-section scroll-mt-32">
            <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Accommodation</h2>
            <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">
              These are the accommodations attached to the published itinerary days for this tour.
            </p>

            <div class="tour-accommodation-grid mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {#each accommodationBlocks as block (block.key)}
                <article class="group relative aspect-square overflow-hidden rounded-[12px] border border-ink/10 bg-deep-green shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(39,43,34,0.18)] focus-within:-translate-y-0.5 focus-within:shadow-[0_18px_38px_rgba(39,43,34,0.18)]">
                  {#if block.gallery[0]}
                    <Img
                      src={block.gallery[0].record ? '' : block.gallery[0].src}
                      record={block.gallery[0].record}
                      fields={block.gallery[0].fields ?? []}
                      alt={block.gallery[0].caption}
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
                  <div class="absolute inset-x-0 bottom-0 h-[66%] bg-gradient-to-t from-deep-green via-deep-green/88 to-transparent" aria-hidden="true"></div>
                  <div class="relative flex h-full flex-col justify-end p-4 text-white md:p-5">
                    <span class="mb-auto w-fit rounded-full border border-white/25 bg-deep-green/82 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_18px_rgba(15,23,42,0.24)] backdrop-blur">
                      {block.dayLabel}
                    </span>
                    <div>
                      <h3 class="accommodation-card-title font-serif text-[20px] font-semibold leading-snug text-white drop-shadow md:text-[21px]">{block.label}</h3>
                      {#if block.summary}<p class="mt-1 accommodation-card-summary text-[13px] font-semibold leading-5 text-white/90 drop-shadow">{block.summary}</p>{/if}
                    </div>
                    <div class="accommodation-card-extra mt-4 overflow-hidden text-white md:max-h-0 md:opacity-0 md:transition-all md:duration-300 md:group-hover:max-h-40 md:group-hover:opacity-100 md:group-focus-within:max-h-40 md:group-focus-within:opacity-100">
                      {#if block.gallery.length > 1}
                        <div class="grid grid-cols-3 gap-2">
                          {#each block.gallery.slice(1, 4) as image}
                            <div class="aspect-[4/3] overflow-hidden rounded-[7px] border border-white/20 bg-white/10">
                              <Img
                                src={image.record ? '' : image.src}
                                record={image.record}
                                fields={image.fields ?? []}
                                alt={image.caption}
                                width={220}
                                sizes="120px"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          {/each}
                        </div>
                      {/if}
                      {#if block.href}
                        <span class="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-goldfinch-gold">
                          View accommodation <ArrowRight size={14} />
                        </span>
                      {/if}
                    </div>
                    {#if block.href}
                      <a class="absolute inset-0 z-10 rounded-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-goldfinch-gold" href={block.href} aria-label={`View accommodation ${block.label}`} data-sveltekit-preload-data="hover"></a>
                    {/if}
                  </div>
                </article>
              {/each}
            </div>
          </section>
        {/if}

        <section id="prices" class="tour-section scroll-mt-32">
          <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Tour Rates</h2>
          <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">
            Rates are shown only from the published tour data. Your final quote is confirmed after dates and availability are checked.
          </p>

          {#if pricingSeasons.length}
            <div class="mt-6 overflow-x-auto rounded-[10px] border border-ink/10 bg-surface shadow-sm">
              <table class="w-full min-w-[820px] border-collapse text-[14px]">
                <thead><tr class="bg-[#34382d] text-left text-white"><th class="sticky left-0 z-10 min-w-40 bg-[#34382d] px-5 py-5 text-[15px] font-bold">Season</th>{#each groupColumns as group}<th class="min-w-28 whitespace-nowrap px-4 py-5 text-left text-[15px] font-bold">{groupLabel(group)}</th>{/each}</tr></thead>
                <tbody>{#each pricingSeasons as season,index}<tr class={index%2===0?'bg-surface':'bg-[#f5f1e9]'}><th class={`sticky left-0 z-10 border-t border-ink/8 px-5 py-6 text-left ${index%2===0?'bg-surface':'bg-[#f5f1e9]'}`}><span class="block max-w-32 text-[16px] font-extrabold leading-6 text-heading">{season.season_name}</span></th>{#each groupColumns as group}{@const key=`${group.minimum_travelers}:${group.maximum_travelers??''}`}{@const rate=groupRate(season,key)}<td class="border-t border-ink/8 px-4 py-6 text-left text-[15px] leading-6 text-ink/65"><span class="block">{rate.label}</span>{#if rate.amount}<span class="block font-semibold text-ink/70">{rate.amount}</span>{/if}</td>{/each}</tr>{/each}</tbody>
              </table>
            </div>
            <p class="mt-4 text-[13px] leading-6 text-ink/55">
              Prices are {normaliseLabel(pricingSeasons[0].pricing_basis).toLowerCase()} in {pricingSeasons[0].currency} and based on shared double/twin accommodation unless stated otherwise. Final pricing depends on travel dates, lodge availability, group size and route adjustments.
              <span class="md:hidden"> Swipe horizontally to compare party sizes.</span>
            </p>
          {:else}
          <div class="tour-rates-mobile mt-5 grid gap-2.5 md:hidden">
            {#each priceRows as row}
              <article class="rounded-[8px] border border-ink/10 bg-surface p-4">
                <div class="flex min-w-0 items-start justify-between gap-4">
                  <h3 class="min-w-0 text-[13px] font-semibold leading-snug text-heading">{row.label}</h3>
                  <p class="max-w-[58%] break-words text-right text-[14px] font-extrabold leading-snug text-forest">{row.value}</p>
                </div>
                {#if row.note}
                  <p class="mt-2 border-t border-ink/8 pt-2 text-[11.5px] leading-5 text-ink/60">{row.note}</p>
                {/if}
              </article>
            {/each}
          </div>
          {/if}

          {#if !pricingSeasons.length}<div class="tour-rates-table mt-6 hidden overflow-hidden rounded-t-[10px] border border-ink/10 md:block">
            <table class="w-full border-collapse text-[14px]">
              <thead>
                <tr class="bg-deep-green text-left text-white">
                  <th class="px-4 py-3 font-semibold">Item</th>
                  <th class="px-4 py-3 font-semibold">Published detail</th>
                  <th class="hidden px-4 py-3 font-semibold md:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {#each priceRows as row, index}
                  <tr class={index % 2 === 0 ? 'bg-surface' : 'bg-sand/35'}>
                    <td class="border-t border-ink/5 px-4 py-3 align-top font-semibold text-heading">{row.label}</td>
                    <td class="border-t border-ink/5 px-4 py-3 align-top text-ink/75">{row.value}</td>
                    <td class="hidden border-t border-ink/5 px-4 py-3 align-top text-ink/60 md:table-cell">{row.note}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>{/if}

          <button
            type="button"
            class="mt-5 inline-flex items-center justify-center rounded-[6px] bg-goldfinch-gold px-5 py-2.5 text-[14px] font-bold text-heading transition hover:brightness-105"
            on:click={() => openPlanner('prices')}
          >
            Get My Exact Quote <ArrowRight size={15} />
          </button>
        </section>

        <section id="inclusions" class="tour-section scroll-mt-32">
          <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">What's Included</h2>
          <div class="tour-two-col-grid mt-6 grid gap-4 md:grid-cols-2">
            <div class="rounded-[12px] border border-ink/10 bg-surface p-5">
              <h3 class="font-serif text-[18px] font-semibold text-heading">Included</h3>
              {#if inclusions.length}
                <ul class="mt-3 space-y-2">
                  {#each inclusions as item}
                    <li class="flex items-start gap-2 text-[14.5px] text-heading">
                      <Check class="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                      <span>{item.title}</span>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="mt-3 text-[14.5px] leading-6 text-ink/65">Published inclusions are not listed on this tour yet.</p>
              {/if}
            </div>

            <div class="rounded-[12px] border border-ink/10 bg-sand/45 p-5">
              <h3 class="font-serif text-[18px] font-semibold text-heading">Not Included</h3>
              {#if exclusions.length}
                <ul class="mt-3 space-y-2">
                  {#each exclusions as item}
                    <li class="flex items-start gap-2 text-[14.5px] text-ink/70">
                      <Minus class="mt-0.5 h-4 w-4 shrink-0 text-ink/45" />
                      <span>{item.title}</span>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="mt-3 text-[14.5px] leading-6 text-ink/65">Published exclusions are not listed on this tour yet.</p>
              {/if}
            </div>
          </div>
          <button
            type="button"
            class="mt-6 inline-flex items-center justify-center rounded-[6px] bg-goldfinch-gold px-5 py-2.5 text-[14px] font-bold text-heading transition hover:brightness-105"
            on:click={() => openPlanner('inclusions')}
          >
            Ask What's Included <ArrowRight size={15} />
          </button>
        </section>

      </main>

      <aside id="plan-this-trip" class="hidden self-stretch transition lg:block">
        <div class="tour-planner-sticky">
          <BookingForm {tour} />
          {#if tourSpecialist}
            <button
              type="button"
              class="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-forest/20 bg-surface px-4 text-sm font-bold text-forest transition hover:border-forest/40 hover:bg-sand/40"
              aria-label={`View specialist ${tourSpecialist.name}`}
              on:click={() => (specialistOpen = true)}
            >
              View Specialist <ArrowRight size={15} strokeWidth={2.5} />
            </button>
          {/if}
        </div>
      </aside>
    </div>
  </div>

  <ReviewsWidget
    eyebrow="Traveller stories"
    title="Travellers Who Planned Tanzania With Us"
    subtitle="Real approved reviews from Goldfinch travellers."
  />

  {#if relatedTours.length}
    <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader eyebrow="You might also like" title="More tours" description="Other published trips travellers book with us." />
          <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/tours">
            Browse all tours <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each relatedTours as item (item.id)}
            <TourCardRich tour={item} whiteSurface />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if recentPosts.length}
    <section class="py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader eyebrow="Stories &amp; guides" title="From the journal" description="Travel inspiration, tips and stories from the field." />
          <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/blog">
            Read the blog <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each recentPosts as post (post.id)}
            <BlogCard {post} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <section id="good-to-know" class="scroll-mt-32 border-t border-ink/10 bg-sand/25 py-14 md:py-20">
    <div class="container-shell">
      <div class="mx-auto max-w-4xl">
        <div class="section-label"><span></span><p>Good to Know</p></div>
        <h2 class="mt-3 font-serif text-[28px] font-semibold leading-tight text-heading sm:text-[32px] md:text-[38px]">Frequently Asked Questions</h2>
        {#if faqs.length}
          <ol class="relative mt-10">
            {#each faqs as item, index}
              {@const faqState = index === activeFaqIndex ? 'is-active' : index < activeFaqIndex ? 'is-complete' : 'is-upcoming'}
              <li data-faq-item class={`faq-timeline-item ${faqState} relative pb-10 pl-14 last:pb-0 md:pl-20`}>
                {#if index < faqs.length - 1}<span class="faq-connector pointer-events-none absolute left-4 top-10 bottom-0 w-px md:left-5" aria-hidden="true"></span>{/if}
                <span class="faq-number absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full font-serif text-[14px] font-semibold md:h-10 md:w-10 md:text-[15px]">{String(index + 1).padStart(2, '0')}</span>
                <h3 class="font-serif text-[19px] font-semibold leading-snug text-heading md:text-[22px]">{item.question}</h3>
                <RichText value={item.answer} className="mt-3 text-[15px] leading-relaxed text-heading/85 md:text-[17px]" />
              </li>
            {/each}
          </ol>
        {:else}
          <div class="mt-6 rounded-[12px] border border-ink/10 bg-surface p-5 text-[14px] leading-6 text-ink/70">No public FAQ entries are published yet. Send your question in the trip request and the team will reply with the latest details.</div>
        {/if}
      </div>
    </div>
  </section>
  </div>

  <div class="tour-mobile-cta fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] lg:hidden">
    <div class="flex items-center gap-3">
      <div class="min-w-0 flex-1">
        <div class="truncate text-[13px] font-semibold text-heading">{priceFromLabel}</div>
        <div class="truncate text-[11.5px] text-ink/65">{durationLabel || 'Tailored trip'}{#if destinationLabel} / {destinationLabel}{/if}</div>
      </div>
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-[6px] bg-goldfinch-gold px-5 text-[14px] font-bold text-heading transition hover:brightness-105"
        on:click={() => openPlanner('mobile-sticky')}
      >
        Plan This Trip
      </button>
    </div>
  </div>

  {#if sheetOpen}
    <div class="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true">
      <button class="absolute inset-0 cursor-default bg-black/60" type="button" aria-label="Close planner" on:click={closeSheet}></button>
      <div class="tour-planner-sheet absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[16px] bg-deep-green">
        <button
          type="button"
          on:click={closeSheet}
          aria-label="Close"
          class="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <X class="h-4 w-4" />
        </button>
        <div class="flex-1 overflow-hidden">
          <BookingForm {tour} />
        </div>
      </div>
    </div>
  {/if}

  {#if specialistOpen && tourSpecialist}
    <div class="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Specialist ${tourSpecialist.name}`}>
      <button class="absolute inset-0 cursor-default" type="button" aria-label="Close specialist" on:click={() => (specialistOpen = false)}></button>
      <div class="relative z-10 w-full max-w-md">
        <button
          type="button"
          class="absolute -right-2 -top-2 z-20 grid h-10 w-10 place-items-center rounded-full bg-deep-green text-white shadow-lg transition hover:bg-forest"
          aria-label="Close specialist"
          on:click={() => (specialistOpen = false)}
        >
          <X size={18} />
        </button>
        <SpecialistCard specialist={tourSpecialist} heading="Your tour specialist" />
      </div>
    </div>
  {/if}

  <div class="h-20 lg:hidden" aria-hidden="true"></div>
{/if}

<svelte:window on:keydown={(event) => event.key === 'Escape' && closeOverlays()} />

{#if touristTripLd}<JsonLd data={touristTripLd} />{/if}
{#if breadcrumbLd}<JsonLd data={breadcrumbLd} />{/if}

<style>
  .skeleton-shimmer {
    position: relative;
    overflow: hidden;
    background-color: rgb(var(--c-ink) / 0.08);
  }

  .skeleton-shimmer::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.68), transparent);
    animation: itinerary-shimmer 1.45s ease-in-out infinite;
  }

  @keyframes itinerary-shimmer {
    to { transform: translateX(100%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-shimmer::after { animation: none; }
  }

  .tour-detail-tabs {
    position: -webkit-sticky;
    position: sticky;
    top: 70px;
    z-index: 45;
  }

  @media (max-width: 1023px) {
    .tour-detail-tabs-pinned {
      position: fixed;
      inset: 70px 0 auto;
      width: 100%;
      z-index: 90;
    }
  }

  .tour-hero-copy {
    isolation: isolate;
  }

  @media (min-width: 1024px) {
    .tour-detail-tabs {
      z-index: 30;
    }

    .tour-planner-sticky {
      position: sticky;
      z-index: 40;
      top: 8.75rem;
      overflow: visible;
    }
  }

  @media (max-width: 1023px) {
    .tour-planner-sheet {
      height: min(92dvh, var(--booking-viewport-height, 100dvh));
      max-height: var(--booking-viewport-height, 100dvh);
    }
  }

  .tour-hero-copy::before {
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

  .section-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-label span {
    height: 1px;
    width: 1.5rem;
    background: rgb(var(--c-clay));
  }

  .section-label p {
    color: rgb(var(--c-clay));
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
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

  .accommodation-card-title,
  .accommodation-card-summary {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .accommodation-card-title {
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }

  .accommodation-card-summary {
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }

  @media (max-width: 767px) {
    .tour-detail-hero {
      min-height: clamp(660px, calc(100svh - 70px), 880px);
      max-width: 100vw;
      overflow-x: clip;
    }

    .tour-detail-hero::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgb(var(--c-deep-green) / 0.06) 0%, rgb(var(--c-deep-green) / 0.2) 36%, rgb(var(--c-deep-green) / 0.82) 100%),
        linear-gradient(90deg, rgb(var(--c-deep-green) / 0.74) 0%, rgb(var(--c-deep-green) / 0.28) 56%, transparent 100%);
      pointer-events: none;
    }

    :global(.tour-detail-hero-image) {
      object-position: center center;
    }

    .tour-detail-hero-overlay {
      background: linear-gradient(to top, rgb(var(--c-deep-green) / 0.42), transparent 58%, rgb(var(--c-deep-green) / 0.12));
    }

    .tour-detail-hero-shell {
      min-height: clamp(660px, calc(100svh - 70px), 880px);
      justify-content: end;
      padding-top: 4.75rem;
      padding-bottom: 2rem;
      z-index: 1;
    }

    .tour-hero-copy {
      max-width: 100%;
      padding-bottom: 0;
      text-shadow: 0 2px 18px rgb(0 0 0 / 0.45);
    }

    .tour-hero-copy::before {
      inset: auto -0.75rem -0.95rem -0.75rem;
      top: 4.25rem;
      border-radius: 16px;
      background:
        linear-gradient(180deg, rgb(var(--c-deep-green) / 0.08), rgb(var(--c-deep-green) / 0.88)),
        linear-gradient(90deg, rgb(var(--c-deep-green) / 0.76), rgb(var(--c-forest) / 0.56));
      box-shadow: 0 18px 44px rgb(15 23 42 / 0.22);
    }

    .tour-hero-tags {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: max-content;
      gap: 0.4rem;
      margin-inline: -16px;
      margin-bottom: 1rem;
      overflow-x: auto;
      padding-inline: 16px;
      padding-bottom: 0.1rem;
      scrollbar-width: none;
    }

    .tour-hero-tags::-webkit-scrollbar {
      display: none;
    }

    .tour-hero-copy h1 {
      max-width: 11.5ch;
      font-size: clamp(2.25rem, 10.4vw, 3.35rem);
      line-height: 0.98;
      text-wrap: balance;
    }

    .tour-hero-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
      margin-top: 1.15rem;
    }

    .tour-hero-actions :global(button) {
      min-height: 2.75rem;
      padding-inline: 0.75rem;
      padding-block: 0.65rem;
      font-size: 0.8125rem;
      line-height: 1.15;
    }

    .tour-hero-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.45rem;
      margin-top: 1rem;
    }

    .hero-stat-chip {
      min-width: 0;
      align-items: start;
      gap: 0.45rem;
      border-radius: 12px;
      padding: 0.55rem;
    }

    .hero-stat-chip :global(svg) {
      height: 0.85rem;
      width: 0.85rem;
    }

    .hero-stat-chip > span:first-child {
      height: 1.7rem;
      width: 1.7rem;
      border-radius: 0.45rem;
    }

    .hero-stat-chip span span:first-child {
      font-size: 0.52rem;
      letter-spacing: 0.08em;
    }

    .hero-stat-chip span span:last-child {
      display: -webkit-box;
      overflow: hidden;
      font-size: 0.72rem;
      line-height: 1.12;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .tour-detail-tablist {
      gap: 1rem;
      padding-block: 0.7rem;
      font-size: 0.8125rem;
      scroll-padding-inline: 16px;
      scroll-snap-type: x proximity;
    }

    .tour-detail-tablist :global(button) {
      scroll-snap-align: start;
    }

    .tour-detail-layout {
      gap: 0;
      padding-block: 2.25rem 1.5rem;
    }

    .tour-section {
      scroll-margin-top: 7.5rem;
    }

    .tour-section h2 {
      font-size: clamp(1.65rem, 7vw, 2.05rem);
      line-height: 1.08;
    }

    .tour-section h3 {
      letter-spacing: 0;
    }

    .section-label p {
      font-size: 0.68rem;
      letter-spacing: 0.13em;
    }

    .tour-facts-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
      margin-top: 1.25rem;
    }

    .tour-facts-grid > :global(div) {
      border-radius: 12px;
      padding: 0.85rem;
    }

    .tour-highlight-grid,
    .tour-two-col-grid {
      gap: 0.75rem;
    }

    .tour-highlight-grid :global(article),
    .tour-two-col-grid > :global(div),
    .tour-snapshot-mobile > :global(div) {
      border-radius: 12px;
      padding: 1rem;
    }

    .tour-customize-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 0.9rem;
      row-gap: 0.7rem;
    }

    .tour-day-list {
      margin-top: 1.15rem;
      display: grid;
      gap: 0.75rem;
    }

    .tour-day-card {
      border-radius: 14px;
    }

    .tour-day-toggle {
      gap: 0.75rem;
      padding: 0.95rem;
    }

    .tour-day-toggle > span:first-child {
      height: 2rem;
      width: 2rem;
      font-size: 0.78rem;
    }

    .tour-day-body {
      padding: 0.9rem 0.9rem 1rem;
    }

    :global(.tour-day-image) {
      aspect-ratio: 16 / 10;
      height: auto;
      margin-bottom: 1rem;
      border-radius: 12px;
    }

    .tour-day-details {
      margin-block: 1rem 1.1rem;
      border-radius: 12px;
      padding: 0.9rem;
    }

    .tour-day-accommodation-card {
      border-radius: 12px;
    }

    :global(.tour-day-accommodation-image) {
      aspect-ratio: 16 / 9;
      height: auto;
    }

    .tour-day-accommodation-card :global(.p-4) {
      padding: 0.9rem;
    }

    .tour-day-accommodation-card a {
      width: 100%;
      justify-content: center;
    }

    .tour-accommodation-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .tour-accommodation-grid :global(article) {
      border-radius: 14px;
    }

    .tour-accommodation-grid :global(article .relative) {
      padding: 0.8rem;
    }

    .accommodation-card-title {
      font-size: 1rem;
      line-height: 1.08;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .accommodation-card-summary {
      font-size: 0.72rem;
      line-height: 1.25;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .accommodation-card-extra {
      display: none;
    }

    .tour-media-strip {
      margin-inline: -16px;
      padding-inline: 16px;
      scroll-padding-inline: 16px;
      scroll-snap-type: x mandatory;
    }

    .tour-mobile-cta {
      padding: 0.65rem 1rem calc(0.65rem + env(safe-area-inset-bottom));
    }

    .tour-mobile-cta button {
      height: 2.6rem;
      padding-inline: 1rem;
      white-space: nowrap;
    }
  }

  @media (max-width: 479px) {
    .tour-detail-hero-shell {
      min-height: clamp(650px, calc(100svh - 70px), 850px);
    }

    .tour-hero-copy h1 {
      max-width: 10.5ch;
    }

    .tour-hero-stats {
      grid-template-columns: 1fr;
    }

    .hero-stat-chip {
      align-items: center;
    }

    .hero-stat-chip span span:last-child {
      -webkit-line-clamp: 1;
      line-clamp: 1;
    }

    .tour-accommodation-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 480px) and (max-width: 767px) {
    .tour-detail-hero {
      min-height: clamp(600px, 78svh, 780px);
    }

    .tour-detail-hero-shell {
      width: calc(100vw - 48px);
      max-width: none;
      min-height: clamp(600px, 78svh, 780px);
      padding-top: 5rem;
      padding-bottom: 2.25rem;
    }

    .tour-hero-copy {
      max-width: 620px;
    }

    .tour-hero-copy h1 {
      max-width: 13ch;
      font-size: clamp(3rem, 8vw, 4rem);
    }

    .tour-hero-actions {
      max-width: 430px;
    }

    .tour-detail-content {
      width: calc(100vw - 48px);
      max-width: none;
    }

    .tour-hero-stats {
      max-width: 620px;
    }
  }

  @media (min-width: 640px) and (max-width: 767px) {
    .tour-facts-grid,
    .tour-highlight-grid,
    .tour-two-col-grid,
    .tour-customize-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .tour-accommodation-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (min-width: 768px) {
    .tour-hero-copy::before {
      display: none;
    }
  }

  .tour-hero-copy::before { display: none; }

  @media (max-width: 767px) {
    .tour-detail-hero,
    .tour-detail-hero-shell {
      min-height: 430px;
    }

    .tour-detail-hero { max-width: 100%; }
    .tour-detail-hero::after { display: none; }

    .tour-detail-hero-overlay {
      background: rgb(var(--c-deep-green) / 0.45);
    }

    .tour-detail-hero-shell {
      width: min(100% - 32px, 1180px);
      max-width: none;
      padding-top: 4.5rem;
      padding-bottom: 1.75rem;
    }

    .tour-hero-copy,
    .tour-hero-copy h1 {
      width: 100%;
      max-width: none;
    }

    .tour-hero-copy h1 {
      font-size: clamp(2rem, 8.6vw, 3rem);
      line-height: 1.04;
      text-wrap: pretty;
    }

    .tour-hero-actions {
      display: flex;
      margin-top: 1rem;
    }

    .tour-hero-actions :global(button) {
      width: auto;
      min-height: 2.65rem;
      padding: 0.65rem 1rem;
    }

    .tour-hero-stats {
      display: grid;
      max-width: 100%;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.4rem;
      margin-top: 0.875rem;
    }

    .hero-stat-chip {
      min-width: 0;
      min-height: 4.4rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
      border-top: 2px solid rgb(var(--c-goldfinch-gold) / 0.72);
      border-left: 0;
      border-radius: 0;
      padding: 0.5rem;
    }

    .hero-stat-chip > span:first-child {
      display: block;
      width: auto;
      height: auto;
      background: transparent;
      color: rgb(var(--c-goldfinch-gold));
    }

    .hero-stat-chip span span:first-child { font-size: 0.5rem; }
    .hero-stat-chip span span:last-child {
      display: -webkit-box;
      overflow: hidden;
      font-size: 0.68rem;
      line-height: 1.12;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
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
