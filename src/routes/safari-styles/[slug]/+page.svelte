<script lang="ts">
  import {
    ArrowRight,
    CalendarRange,
    Check,
    Compass,
    MapPinned,
    Route,
    ShieldCheck,
    Wallet,
    X
  } from '@lucide/svelte';
  import { onDestroy, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { page } from '$app/stores';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import HomeTravellerStories from '$lib/components/public/home/HomeTravellerStories.svelte';
  import Img from '$lib/components/public/Img.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import StylePlannerBand from '$lib/components/public/StylePlannerBand.svelte';
  import TravellerMomentsMarquee from '$lib/components/public/TravellerMomentsMarquee.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { currency, formatUsd } from '$lib/currency';
  import { imgUrl, srcsetFor, variantSrc, variantsOf } from '$lib/img';
  import { publicSettings, settingText } from '$lib/settings';
  import { defaultStyleLandingContent } from '$lib/safariStyleLanding';
  import { breadcrumbLd, faqLd } from '$lib/seo';
  import { getTourDestinations } from '$lib/tourDestinations';
  import { toMetaText, toPlainText } from '$lib/richText';
  import type { FAQ, Review, ReviewSummary, Tour, TourCategory } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  type HomeSection = {
    section_key?: string;
    title?: string | null;
    subtitle?: string | null;
    extra_data?: Record<string, unknown> | null;
  };
  type PlanningStep = { title: string; body: string };
  type AdvisorColumn = { title: string; items: string[] };

  const DAY_BUCKETS = [
    { key: '3-4', label: '3–4 Days', test: (days: number) => days >= 3 && days <= 4 },
    { key: '5-6', label: '5–6 Days', test: (days: number) => days >= 5 && days <= 6 },
    { key: '7-8', label: '7–8 Days', test: (days: number) => days >= 7 && days <= 8 },
    { key: '9-10', label: '9–10 Days', test: (days: number) => days >= 9 && days <= 10 },
    { key: '11+', label: '11+ Days', test: (days: number) => days >= 11 }
  ];
  const PRICE_BUCKETS = [
    { key: 'u1500', label: 'Under $1,500', test: (price: number) => price > 0 && price < 1500 },
    { key: '1500-3000', label: '$1,500–$3,000', test: (price: number) => price >= 1500 && price < 3000 },
    { key: '3000-5000', label: '$3,000–$5,000', test: (price: number) => price >= 3000 && price < 5000 },
    { key: '5000+', label: '$5,000+', test: (price: number) => price >= 5000 }
  ];
  const TIER_LABELS: Record<string, string> = {
    budget: 'Budget',
    mid_range: 'Mid-range',
    'mid-range': 'Mid-range',
    comfort: 'Comfort',
    luxury: 'Luxury',
    premium_luxury: 'Premium luxury'
  };
  const GUIDE_ICONS = [CalendarRange, MapPinned, Wallet, Route];

  $: category = data.category as TourCategory | null;
  $: tours = (data.tours ?? []) as Tour[];
  $: otherStyles = (data.otherStyles ?? []) as TourCategory[];
  $: faqs = (data.faqs ?? []) as FAQ[];
  $: reviews = (data.reviews ?? []) as Review[];
  $: galleryItems = (data.galleryItems ?? []) as Array<Record<string, unknown>>;
  $: reviewSummary = (data.reviewSummary ?? null) as ReviewSummary | null;
  $: homeSections = (data.homeSections ?? []) as HomeSection[];
  $: homeByKey = Object.fromEntries(homeSections.map((section) => [section.section_key, section]));

  $: origin = $page.url.origin;
  $: title = category?.meta_title?.trim() || (category ? `${category.name} | Goldfinch Adventures` : 'Safari Style');
  $: description = toMetaText(
    category?.meta_description || category?.short_description || category?.description || 'Explore this Goldfinch safari style.',
    170
  );
  $: standfirst = category?.short_description?.trim() || toMetaText(toPlainText(category?.description), 240);
  $: highlights = (category?.highlights ?? []).map((item) => toPlainText(item).trim()).filter(Boolean);
  $: landing = category?.landing_page_content ?? defaultStyleLandingContent(category ?? {});
  $: trustChips = landing.trustChips;
  $: heroVariants = variantsOf(category, 'image_url');
  $: heroPreloadType = heroVariants?.avif ? 'image/avif' : heroVariants ? 'image/webp' : undefined;
  $: heroPreloadSrcset = heroVariants ? srcsetFor(heroVariants, heroVariants.avif ? 'avif' : 'webp') : '';
  $: heroPreloadHref = variantSrc(heroVariants, 1800, heroVariants?.avif ? 'avif' : 'webp') || imgUrl(category?.image_url, 1600, 72);

  $: destinations = [...new Map(tours.flatMap((tour) => getTourDestinations(tour)).map((place) => [place.slug, place])).values()];
  $: destinationNames = destinations.map((place) => place.name);
  $: planningNotes = category?.planning_notes ?? {};
  $: bestMonths = (category?.best_months ?? []).map(Number).filter((month) => month >= 1 && month <= 12);
  $: prices = tours.map((tour) => Number(tour.price_from ?? 0)).filter((price) => price > 0);
  $: featuredTour = tours.find((tour) => tour.is_popular) || tours.find((tour) => tour.is_featured) || tours[0] || null;
  $: derivedPlanningBlocks = [
    {
      title: 'Best time to go',
      body: bestMonths.length
        ? `${bestMonths.map((month) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month - 1]).join(', ')} are highlighted in the CMS for this safari style. We refine the timing around wildlife, weather and availability.`
        : `The best season depends on the wildlife, pace and places you want. We match your dates to the strongest version of ${category?.name ?? 'this trip'}.`,
      links: [{ label: 'Read our Tanzania travel advice', href: '/expert-advice' }]
    },
    {
      title: 'Best safari parks',
      body: destinationNames.length
        ? `${destinationNames.slice(0, 6).join(', ')}${destinationNames.length > 6 ? ' and more' : ''} appear across the published trips for this safari style.`
        : 'We recommend the right parks after checking your dates, starting point and preferred pace.',
      links: destinations.length
        ? destinations.slice(0, 6).map((place) => ({ label: place.name, href: `/destinations/${place.slug}` }))
        : [{ label: 'Explore safari destinations', href: '/destinations' }]
    },
    {
      title: 'Travel costs',
      body: planningNotes.costs?.trim() || (prices.length
        ? `Published ideas currently start between ${formatUsd(Math.min(...prices), $currency)} and ${formatUsd(Math.max(...prices), $currency)} per person. Dates, group size and lodge standard shape the final quote.`
        : 'Pricing is tailored to your dates, group size, route and preferred comfort level.'),
      links: [{ label: 'Read our safari planning advice', href: '/expert-advice' }]
    },
    {
      title: 'Route planning',
      body: planningNotes.route?.trim() || (destinationNames.length
        ? `A strong starting route connects ${destinationNames.slice(0, 4).join(', ')}. We adjust the order, travel time and number of nights around your trip.`
        : 'Your route is built around your dates, starting point, available time and priorities.'),
      links: [{ label: `Request a ${(category?.name ?? 'safari').toLowerCase()} plan`, href: '#lead-form' }]
    }
  ];
  $: planningBlocks = category?.landing_page_content?.planningGuide?.blocks ?? derivedPlanningBlocks;

  $: planningSection = homeByKey.planning_process;
  $: planningExtra = (planningSection?.extra_data ?? {}) as Record<string, unknown>;
  $: cmsPlanningSteps = Array.isArray(planningExtra.steps) ? planningExtra.steps as Array<Record<string, unknown>> : [];
  $: planningSteps = (category?.landing_page_content?.howItsPlanned?.steps
    ? category.landing_page_content.howItsPlanned.steps.map((step) => ({ title: step.title, body: step.text }))
    : cmsPlanningSteps.length
      ? cmsPlanningSteps.map((step) => ({ title: String(step.title ?? ''), body: String(step.body ?? step.text ?? '') }))
      : landing.howItsPlanned.steps.map((step) => ({ title: step.title, body: step.text }))) as PlanningStep[];

  $: advisorSection = homeByKey.advisor_note;
  $: advisorExtra = (advisorSection?.extra_data ?? {}) as Record<string, unknown>;
  $: cmsAdvisorColumns = Array.isArray(advisorExtra.columns) ? advisorExtra.columns as Array<Record<string, unknown>> : [];
  $: advisorColumns = (category?.landing_page_content?.advisor
    ? [
        { title: 'The big choices', items: category.landing_page_content.advisor.big },
        { title: 'The quiet details', items: category.landing_page_content.advisor.quiet }
      ]
    : cmsAdvisorColumns.length >= 2
      ? cmsAdvisorColumns.map((column) => ({
          title: String(column.title ?? ''), items: Array.isArray(column.items) ? column.items.map(String) : []
        }))
      : [
          { title: 'The big choices', items: landing.advisor.big },
          { title: 'The quiet details', items: landing.advisor.quiet }
        ]) as AdvisorColumn[];

  let duration = 'all';
  let comfort = 'all';
  let price = 'all';
  let appliedDuration = 'all';
  let appliedComfort = 'all';
  let appliedPrice = 'all';
  let visibleCount = 6;
  let enquiryOpen = false;
  let enquiryDialog: HTMLDialogElement;

  $: filteredTours = tours.filter((tour) => {
    const days = Number(tour.duration_days ?? 0);
    const cost = Number(tour.price_from ?? 0);
    const durationMatch = appliedDuration === 'all' || DAY_BUCKETS.find((bucket) => bucket.key === appliedDuration)?.test(days);
    const comfortMatch = appliedComfort === 'all' || String(tour.budget_tier ?? '') === appliedComfort;
    const priceMatch = appliedPrice === 'all' || PRICE_BUCKETS.find((bucket) => bucket.key === appliedPrice)?.test(cost);
    return durationMatch && comfortMatch && priceMatch;
  });
  $: visibleTours = filteredTours.slice(0, visibleCount);
  $: comfortOptions = [...new Set(tours.map((tour) => String(tour.budget_tier ?? '')).filter(Boolean))];

  const applyFilters = () => {
    appliedDuration = duration;
    appliedComfort = comfort;
    appliedPrice = price;
    visibleCount = 6;
  };
  const resetFilters = () => {
    duration = comfort = price = appliedDuration = appliedComfort = appliedPrice = 'all';
    visibleCount = 6;
  };

  const lockPage = (locked: boolean) => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    document.body.style.overflow = locked ? 'hidden' : '';
  };
  const openEnquiry = async () => {
    enquiryOpen = true;
    lockPage(true);
    await tick();
    if (enquiryDialog && !enquiryDialog.open) enquiryDialog.showModal();
  };
  const closeEnquiry = () => {
    if (enquiryDialog?.open) enquiryDialog.close();
    enquiryOpen = false;
    lockPage(false);
  };
  onDestroy(() => lockPage(false));

  $: waDigits = (settingText($publicSettings, 'whatsapp_number') || settingText($publicSettings, 'contact_phone') || '255754600905').replace(/[^0-9]/g, '');
  $: whatsappHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hello Goldfinch Adventures, I would like help planning ${category?.name ?? 'my safari'}.`)}`;
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if category?.image_url}
    <link rel="preload" as="image" href={heroPreloadHref} imagesrcset={heroPreloadSrcset || undefined} imagesizes="100vw" type={heroPreloadType} fetchpriority="high" />
  {/if}
</svelte:head>

{#if category}
  <JsonLd data={breadcrumbLd(origin, [
    { name: 'Home', path: '/' },
    { name: 'Safari Styles', path: '/safari-styles' },
    { name: category.name, path: `/safari-styles/${category.slug}` }
  ])} />

  <!-- 2 · Hero -->
  <section data-hero class="relative isolate overflow-hidden bg-deep-green">
    {#if category.image_url}
      <Img record={category} fields={['image_url']} alt="" width={1920} sizes="100vw" eager className="absolute inset-0 h-full w-full object-cover" />
    {/if}
    <div class="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/60"></div>
    <div class="container-shell relative py-20 md:py-28 lg:py-32">
      <div class="max-w-2xl text-white">
        <span class="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white ring-1 ring-white/25 backdrop-blur">{landing.hero.eyebrow}</span>
        <h1 class="mt-5 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">{landing.hero.headline}</h1>
        <p class="mt-5 max-w-xl text-base leading-relaxed text-white/90 md:text-lg">{landing.hero.subheadline}</p>
        <div class="mt-7 flex flex-col gap-3 sm:flex-row">
          <a href="#lead-form" class="inline-flex items-center justify-center rounded-md bg-goldfinch-gold px-5 py-3 text-sm font-semibold text-heading transition hover:brightness-95">{landing.hero.primaryCtaLabel}</a>
          <a href="#trip-ideas" class="inline-flex items-center justify-center rounded-md border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">{landing.hero.secondaryCtaLabel}</a>
        </div>
        <p class="mt-5 text-sm text-white/80">{landing.hero.trustLine}</p>
      </div>
    </div>
  </section>

  <!-- 3 · Trust chips -->
  <section class="hidden bg-deep-green md:block">
    <div class="container-shell">
      <ul class="grid grid-cols-4 divide-x divide-white/10">
        {#each trustChips as chip}
          <li class="group flex items-center gap-3 px-4 py-4 transition-transform hover:-translate-y-0.5">
            <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-goldfinch-gold text-heading"><Check size={14} strokeWidth={3} /></span>
            <span class="min-w-0 text-[15px] font-semibold leading-tight text-white md:text-base">{chip}</span>
          </li>
        {/each}
      </ul>
    </div>
  </section>

  <!-- 4 · Overview -->
  <section class="bg-surface py-14 md:py-20">
    <div class="container-shell grid items-center gap-10 md:grid-cols-2 md:gap-14">
      <div>
        <div class="inline-flex items-center gap-2"><span class="h-px w-6 bg-clay"></span><span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">{landing.overview.label}</span></div>
        <h2 class="mt-3 font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[40px]">{landing.overview.headline}</h2>
        <div class="mt-5 space-y-4 text-[15px] leading-relaxed text-ink/85 md:text-base">{#each landing.overview.paragraphs as paragraph}<RichText value={paragraph} />{/each}</div>
      </div>
      <div class="relative overflow-hidden rounded-[12px] border border-ink/10 bg-surface">
        {#if landing.overview.imageUrl || category.image_url}
          <Img src={(landing.overview.imageUrl || category.image_url) ?? undefined} alt={category.name} width={1100} sizes="(max-width: 768px) 92vw, 50vw" className="h-[320px] w-full object-cover md:h-[440px]" />
        {/if}
      </div>
    </div>
  </section>

  <!-- 5 · Three-step mid-page CTA -->
  <StylePlannerBand
    eyebrow={landing.planner.label}
    title={landing.planner.headline}
    description={landing.planner.intro}
    startPoints={data.startPoints ?? []}
    interests={[{ name: category.name, slug: category.slug }, ...otherStyles.map((style) => ({ name: style.name, slug: style.slug }))]}
    categoryName={category.name}
    categorySlug={category.slug}
  />

  <!-- 6 · Tour collection / itinerary fallback -->
  <section id="trip-ideas" class="scroll-mt-24 bg-surface py-14 md:py-16">
    <div class="container-shell">
      <div class="max-w-[1180px]">
        <div class="inline-flex items-center gap-2"><span class="h-px w-6 bg-clay"></span><span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">{landing.tourCollection.label}</span></div>
        <h2 class="mt-3 font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[40px]">{landing.tourCollection.headline}</h2>
        <p class="mt-3 max-w-[720px] text-[15px] leading-relaxed text-ink/65">{landing.tourCollection.subheadline}</p>
      </div>

      {#if tours.length}
        <div class="mt-8 rounded-[12px] border border-ink/10 bg-surface p-4 shadow-[0_8px_24px_rgba(57,61,50,0.04)] md:p-5">
          <div class="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
            <span class="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/65 md:pb-3">Filter by:</span>
            <div class="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
              <label class="flex flex-col gap-1"><span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/65">Number of Days</span><select bind:value={duration} class="h-11 w-full rounded-md border border-ink/20 bg-surface px-3 text-[13px] text-heading outline-none focus:border-clay"><option value="all">All durations</option>{#each DAY_BUCKETS as option}<option value={option.key}>{option.label}</option>{/each}</select></label>
              <label class="flex flex-col gap-1"><span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/65">Comfort Level</span><select bind:value={comfort} class="h-11 w-full rounded-md border border-ink/20 bg-surface px-3 text-[13px] text-heading outline-none focus:border-clay"><option value="all">All comfort levels</option>{#each comfortOptions as option}<option value={option}>{TIER_LABELS[option] ?? option}</option>{/each}</select></label>
              <label class="flex flex-col gap-1"><span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/65">Price</span><select bind:value={price} class="h-11 w-full rounded-md border border-ink/20 bg-surface px-3 text-[13px] text-heading outline-none focus:border-clay"><option value="all">All prices</option>{#each PRICE_BUCKETS as option}<option value={option.key}>{option.label}</option>{/each}</select></label>
            </div>
            <div class="flex gap-2">
              <button type="button" on:click={applyFilters} class="inline-flex h-11 items-center justify-center rounded-md bg-deep-green px-5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-forest">Filter</button>
              <button type="button" on:click={resetFilters} class="inline-flex h-11 items-center justify-center rounded-md border border-ink/20 bg-surface px-5 text-xs font-semibold uppercase tracking-[0.14em] text-heading hover:bg-canvas">Reset</button>
            </div>
          </div>
        </div>

        {#if filteredTours.length}
          <div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {#each visibleTours as tour (tour.slug)}
              <TourCard {tour} />
            {/each}
          </div>
          <div class="mt-10 flex flex-col items-center gap-4 text-center">
            <p class="text-[13px] text-ink/65">Showing {visibleTours.length} of {filteredTours.length} {landing.tourCollection.resultsNoun}</p>
            {#if visibleCount < filteredTours.length}<button type="button" on:click={() => (visibleCount += 6)} class="inline-flex h-12 items-center justify-center rounded-md bg-deep-green px-7 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-forest">{landing.tourCollection.loadMoreLabel}</button>{/if}
            <a href="#lead-form" class="text-[13px] font-semibold text-clay hover:text-goldfinch-gold">Not sure which one fits? Request a custom recommendation →</a>
          </div>
        {:else}
          <div class="mt-8 rounded-[12px] border border-ink/10 bg-canvas p-8 text-center text-sm text-heading">No safari options match these filters. <button type="button" on:click={resetFilters} class="font-semibold text-clay underline underline-offset-4">Reset the filters</button>.</div>
        {/if}
      {:else}
        <article class="mt-8 grid overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-sm md:grid-cols-2">
          <div class="relative min-h-[260px] bg-sand">{#if category.image_url}<Img record={category} fields={['image_url']} alt={category.name} width={1000} sizes="(max-width: 768px) 100vw, 50vw" className="absolute inset-0 h-full w-full object-cover" />{/if}<span class="absolute left-4 top-4 rounded-md bg-clay px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">Custom Safari</span></div>
          <div class="flex flex-col justify-center p-6 md:p-9"><h3 class="font-serif text-2xl font-semibold text-heading">Custom {category.name}</h3><p class="mt-3 text-[15px] leading-7 text-ink/75">A route designed around your dates, starting point, budget and preferred pace.</p><p class="mt-5 font-semibold text-heading">Tailored quote</p><a href="#lead-form" class="mt-5 inline-flex w-fit items-center gap-2 rounded-md bg-goldfinch-gold px-4 py-2.5 text-sm font-semibold text-heading">Request a Plan <ArrowRight size={15} /></a></div>
        </article>
      {/if}
    </div>
  </section>

  <!-- 7 · Planning guide -->
  <section class="bg-surface py-14 md:py-20">
    <div class="container-shell">
      <div class="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div class="lg:col-span-7">
          <div class="inline-flex items-center gap-2"><span class="h-px w-6 bg-clay"></span><span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">{landing.planningGuide.label}</span></div>
          <h2 class="mt-3 font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[40px]">{landing.planningGuide.title}</h2>
          <p class="mt-5 max-w-[640px] text-[15px] leading-relaxed text-ink/85 md:text-base">{landing.planningGuide.intro}</p>
        </div>
        <aside class="lg:col-span-5">
          <div class="rounded-[12px] border border-ink/10 bg-canvas p-5 md:p-6">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/65">In this guide</div>
            <ul class="mt-4 divide-y divide-ink/10">{#each planningBlocks as block, index}<li><a href={`#planning-${index + 1}`} class="group flex items-center gap-3 py-3"><span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink/10 bg-surface text-clay"><svelte:component this={GUIDE_ICONS[index]} size={16} /></span><span class="text-[15px] font-medium text-heading group-hover:text-clay">{block.title}</span></a></li>{/each}</ul>
          </div>
        </aside>
      </div>
      <div class="mt-14 grid gap-x-14 gap-y-12 lg:grid-cols-2">
        {#each planningBlocks as block, index}
          <article id={`planning-${index + 1}`} class="scroll-mt-24 border-t border-ink/10 pt-8">
            <div class="flex items-center gap-4"><span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink/10 bg-surface text-clay"><svelte:component this={GUIDE_ICONS[index]} size={20} /></span><h3 class="font-sans text-xl font-semibold leading-snug text-heading md:text-2xl">{block.title}</h3></div>
            <RichText value={block.body} className="mt-3 max-w-[900px] text-[15px] leading-relaxed text-ink/85 md:text-base" />
            {#if 'links' in block && Array.isArray(block.links) && block.links.length}
              <p class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-clay"><span aria-hidden="true">➔</span>{#each block.links as link, linkIndex}<span class="inline-flex items-center gap-2"><a href={link.href || '#lead-form'} class="underline decoration-transparent underline-offset-4 hover:text-goldfinch-gold hover:decoration-goldfinch-gold">{link.label}</a>{#if linkIndex < block.links.length - 1}<span class="text-ink/55">|</span>{/if}</span>{/each}</p>
            {/if}
          </article>
        {/each}
      </div>
    </div>
  </section>

  <!-- 8 · Advisor -->
  <section class="bg-surface py-14 md:py-20">
    <div class="container-shell">
      <div class="relative overflow-hidden rounded-xl border border-ink/10 bg-canvas p-6 md:p-12 lg:p-16">
        <Compass class="pointer-events-none absolute right-8 top-8 h-32 w-32 text-clay opacity-[0.08] md:h-48 md:w-48" strokeWidth={0.8} />
        <div class="relative max-w-[820px]">
          <div class="flex items-center gap-3"><span class="h-8 w-[3px] rounded-full bg-goldfinch-gold"></span><span class="text-xs font-semibold uppercase tracking-[0.18em] text-ink/65">Advisor's Note</span></div>
          <h2 class="mt-5 font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[42px]">{category.landing_page_content?.advisor.headline || advisorSection?.title || landing.advisor.headline}</h2>
          <p class="mt-4 text-base leading-relaxed text-ink/65 md:text-lg">{category.landing_page_content?.advisor.intro || advisorSection?.subtitle || landing.advisor.intro}</p>
        </div>
        <div class="relative mt-10 grid gap-10 md:mt-14 md:grid-cols-2 md:gap-14">
          {#each advisorColumns as column}
            <div><h3 class="font-serif text-xl font-semibold text-heading md:text-2xl">{column.title}</h3><div class="mt-3 h-px w-10 bg-goldfinch-gold"></div><ul class="mt-5 space-y-3.5">{#each column.items as item}<li class="flex items-start gap-3.5 text-[15px] leading-relaxed text-heading"><span class="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold"></span><span>{item}</span></li>{/each}</ul></div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- 9 · How it is planned -->
  <section class="bg-surface py-14 md:py-20">
    <div class="container-shell">
      <div class="max-w-[1180px]"><div class="inline-flex items-center gap-2"><span class="h-px w-6 bg-clay"></span><span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">{category.landing_page_content?.howItsPlanned.label || String(planningExtra.eyebrow || landing.howItsPlanned.label)}</span></div><h2 class="mt-3 font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[44px]">{category.landing_page_content?.howItsPlanned.title || planningSection?.title || landing.howItsPlanned.title}</h2><p class="mt-4 max-w-[820px] text-base leading-relaxed text-ink/65">{category.landing_page_content?.howItsPlanned.intro || planningSection?.subtitle || landing.howItsPlanned.intro}</p></div>
      <div class="mt-10 grid gap-8 md:grid-cols-4 md:gap-6">{#each planningSteps as step, index}<article class="border-t border-ink/10 pt-5"><div class="font-serif text-4xl text-clay">{String(index + 1).padStart(2, '0')}</div><h3 class="mt-3 text-lg font-semibold text-heading">{step.title}</h3><p class="mt-2 text-sm leading-relaxed text-ink/65">{step.body}</p></article>{/each}</div>
    </div>
  </section>

  <!-- 10 · Homepage review slider -->
  <HomeTravellerStories
    eyebrow={landing.reviews.label}
    title={landing.reviews.title}
    subtitle={landing.reviews.intro}
    {reviews}
    summary={reviewSummary}
  />

  <TravellerMomentsMarquee images={galleryItems} />

  <!-- 11 · FAQ -->
  {#if faqs.length}
    <JsonLd data={faqLd(faqs.map((faq) => ({ q: faq.question, a: faq.answer })))} />
    <section class="border-t border-ink/10 bg-surface py-16 md:py-24">
      <div class="mx-auto max-w-[1040px] px-4 md:px-6">
        <div class="inline-flex items-center gap-2"><span class="h-px w-6 bg-clay"></span><span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">FAQ</span></div>
        <h2 class="mt-3 font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[44px]">{landing.faq.title}</h2>
        <div class="mt-5 flex items-center gap-3"><span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-clay font-serif text-[15px] font-semibold text-white ring-1 ring-ink/20">G</span><div class="text-[13px] leading-tight"><div class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/65">Answered by</div><div class="mt-0.5 font-semibold text-heading">{landing.faq.answeredBy}</div></div></div>
        <div class="mt-12 md:mt-14"><FAQAccordion {faqs} /></div>
      </div>
    </section>
  {/if}

  <!-- 12 · Final CTA -->
  <section id="lead-form" class="scroll-mt-20 bg-deep-green py-14 text-white md:py-20">
    <div class="mx-auto max-w-4xl px-4 text-center md:px-6">
      <div class="inline-flex items-center gap-2"><span class="h-px w-6 bg-goldfinch-gold"></span><span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{landing.finalCta.label}</span></div>
      <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">{landing.finalCta.headline}</h2>
      <p class="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/70">{landing.finalCta.subheadline}</p>
      <ul class="mx-auto mt-7 grid max-w-2xl gap-3 sm:grid-cols-2">{#each landing.finalCta.proofs as proof}<li class="flex items-start gap-3 text-left text-sm text-white/90"><span class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-goldfinch-gold text-heading"><Check size={12} /></span>{proof}</li>{/each}</ul>
      <div class="mt-8 flex flex-col items-center gap-4"><button type="button" on:click={openEnquiry} class="inline-flex items-center justify-center rounded-md bg-goldfinch-gold px-6 py-3 text-sm font-semibold text-heading hover:brightness-95">{landing.finalCta.buttonLabel}</button><a href={whatsappHref} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-sm text-white/70 underline decoration-white/25 underline-offset-4 hover:text-white"><ShieldCheck size={14} />{landing.finalCta.whatsappLabel}</a></div>
    </div>
  </section>

  {#if enquiryOpen}
    <dialog bind:this={enquiryDialog} class="enquiry-dialog" aria-label={`Plan ${category.name}`} transition:fade={{ duration: 140 }} on:cancel|preventDefault={closeEnquiry} on:click|self={closeEnquiry}>
      <div class="relative my-5 w-[min(94vw,576px)] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
        <button type="button" aria-label="Close enquiry form" on:click={closeEnquiry} class="absolute right-2 top-2 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-deep-green text-white shadow-lg transition hover:bg-forest sm:-right-3 sm:-top-3"><X size={18} /></button>
        <BookingForm source="category_enquiry" leadContext={{ safari_style: category.name, safari_style_slug: category.slug }} />
      </div>
    </dialog>
  {/if}
{:else}
  <section class="container-shell py-20 text-center"><h1 class="text-2xl font-bold text-heading">Safari style not found</h1><a class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest" href="/safari-styles">All safari styles <ArrowRight size={16} /></a></section>
{/if}

<style>
  .enquiry-dialog {
    inset: 0;
    z-index: 200;
    margin: 0;
    height: 100dvh;
    width: 100%;
    max-height: none;
    max-width: none;
    overflow-y: auto;
    border: 0;
    background: transparent;
    padding: 1rem;
  }
  .enquiry-dialog[open] {
    display: grid;
    place-items: center;
  }
  .enquiry-dialog::backdrop {
    background: rgba(12, 14, 11, 0.82);
    backdrop-filter: blur(7px);
  }
</style>
