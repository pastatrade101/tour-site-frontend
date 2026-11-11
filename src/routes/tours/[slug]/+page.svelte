<script lang="ts">
  import { t } from '$lib/i18n/ui';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import {
    ArrowLeft,
    ArrowRight,
    BedDouble,
    Binoculars,
    Bird,
    CalendarDays,
    Check,
    CircleCheck,
    CircleDollarSign,
    Compass,
    Footprints,
    Landmark,
    MapPin,
    Minus,
    Mountain,
    PlaneTakeoff,
    Route,
    Sailboat,
    SlidersHorizontal,
    Sparkles,
    TreePalm,
    Users,
    Utensils,
    X
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { loadFaqsFor } from '$lib/faqEntities';
  import { trackEvent } from '$lib/analytics';
  import { currency, formatUsd } from '$lib/currency';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import DayBadge from '$lib/components/public/DayBadge.svelte';
  import SectionTitle from '$lib/components/public/SectionTitle.svelte';
  import TripRequestForm from '$lib/components/public/TripRequestForm.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import Img from '$lib/components/public/Img.svelte';
  import ItineraryDays from '$lib/components/public/ItineraryDays.svelte';
  import RouteMap from '$lib/components/public/RouteMap.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ReviewsWidget from '$lib/components/public/ReviewsWidget.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import SpecialistCard from '$lib/components/public/SpecialistCard.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import TourRates from '$lib/components/public/TourRates.svelte';
  import { toMetaText } from '$lib/richText';
  import { getTourDestinationLabel, getTourDestinations } from '$lib/tourDestinations';
  import {
    activityKind,
    placeOfDay,
    placesForDays,
    shortPlaceNames,
    splitList,
    type ActivityKind,
    type DayPlace
  } from '$lib/itineraryDisplay';
  import {
    galleryForStay as buildGallery,
    imageFromLodgeMedia,
    loadLodgeMedia,
    stayKey,
    type MediaImage,
    type Stay
  } from '$lib/lodgeMedia';
  import { cdnUrl } from '$lib/img';
  import type { BlogPost, FAQ, ItineraryDay, Tour, TravelStyle } from '$lib/types';
  import type { PageData } from './$types';

  type Icon = typeof CalendarDays;
  type FactCard = { icon: Icon; label: string; value: string };
  /** A hero fact: a small label, one large value, and a small detail under it. */
  type HeroFact = { kind: 'duration' | 'places' | 'price'; icon: Icon; label: string; value: string; sub: string };
  type SnapshotRow = {
    number: number;
    /** Where the day is spent, with its colour. Null when the day has no place linked. */
    place: DayPlace | null;
    title: string;
    /** The day's activities as separate tags, each with the icon its words suggest. */
    tags: Array<{ text: string; icon: Icon }>;
    /** Used only when a day lists no activities: the opening of its description. */
    summary: string;
    hotel: string;
  };
  type AccommodationBlock = {
    key: string;
    label: string;
    /** The days spent here. One night each: a day with a stay ends there. */
    days: number[];
    summary: string;
    href?: string;
    gallery: MediaImage[];
  };

  const ACTIVITY_ICONS: Record<ActivityKind, Icon> = {
    flight: PlaneTakeoff,
    drive: Binoculars,
    meal: Utensils,
    birds: Bird,
    walk: Footprints,
    boat: Sailboat,
    beach: TreePalm,
    culture: Landmark,
    other: Compass
  };

  // Reactive so the tabs follow the page language.
  $: TABS = [
    { id: 'overview', label: $t('ui.overview') },
    { id: 'route', label: $t('ui.route_heading') },
    { id: 'day-by-day', label: $t('ui.day_by_day') },
    { id: 'accommodation', label: $t('nav.accommodation') },
    { id: 'prices', label: $t('ui.prices') },
    { id: 'inclusions', label: $t('ui.inclusions') },
    { id: 'good-to-know', label: $t('ui.good_to_know') }
  ];

  $: LODGE_TYPES = {
    tented_camp: $t('ui.tented_camp'),
    mobile_camp: $t('ui.mobile_camp'),
    lodge: $t('ui.lodge'),
    hotel: $t('ui.hotel'),
    treehouse: $t('ui.treehouse')
  } as Record<string, string>;

  export let data: PageData;

  // Seeded from the server load so the first render — the one a crawler sees —
  // already has the tour and its SEO. The client only fetches the below-fold
  // extras from here on.
  let tour: Tour | null = data.tour;
  let loading = !data.tour;
  let error = data.tour ? '' : '';
  let loadedSlug = data.tour?.slug ?? '';
  let hydratedOnce = false;
  let sheetOpen = false;
  let specialistOpen = false;
  // The first tab's id, not TABS[0]: the tabs are reactive (translated labels)
  // and are not built yet when this line runs.
  let activeTab = 'overview';
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

  $: durationOf = (item: Tour | null): string => {
    if (!item?.duration_days) return '';
    const days = `${item.duration_days} ${$t(item.duration_days === 1 ? 'label.day' : 'label.days')}`;
    if (!item.duration_nights) return days;
    return `${days} / ${item.duration_nights} ${$t(item.duration_nights === 1 ? 'label.night' : 'label.nights')}`;
  };

  $: groupSizeOf = (item: Tour | null): string => {
    if (!item) return '';
    if (item.group_size_min && item.group_size_max) return `${item.group_size_min}-${item.group_size_max} ${$t('ui.people')}`;
    if (item.group_size_max) return `${$t('ui.up_to')} ${item.group_size_max} ${$t('ui.people')}`;
    return item.group_size ?? '';
  };

  /** A trip that ends where it starts names the place once, not "Zanzibar → Zanzibar". */
  const routeOf = (item: Tour | null): string => {
    if (!item) return '';
    const start = (item.start_location ?? '').trim();
    const end = (item.end_location ?? '').trim();
    if (start && end) return start.toLowerCase() === end.toLowerCase() ? start : `${start} → ${end}`;
    return start || end;
  };

  /** "$3,309.00" → "$3,309": the cents of a round price are noise at headline size. */
  const withoutZeroCents = (amount: string): string => amount.replace(/[.,]00(?=\D*$)/, '');

  /** Difficulty is free text in the CMS; the usual words are translated, anything else shows as typed. */
  $: difficultyLabel = (value: string): string => {
    const key = `difficulty.${value.trim().toLowerCase()}`;
    const out = $t(key);
    return out === key ? normaliseLabel(value) : out;
  };
  $: levelLabel = (level: string): string => {
    const key = `tier.${level}`;
    const out = $t(key);
    return out === key ? normaliseLabel(level) : out;
  };

  /** The stay's pictures, plus anything fetched for it below. */
  const galleryForStay = (stay: Stay): MediaImage[] => buildGallery(stay, lodgeMedia[stayKey(stay)] ?? []);

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
  $: priceFromLabel = priceLabel ? `${$t('label.from')} ${priceLabel} ${$t('label.per_person_inline')}` : $t('ui.on_request');
  $: tourSpecialist = tour?.specialist?.name ? tour.specialist : null;
  // The park names without "National Park": three of them fit on one line that
  // way, where the full names ran to four.
  $: heroPlaces = shortPlaceNames(destinations.map((destination) => destination.name));
  $: heroPlacesShown = heroPlaces.slice(0, 4);
  $: heroFacts = ([
    tour?.duration_days
      ? {
          kind: 'duration',
          icon: CalendarDays,
          label: $t('label.duration'),
          value: `${tour.duration_days} ${$t(tour.duration_days === 1 ? 'label.day' : 'label.days')}`,
          sub: tour.duration_nights ? `${tour.duration_nights} ${$t(tour.duration_nights === 1 ? 'label.night' : 'label.nights')}` : ''
        }
      : null,
    heroPlaces.length
      ? {
          kind: 'places',
          icon: MapPin,
          label: $t(heroPlaces.length === 1 ? 'filter.destination' : 'nav.destinations'),
          value: heroPlacesShown.join(' · ') + (heroPlaces.length > heroPlacesShown.length ? ` +${heroPlaces.length - heroPlacesShown.length}` : ''),
          sub: heroPlaces.length > 1 ? $t('ui.n_destinations').replace('{n}', String(heroPlaces.length)) : ''
        }
      : null,
    {
      kind: 'price',
      icon: CircleDollarSign,
      label: priceLabel ? $t('ui.starting_from') : $t('filter.price'),
      value: priceLabel ? withoutZeroCents(priceLabel) : $t('ui.on_request'),
      sub: priceLabel ? $t('label.per_person_inline') : ''
    }
  ].filter(Boolean) as HeroFact[]);
  $: tourDescription = tour?.full_description || tour?.short_description || '';
  $: metaDescription = tour ? shortText(tour.meta_description || tour.short_description || tour.full_description, 170) : '';
  $: categoryLabel = tour?.tour_categories?.name || normaliseLabel(tour?.experience_type);
  $: tripFacts = tour
    ? ([
        routeLabel ? { icon: Route, label: $t('ui.start_end'), value: routeLabel } : null,
        groupSize ? { icon: Users, label: $t('ui.group_size'), value: groupSize } : null,
        tour.difficulty_level ? { icon: Mountain, label: $t('ui.difficulty'), value: difficultyLabel(tour.difficulty_level) } : null,
        tour.minimum_age ? { icon: CircleCheck, label: $t('ui.minimum_age'), value: `${tour.minimum_age}+` } : null
      ].filter(Boolean) as FactCard[])
    : [];
  // One colour per place, shared with the day cards below so the snapshot and
  // the day-by-day list read as one system.
  $: dayPlaces = placesForDays(itineraryDays);
  $: snapshotRows = itineraryDays.map((day) => {
    const tags = splitList(day.activities).map((text) => ({ text, icon: ACTIVITY_ICONS[activityKind(text)] }));
    return {
      number: day.day_number,
      place: placeOfDay(day, dayPlaces),
      title: day.title,
      tags,
      summary: tags.length ? '' : shortText(day.description, 120),
      hotel: day.lodge?.name || day.accommodation || ''
    };
  }) as SnapshotRow[];
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
        item.stay.accommodation_level ? levelLabel(item.stay.accommodation_level) : '',
        item.stay.destinations?.name ?? ''
      ]).join(' / ');
      blocks.push({
        key,
        label: item.stay.name,
        days: [...new Set(item.days)].sort((a, b) => a - b),
        summary,
        href: item.stay.slug ? `/accommodation/${item.stay.slug}` : undefined,
        gallery: galleryForStay(item.stay)
      });
    }
    return blocks;
  })();
  /**
   * The days the cards above do not cover — on most trips, the last one, when
   * the traveller goes home. Said out loud in a quiet card of its own, so a
   * six-day trip showing five nights of lodges does not read as a day missing.
   *
   * "Final day, no overnight stay" is claimed only when the tour itself says it
   * has fewer nights than days and the uncovered day is the last. Any other
   * uncovered day names its accommodation if one was typed, and otherwise says
   * what is true of it: confirmed when quoted.
   */
  $: openDays = accommodationBlocks.length ? itineraryDays.filter((day) => !day.lodge) : [];
  $: lastDayNumber = itineraryDays.length ? itineraryDays[itineraryDays.length - 1].day_number : 0;
  $: openDaysNote = (() => {
    if (!openDays.length) return '';
    const onlyFinalDay =
      openDays.length === 1 &&
      openDays[0].day_number === lastDayNumber &&
      !openDays[0].accommodation &&
      Number(tour?.duration_nights ?? 0) < Number(tour?.duration_days ?? 0);
    if (onlyFinalDay) return $t('ui.final_day_no_overnight');
    return openDays.every((day) => day.accommodation?.trim())
      ? unique(openDays.map((day) => day.accommodation)).join(' / ')
      : $t('ui.confirmed_when_quoted');
  })();
  /** The trip's last day, when the tour says it ends without a night's stay. */
  $: endsWithoutStay = (dayNumber: number): boolean =>
    dayNumber === lastDayNumber && Number(tour?.duration_nights ?? 0) < Number(tour?.duration_days ?? 0);
  /** The overview facts short enough to sit four across; a long one takes a row of its own. */
  $: compactFacts = tripFacts.filter((fact) => fact.value.length <= 26).length;
  const CUSTOMIZE_ICONS = [SlidersHorizontal, Sparkles, Compass, Route];
  // The same rule RouteMap uses to decide whether to draw anything: a day counts
  // only when its place has real coordinates. Without this the tab would scroll
  // to a section that renders nothing.
  $: hasRoute = itineraryDays.some((day) => {
    const lat = Number(day.destination?.latitude);
    const lng = Number(day.destination?.longitude);
    return day.destination?.latitude != null && day.destination?.latitude !== '' && Number.isFinite(lat) && Number.isFinite(lng);
  });
  $: visibleTabs = TABS.filter(
    (tab) => (tab.id !== 'accommodation' || accommodationBlocks.length) && (tab.id !== 'route' || hasRoute)
  );
  $: touristTripLd = tour
    ? {
        '@type': 'TouristTrip',
        name: tour.title,
        description: shortText(tour.short_description ?? tour.full_description, 300),
        ...(heroImage ? { image: cdnUrl(heroImage) } : {}),
        ...(tour.price_from
          ? {
              offers: {
                '@type': 'Offer',
                price: tour.price_from,
                priceCurrency: tour.currency ?? 'USD',
                availability: tour.is_available === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
                url: `${origin}/tours/${tour.slug}`
              }
            }
          : {}),
        url: `${origin}/tours/${tour.slug}`,
        provider: { '@id': `${origin}/#organization` }
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
      // This trip's own questions, then its travel style's — most of what a
      // reader asks about a trip was answered once on the style rather than
      // retyped onto each tour under it — then the general library.
      loadFaqsFor(
        [
          { type: 'tours', id: current.id },
          { type: 'tour_categories', id: current.category_id }
        ],
        8,
        $page.data.locale
      )
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
      faqs = faqRes.value;
      requestAnimationFrame(updateFaqTimeline);
    }
  };

  /**
   * Galleries for the properties this tour stays at. The day cards and the
   * accommodation tab both read them, so the page loads them once here rather
   * than letting the day renderer fetch its own.
   */
  const hydrateLodgeMedia = async (current: Tour) => {
    lodgeMedia = await loadLodgeMedia(
      (current.itinerary_days ?? []).map((day) => day.lodge),
      {}
    );
  };

  /**
   * Everything that follows the tour record itself. The record now arrives
   * from the server load, so this only pulls the below-fold extras.
   */
  const hydrate = async (record: Tour) => {
    relatedTours = [];
    recentPosts = [];
    faqs = [];
    travelStyles = [];
    lodgeMedia = {};
    activeFaqIndex = -1;
    sheetOpen = false;
    specialistOpen = false;
    error = '';
    loading = false;

    const stylesRequest = api.travelStyles.list({ status: 'published', limit: 100 }).catch(() => null);
    travelStyles = (await stylesRequest)?.data.items ?? [];
    void loadRelated(record);
    void hydrateLodgeMedia(record);
    trackEvent('tour_page_view', {
      tour_id: record.id,
      tour_title: record.title,
      destination: getTourDestinationLabel(record, 4) || record.destinations?.name
    });
  };

  // The load re-runs on every slug change, so this covers both first paint and
  // client-side navigation between tours.
  $: if (browser && data.tour) {
    tour = data.tour;
    if (data.tour.slug !== loadedSlug || !hydratedOnce) {
      loadedSlug = data.tour.slug;
      hydratedOnce = true;
      void hydrate(data.tour);
    }
  }
  $: if (browser && !data.tour) {
    tour = null;
    loading = false;
    error = $t('ui.tour_not_found');
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

<!-- Title, description and canonical are published to the root layout through
     the load's `seo` field. Emitting them here as well would leave the document
     with two titles and two canonicals. -->

{#if loading}
  <div class="tour-detail-skeleton bg-[#fbfaf6]" aria-busy="true" aria-label={$t('ui.loading_tour_itinerary')}>
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
    <ErrorState message={error || $t('ui.tour_not_found')} />
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
    <div class="absolute inset-0 bg-gradient-to-r from-deep-green/92 via-deep-green/68 to-deep-green/18" aria-hidden="true"></div>
    <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-deep-green/65 to-transparent" aria-hidden="true"></div>

    <div class="tour-detail-hero-shell container-shell relative flex min-h-[390px] flex-col justify-end pb-8 pt-16 md:min-h-[460px] md:pb-12 md:pt-20 lg:pb-14">
      <a href="/tours" class="absolute left-0 top-6 hidden items-center gap-1.5 text-[13px] font-medium text-white/90 transition hover:text-goldfinch-gold md:top-8 md:inline-flex">
        <ArrowLeft class="h-3.5 w-3.5" />{$t('ui.back_to_tours')}</a>

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
          >{$t('ui.plan_this_trip')}</button>
        </div>
        {#if heroFacts.length}
          <!-- White cards, so the three facts a visitor skims first stand off
               the photograph instead of sinking into it. The price is the
               largest of the three and carries the gold outline. -->
          <div class="tour-hero-facts mt-6 grid gap-2.5 md:grid-cols-3 md:gap-3.5 lg:grid-cols-[0.85fr_1.4fr_1fr]">
            {#each heroFacts as fact}
              <div class={`hero-fact flex min-w-0 items-center gap-3.5 rounded-[18px] bg-surface px-4 py-3.5 [text-shadow:none] ${fact.kind === 'price' ? 'hero-fact-price' : ''}`}>
                <span class="hero-fact-icon grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-deep-green text-goldfinch-gold">
                  <svelte:component this={fact.icon} size={26} strokeWidth={1.9} />
                </span>
                <span class="grid min-w-0 gap-0.5">
                  <span class="text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-ink/65">{fact.label}</span>
                  {#if fact.kind === 'places'}
                    <span class="text-[15px] font-semibold leading-[1.3] text-heading">
                      <!-- Real spaces around each dot: without them the names
                           are one unbreakable word and run out of the card. -->
                      {#each heroPlacesShown as name, index}{#if index}{' '}<span class="text-gold-hover" aria-hidden="true">·</span>{' '}{/if}<span class="whitespace-nowrap">{name}</span>{/each}{#if heroPlaces.length > heroPlacesShown.length}{' '}<span class="text-ink/60">+{heroPlaces.length - heroPlacesShown.length}</span>{/if}
                    </span>
                  {:else}
                    <span class={`hero-fact-value font-serif font-bold leading-[1.05] text-heading ${fact.kind === 'price' ? 'text-[30px] md:text-[32px]' : 'text-[26px]'}`}>{fact.value}</span>
                  {/if}
                  {#if fact.sub}<span class="text-[13px] leading-tight text-ink/65">{fact.sub}</span>{/if}
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
            <p>{$t('ui.overview')}</p>
          </div>
          <h2 class="mt-3 font-serif text-[28px] font-semibold leading-tight text-heading sm:text-[32px] md:text-[38px]">{$t('ui.about_this_safari')}</h2>
          {#if tourDescription}
            <RichText value={tourDescription} className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink/70" />
          {/if}

          {#if tripFacts.length}
            <div class={`tour-facts-grid mt-7 grid grid-cols-2 gap-3 ${compactFacts >= 4 ? 'md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4' : compactFacts === 3 ? 'md:grid-cols-3' : ''}`}>
              {#each tripFacts as fact}
                {@const long = fact.value.length > 26}
                <div class={`tour-fact flex min-w-0 items-center gap-3 rounded-[16px] border border-goldfinch-gold/35 bg-surface p-3.5 shadow-[0_8px_20px_-14px_rgba(57,61,50,0.5)] ${long ? 'col-span-full' : ''}`}>
                  <span class="tour-fact-icon grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-goldfinch-gold text-deep-green">
                    <svelte:component this={fact.icon} size={22} strokeWidth={2} />
                  </span>
                  <span class="grid min-w-0 gap-px">
                    <span class="gf-gold-text text-[11px] font-bold uppercase leading-tight tracking-[0.1em]">{fact.label}</span>
                    <span class={`font-serif font-bold leading-[1.15] text-heading ${long ? 'text-[16px]' : 'text-[17px] md:text-[19px]'}`}>{fact.value}</span>
                  </span>
                </div>
              {/each}
            </div>
          {/if}

          <button
            type="button"
            class="mt-5 inline-flex items-center gap-1 text-[14px] font-semibold text-clay transition hover:text-heading"
            on:click={() => openPlanner('overview-customize')}
          >{$t('ui.customize_this_route')}<ArrowRight size={14} />
          </button>
        </section>

        {#if snapshotRows.length}
          <section class="tour-section">
            <SectionTitle title={$t('ui.safari_snapshot')} description={$t('ui.a_quick_look_at_the')} />

            <!-- Rows, not a table: each is a card with the same calendar tile
                 and place colour as its day card further down. -->
            <div class="snapshot-head gf-gold-text mt-6 hidden text-[11px] font-bold uppercase tracking-[0.12em] md:grid">
              <span></span>
              <span>{$t('ui.place')}</span>
              <span>{$t('label.highlights')}</span>
              <span>{$t('ui.hotel_options')}</span>
            </div>
            <ul class="mt-6 grid gap-2.5 md:mt-2">
              {#each snapshotRows as row (row.number)}
                <li class="snapshot-row rounded-[14px] border border-ink/10 bg-surface shadow-[0_8px_18px_-16px_rgba(57,61,50,0.7)]" style={row.place ? `--day-colour:${row.place.colour}` : undefined}>
                  <DayBadge day={row.number} colour={row.place?.colour ?? ''} size="md" />
                  <div class="min-w-0">
                    {#if row.place}<span class="snapshot-place mb-0.5 block text-[11px] font-bold uppercase leading-tight tracking-[0.1em]">{row.place.name}</span>{/if}
                    <p class="font-serif text-[16px] font-bold leading-[1.2] text-heading md:text-[17px]">{row.title}</p>
                  </div>
                  <div class="snapshot-detail min-w-0">
                    {#if row.tags.length}
                      <span class="flex flex-wrap gap-1.5">
                        {#each row.tags as tag}
                          <span class="snapshot-tag inline-flex max-w-full items-center gap-[5px] rounded-full bg-canvas px-2.5 py-1 text-[12px] font-semibold leading-[1.3] text-heading">
                            <svelte:component this={tag.icon} size={13} strokeWidth={2} aria-hidden="true" />{tag.text}
                          </span>
                        {/each}
                      </span>
                    {:else if row.summary}
                      <p class="text-[13.5px] leading-relaxed text-ink/70">{row.summary}</p>
                    {:else}
                      <span class="text-[13px] text-ink/55">{$t('ui.details_on_request')}</span>
                    {/if}
                  </div>
                  <div class="snapshot-detail min-w-0">
                    {#if row.hotel}
                      <span class="inline-flex min-w-0 items-center gap-2 text-[13px] font-semibold leading-snug text-heading">
                        <span class="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-goldfinch-gold text-deep-green"><BedDouble size={16} strokeWidth={2} aria-hidden="true" /></span>
                        {row.hotel}
                      </span>
                    {:else if !endsWithoutStay(row.number)}
                      <span class="text-[13px] text-ink/55">{$t('ui.confirmed_when_quoted')}</span>
                    {/if}
                  </div>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if tour.customization_options?.length}
          <section class="tour-section">
            <SectionTitle title={$t('ui.ways_to_customize_this_trip')} description={tour.customization_intro ?? ''} />
            <!-- The points one under another, each with its icon, and the
                 button beside them rather than under: one card, one action. -->
            <div class="mt-6 grid items-center gap-5 rounded-[18px] border border-goldfinch-gold/35 bg-surface p-5 shadow-[0_10px_24px_-18px_rgba(57,61,50,0.6)] md:grid-cols-[minmax(0,1fr)_auto] md:px-[22px]">
              <ul class="grid min-w-0 gap-3.5">
                {#each tour.customization_options as item, index}
                  <li class="flex items-center gap-3.5">
                    <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-goldfinch-gold text-deep-green">
                      <svelte:component this={CUSTOMIZE_ICONS[index % CUSTOMIZE_ICONS.length]} size={21} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span class="min-w-0 text-[15px] font-semibold leading-snug text-heading">{item}</span>
                  </li>
                {/each}
              </ul>
              <button
                type="button"
                class="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-[12px] bg-goldfinch-gold px-[22px] py-3.5 text-[15px] font-bold text-heading shadow-[0_10px_20px_-12px_rgba(198,138,30,0.9)] transition hover:brightness-105 md:w-auto"
                on:click={() => openPlanner('customize')}
              >{$t('ui.customize_this_trip')}<ArrowRight size={16} strokeWidth={2.4} />
              </button>
            </div>
          </section>
        {/if}

        <!-- Where the days are, before what happens on them. Renders nothing for
             a tour whose days have no mapped place yet, and removes itself if
             the basemap cannot load. -->
        <RouteMap days={itineraryDays} title={tour?.title ?? ''} />

        <section id="day-by-day" class="tour-section scroll-mt-32">
          <SectionTitle
            title={$t('ui.day_by_day')}
            description={$t('ui.here_is_how_the_days')}
            chip={tour.duration_days ? `${tour.duration_days} ${$t(tour.duration_days === 1 ? 'label.day' : 'label.days')}` : ''}
            chipIcon={CalendarDays}
          />

          {#if itineraryDays.length}
            <!-- The same renderer the safari-package pages use, so a day card
                 cannot drift between the tour and the page selling it. -->
            <div class="mt-6">
              <ItineraryDays days={itineraryDays} {lodgeMedia} planCta on:plan={() => openPlanner('day-by-day')} />
            </div>
          {:else}
            <div class="mt-6 rounded-[12px] border border-ink/10 bg-canvas p-5 text-[14px] leading-6 text-ink/70">{$t('ui.the_daybyday_route_for_this')}</div>
          {/if}
        </section>

        {#if accommodationBlocks.length}
          <section id="accommodation" class="tour-section scroll-mt-32">
            <SectionTitle title={$t('nav.accommodation')} description={$t('ui.where_you_stay_on_this')} />

            <div class="tour-accommodation-grid mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {#each accommodationBlocks as block (block.key)}
                <article class="group relative aspect-[4/4.2] overflow-hidden rounded-[18px] border border-ink/10 bg-deep-green shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(39,43,34,0.18)] focus-within:-translate-y-0.5 focus-within:shadow-[0_18px_38px_rgba(39,43,34,0.18)]">
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
                    <!-- One chip per day and the length of the stay, both solid:
                         a frosted tag fades into a bright photograph. -->
                    <div class="mb-auto flex items-start justify-between gap-2">
                      <div class="flex min-w-0 flex-wrap gap-1.5">
                        {#each block.days as dayNumber}<DayBadge day={dayNumber} size="sm" gold />{/each}
                      </div>
                      <span class="shrink-0 whitespace-nowrap rounded-full bg-deep-green px-2.5 py-1.5 text-[11px] font-bold leading-none text-white shadow-[0_6px_14px_-6px_rgba(0,0,0,0.6)]">
                        <b class="text-goldfinch-gold">{block.days.length}</b> {$t(block.days.length === 1 ? 'label.night' : 'label.nights')}
                      </span>
                    </div>
                    <div>
                      <h3 class="accommodation-card-title font-serif text-[20px] font-semibold leading-snug text-white drop-shadow md:text-[21px]">{block.label}</h3>
                      {#if block.summary}<p class="mt-1 accommodation-card-summary text-[13px] font-semibold leading-5 text-white/90 drop-shadow">{block.summary}</p>{/if}
                      {#if block.href}
                        <span class="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-goldfinch-gold"><ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />{$t('ui.view_accommodation')}</span>
                      {/if}
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
                    </div>
                    {#if block.href}
                      <a class="absolute inset-0 z-10 rounded-[18px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-goldfinch-gold" href={block.href} aria-label={$t('pg_destinations_slug.view_accommodation_name').replace('{name}', block.label)} data-sveltekit-preload-data="hover"></a>
                    {/if}
                  </div>
                </article>
              {/each}
              {#if openDays.length}
                <!-- The days no card above covers, so the row is full and a
                     day with no lodge is explained rather than missing. -->
                <article class="accommodation-open flex flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed border-ink/20 bg-surface p-5 text-center">
                  <div class="flex flex-wrap justify-center gap-1.5">
                    {#each openDays as day}<DayBadge day={day.day_number} size="sm" gold />{/each}
                  </div>
                  <p class="max-w-[22ch] text-[13.5px] font-medium leading-snug text-ink/70">{openDaysNote}</p>
                </article>
              {/if}
            </div>
          </section>
        {/if}

        <section id="prices" class="tour-section scroll-mt-32">
          <SectionTitle title={$t('ui.tour_rates')} description={$t('ui.this_is_the_starting_price')} />

          <TourRates {tour}>
            <button
              slot="action"
              type="button"
              class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] bg-goldfinch-gold px-[22px] py-3.5 text-[15px] font-bold text-heading shadow-[0_10px_20px_-12px_rgba(198,138,30,0.9)] transition hover:brightness-105"
              on:click={() => openPlanner('prices')}
            >{$t('ui.get_my_exact_quote')}<ArrowRight size={16} strokeWidth={2.4} />
            </button>
          </TourRates>
        </section>

        <section id="inclusions" class="tour-section scroll-mt-32">
          <SectionTitle title={$t('ui.whats_included')} />
          <div class="tour-two-col-grid mt-6 grid gap-4 md:grid-cols-2">
            <div class="rounded-[12px] border border-ink/10 bg-surface p-5">
              <h3 class="font-serif text-[18px] font-semibold text-heading">{$t('ui.included')}</h3>
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
                <p class="mt-3 text-[14.5px] leading-6 text-ink/65">{$t('ui.whats_included_is_not_listed')}</p>
              {/if}
            </div>

            <div class="rounded-[12px] border border-ink/10 bg-canvas p-5">
              <h3 class="font-serif text-[18px] font-semibold text-heading">{$t('ui.not_included_2')}</h3>
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
                <p class="mt-3 text-[14.5px] leading-6 text-ink/65">{$t('ui.whats_not_included_is_not')}</p>
              {/if}
            </div>
          </div>
          <button
            type="button"
            class="mt-6 inline-flex items-center justify-center rounded-[6px] bg-goldfinch-gold px-5 py-2.5 text-[14px] font-bold text-heading transition hover:brightness-105"
            on:click={() => openPlanner('inclusions')}
          >{$t('ui.ask_whats_included')}<ArrowRight size={15} />
          </button>
        </section>

      </main>

      <aside id="plan-this-trip" class="hidden self-stretch transition lg:block">
        <div class="tour-planner-sticky">
          {#key tour.id}<TripRequestForm {tour} tone="light" />{/key}
          {#if tourSpecialist}
            <button
              type="button"
              class="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-forest/20 bg-surface px-4 text-sm font-bold text-forest transition hover:border-forest/40 hover:bg-canvas"
              aria-label={`${$t('ui.view_specialist')}: ${tourSpecialist.name}`}
              on:click={() => (specialistOpen = true)}
            >{$t('ui.view_specialist')}<ArrowRight size={15} strokeWidth={2.5} />
            </button>
          {/if}
        </div>
      </aside>
    </div>
  </div>

  <ReviewsWidget
    variant="stories"
    eyebrow={$t('ui.traveller_stories')}
    title={$t('ui.travellers_who_planned_tanzania_with')}
    subtitle={$t('ui.real_approved_reviews_from_goldfinch')}
  />

  {#if relatedTours.length}
    <section class="border-t border-ink/[0.06] bg-canvas py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader eyebrow={$t('ui.you_might_also_like')} title={$t('ui.more_tours')} description={$t('ui.other_published_trips')} />
          <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/tours">{$t('ui.browse_all_tours')}<ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each relatedTours as item (item.id)}
            <TourCard tour={item} whiteSurface />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if recentPosts.length}
    <section class="py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader eyebrow={$t('ui.stories_amp_guides')} title={$t('ui.from_the_journal')} description={$t('pg_blog_slug.more_posts_description')} />
          <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/blog">{$t('ui.read_the_blog')}<ArrowRight size={16} />
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

  <section id="good-to-know" class="scroll-mt-32 border-t border-ink/10 bg-canvas py-14 md:py-20">
    <div class="container-shell">
      <div class="mx-auto max-w-4xl">
        <div class="section-label"><span></span><p>{$t('ui.good_to_know_2')}</p></div>
        <h2 class="mt-3 font-serif text-[28px] font-semibold leading-tight text-heading sm:text-[32px] md:text-[38px]">{$t('ui.frequently_asked_questions')}</h2>
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
          <div class="mt-6 rounded-[12px] border border-ink/10 bg-surface p-5 text-[14px] leading-6 text-ink/70">{$t('ui.no_questions_have_been_answered')}</div>
        {/if}
      </div>
    </div>
  </section>
  </div>

  <div class="tour-mobile-cta fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] lg:hidden">
    <div class="flex items-center gap-3">
      <div class="min-w-0 flex-1">
        <div class="truncate text-[13px] font-semibold text-heading">{priceFromLabel}</div>
        <div class="truncate text-[11.5px] text-ink/65">{durationLabel || $t('ui.tailored_trip')}{#if destinationLabel} / {destinationLabel}{/if}</div>
      </div>
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-[6px] bg-goldfinch-gold px-5 text-[14px] font-bold text-heading transition hover:brightness-105"
        on:click={() => openPlanner('mobile-sticky')}
      >{$t('ui.plan_this_trip')}</button>
    </div>
  </div>

  {#key tour.id}
    <div class:hidden={!sheetOpen} class="fixed inset-0 z-[120] lg:hidden" role="dialog" aria-modal="true">
      <button class="absolute inset-0 cursor-default bg-black/60" type="button" aria-label={$t('ui.close_planner')} on:click={closeSheet}></button>
      <div class="tour-planner-sheet absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[16px] bg-surface">
        <button
          type="button"
          on:click={closeSheet}
          aria-label={$t('ui.close')}
          class="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.07] text-heading transition hover:bg-ink/[0.12]"
        >
          <X class="h-4 w-4" />
        </button>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <TripRequestForm {tour} tone="light" />
        </div>
      </div>
    </div>
  {/key}

  {#if specialistOpen && tourSpecialist}
    <div class="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${$t('ui.your_tour_specialist')}: ${tourSpecialist.name}`}>
      <button class="absolute inset-0 cursor-default" type="button" aria-label={$t('ui.close_specialist')} on:click={() => (specialistOpen = false)}></button>
      <div class="relative z-10 w-full max-w-md">
        <button
          type="button"
          class="absolute -right-2 -top-2 z-20 grid h-10 w-10 place-items-center rounded-full bg-deep-green text-white shadow-lg transition hover:bg-forest"
          aria-label={$t('ui.close_specialist')}
          on:click={() => (specialistOpen = false)}
        >
          <X size={18} />
        </button>
        <SpecialistCard specialist={tourSpecialist} heading={$t('ui.your_tour_specialist')} />
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
    /*
     * Flush against the header, with no seam between them.
     *
     * 70px was a guess at the nav's height. The nav publishes its measured
     * height as --nav-h (see Navbar.svelte) precisely so the bars beneath it
     * can sit tight — the tours, destinations and accommodation pages already
     * read it. Hardcoding left a few px of page showing through, and got
     * worse between lg and ~1310px where the nav labels wrap and it grows to
     * 91px, and during the collapse animation on scroll.
     */
    top: var(--nav-h, 70px);
    z-index: 45;
  }

  @media (max-width: 1023px) {
    .tour-detail-tabs-pinned {
      position: fixed;
      inset: var(--nav-h, 70px) 0 auto;
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
      /*
       * Under both bars that pin above it: the site header (`sticky top-0
       * z-40`) and .tour-detail-tabs (z-30), which is full-width and so runs
       * across this column too.
       *
       * It used to be 40 — level with the header — and equal z-index is
       * settled by document order, so the aside won and the enquiry form rode
       * up over the top nav instead of sliding beneath it. Anything below 30
       * puts it under both.
       */
      z-index: 20;
      /* Clear of the header plus the tab bar that pins under it. */
      top: calc(var(--nav-h, 70px) + 4.5rem);
      overflow: visible;
    }
  }

  @media (max-width: 1023px) {
    /* As tall as the form in it, up to most of the screen. It used to be a
       fixed 92% of the screen, which the shorter form no longer fills. */
    .tour-planner-sheet {
      height: auto;
      max-height: min(92dvh, var(--booking-viewport-height, 100dvh));
      padding-bottom: env(safe-area-inset-bottom);
    }

    /* The sheet is already the white card; the form's own border and shadow
       inside it would draw a card within a card. */
    .tour-planner-sheet :global(.trip-request) {
      border: 0;
      border-radius: 0;
      box-shadow: none;
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

    .tour-highlight-grid,
    .tour-two-col-grid {
      gap: 0.75rem;
    }

    .tour-highlight-grid :global(article),
    .tour-two-col-grid > :global(div) {
      border-radius: 12px;
      padding: 1rem;
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

  }

  @media (min-width: 640px) and (max-width: 767px) {
    .tour-highlight-grid,
    .tour-two-col-grid {
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

  }

  /* ── Hero facts ─────────────────────────────────────────────────────── */
  .hero-fact {
    box-shadow: 0 10px 28px -10px rgb(20 22 16 / 0.55);
  }

  .hero-fact-price {
    box-shadow:
      0 10px 28px -10px rgb(20 22 16 / 0.55),
      0 0 0 2px rgb(var(--c-goldfinch-gold));
  }

  @media (max-width: 767px) {
    .tour-hero-facts {
      margin-top: 1rem;
    }

    .hero-fact {
      gap: 0.75rem;
      border-radius: 14px;
      padding: 0.6rem 0.85rem;
    }

    .hero-fact-icon {
      height: 2.5rem;
      width: 2.5rem;
    }

    .hero-fact-icon :global(svg) {
      height: 1.25rem;
      width: 1.25rem;
    }

    .hero-fact-value {
      font-size: 1.375rem;
    }

    .hero-fact-price .hero-fact-value {
      font-size: 1.625rem;
    }
  }

  /* ── Overview facts ─────────────────────────────────────────────────── */
  @media (max-width: 479px) {
    .tour-fact {
      gap: 0.6rem;
      padding: 0.7rem;
    }

    .tour-fact-icon {
      height: 2.25rem;
      width: 2.25rem;
      border-radius: 10px;
    }

    .tour-fact-icon :global(svg) {
      height: 1.15rem;
      width: 1.15rem;
    }
  }

  /* ── Safari snapshot ────────────────────────────────────────────────── */
  .snapshot-head,
  .snapshot-row {
    grid-template-columns: 62px minmax(0, 1.3fr) minmax(0, 1.4fr) minmax(0, 0.9fr);
    column-gap: 16px;
  }

  .snapshot-head {
    padding: 0 16px 0 10px;
  }

  .snapshot-row {
    --day-colour: rgb(var(--c-clay));
    display: grid;
    align-items: center;
    row-gap: 10px;
    padding: 10px 16px 10px 10px;
  }

  .snapshot-place {
    color: var(--day-colour);
  }

  .snapshot-tag :global(svg) {
    flex: none;
    color: var(--day-colour);
  }

  @media (max-width: 767px) {
    .snapshot-row {
      grid-template-columns: 54px minmax(0, 1fr);
      column-gap: 12px;
      align-items: start;
      padding: 10px 12px 12px 10px;
    }

    /* Highlights and hotel sit under the place, in the text column. */
    .snapshot-row > .snapshot-detail {
      grid-column: 2;
    }

    .snapshot-row > .snapshot-detail:empty {
      display: none;
    }
  }

  /* ── Accommodation ──────────────────────────────────────────────────── */
  .accommodation-open {
    min-height: 150px;
  }

  @media (prefers-reduced-motion: reduce) {
    .faq-number,
    .faq-connector::before {
      transition: none;
      animation: none;
    }
  }
</style>
