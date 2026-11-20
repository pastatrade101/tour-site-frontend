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
  import CompareButton from '$lib/components/public/compare/CompareButton.svelte';
  import { thumbImage } from '$lib/compare/shared';
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
  {@const heroTitleParts = tour.title.split(/\s*\|\s*/).filter(Boolean)}
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
    <div class="tour-detail-hero-overlay" aria-hidden="true"></div>

    <div class="tour-detail-hero-shell container-shell">
      <a href="/tours" class="tour-hero-back">
        <ArrowLeft class="h-3.5 w-3.5" />{$t('ui.back_to_tours')}</a>

      <div class="tour-hero-copy">
        {#if categoryLabel}
          <span class="tour-hero-category">{categoryLabel}</span>
        {/if}
        <h1>
          <span>{heroTitleParts[0] || tour.title}</span>
          {#if heroTitleParts.length > 1}
            {' '}<span class="tour-hero-subtitle">{heroTitleParts.slice(1).join(' · ')}</span>
          {/if}
        </h1>
        <div class="tour-hero-actions">
          <button
            type="button"
            class="tour-hero-plan"
            on:click={() => openPlanner('hero')}
          >{$t('ui.plan_this_trip')}<ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" /></button>
          <CompareButton kind="tours" variant="full" onDark shape="rounded-[10px]" pick={{ key: tour.slug, title: tour.title, image: thumbImage(tour, ['main_image_url', 'banner_image_url']) }} />
        </div>
        {#if heroFacts.length}
          <div class="tour-hero-facts">
            {#each heroFacts as fact}
              <div class="hero-fact" class:hero-fact-price={fact.kind === 'price'} class:hero-fact-places={fact.kind === 'places'}>
                <span class="hero-fact-icon">
                  <svelte:component this={fact.icon} size={23} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span class="hero-fact-copy">
                  <span class="hero-fact-label">{fact.label}</span>
                  {#if fact.kind === 'places'}
                    <span class="hero-fact-destinations">
                      <!-- Real spaces around each dot: without them the names
                           are one unbreakable word and run out of the card. -->
                      {#each heroPlacesShown as name, index}{#if index}{' '}<span class="hero-place-dot" aria-hidden="true">·</span>{' '}{/if}<span>{name}</span>{/each}{#if heroPlaces.length > heroPlacesShown.length}{' '}<span>+{heroPlaces.length - heroPlacesShown.length}</span>{/if}
                    </span>
                  {:else}
                    <span class="hero-fact-value">{fact.value}</span>
                  {/if}
                  {#if fact.sub}<span class="hero-fact-sub">{fact.sub}</span>{/if}
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
        <section id="overview" class="tour-section tour-overview scroll-mt-32">
          <div class="section-label">
            <span></span>
            <p>{$t('ui.overview')}</p>
          </div>
          <h2 class="overview-title">{$t('ui.about_this_safari')}</h2>
          {#if tourDescription}
            <div class="overview-copy">
              <RichText value={tourDescription} />
            </div>
          {/if}

          {#if tripFacts.length}
            <div class="tour-facts-grid" class:tour-facts-three={compactFacts === 3} class:tour-facts-four={compactFacts >= 4}>
              {#each tripFacts as fact}
                {@const long = fact.value.length > 26}
                <div class="tour-fact" class:tour-fact-long={long}>
                  <span class="tour-fact-icon">
                    <svelte:component this={fact.icon} size={19} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span class="tour-fact-copy">
                    <span class="tour-fact-label">{fact.label}</span>
                    <span class="tour-fact-value">{fact.value}</span>
                  </span>
                </div>
              {/each}
            </div>
          {/if}

          <button
            type="button"
            class="overview-customize"
            on:click={() => openPlanner('overview-customize')}
          >{$t('ui.customize_this_route')}<ArrowRight size={14} />
          </button>
        </section>

        {#if snapshotRows.length}
          <section class="tour-section tour-snapshot" aria-labelledby="safari-snapshot-title">
            <header class="snapshot-header">
              <div class="snapshot-heading">
                <h2 id="safari-snapshot-title">{$t('ui.safari_snapshot')}</h2>
                <p>{$t('ui.a_quick_look_at_the')}</p>
              </div>
              {#if tour.duration_days || tour.duration_nights}
                <dl class="snapshot-duration">
                  {#if tour.duration_days}
                    <div><dt>{$t(tour.duration_days === 1 ? 'label.day' : 'label.days')}</dt><dd>{tour.duration_days}</dd></div>
                  {/if}
                  {#if tour.duration_nights}
                    <div><dt>{$t(tour.duration_nights === 1 ? 'label.night' : 'label.nights')}</dt><dd>{tour.duration_nights}</dd></div>
                  {/if}
                </dl>
              {/if}
            </header>

            <ol class="snapshot-list">
              {#each snapshotRows as row (row.number)}
                <li class="snapshot-card">
                  <div class="snapshot-day-band">
                    <span class="snapshot-day-number"><span>{$t('label.day')}</span><strong>{String(row.number).padStart(2, '0')}</strong></span>
                    <svelte:component this={row.tags[0]?.icon ?? Compass} size={18} strokeWidth={1.6} aria-hidden="true" />
                  </div>
                  <div class="snapshot-main">
                    {#if row.place}<p class="snapshot-place">{row.place.name}</p>{/if}
                    <h3>{row.title}</h3>
                    {#if row.tags.length}
                      <ul class="snapshot-highlights" aria-label={$t('label.highlights')}>
                        {#each row.tags as tag}
                          <li><svelte:component this={tag.icon} size={16} strokeWidth={1.7} aria-hidden="true" /><span>{tag.text}</span></li>
                        {/each}
                      </ul>
                    {:else if row.summary}
                      <p class="snapshot-summary">{row.summary}</p>
                    {:else}
                      <p class="snapshot-summary">{$t('ui.details_on_request')}</p>
                    {/if}
                  </div>
                  <div class="snapshot-stay" class:snapshot-stay-final={!row.hotel && endsWithoutStay(row.number)}>
                    {#if !row.hotel && endsWithoutStay(row.number)}
                      <span class="snapshot-stay-icon"><CircleCheck size={17} strokeWidth={1.7} aria-hidden="true" /></span>
                      <p class="snapshot-stay-note">{$t('ui.final_day_no_overnight')}</p>
                    {:else}
                      <span class="snapshot-stay-icon"><BedDouble size={17} strokeWidth={1.7} aria-hidden="true" /></span>
                      <div class="snapshot-stay-copy">
                        <span class="snapshot-stay-label">{$t('ui.hotel_options')}</span>
                        <p>{row.hotel || $t('ui.confirmed_when_quoted')}</p>
                      </div>
                    {/if}
                  </div>
                </li>
              {/each}
            </ol>
          </section>
        {/if}

        {#if tour.customization_options?.length}
          <section class="tour-section tour-customize" aria-labelledby="customize-heading">
            <header class="customize-header">
              <h2 id="customize-heading">{$t('ui.ways_to_customize_this_trip')}</h2>
              {#if tour.customization_intro}<p>{tour.customization_intro}</p>{/if}
            </header>
            <div class="customize-panel">
              <ul class="customize-options">
                {#each tour.customization_options as item, index}
                  <li>
                    <span class="customize-icon">
                      <svelte:component this={CUSTOMIZE_ICONS[index % CUSTOMIZE_ICONS.length]} size={18} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span class="customize-option-copy">{item}</span>
                  </li>
                {/each}
              </ul>
              <div class="customize-action">
                <button
                  type="button"
                  class="customize-button"
                  on:click={() => openPlanner('customize')}
                ><span>{$t('ui.customize_this_trip')}</span><ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
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
              <ItineraryDays days={itineraryDays} {lodgeMedia} planCta refined on:plan={() => openPlanner('day-by-day')} />
            </div>
          {:else}
            <div class="mt-6 rounded-[12px] border border-ink/10 bg-canvas p-5 text-[14px] leading-6 text-ink/70">{$t('ui.the_daybyday_route_for_this')}</div>
          {/if}
        </section>

        {#if accommodationBlocks.length}
          <section id="accommodation" class="tour-section scroll-mt-32">
            <SectionTitle title={$t('nav.accommodation')} description={$t('ui.where_you_stay_on_this')} />

            <div class="tour-accommodation-grid mt-6 grid gap-4 md:grid-cols-2">
              {#each accommodationBlocks as block (block.key)}
                <article class="accommodation-stay group relative overflow-hidden border border-ink/10 bg-deep-green">
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
                  <div class="accommodation-stay-copy relative flex h-full flex-col justify-end p-4 text-white md:p-5">
                    <!-- One chip per day and the length of the stay, both solid:
                         a frosted tag fades into a bright photograph. -->
                    <div class="mb-auto flex items-start justify-between gap-2">
                      <div class="flex min-w-0 flex-wrap gap-1.5">
                        {#each block.days as dayNumber}<DayBadge day={dayNumber} size="sm" gold />{/each}
                      </div>
                      <span class="stay-night-count shrink-0 whitespace-nowrap rounded-full bg-deep-green/80 px-2.5 py-1.5 text-[11px] font-medium leading-none text-white backdrop-blur">
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
                <article class="accommodation-open">
                  <div class="flex flex-wrap justify-center gap-1.5">
                    {#each openDays as day}<DayBadge day={day.day_number} size="sm" gold />{/each}
                  </div>
                  <p class="text-[13px] leading-relaxed text-ink/70">{openDaysNote}</p>
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
              class="tour-detail-action"
              on:click={() => openPlanner('prices')}
            >{$t('ui.get_my_exact_quote')}<ArrowRight size={16} strokeWidth={2.4} />
            </button>
          </TourRates>
        </section>

        <section id="inclusions" class="tour-section scroll-mt-32">
          <SectionTitle title={$t('ui.whats_included')} />
          <div class="tour-two-col-grid mt-6 grid gap-4 md:grid-cols-2">
            <div class="inclusion-panel">
              <h3><span class="inclusion-symbol"><Check size={17} strokeWidth={1.8} aria-hidden="true" /></span>{$t('ui.included')}</h3>
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

            <div class="inclusion-panel inclusion-panel-muted">
              <h3><span class="inclusion-symbol"><Minus size={17} strokeWidth={1.8} aria-hidden="true" /></span>{$t('ui.not_included_2')}</h3>
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
            class="tour-detail-action mt-5"
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
  /* Photo-led hero with one trip summary; all values keep their existing bindings. */
  .tour-detail-hero-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(0deg, rgb(var(--c-forest) / 0.8), transparent 65%),
      linear-gradient(90deg, rgb(var(--c-forest) / 0.88), rgb(var(--c-forest) / 0.57) 49%, rgb(var(--c-forest) / 0.12) 100%);
  }

  .tour-detail-hero-shell {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 590px;
    padding-block: 6rem 2.5rem;
  }

  .tour-hero-back {
    position: absolute;
    top: 1.25rem;
    inset-inline-start: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    color: rgb(255 255 255 / 0.85);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .tour-hero-back:hover { color: rgb(var(--c-goldfinch-gold)); }
  .tour-hero-copy { width: 100%; min-width: 0; }
  .tour-hero-category { display: inline-flex; align-items: center; gap: 0.75rem; color: rgb(var(--c-goldfinch-gold)); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; }
  .tour-hero-category::before { content: ''; flex: 0 0 28px; height: 1px; background: currentColor; }
  .tour-hero-copy h1 { max-width: 24ch; margin-top: 1rem; color: white; font-size: clamp(2.75rem, 4.2vw, 3.875rem); font-weight: 500; line-height: 1.06; letter-spacing: -0.025em; text-wrap: balance; }
  .tour-hero-subtitle { display: block; margin-top: 1.125rem; color: rgb(var(--c-savanna) / 0.95); font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: clamp(1rem, 1.6vw, 1.25rem); font-weight: 400; line-height: 1.5; letter-spacing: 0.01em; }
  .tour-hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 1.75rem; }
  .tour-hero-plan { display: inline-flex; align-items: center; justify-content: space-between; gap: 1.75rem; min-height: 50px; padding: 0.875rem 1.125rem 0.875rem 1.25rem; border: 1px solid rgb(var(--c-goldfinch-gold)); border-radius: 10px; background: rgb(var(--c-goldfinch-gold)); color: rgb(var(--c-deep-green)); font-size: 0.875rem; font-weight: 700; }
  .tour-hero-plan:hover { background: rgb(var(--c-gold-hover)); border-color: rgb(var(--c-gold-hover)); }
  .tour-hero-plan:focus-visible, .tour-hero-back:focus-visible { outline: 2px solid white; outline-offset: 5px; }

  .tour-hero-facts {
    display: flex;
    max-width: 920px;
    margin-top: 1.5rem;
    overflow: hidden;
    border: 1px solid rgb(var(--c-savanna) / 0.32);
    border-radius: 12px;
    background:
      linear-gradient(135deg, rgb(255 255 255 / 0.1), rgb(255 255 255 / 0.015) 55%),
      rgb(var(--c-forest) / 0.48);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.16), 0 16px 40px -24px rgb(0 0 0 / 0.5);
    -webkit-backdrop-filter: blur(18px) saturate(125%);
    backdrop-filter: blur(18px) saturate(125%);
  }

  .hero-fact { display: flex; flex: 1 1 0; align-items: flex-start; gap: 0.625rem; min-width: 0; padding: 1rem 1.125rem; color: white; }
  .hero-fact + .hero-fact { border-inline-start: 1px solid rgb(var(--c-savanna) / 0.2); }
  .hero-fact-places { flex-grow: 1.65; }
  .hero-fact-icon { display: grid; place-items: center; flex: 0 0 28px; width: 28px; height: 28px; margin-top: 1rem; color: rgb(var(--c-goldfinch-gold)); }
  .hero-fact-copy { display: grid; min-width: 0; gap: 0.1875rem; }
  .hero-fact-label { color: rgb(var(--c-savanna) / 0.82); font-size: 0.6875rem; font-weight: 500; line-height: 1.4; }
  .hero-fact-value { font-family: 'Source Serif 4', Georgia, serif; font-size: 1.75rem; font-weight: 500; line-height: 1.1; overflow-wrap: anywhere; }
  .hero-fact-sub { color: rgb(255 255 255 / 0.72); font-size: 0.75rem; line-height: 1.5; }
  .hero-fact-destinations { font-size: 0.9375rem; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
  .hero-place-dot { color: rgb(var(--c-goldfinch-gold)); }
  .hero-fact-price { position: relative; background: rgb(var(--c-savanna) / 0.84); color: rgb(var(--c-deep-green)); }
  .hero-fact-price::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: rgb(var(--c-goldfinch-gold)); }
  .hero-fact-price .hero-fact-label, .hero-fact-price .hero-fact-sub { color: rgb(var(--c-deep-green) / 0.76); }
  .hero-fact-price .hero-fact-icon { color: rgb(var(--c-deep-green)); }
  .hero-fact-price .hero-fact-value { font-size: 2rem; }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .tour-hero-facts { background: rgb(var(--c-forest) / 0.94); }
    .hero-fact-price { background: rgb(var(--c-savanna)); }
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    .hero-fact { gap: 0.5rem; padding: 1rem; }
    .hero-fact-icon { flex-basis: 28px; width: 28px; }
    .hero-fact-value { font-size: 1.625rem; }
    .hero-fact-price .hero-fact-value { font-size: 1.875rem; }
    .hero-fact-destinations { font-size: 0.9375rem; }
  }

  @media (max-width: 767px) {
    .tour-detail-hero-shell { min-height: 0; padding-block: 5rem 1.75rem; }
    .tour-detail-hero-overlay { background: linear-gradient(0deg, rgb(var(--c-forest) / 0.95), rgb(var(--c-forest) / 0.6) 58%, rgb(var(--c-forest) / 0.45)); }
    .tour-hero-back { top: 0.75rem; }
    .tour-hero-category { font-size: 0.6875rem; gap: 0.625rem; }
    .tour-hero-copy h1 { max-width: 100%; font-size: clamp(2rem, 7.5vw, 3rem); line-height: 1.1; }
    .tour-hero-actions { margin-top: 1.25rem; }
    .tour-hero-facts { flex-wrap: wrap; margin-top: 1.5rem; }
    .hero-fact { flex: 1 1 50%; gap: 0.5rem; padding: 0.75rem 0.875rem; }
    .hero-fact-places { flex-basis: 100%; order: 1; border-inline-start: 0 !important; border-top: 1px solid rgb(var(--c-savanna) / 0.2); }
    .hero-fact-icon { flex-basis: 27px; width: 27px; margin-top: 0.75rem; }
    .hero-fact-value { font-size: 1.5rem; }
    .hero-fact-price .hero-fact-value { font-size: 1.625rem; }
    .hero-fact-destinations { font-size: 0.875rem; }
  }

  @media (max-width: 359px) {
    .hero-fact { padding: 0.875rem 0.75rem; }
    .hero-fact-icon { display: none; }
  }

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

    .tour-accommodation-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 480px) and (max-width: 767px) {

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

  /* These sections respond to their content column beside the existing planner. */
  .tour-overview {
    container: safari-overview / inline-size;
    padding-bottom: 1.75rem;
    border-bottom: 1px solid rgb(var(--c-ink) / 0.12);
  }

  .overview-title {
    margin-top: 0.75rem;
    color: rgb(var(--c-heading));
    font-size: clamp(2rem, 3vw, 2.5rem);
    font-weight: 600;
    line-height: 1.15;
    letter-spacing: -0.025em;
  }

  .overview-copy {
    max-width: 80ch;
    margin-top: 1.25rem;
    color: rgb(var(--c-ink) / 0.75);
    font-size: 0.9375rem;
    line-height: 1.8;
  }

  .tour-facts-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 1.75rem;
  }

  .tour-fact {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 0.75rem;
    padding: 0.875rem;
    border: 1px solid rgb(var(--c-goldfinch-gold) / 0.35);
    border-radius: 12px;
    background: rgb(var(--c-surface));
  }

  .tour-fact-long { grid-column: 1 / -1; }

  .tour-fact-icon {
    display: grid;
    place-items: center;
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgb(var(--c-goldfinch-gold));
    color: rgb(var(--c-deep-green));
  }

  .tour-fact-copy { display: grid; min-width: 0; gap: 3px; }
  .tour-fact-label { color: rgb(var(--c-ink) / 0.72); font-size: 0.6875rem; line-height: 1.4; }
  .tour-fact-value {
    color: rgb(var(--c-heading));
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .tour-fact-long .tour-fact-value { font-size: 1.125rem; }

  .overview-customize {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    margin-top: 0.75rem;
    color: rgb(var(--c-clay));
    font-size: 0.875rem;
    font-weight: 600;
    text-align: start;
  }

  .overview-customize:hover { text-decoration: underline; text-underline-offset: 4px; }
  .overview-customize:focus-visible { outline: 2px solid rgb(var(--c-clay)); outline-offset: 4px; border-radius: 4px; }

  @container safari-overview (min-width: 600px) {
    .tour-facts-three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }

  @container safari-overview (min-width: 850px) {
    .tour-facts-four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }

  @container safari-overview (max-width: 380px) {
    .tour-fact { gap: 0.5rem; padding: 0.75rem 0.625rem; }
    .tour-fact-icon { flex-basis: 29px; width: 29px; height: 29px; border-radius: 8px; }
    .tour-fact-value { font-size: 1.0625rem; }
  }

  /* Compact route summary; the full itinerary keeps its existing presentation. */
  .tour-snapshot { container: safari-snapshot / inline-size; }
  .tour-overview + .tour-snapshot { margin-top: 2rem; }

  .snapshot-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .snapshot-heading { min-width: 0; padding-inline-start: 1rem; border-inline-start: 4px solid rgb(var(--c-goldfinch-gold)); }
  .snapshot-heading h2 { color: rgb(var(--c-heading)); font-size: 2rem; font-weight: 600; line-height: 1.1; letter-spacing: -0.025em; }
  .snapshot-heading p { margin-top: 0.625rem; color: rgb(var(--c-ink) / 0.72); font-size: 0.8125rem; line-height: 1.6; }
  .snapshot-duration { display: flex; flex: none; align-items: center; gap: 1rem; padding-top: 4px; }
  .snapshot-duration > div { display: flex; flex-direction: row-reverse; align-items: baseline; gap: 5px; }
  .snapshot-duration > div + div { padding-inline-start: 1rem; border-inline-start: 1px solid rgb(var(--c-ink) / 0.16); }
  .snapshot-duration dt { color: rgb(var(--c-ink) / 0.72); font-size: 0.75rem; }
  .snapshot-duration dd { color: rgb(var(--c-heading)); font-family: 'Source Serif 4', Georgia, serif; font-size: 1.75rem; font-weight: 600; line-height: 1; }

  .snapshot-list { display: grid; gap: 0.875rem; list-style: none; padding: 0; }
  .snapshot-card {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr) 160px;
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgb(var(--c-ink) / 0.13);
    border-radius: 14px;
    background: rgb(var(--c-surface));
    box-shadow: 0 6px 18px -14px rgb(var(--c-deep-green) / 0.3);
  }

  .snapshot-day-band {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1.125rem 0.375rem;
    border-inline-end: 3px solid rgb(var(--c-goldfinch-gold));
    background: rgb(var(--c-deep-green));
    color: rgb(var(--c-savanna));
  }

  .snapshot-day-number { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .snapshot-day-number > span { font-size: 0.6875rem; font-weight: 500; text-transform: capitalize; }
  .snapshot-day-number strong { color: #fff; font-family: 'Source Serif 4', Georgia, serif; font-size: 2rem; font-weight: 500; line-height: 1; }
  .snapshot-main { min-width: 0; padding: 1.25rem; }
  .snapshot-place { margin-bottom: 0.5rem; color: rgb(var(--c-ink) / 0.75); font-size: 0.6875rem; font-weight: 600; line-height: 1.5; letter-spacing: 0.07em; text-transform: uppercase; overflow-wrap: anywhere; }
  .snapshot-main h3 { color: rgb(var(--c-heading)); font-size: 1.3125rem; font-weight: 600; line-height: 1.2; letter-spacing: -0.015em; overflow-wrap: anywhere; }
  .snapshot-highlights { display: flex; flex-wrap: wrap; gap: 0.625rem 1rem; margin-top: 1rem; padding: 0; list-style: none; }
  .snapshot-highlights li { display: flex; align-items: flex-start; gap: 0.5rem; min-width: 0; color: rgb(var(--c-ink) / 0.85); font-size: 0.75rem; line-height: 1.5; }
  .snapshot-highlights li :global(svg) { flex: none; margin-top: 1px; color: rgb(var(--c-heading)); }
  .snapshot-highlights li span { min-width: 0; overflow-wrap: anywhere; }
  .snapshot-summary { margin-top: 1rem; color: rgb(var(--c-ink) / 0.72); font-size: 0.8125rem; line-height: 1.6; }

  .snapshot-stay {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    min-width: 0;
    gap: 0.625rem;
    padding: 1rem;
    border-inline-start: 1px solid rgb(var(--c-ink) / 0.1);
    background: rgb(var(--c-canvas));
  }

  .snapshot-stay-icon { display: grid; place-items: center; flex: 0 0 34px; width: 34px; height: 34px; border-radius: 50%; background: rgb(var(--c-sand)); color: rgb(var(--c-heading)); }
  .snapshot-stay-copy { min-width: 0; }
  .snapshot-stay-label { display: block; margin-bottom: 3px; color: rgb(var(--c-ink) / 0.72); font-size: 0.6875rem; line-height: 1.5; }
  .snapshot-stay p { color: rgb(var(--c-heading)); font-size: 0.8125rem; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
  .snapshot-stay-final { background: rgb(var(--c-surface)); }
  .snapshot-stay-final .snapshot-stay-icon { background: rgb(var(--c-canvas)); }
  .snapshot-stay .snapshot-stay-note { color: rgb(var(--c-ink) / 0.72); font-size: 0.75rem; font-weight: 400; }

  @container safari-snapshot (min-width: 850px) {
    .snapshot-list { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    .snapshot-card { display: flex; flex-direction: column; }
    .snapshot-day-band { flex-direction: row; justify-content: space-between; padding: 1rem 1.25rem; border-inline-end: 0; border-bottom: 3px solid rgb(var(--c-goldfinch-gold)); }
    .snapshot-day-number { flex-direction: row; align-items: baseline; gap: 0.625rem; }
    .snapshot-main { flex: 1; padding: 1.375rem; }
    .snapshot-main h3 { font-size: 1.5rem; }
    .snapshot-highlights { display: grid; gap: 0.75rem; }
    .snapshot-stay { flex-direction: row; align-items: center; justify-content: flex-start; min-height: 88px; padding: 1rem 1.25rem; border-inline-start: 0; border-top: 1px solid rgb(var(--c-ink) / 0.1); }
  }

  @container safari-snapshot (max-width: 560px) {
    .snapshot-card { grid-template-columns: 50px minmax(0, 1fr); }
    .snapshot-day-band { grid-row: 1 / 3; justify-content: flex-start; }
    .snapshot-main { padding: 1.125rem; }
    .snapshot-highlights { display: grid; gap: 0.625rem; }
    .snapshot-stay { grid-column: 2; flex-direction: row; align-items: center; justify-content: flex-start; padding: 0.875rem 1.125rem; border-inline-start: 0; border-top: 1px solid rgb(var(--c-ink) / 0.1); }
  }

  @container safari-snapshot (max-width: 380px) {
    .snapshot-card { grid-template-columns: 44px minmax(0, 1fr); }
    .snapshot-day-number strong { font-size: 1.75rem; }
    .snapshot-main { padding: 1rem; }
    .snapshot-main h3 { font-size: 1.25rem; }
    .snapshot-stay { padding: 0.875rem 1rem; }
  }

  .tour-customize { container: safari-customize / inline-size; }
  .customize-header { padding-inline-start: 1rem; border-inline-start: 4px solid rgb(var(--c-goldfinch-gold)); }
  .customize-header h2 { color: rgb(var(--c-heading)); font-size: 1.875rem; font-weight: 500; line-height: 1.15; letter-spacing: -0.02em; }
  .customize-header p { margin-top: 0.625rem; color: rgb(var(--c-ink) / 0.72); font-size: 0.875rem; line-height: 1.65; }
  .customize-panel { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 1.25rem; margin-top: 1.375rem; padding: 1.25rem; border: 1px solid rgb(var(--c-ink) / 0.12); border-radius: 14px; background: linear-gradient(110deg, rgb(var(--c-sand) / 0.28), rgb(var(--c-surface)) 65%); }
  .customize-options { display: grid; gap: 0.875rem; min-width: 0; list-style: none; padding: 0; }
  .customize-options li { display: grid; grid-template-columns: 32px minmax(0, 1fr); align-items: center; gap: 0.75rem; min-width: 0; }
  .customize-icon { display: grid; place-items: center; flex: 0 0 32px; width: 32px; height: 32px; border: 1px solid rgb(var(--c-goldfinch-gold) / 0.2); border-radius: 50%; background: rgb(var(--c-sand) / 0.6); color: rgb(var(--c-heading)); }
  .customize-option-copy { min-width: 0; color: rgb(var(--c-heading)); font-size: 0.875rem; font-weight: 400; line-height: 1.6; overflow-wrap: anywhere; }
  .customize-action { padding-inline-start: 1.25rem; border-inline-start: 1px solid rgb(var(--c-ink) / 0.12); }
  .customize-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.875rem; min-height: 44px; max-width: 220px; padding: 0.75rem 1rem; border: 1px solid rgb(var(--c-deep-green)); border-radius: 9px; background: rgb(var(--c-deep-green)); color: white; font-size: 0.8125rem; font-weight: 400; line-height: 1.4; }
  .customize-button :global(svg) { flex: none; color: rgb(var(--c-goldfinch-gold)); }
  .customize-button:hover { background: rgb(var(--c-forest)); }
  .customize-button:focus-visible { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 4px; }

  @container safari-customize (max-width: 680px) {
    .customize-panel { grid-template-columns: minmax(0, 1fr); gap: 1rem; }
    .customize-action { display: flex; justify-content: flex-end; padding-inline-start: 0; padding-top: 1rem; border-inline-start: 0; border-top: 1px solid rgb(var(--c-ink) / 0.1); }
  }

  @container safari-customize (max-width: 380px) {
    .customize-header h2 { font-size: 1.625rem; }
    .customize-panel { padding: 1rem; }
    .customize-button { width: 100%; max-width: none; }
  }

  /* The remaining details share the quieter borders, type, and spacing above. */
  #accommodation { container: itinerary-accommodation / inline-size; }
  .tour-accommodation-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .accommodation-stay { min-height: 310px; border-radius: 14px; }
  .accommodation-stay-copy { min-height: inherit; }
  .accommodation-stay:focus-within { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 3px; }
  .accommodation-stay :global(.day-badge) { width: 35px; border-radius: 7px; box-shadow: none; }
  .accommodation-stay :global(.day-badge-top) { font-size: 9px; font-weight: 500; }
  .accommodation-stay :global(.day-badge-num) { font-size: 18px; font-weight: 500; }
  .accommodation-card-title { display: block; overflow: visible; font-size: 22px; line-clamp: none; -webkit-line-clamp: unset; }
  .accommodation-card-summary { font-size: 12px; font-weight: 400; }
  .accommodation-open { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 0.875rem; min-height: 0; padding: 0.875rem 1rem; border: 1px solid rgb(var(--c-ink) / 0.1); border-radius: 10px; background: rgb(var(--c-canvas) / 0.6); }
  .accommodation-open :global(.day-badge) { width: 36px; border-radius: 6px; box-shadow: none; }
  .accommodation-open :global(.day-badge-num) { font-size: 18px; }
  .accommodation-open :global(.day-badge-top) { font-size: 9px; }
  @container itinerary-accommodation (max-width: 520px) {
    .tour-accommodation-grid { grid-template-columns: minmax(0, 1fr); }
    .accommodation-stay { min-height: 300px; }
  }

  .tour-detail-action { display: inline-flex; align-items: center; justify-content: center; gap: 0.625rem; min-height: 44px; padding: 0.75rem 1rem; border: 1px solid rgb(var(--c-goldfinch-gold)); border-radius: 9px; background: rgb(var(--c-goldfinch-gold)); color: rgb(var(--c-deep-green)); font-size: 13px; font-weight: 600; line-height: 1.4; }
  .tour-detail-action:hover { background: rgb(var(--c-gold-hover)); border-color: rgb(var(--c-gold-hover)); }
  .tour-detail-action:focus-visible { outline: 2px solid rgb(var(--c-deep-green)); outline-offset: 4px; }
  #prices { container: itinerary-rates / inline-size; }
  #prices :global(.rate-card) { border-radius: 10px; box-shadow: none; padding: 1rem 0.625rem 0.875rem; }
  #prices :global(.rate-who) { font-weight: 500; letter-spacing: 0; text-transform: none; }
  #prices :global(.rate-amount) { font-weight: 600; font-variant-numeric: tabular-nums; }
  #prices :global(.rate-flag) { border-radius: 5px; padding: 4px 7px; font-weight: 600; letter-spacing: 0.02em; }
  #prices :global(.rate-ask) { border-style: solid; background: rgb(var(--c-canvas) / 0.6); }
  #prices :global(.rate-foot) { padding-top: 1rem; border-top: 1px solid rgb(var(--c-ink) / 0.1); }
  #prices :global(.tour-rates-table) { border-radius: 12px; }
  @container itinerary-rates (max-width: 600px) {
    #prices :global(.rate-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  #inclusions { container: itinerary-inclusions / inline-size; }
  .inclusion-panel { padding: 1.25rem; border: 1px solid rgb(var(--c-ink) / 0.12); border-radius: 12px; background: rgb(var(--c-surface)); }
  .inclusion-panel-muted { background: rgb(var(--c-canvas) / 0.55); }
  .inclusion-panel h3 { display: flex; align-items: center; gap: 0.625rem; color: rgb(var(--c-heading)); font-size: 21px; font-weight: 600; line-height: 1.2; }
  .inclusion-symbol { display: grid; place-items: center; flex: 0 0 30px; width: 30px; height: 30px; border-radius: 50%; background: rgb(var(--c-sand) / 0.7); }
  .inclusion-panel p, .inclusion-panel li { font-size: 13px; line-height: 1.7; }
  .inclusion-panel li { padding-block: 2px; }
  @container itinerary-inclusions (max-width: 560px) {
    .tour-two-col-grid { grid-template-columns: minmax(0, 1fr); gap: 0.75rem; }
  }

  .tour-detail-main :global(.route__map) { border-radius: 14px; }
  .tour-detail-main :global(.route__legend) { padding: 0.25rem 1rem; border: 1px solid rgb(var(--c-ink) / 0.1); border-radius: 12px; background: rgb(var(--c-surface)); }
  .tour-detail-main :global(.route__stop) { grid-template-columns: 12px minmax(0, 1fr) auto; align-items: center; gap: 2px 10px; padding: 0.875rem 0; }
  .tour-detail-main :global(.route__dot) { grid-column: 1; grid-row: 1 / 3; width: 8px; height: 8px; box-shadow: none; }
  .tour-detail-main :global(.route__day) { grid-column: 2; color: rgb(var(--c-ink) / 0.65); font-size: 11px; font-weight: 400; line-height: 1.5; letter-spacing: 0; text-transform: none; }
  .tour-detail-main :global(.route__place) { grid-column: 2; justify-self: start; min-width: 0; font-size: 14px; font-weight: 400; line-height: 1.5; overflow-wrap: anywhere; }
  .tour-detail-main :global(.route__open) { grid-column: 3; grid-row: 1 / span 2; }
  .tour-detail-main :global(.route__place:focus-visible) { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 3px; border-radius: 3px; }
  #good-to-know .faq-timeline-item { padding-bottom: 2rem; }
  #good-to-know .faq-timeline-item:last-child { padding-bottom: 0; }
  #good-to-know .faq-timeline-item h3 { font-size: 21px; line-height: 1.35; }
  #good-to-know :global(.rich) { font-size: 14px; line-height: 1.8; }
  #good-to-know .faq-number { border-radius: 10px; }

  @media (prefers-reduced-motion: reduce) {
    .faq-number,
    .faq-connector::before {
      transition: none;
      animation: none;
    }
  }
</style>
