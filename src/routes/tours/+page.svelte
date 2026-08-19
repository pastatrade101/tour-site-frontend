<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { ArrowLeft, ArrowRight, CalendarDays, Check, Compass, MapPin, X } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { staggeredCardReveal } from '$lib/animations';
  import { currency, formatUsd } from '$lib/currency';
  import { EXPERIENCE_TO_CATEGORY, PERSONA_ORDER, PERSONAS, type Persona } from '$lib/data/personas';
  import { toMetaText } from '$lib/richText';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import ContentShimmer from '$lib/components/public/ContentShimmer.svelte';
  import Img from '$lib/components/public/Img.svelte';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import TourFilterBar from '$lib/components/public/TourFilterBar.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import LeadCaptureForm from '$lib/components/public/LeadCaptureForm.svelte';
  import HomeDestinationsCarousel from '$lib/components/public/home/HomeDestinationsCarousel.svelte';
  import HomeAdvisorNote from '$lib/components/public/home/HomeAdvisorNote.svelte';
  import HomeHowPlanned from '$lib/components/public/home/HomeHowPlanned.svelte';
  import HomeTravellerStories from '$lib/components/public/home/HomeTravellerStories.svelte';
  import HomePlanningBand from '$lib/components/public/home/HomePlanningBand.svelte';
  import { getTourDestinationNames, getTourDestinations, matchesTourDestinationSlug } from '$lib/tourDestinations';
  import type { Tour, TravelStyle } from '$lib/types';
  import type { PageData } from './$types';

  const TIERS = [
    { key: 'luxury_plus', label: 'Luxury+' },
    { key: 'luxury', label: 'Luxury' },
    { key: 'mid_range', label: 'Mid-range' },
    { key: 'budget', label: 'Budget' }
  ];

  const normTier = (t?: string | null) => {
    if (!t) return '';
    const v = t.toLowerCase().replace(/[\s-]+/g, '_');
    if (v === 'midrange') return 'mid_range';
    if (v === 'luxuryplus' || v === 'ultra_luxury') return 'luxury_plus';
    return v;
  };

  export let data: PageData;
  let allTours: Tour[] = data.tours ?? [];
  let heroIndex = 0;
  $: heroSlides = allTours
    .filter((tour) => (tour.is_featured || tour.is_popular) && (tour.banner_image_url || tour.main_image_url))
    .slice(0, 5);
  $: if (heroSlides.length && heroIndex >= heroSlides.length) heroIndex = 0;
  const personaKey = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const cmsPersonaStyles = (data.travelStyles ?? []).filter(
    (style: TravelStyle) => Boolean(style.persona?.trim())
  );
  const cmsPersonas = cmsPersonaStyles.reduce<Record<string, Persona>>((personas, style) => {
    const key = personaKey(style.persona ?? '');
    if (!key || personas[key]) return personas;
    personas[key] = {
      label: style.name,
      headline: style.emotional_promise?.split('\n').map((item) => item.trim()).find(Boolean) || style.name,
      sub: toMetaText(style.description, 240),
      concerns: style.concerns ?? []
    };
    return personas;
  }, {});
  const personaMap: Record<string, Persona> = cmsPersonaStyles.length ? cmsPersonas : PERSONAS;
  const personaKeys = cmsPersonaStyles.length ? Object.keys(cmsPersonas) : [...PERSONA_ORDER];
  // Supporting content rendered under the grid. Each block self-hides when its
  // list is empty, so a missing endpoint just removes that section.
  $: parkDestinations = data.destinations ?? [];
  $: tourReviews = data.reviews ?? [];
  $: tourReviewSummary = data.reviewSummary ?? null;
  $: tourFaqs = data.faqs ?? [];
  let loading = false;
  let error = '';

  let selectedTiers: string[] = [];
  let popularOnly = false;
  let lenMin = 1;
  let lenMax = 21;
  let lengthLo = 1;
  let lengthHi = 21;
  let priceMin = 0;
  let priceMax = 10000;
  let priceLo = 0;
  let priceHi = 10000;
  let rangesReady = false;
  let sort = 'recommended';

  $: params = $page.url.searchParams;
  $: searchTerm = params.get('search')?.trim() ?? '';
  $: destSlug = params.get('destination')?.trim() ?? '';
  $: persona = params.get('persona')?.trim() ?? '';
  $: experience = params.get('experience')?.trim() ?? '';
  $: urlCategories = (() => {
    const set = new Set<string>();
    (params.get('category')?.split(',') ?? []).forEach((c) => c.trim() && set.add(c.trim()));
    if (experience && EXPERIENCE_TO_CATEGORY[experience]) set.add(EXPERIENCE_TO_CATEGORY[experience]);
    return set;
  })();
  $: personaCfg = persona ? personaMap[persona] ?? null : null;

  const initRanges = () => {
    const prices = allTours.map((t) => t.price_from ?? 0).filter((n) => n > 0);
    const durs = allTours.map((t) => t.duration_days ?? 0).filter((n) => n > 0);
    priceMin = prices.length ? Math.floor(Math.min(...prices)) : 0;
    priceMax = prices.length ? Math.ceil(Math.max(...prices)) : 10000;
    if (priceMax <= priceMin) priceMax = priceMin + 100;
    lenMin = durs.length ? Math.min(...durs) : 1;
    lenMax = durs.length ? Math.max(...durs) : 21;
    if (lenMax <= lenMin) lenMax = lenMin + 1;
    priceLo = priceMin;
    priceHi = priceMax;
    lengthLo = lenMin;
    lengthHi = lenMax;
    rangesReady = true;
  };

  onMount(() => {
    initRanges();
    if (heroSlides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      heroIndex = (heroIndex + 1) % heroSlides.length;
    }, 6500);
    return () => window.clearInterval(timer);
  });

  const distinctBy = <T,>(arr: T[], key: (x: T) => string | undefined) => {
    const seen = new Map<string, T>();
    for (const x of arr) {
      const k = key(x);
      if (k && !seen.has(k)) seen.set(k, x);
    }
    return [...seen.values()];
  };

  $: destinationOptions = distinctBy(allTours.flatMap((tour) => getTourDestinations(tour)), (destination) => destination.slug)
    .map((destination) => ({ slug: destination.slug, name: destination.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  $: categoryOptions = distinctBy(allTours, (t) => t.tour_categories?.slug)
    .map((t) => ({ slug: t.tour_categories!.slug as string, name: t.tour_categories!.name as string }))
    .sort((a, b) => a.name.localeCompare(b.name));
  $: tourDurations = allTours.map((tour) => Number(tour.duration_days)).filter((duration) => Number.isFinite(duration) && duration > 0);
  $: durationMeta = tourDurations.length
    ? `${Math.min(...tourDurations)}–${Math.max(...tourDurations)} days`
    : 'Flexible length';

  const matchSearch = (t: Tour, q: string) => {
    const hay = `${t.title} ${t.short_description ?? ''} ${getTourDestinationNames(t)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  $: base = allTours.filter(
    (t) =>
      (!searchTerm || matchSearch(t, searchTerm)) &&
      (!destSlug || matchesTourDestinationSlug(t, destSlug))
  );
  const catCount = (slug: string) => base.filter((t) => t.tour_categories?.slug === slug).length;
  const tierCount = (key: string) => base.filter((t) => normTier(t.budget_tier) === key).length;

  $: result = base.filter(
    (t) =>
      (urlCategories.size === 0 || (t.tour_categories?.slug ? urlCategories.has(t.tour_categories.slug) : false)) &&
      (selectedTiers.length === 0 || selectedTiers.includes(normTier(t.budget_tier))) &&
      (t.duration_days == null || (t.duration_days >= lengthLo && t.duration_days <= lengthHi)) &&
      ((t.price_from ?? 0) >= priceLo && (t.price_from ?? 0) <= priceHi) &&
      (!popularOnly || Boolean(t.is_popular))
  );

  const personaTags = (t: Tour) => t.persona_tags ?? [];
  // ── Paging over the filtered result set ──────────────────────────────────
  const PER_PAGE = 12;
  let pageNum = 1;
  // Any change to the filters/sort collapses back to the first page.
  $: filterSignature = `${searchTerm}|${destSlug}|${[...urlCategories].join(',')}|${selectedTiers.join(',')}|${popularOnly}|${lengthLo}-${lengthHi}|${priceLo}-${priceHi}|${sort}`;
  $: if (filterSignature) pageNum = 1;
  $: totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  $: safePage = Math.min(pageNum, totalPages);
  $: paged = sorted.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const goToPage = (n: number) => {
    pageNum = Math.min(Math.max(1, n), totalPages);
    if (typeof document !== 'undefined') {
      document.querySelector('[data-results-top]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  $: sorted = (() => {
    const r = [...result];
    if (sort === 'price_asc') return r.sort((a, b) => (a.price_from ?? 0) - (b.price_from ?? 0));
    if (sort === 'price_desc') return r.sort((a, b) => (b.price_from ?? 0) - (a.price_from ?? 0));
    if (sort === 'duration_asc') return r.sort((a, b) => (a.duration_days ?? 0) - (b.duration_days ?? 0));
    if (sort === 'duration_desc') return r.sort((a, b) => (b.duration_days ?? 0) - (a.duration_days ?? 0));
    return r.sort((a, b) => {
      const p = persona ? Number(personaTags(b).includes(persona)) - Number(personaTags(a).includes(persona)) : 0;
      if (p) return p;
      const f = Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
      if (f) return f;
      return Number(Boolean(b.is_popular)) - Number(Boolean(a.is_popular));
    });
  })();

  const withParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams($page.url.searchParams);
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k);
    return `/tours${next.toString() ? `?${next}` : ''}`;
  };

  const writeUrl = (changes: Record<string, string | null>) => {
    trackEvent('tour_filter_used', { metadata: { filters: Object.keys(changes) } });
    void goto(withParams(changes), { replaceState: true, noScroll: true, keepFocus: true });
  };

  const toggleCategory = (slug: string) => {
    const next = new Set(urlCategories);
    next.has(slug) ? next.delete(slug) : next.add(slug);
    writeUrl({ category: next.size ? [...next].join(',') : null, experience: null });
  };
  const setDestination = (slug: string) => writeUrl({ destination: slug || null });
  const toggleTier = (key: string) => {
    selectedTiers = selectedTiers.includes(key) ? selectedTiers.filter((k) => k !== key) : [...selectedTiers, key];
  };

  $: lengthActive = lengthLo > lenMin || lengthHi < lenMax;
  $: priceActive = priceLo > priceMin || priceHi < priceMax;
  $: activeCount =
    urlCategories.size +
    selectedTiers.length +
    (destSlug ? 1 : 0) +
    (searchTerm ? 1 : 0) +
    (popularOnly ? 1 : 0) +
    (lengthActive ? 1 : 0) +
    (priceActive ? 1 : 0);

  const clearAll = () => {
    selectedTiers = [];
    popularOnly = false;
    lengthLo = lenMin;
    lengthHi = lenMax;
    priceLo = priceMin;
    priceHi = priceMax;
    sort = 'recommended';
    void goto('/tours', { replaceState: true, noScroll: true });
  };

  $: moneyFormatter = (n: number) => formatUsd(n, $currency);
  const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
  $: catName = (slug: string) => categoryOptions.find((c) => c.slug === slug)?.name ?? slug;
  $: destName = destinationOptions.find((d) => d.slug === destSlug)?.name ?? destSlug;
  $: featuredVisible = sorted.filter((t) => t.is_featured || t.is_popular).length;
</script>

<svelte:head>
  <title>Safari &amp; Tour Packages | Goldfinch Adventures</title>
  <meta name="description" content="Browse and filter East Africa safari and tour packages by destination, experience, length, price and comfort level." />
</svelte:head>

<section data-hero class="relative isolate min-h-[390px] overflow-hidden bg-deep-green text-savanna md:min-h-[460px]">
  {#if heroSlides.length}
    {#key heroIndex}
      {@const heroTour = heroSlides[heroIndex]}
      <div class="hero-slide absolute inset-0" aria-hidden="true">
        <Img
          record={heroTour}
          fields={['banner_image_url', 'main_image_url']}
          alt=""
          width={1800}
          sizes="100vw"
          className="h-full w-full object-cover"
        />
      </div>
    {/key}
    <div class="absolute inset-0 bg-deep-green/45" aria-hidden="true"></div>
    <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,54,48,0.92)_0%,rgba(26,54,48,0.7)_48%,rgba(26,54,48,0.2)_100%)]" aria-hidden="true"></div>
    <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-deep-green/65 to-transparent" aria-hidden="true"></div>
  {/if}

  <div class="tour-shell relative z-10 flex min-h-[390px] min-w-0 items-end py-8 md:min-h-[460px] md:py-12 lg:py-14">
    <div class="min-w-0">
      <p class="font-serif text-xl italic text-goldfinch-gold">{personaCfg ? `For ${personaCfg.label}` : 'Safari & Tours'}</p>
      {#key personaCfg?.headline ?? 'default'}
        <h1 class="mt-2 max-w-4xl break-words text-[2rem] font-extrabold leading-[1.08] tracking-normal text-white sm:text-5xl lg:text-[56px]">
          {personaCfg?.headline ?? 'Find the safari that fits your travel style'}
        </h1>
      {/key}
      <p class="mt-4 max-w-3xl break-words text-base leading-7 text-savanna/82 md:text-lg">
        {personaCfg?.sub ?? 'Choose a destination, set your budget and trip length, then compare the best East Africa itineraries without hunting through every page.'}
      </p>

      {#if personaCfg}
        <div class="mt-5 flex flex-wrap gap-2">
          {#each personaCfg.concerns as concern}
            <span class="inline-flex items-center gap-1.5 rounded-full border border-savanna/15 bg-white/8 px-3 py-1.5 text-sm font-semibold text-savanna">
              <span class="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-goldfinch-gold text-heading"><Check size={11} strokeWidth={3} /></span>
              {concern}
            </span>
          {/each}
        </div>
      {/if}

      <div class="mt-6 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3" aria-label="Tour collection details">
        <div class="hero-meta">
          <Compass size={18} class="shrink-0 text-goldfinch-gold" />
          <div><span>{allTours.length}</span><small>itineraries</small></div>
        </div>
        <div class="hero-meta">
          <MapPin size={18} class="shrink-0 text-goldfinch-gold" />
          <div><span>{destinationOptions.length}</span><small>destinations</small></div>
        </div>
        <div class="hero-meta">
          <CalendarDays size={18} class="shrink-0 text-goldfinch-gold" />
          <div><span>{durationMeta}</span><small>trip duration</small></div>
        </div>
      </div>

      {#if heroSlides.length > 1}
        <div class="mt-6 flex items-center gap-2" aria-label="Featured tour images">
          {#each heroSlides as slide, index (slide.id)}
            <button
              type="button"
              class={`h-1.5 rounded-full transition-all ${index === heroIndex ? 'w-8 bg-goldfinch-gold' : 'w-2 bg-white/45 hover:bg-white/75'}`}
              aria-label={`Show image ${index + 1}: ${slide.title}`}
              aria-current={index === heroIndex ? 'true' : undefined}
              on:click={() => (heroIndex = index)}
            ></button>
          {/each}
        </div>
      {/if}
    </div>

  </div>
</section>

<!-- Padding on the section rather than margin on the grid: the margin
     collapsed straight through this wrapper, opening a strip where the cream
     page canvas showed between the hero and the white results area. -->
<div class="bg-white">
<section class="tour-shell min-w-0 pb-12 pt-6">


  <div class="grid min-w-0 gap-6">

    <div class="min-w-0">
      <!-- lg:relative, not lg:static: z-index only applies to positioned
           elements, and the reveal-transformed tour cards each create their
           own stacking context — with the panel static, its open filter
           dropdown painted UNDER the cards that follow it in the DOM. The
           blur goes at lg too: it is invisible over the solid white panel but
           still forced a stacking context (and a paint cost) of its own.
           lg:top-auto matters: the sticky offset is harmless while the panel
           is static, but on a relative element top shifts the paint position —
           the panel drifted a nav-height down, opening a gap above itself and
           landing on the cards below. -->
      <div class="results-panel sticky top-[var(--nav-h)] z-20 -mx-3 border-y border-ink/10 bg-[#fbfaf6]/95 px-3 py-3 backdrop-blur lg:relative lg:top-auto lg:mx-0 lg:rounded-[8px] lg:border lg:bg-white lg:p-4 lg:backdrop-blur-none">
        <div class="results-filter-slot">
          <TourFilterBar
                {destinationOptions}
                {categoryOptions}
                tiers={TIERS}
                personas={personaKeys.map((key) => ({ key, label: personaMap[key].label }))}
                {destSlug}
                selectedCategories={[...urlCategories]}
                {selectedTiers}
                {persona}
                {popularOnly}
                {lenMin}
                {lenMax}
                bind:lengthLo
                bind:lengthHi
                {priceMin}
                {priceMax}
                bind:priceLo
                bind:priceHi
                {rangesReady}
                resultCount={sorted.length}
                {activeCount}
                {catCount}
                {tierCount}
                {days}
                money={moneyFormatter}
                currencyKey={$currency.selectedCurrency}
                on:destination={(e) => setDestination(e.detail)}
                on:category={(e) => toggleCategory(e.detail)}
                on:tier={(e) => toggleTier(e.detail)}
                on:persona={(e) => writeUrl({ persona: persona === e.detail ? null : e.detail })}
                on:popular={(e) => (popularOnly = e.detail)}
                on:length={(e) => { lengthLo = e.detail.lo; lengthHi = e.detail.hi; }}
                on:price={(e) => { priceLo = e.detail.lo; priceHi = e.detail.hi; }}
                on:clear={clearAll}
                on:apply={() => document.querySelector('[data-results-top]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
        </div>
        <div class="results-summary flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-base font-extrabold text-heading">
              {#if searchTerm}
                Results for "{searchTerm}"
              {:else if destSlug}
                {destName} tours
              {:else}
                Best matching tours
              {/if}
            </p>
            <p class="mt-1 text-xs text-ink/60">
              {sorted.length} of {allTours.length} packages shown{#if featuredVisible} · {featuredVisible} recommended picks{/if}
            </p>
          </div>

          <div class="flex w-full items-center gap-2 sm:w-auto">
            <label class="flex h-10 flex-1 items-center gap-2 rounded-[8px] border border-ink/15 bg-surface px-3 text-sm text-ink/70 sm:flex-none">
              Sort
              <select class="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none" bind:value={sort} aria-label="Sort tours">
                <option value="recommended">Recommended</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="duration_asc">Duration: short to long</option>
                <option value="duration_desc">Duration: long to short</option>
              </select>
            </label>
          </div>
        </div>

        {#if activeCount}
          <div class="mt-3 flex flex-wrap items-center gap-2">
            {#if destSlug}
              <button class="chip" type="button" on:click={() => setDestination('')}>{destName} <X size={13} /></button>
            {/if}
            {#each [...urlCategories] as slug}
              <button class="chip" type="button" on:click={() => toggleCategory(slug)}>{catName(slug)} <X size={13} /></button>
            {/each}
            {#each selectedTiers as key}
              <button class="chip" type="button" on:click={() => toggleTier(key)}>{TIERS.find((t) => t.key === key)?.label} <X size={13} /></button>
            {/each}
            {#if searchTerm}
              <button class="chip" type="button" on:click={() => writeUrl({ search: null })}>"{searchTerm}" <X size={13} /></button>
            {/if}
            {#if lengthActive}
              <button class="chip" type="button" on:click={() => { lengthLo = lenMin; lengthHi = lenMax; }}>{days(lengthLo)}-{days(lengthHi)} <X size={13} /></button>
            {/if}
            {#if priceActive}
              <button class="chip" type="button" on:click={() => { priceLo = priceMin; priceHi = priceMax; }}>{moneyFormatter(priceLo)}-{moneyFormatter(priceHi)} <X size={13} /></button>
            {/if}
            {#if popularOnly}
              <button class="chip" type="button" on:click={() => (popularOnly = false)}>Best sellers <X size={13} /></button>
            {/if}
            <button class="text-sm font-bold text-forest underline-offset-2 hover:underline" type="button" on:click={clearAll}>Clear all</button>
          </div>
        {/if}
      </div>

      <div class="mt-5" data-results-top>
        {#if loading}
          <ContentShimmer cards={6} compact label="Loading tours" />
        {:else if error && allTours.length === 0}
          <ErrorState message={error} />
        {:else if sorted.length === 0}
          <div class="grid gap-4">
            <EmptyState
              title="No tours match your filters"
              message="Try a wider budget, a different duration, or remove one filter. A custom trip can still be planned around your exact dates."
            />
            <div class="flex flex-wrap justify-center gap-3">
              <button type="button" class="h-11 rounded-[8px] border border-ink/15 bg-surface px-4 text-sm font-bold text-ink" on:click={clearAll}>Clear filters</button>
              <a class="inline-flex h-11 items-center rounded-[8px] bg-deep-green px-4 text-sm font-bold text-white" href="/plan-my-trip">Plan a custom trip</a>
            </div>
          </div>
        {:else}
          <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
            {#each paged as tour (tour.slug)}
              <TourCardRich {tour} />
            {/each}
          </div>

          {#if totalPages > 1}
            <nav class="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Tour pages">
              <button
                type="button"
                class="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-ink/15 bg-surface px-3 text-sm font-bold text-ink disabled:opacity-40"
                disabled={safePage === 1}
                on:click={() => goToPage(safePage - 1)}
              >
                <ArrowLeft size={15} /> Previous
              </button>

              {#each Array(totalPages) as _, i}
                {@const n = i + 1}
                <button
                  type="button"
                  class={`grid h-10 min-w-[40px] place-items-center rounded-[8px] border px-2 text-sm font-bold transition ${
                    n === safePage
                      ? 'border-goldfinch-gold bg-goldfinch-gold text-heading'
                      : 'border-ink/15 bg-surface text-ink/70 hover:border-goldfinch-gold/50'
                  }`}
                  aria-current={n === safePage ? 'page' : undefined}
                  on:click={() => goToPage(n)}
                >
                  {n}
                </button>
              {/each}

              <button
                type="button"
                class="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-ink/15 bg-surface px-3 text-sm font-bold text-ink disabled:opacity-40"
                disabled={safePage === totalPages}
                on:click={() => goToPage(safePage + 1)}
              >
                Next <ArrowRight size={15} />
              </button>
            </nav>
            <p class="mt-3 text-center text-xs text-ink/55">
              Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, sorted.length)} of {sorted.length} tours
            </p>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</section>
</div>

<!-- ── Supporting content, below the filtered grid ─────────────────────────── -->

{#if parkDestinations.length}
  <HomeDestinationsCarousel
    destinations={parkDestinations}
    eyebrow="Best parks"
    title="Where These Safaris Take You"
    subtitle="Some parks are best for big cats, others for scenery, migration timing or a quieter feel. We help you combine them in the right order."
  />
{/if}

<HomeAdvisorNote
  eyebrow="Advisor's note"
  title="What We Help You Get Right"
  body="Most travel mistakes happen before arrival. The wrong route, too many one-night stops, poor lodge locations or badly timed transfers can make even a beautiful trip feel tiring."
/>

<HomeHowPlanned
  eyebrow="How your trip is planned"
  title="From First Note to Final Sundowner"
  subtitle="You do not need to arrive with a finished itinerary. Share the basics, and we'll shape the route, pace and logistics around you."
/>

{#if tourReviews.length}
  <HomeTravellerStories
    reviews={tourReviews}
    summary={tourReviewSummary}
    eyebrow="Traveller stories"
    title="Travellers Who Planned Tanzania With Us"
    subtitle="Real guests, real routes and the planning details that made their trips work."
  />
{/if}

{#if tourFaqs.length}
  <section class="bg-surface py-14 md:py-20">
    <div class="tour-shell grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
      <div>
        <div class="inline-flex items-center gap-2">
          <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
          <span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">Good to know</span>
        </div>
        <h2 class="font-serif mt-3 text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[40px]">
          Questions About These Safaris
        </h2>
        <p class="mt-4 max-w-md text-base leading-relaxed text-ink/70">
          Honest answers to what travellers ask most before choosing a route.
        </p>
      </div>
      <FAQAccordion faqs={tourFaqs} />
    </div>
  </section>
{/if}

<HomePlanningBand
  eyebrow="Start planning"
  title="Request Your Tanzania Safari Plan"
  subtitle="Tell us your dates, group and the experiences you are considering. A local specialist will shape the route, timing and logistics around you."
>
  <LeadCaptureForm compact title="Start your trip plan" />
</HomePlanningBand>

<style>
  .hero-meta {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.625rem;
    border-left: 2px solid rgb(var(--c-goldfinch-gold) / 0.72);
    background: rgb(var(--c-deep-green) / 0.48);
    padding: 0.625rem 0.75rem;
    backdrop-filter: blur(8px);
  }

  .hero-meta div { display: grid; min-width: 0; }
  .hero-meta span { color: white; font-size: 0.875rem; font-weight: 800; line-height: 1.15; }
  .hero-meta small { margin-top: 0.125rem; color: rgb(255 255 255 / 0.64); font-size: 0.625rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }

  @media (max-width: 639px) {
    .hero-meta {
      min-height: 4.5rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
      border-left: 0;
      border-top: 2px solid rgb(var(--c-goldfinch-gold) / 0.72);
      padding: 0.625rem;
    }
    .hero-meta span { font-size: 0.75rem; overflow-wrap: anywhere; }
    .hero-meta small { font-size: 0.54rem; }
  }

  .hero-slide { animation: hero-slide-enter 900ms ease-out both; }

  @keyframes hero-slide-enter {
    from { opacity: 0.25; transform: scale(1.025); }
    to { opacity: 1; transform: scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-slide { animation: none; }
  }

  :global(body) {
    overflow-x: hidden;
  }

  .results-filter-slot { margin-bottom: 1rem; }

  @media (max-width: 767px) {
    :global(body.tour-filter-open) .results-panel {
      position: static;
      z-index: auto;
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
  }

  @media (max-width: 767px) {
    .results-panel { position: sticky; }
    .results-filter-slot {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      margin: 0;
    }
    .results-summary > :first-child {
      width: 100%;
      padding-right: 5rem;
    }
  }

  .tour-shell {
    width: min(1320px, calc(100% - 32px));
    margin-inline: auto;
  }
  @media (min-width: 768px) {
    .tour-shell {
      width: min(1320px, calc(100% - 48px));
    }
  }
  :global(.chip) {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    max-width: 100%;
    border-radius: 999px;
    border: 1px solid rgba(31, 77, 58, 0.2);
    background: rgba(31, 77, 58, 0.06);
    padding: 0.35rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 700;
    color: rgb(var(--c-ink));
    transition: background 0.15s, border-color 0.15s;
  }
  :global(.chip:hover) {
    border-color: rgba(31, 77, 58, 0.34);
    background: rgba(31, 77, 58, 0.12);
  }
  :global(.metric) {
    min-width: 0;
    border-radius: 8px;
    border: 1px solid rgba(57, 61, 50, 0.1);
    background: rgb(var(--c-surface));
    padding: 1rem;
    box-shadow: 0 14px 40px rgba(57, 61, 50, 0.08);
  }
  :global(.metric p) {
    font-size: 0.75rem;
    font-weight: 700;
    color: rgb(var(--c-ink) / 0.55);
  }
  :global(.metric strong) {
    display: block;
    margin-top: 0.25rem;
    font-size: 1.25rem;
    color: rgb(var(--c-heading));
  }
  :global(.category-pill) {
    display: inline-flex;
    min-height: 2.5rem;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
    border-radius: 999px;
    border: 1px solid rgba(57, 61, 50, 0.14);
    background: rgb(var(--c-surface));
    padding: 0.45rem 0.85rem;
    font-size: 0.875rem;
    font-weight: 750;
    color: rgb(var(--c-ink) / 0.78);
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  :global(.category-pill span) {
    display: grid;
    min-width: 1.35rem;
    height: 1.35rem;
    place-items: center;
    border-radius: 999px;
    background: rgb(var(--c-sand) / 0.8);
    font-size: 0.75rem;
  }
  :global(.category-pill:hover),
  :global(.category-pill-active) {
    border-color: rgba(228, 169, 46, 0.65);
    background: rgb(var(--c-goldfinch-gold) / 0.14);
    color: rgb(var(--c-heading));
  }
  :global(.filter-section) {
    border-bottom: 1px solid rgba(57, 61, 50, 0.1);
    padding: 1rem;
  }
  /* Filters sit ABOVE the grid on desktop and flow in columns, so the stacked
     dividers of the old sidebar would read as stray lines. */
  @media (min-width: 1024px) {
    :global(.filter-section) {
      border-bottom: 0;
    }
  }
  :global(.filter-heading) {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }
  :global(.filter-heading span) {
    display: grid;
    height: 1.5rem;
    width: 1.5rem;
    place-items: center;
    border-radius: 999px;
    background: rgb(var(--c-deep-green));
    color: white;
    font-size: 0.75rem;
    font-weight: 800;
  }
  :global(.filter-heading p) {
    font-size: 0.875rem;
    font-weight: 800;
    color: rgb(var(--c-ink));
  }
  :global(.quick-btn) {
    display: inline-flex;
    min-height: 2.55rem;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    border-radius: 8px;
    border: 1px solid rgba(57, 61, 50, 0.12);
    background: rgba(241, 227, 200, 0.35);
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 800;
    color: rgb(var(--c-ink));
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  :global(.quick-btn:hover),
  :global(.quick-btn-active) {
    border-color: rgba(45, 48, 39, 0.35);
    background: rgba(45, 48, 39, 0.08);
    color: rgb(var(--c-heading));
  }
  :global(.filter-option) {
    display: flex;
    min-height: 2.75rem;
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border-radius: 8px;
    border: 1px solid rgba(57, 61, 50, 0.1);
    background: transparent;
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: rgb(var(--c-ink) / 0.78);
    transition: border-color 0.15s, background 0.15s;
  }
  :global(.filter-option:hover),
  :global(.filter-option-active) {
    border-color: rgba(45, 48, 39, 0.26);
    background: rgba(45, 48, 39, 0.06);
  }
  .filter-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }
  .filter-scroll::-webkit-scrollbar {
    display: none;
  }
</style>
