<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import {
    ArrowLeft,
    ArrowRight,
    BedDouble,
    CalendarDays,
    Camera,
    Check,
    ChevronDown,
    Compass,
    MapPin,
    Minus,
    Route,
    Users,
    Utensils,
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
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ReviewsWidget from '$lib/components/public/ReviewsWidget.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import SpecialistCard from '$lib/components/public/SpecialistCard.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { defaultSpecialist } from '$lib/data/specialists';
  import { toMetaText } from '$lib/richText';
  import { getTourDestinationLabel, getTourDestinations } from '$lib/tourDestinations';
  import type { BlogPost, FAQ, ItineraryDay, Tour } from '$lib/types';

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

  let tour: Tour | null = null;
  let loading = true;
  let error = '';
  let loadedSlug = '';
  let sheetOpen = false;
  let activeTab = TABS[0].id;
  let openDays: Record<number, boolean> = {};

  let relatedTours: Tour[] = [];
  let recentPosts: BlogPost[] = [];
  let faqs: FAQ[] = [];
  let lodgeMedia: Record<string, MediaImage[]> = {};

  const normaliseLabel = (value: string | null | undefined): string =>
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

  const isDayOpen = (day: ItineraryDay, index: number): boolean =>
    openDays[day.day_number] ?? index === 0;

  const toggleDay = (day: ItineraryDay, index: number) => {
    const currentlyOpen = isDayOpen(day, index);
    openDays = { ...openDays, [day.day_number]: !currentlyOpen };
  };

  const scrollToSection = (id: string) => {
    if (!browser) return;
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });
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
  $: tourDescription = tour?.full_description || tour?.short_description || '';
  $: metaDescription = tour ? shortText(tour.meta_description || tour.short_description || tour.full_description, 170) : '';
  $: categoryLabel = tour?.tour_categories?.name || normaliseLabel(tour?.experience_type);
  $: heroTags = unique([
    ...destinations.slice(0, 3).map((destination) => destination.name),
    categoryLabel,
    durationLabel
  ]).slice(0, 5);
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
        durationLabel ? { icon: CalendarDays, label: 'Duration', value: durationLabel } : null,
        destinationLabel ? { icon: MapPin, label: 'Destinations', value: destinationLabel } : null,
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
  $: priceRows = [
    { label: 'Starting price', value: priceFromLabel, note: tour?.price_from ? 'Final pricing depends on dates, party size and confirmed availability.' : 'Your specialist will quote this from live availability.' },
    durationLabel ? { label: 'Duration', value: durationLabel, note: 'Taken from the published itinerary.' } : null,
    groupSize ? { label: 'Group size', value: groupSize, note: 'Based on the published trip settings.' } : null,
    routeLabel ? { label: 'Route', value: routeLabel, note: 'Start and end points from this tour.' } : null
  ].filter(Boolean) as Array<{ label: string; value: string; note: string }>;
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
    if (faqRes.status === 'fulfilled') faqs = faqRes.value.data.items ?? [];
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
    lodgeMedia = {};
    openDays = {};
    sheetOpen = false;

    try {
      const response = await api.tours.get(nextSlug);
      tour = response.data;
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

  $: if (browser) document.body.style.overflow = sheetOpen ? 'hidden' : '';

  onMount(() => {
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
    window.addEventListener('resize', updateActiveTab);
    updateActiveTab();

    return () => {
      window.removeEventListener('scroll', updateActiveTab);
      window.removeEventListener('resize', updateActiveTab);
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
  <section class="container-shell py-16">
    <LoadingState message="Loading tour..." />
  </section>
{:else if !tour}
  <section class="container-shell py-16">
    <ErrorState message={error || 'Tour not found.'} />
  </section>
{:else}
  <section data-hero class="relative isolate overflow-hidden bg-deep-green">
    {#if heroImage}
      <Img
        record={tour}
        fields={['main_image_url', 'banner_image_url']}
        alt=""
        width={1800}
        sizes="100vw"
        eager
        className="absolute inset-0 h-full w-full object-cover"
      />
    {/if}
    <div class="absolute inset-0 bg-gradient-to-b from-deep-green/35 via-deep-green/10 to-deep-green/50" aria-hidden="true"></div>
    <div class="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-tr from-deep-green/95 via-forest/70 to-transparent" aria-hidden="true"></div>

    <div class="relative mx-auto flex min-h-[560px] max-w-7xl flex-col justify-end px-4 pb-12 pt-20 md:min-h-[640px] md:px-6 md:pb-16 md:pt-24 lg:min-h-[680px] lg:pb-20">
      <a href="/tours" class="absolute left-4 top-6 hidden items-center gap-1.5 text-[13px] font-medium text-white/90 transition hover:text-goldfinch-gold md:left-6 md:top-8 md:inline-flex">
        <ArrowLeft class="h-3.5 w-3.5" /> Back to tours
      </a>

      <div class="max-w-3xl pb-2 [text-shadow:0_2px_18px_rgba(39,43,34,0.42)] md:pb-4">
        {#if heroTags.length}
          <div class="mb-5 flex flex-wrap gap-1.5">
            {#each heroTags as tag}
              <span class="inline-flex items-center rounded-full border border-white/30 bg-deep-green/35 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                {tag}
              </span>
            {/each}
          </div>
        {/if}
        {#if categoryLabel}
          <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold drop-shadow">{categoryLabel}</span>
        {/if}
        <h1 class="mt-3 font-serif text-3xl font-semibold leading-[1.05] tracking-normal text-white sm:text-4xl md:text-5xl lg:text-[54px]">
          {tour.title}
        </h1>
        {#if tour.short_description || tour.full_description}
          <p class="mt-4 max-w-2xl text-[15px] font-medium leading-relaxed text-white md:text-base">
            {shortText(tour.short_description || tour.full_description, 230)}
          </p>
        {/if}
        <div class="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-[6px] bg-goldfinch-gold px-5 py-3 text-sm font-bold text-heading transition hover:brightness-105"
            on:click={() => openPlanner('hero')}
          >
            Plan This Trip
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-[6px] border border-white/35 bg-deep-green/30 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-deep-green/45"
            on:click={() => scrollToSection('day-by-day')}
          >
            View Day by Day
          </button>
        </div>
        <p class="mt-5 text-[13.5px] text-white/90">
          {durationLabel || 'Tailored itinerary'}{#if destinationLabel} / {destinationLabel}{/if}{#if priceLabel} / from {priceLabel} per person{/if}
        </p>
      </div>
    </div>
  </section>

  <div class="sticky top-[70px] z-30 border-b border-ink/10 bg-surface/95 backdrop-blur">
    <div class="mx-auto max-w-7xl px-4 md:px-6">
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

  <div class="mx-auto max-w-7xl px-4 md:px-6">
    <div class="grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
      <main class="min-w-0 space-y-14 md:space-y-16">
        <section id="overview" class="scroll-mt-32">
          <div class="section-label">
            <span></span>
            <p>Overview</p>
          </div>
          <h2 class="mt-3 font-serif text-[28px] font-semibold leading-tight text-heading sm:text-[32px] md:text-[38px]">About This Safari</h2>
          {#if tourDescription}
            <RichText value={tourDescription} className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink/70" />
          {/if}

          {#if tripFacts.length}
            <div class="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          <section>
            <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Safari Snapshot</h2>
            <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">A quick look at the published route, day by day.</p>

            <div class="mt-6 hidden overflow-hidden rounded-t-[10px] border border-ink/10 md:block">
              <table class="w-full border-collapse text-[14px]">
                <thead>
                  <tr class="bg-deep-green text-left text-white">
                    <th class="px-4 py-3 font-semibold">Day</th>
                    <th class="px-4 py-3 font-semibold">Place</th>
                    <th class="px-4 py-3 font-semibold">Highlights</th>
                    <th class="px-4 py-3 font-semibold">Hotel Options</th>
                  </tr>
                </thead>
                <tbody>
                  {#each snapshotRows as row, index}
                    <tr class={index % 2 === 0 ? 'bg-surface' : 'bg-sand/35'}>
                      <td class="border-t border-ink/5 px-4 py-3 align-top font-semibold text-heading">{row.day}</td>
                      <td class="border-t border-ink/5 px-4 py-3 align-top font-semibold text-clay">{row.place}</td>
                      <td class="border-t border-ink/5 px-4 py-3 align-top text-ink/70">{row.highlights || 'Published details on request'}</td>
                      <td class="border-t border-ink/5 px-4 py-3 align-top text-ink/70">{row.hotel || 'Confirmed when quoted'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            <div class="mt-6 space-y-3 md:hidden">
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

        {#if highlights.length}
          <section>
            <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Why This Trip Works</h2>
            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              {#each highlights as highlight, index}
                <article class="rounded-[12px] border border-ink/10 bg-surface p-5">
                  <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-clay">Highlight {index + 1}</p>
                  <RichText value={highlight} className="mt-2 text-[14.5px] leading-relaxed text-ink/70" />
                </article>
              {/each}
            </div>
          </section>
        {/if}

        {#if bestFor.length || tripFacts.length}
          <section>
            <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Is This Safari Right for You?</h2>
            <div class="mt-6 grid gap-4 md:grid-cols-2">
              {#if bestFor.length}
                <div class="rounded-[12px] border border-ink/10 bg-surface p-5">
                  <h3 class="font-serif text-[18px] font-semibold text-heading">Best for</h3>
                  <ul class="mt-3 space-y-2">
                    {#each bestFor as item}
                      <li class="flex items-start gap-2 text-[14.5px] text-heading">
                        <Check class="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                        <span>{item}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
              <div class="rounded-[12px] border border-ink/10 bg-sand/45 p-5">
                <h3 class="font-serif text-[18px] font-semibold text-heading">Planning notes</h3>
                <ul class="mt-3 space-y-2">
                  {#each tripFacts as fact}
                    <li class="flex items-start gap-2 text-[14.5px] text-ink/70">
                      <Minus class="mt-0.5 h-4 w-4 shrink-0 text-ink/45" />
                      <span><span class="font-semibold text-heading">{fact.label}:</span> {fact.value}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          </section>
        {/if}

        <section>
          <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Ways to Customize This Trip</h2>
          <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">
            Use the request form to ask the team to adjust the dates, party size, accommodation preference, interests, special requests or route notes.
          </p>
          <ul class="mt-6 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {#each ['Preferred travel date', 'Adults and children', 'Accommodation preference', 'Travel interests', 'Special requests', 'Route notes'] as item}
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

        <section id="day-by-day" class="scroll-mt-32">
          <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Day by Day</h2>
          <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">
            This is the published itinerary for this tour. The planning team can adjust it around your dates and preferred pace.
          </p>

          {#if itineraryDays.length}
            <div class="mt-6 space-y-2.5">
              {#each itineraryDays as day, index (day.day_number)}
                {@const open = isDayOpen(day, index)}
                {@const image = dayImage(day)}
                {@const details = detailsForDay(day)}
                <article id={`day-${day.day_number}`} class="overflow-hidden rounded-[12px] border border-ink/10 bg-surface">
                  <button
                    type="button"
                    class="flex w-full items-center gap-4 px-4 py-4 text-left md:px-5"
                    aria-expanded={open}
                    on:click={() => toggleDay(day, index)}
                  >
                    <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-deep-green text-[13px] font-bold text-white">
                      {day.day_number}
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block font-serif text-[16.5px] font-semibold leading-snug text-heading md:text-[18px]">Day {day.day_number}: {day.title}</span>
                      <span class="block text-[12.5px] text-ink/60">
                        {[day.lodge?.name || day.accommodation || '', day.meals || ''].filter(Boolean).join(' / ')}
                      </span>
                    </span>
                    <ChevronDown class={`h-5 w-5 shrink-0 text-ink/60 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>

                  {#if open}
                    <div class="border-t border-ink/10 px-4 pb-8 pt-6 md:px-8 md:pt-8">
                      {#if image}
                        <Img
                          src={image.record ? '' : image.src}
                          record={image.record}
                          fields={image.fields ?? []}
                          alt={image.caption}
                          width={1000}
                          sizes="(max-width: 768px) 92vw, 700px"
                          className="mb-6 h-[220px] w-full rounded-[12px] object-cover sm:h-[280px] md:mb-8 md:h-[380px]"
                        />
                      {/if}

                      <h3 class="mb-[14px] font-serif text-[20px] font-semibold leading-[1.18] tracking-normal text-heading md:mb-4 md:text-[26px] md:leading-[1.15]">
                        Day {day.day_number}: {day.title}
                      </h3>

                      {#if day.description}
                        <RichText value={day.description} className="space-y-4 text-[14.5px] leading-[1.65] text-ink/70 md:text-[16px]" />
                      {/if}

                      {#if details.length}
                        <ul class="mb-7 mt-6 rounded-[12px] border border-ink/10 bg-sand/45 p-5 md:p-[22px]">
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
                        <div>
                          <div class="mb-3.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink/60 md:text-[11px]">Accommodation - {stay.name}</div>
                          <div class="overflow-hidden rounded-[12px] border border-ink/10 bg-surface">
                            {#if gallery[0]}
                              <Img
                                src={gallery[0].record ? '' : gallery[0].src}
                                record={gallery[0].record}
                                fields={gallery[0].fields ?? []}
                                alt={gallery[0].caption}
                                width={900}
                                sizes="(max-width: 768px) 92vw, 700px"
                                className="h-[190px] w-full object-cover sm:h-[240px]"
                              />
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

                              {#if gallery.length > 1}
                                <div class="mt-4 grid grid-cols-3 gap-2.5">
                                  {#each gallery.slice(1, 4) as image}
                                    <div class="aspect-[4/3] overflow-hidden rounded-[8px] border border-ink/10 bg-sand">
                                      <Img
                                        src={image.record ? '' : image.src}
                                        record={image.record}
                                        fields={image.fields ?? []}
                                        alt={image.caption}
                                        width={260}
                                        sizes="160px"
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  {/each}
                                </div>
                              {/if}
                            </div>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </article>
              {/each}
            </div>
          {:else}
            <div class="mt-6 rounded-[12px] border border-ink/10 bg-sand/35 p-5 text-[14px] leading-6 text-ink/70">
              The day-by-day itinerary has not been published for this tour yet. Send a request and the team will share the current route.
            </div>
          {/if}
        </section>

        {#if accommodationBlocks.length}
          <section id="accommodation" class="scroll-mt-32">
            <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Accommodation</h2>
            <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">
              These are the accommodations attached to the published itinerary days for this tour.
            </p>

            <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {#each accommodationBlocks as block (block.key)}
                <article class="overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-sm">
                  {#if block.gallery[0]}
                    <div class="relative h-[220px] bg-sand">
                      <Img
                        src={block.gallery[0].record ? '' : block.gallery[0].src}
                        record={block.gallery[0].record}
                        fields={block.gallery[0].fields ?? []}
                        alt={block.gallery[0].caption}
                        width={720}
                        sizes="(max-width: 768px) 92vw, 360px"
                        className="h-full w-full object-cover"
                      />
                      <span class="absolute left-3 top-3 rounded-full bg-deep-green/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
                        {block.dayLabel}
                      </span>
                    </div>
                  {:else}
                    <div class="grid h-[160px] place-items-center bg-sand/60 text-forest">
                      <BedDouble size={30} />
                    </div>
                  {/if}

                  <div class="p-5">
                    <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-clay">{block.dayLabel}</p>
                    <h3 class="mt-2 font-serif text-[20px] font-semibold leading-snug text-heading">{block.label}</h3>
                    {#if block.summary}<p class="mt-2 text-[14px] leading-6 text-ink/65">{block.summary}</p>{/if}

                    {#if block.gallery.length > 1}
                      <div class="mt-4 grid grid-cols-3 gap-2.5">
                        {#each block.gallery.slice(1, 4) as image}
                          <div class="aspect-[4/3] overflow-hidden rounded-[8px] border border-ink/10 bg-sand">
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
                      <a class="mt-5 inline-flex items-center gap-1 text-[13px] font-bold text-forest transition hover:text-heading" href={block.href} data-sveltekit-preload-data="hover">
                        View accommodation <ArrowRight size={14} />
                      </a>
                    {/if}
                  </div>
                </article>
              {/each}
            </div>
          </section>
        {/if}

        <section id="prices" class="scroll-mt-32">
          <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">Tour Rates</h2>
          <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">
            Rates are shown only from the published tour data. Your final quote is confirmed after dates and availability are checked.
          </p>

          <div class="mt-6 overflow-hidden rounded-t-[10px] border border-ink/10">
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
          </div>

          <button
            type="button"
            class="mt-5 inline-flex items-center justify-center rounded-[6px] bg-goldfinch-gold px-5 py-2.5 text-[14px] font-bold text-heading transition hover:brightness-105"
            on:click={() => openPlanner('prices')}
          >
            Get My Exact Quote <ArrowRight size={15} />
          </button>
        </section>

        <section id="inclusions" class="scroll-mt-32">
          <h2 class="font-serif text-[26px] font-semibold leading-tight text-heading sm:text-[30px] md:text-[34px]">What's Included</h2>
          <div class="mt-6 grid gap-4 md:grid-cols-2">
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

        {#if mediaImages.length > 1}
          <section class="overflow-hidden">
            <div class="flex items-center gap-2">
              <Camera class="h-4 w-4 text-clay" aria-hidden="true" />
              <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay">Images from this itinerary</span>
            </div>
            <div class="no-scrollbar mt-5 flex snap-x gap-4 overflow-x-auto pb-2">
              {#each mediaImages as image}
                <figure class="relative h-[230px] w-[190px] shrink-0 snap-start overflow-hidden rounded-[12px] bg-sand shadow-[0_12px_28px_rgba(57,61,50,0.10)] md:h-[280px] md:w-[230px]">
                  <Img
                    src={image.record ? '' : image.src}
                    record={image.record}
                    fields={image.fields ?? []}
                    alt={image.caption}
                    width={520}
                    sizes="230px"
                    className="h-full w-full object-cover"
                  />
                  <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" aria-hidden="true"></div>
                  <figcaption class="absolute inset-x-0 bottom-0 p-3 text-[13px] font-bold text-white md:text-[14.5px]">{image.caption}</figcaption>
                </figure>
              {/each}
            </div>
          </section>
        {/if}

        <section id="good-to-know" class="scroll-mt-32">
          <div class="section-label">
            <span></span>
            <p>Good to Know</p>
          </div>
          <h2 class="mt-3 font-serif text-[28px] font-semibold leading-tight text-heading sm:text-[32px] md:text-[38px]">Frequently Asked Questions</h2>
          {#if faqs.length}
            <ol class="relative mt-10">
              {#each faqs as item, index}
                <li class="relative pb-10 pl-14 last:pb-0 md:pl-20">
                  {#if index < faqs.length - 1}
                    <span class="pointer-events-none absolute left-4 top-10 bottom-0 w-px bg-ink/15 md:left-5" aria-hidden="true"></span>
                  {/if}
                  <span class="absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-clay font-serif text-[14px] font-semibold text-white md:h-10 md:w-10 md:text-[15px]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 class="font-serif text-[19px] font-semibold leading-snug text-heading md:text-[22px]">{item.question}</h3>
                  <RichText value={item.answer} className="mt-3 text-[15px] leading-relaxed text-heading/85 md:text-[17px]" />
                </li>
              {/each}
            </ol>
          {:else}
            <div class="mt-6 rounded-[12px] border border-ink/10 bg-sand/35 p-5 text-[14px] leading-6 text-ink/70">
              No public FAQ entries are published yet. Send your question in the trip request and the team will reply with the latest details.
            </div>
          {/if}
        </section>
      </main>

      <aside id="plan-this-trip" class="hidden transition lg:block">
        <div class="lg:sticky lg:top-[110px]">
          <BookingForm {tour} />
          <div class="mt-6">
            <SpecialistCard specialist={defaultSpecialist} />
          </div>
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
            <TourCard tour={item} />
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

  <div class="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] lg:hidden">
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
      <div class="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[16px] bg-deep-green">
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

  <div class="h-20 lg:hidden" aria-hidden="true"></div>
{/if}

<svelte:window on:keydown={(event) => event.key === 'Escape' && closeSheet()} />

{#if touristTripLd}<JsonLd data={touristTripLd} />{/if}
{#if breadcrumbLd}<JsonLd data={breadcrumbLd} />{/if}

<style>
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
</style>
