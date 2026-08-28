<script lang="ts">
  import { fade } from 'svelte/transition';
  import { ArrowRight, Route, Wallet, CalendarRange, Check, Clock, Compass, Gauge, MapPinned, MessageCircle, Sparkles, Users } from '@lucide/svelte';
  import { page } from '$app/stores';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import HomeTravellerStories from '$lib/components/public/home/HomeTravellerStories.svelte';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import StylePlannerBand from '$lib/components/public/StylePlannerBand.svelte';
  import { configFor } from '$lib/enquiry/configs';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import { brand } from '$lib/brand';
  import { trackEvent } from '$lib/analytics';
  import { publicSettings, settingText } from '$lib/settings';
  import { getTourDestinations } from '$lib/tourDestinations';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal } from '$lib/animations';
  import { imgUrl, srcsetFor, variantSrc, variantsOf } from '$lib/img';
  import { toMetaText, toPlainText } from '$lib/richText';
  import { breadcrumbLd, faqLd } from '$lib/seo';
  import Img from '$lib/components/public/Img.svelte';
  import type { FAQ, Review, ReviewSummary, Tour, TourCategory } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: category = data.category as TourCategory | null;
  $: tours = (data.tours ?? []) as Tour[];
  $: otherStyles = (data.otherStyles ?? []) as TourCategory[];
  $: faqs = (data.faqs ?? []) as FAQ[];
  $: reviews = (data.reviews ?? []) as Review[];
  $: reviewSummary = (data.reviewSummary ?? null) as ReviewSummary | null;
  $: homeSections = (data.homeSections ?? []) as Array<Record<string, any>>;

  // The CTAs open the four-step booking form — the same one the tour pages use,
  // including its WhatsApp consent card. configFor still supplies the heading
  // and copy for the band below, which is all it is used for now.
  let enquiryOpen = false;
  $: enquiryContext = {
    category: category ? { id: String(category.id), name: category.name, slug: category.slug } : undefined
  };
  $: enquiryConfig = configFor('category_enquiry', enquiryContext);

  $: origin = $page.url.origin;
  // An explicit meta_title is used verbatim — admins write the brand suffix
  // into it, and appending it again doubled "| Goldfinch Adventures".
  $: title = category?.meta_title?.trim() || (category ? `${category.name} Safari Style | Goldfinch Adventures` : 'Safari Style | Goldfinch Adventures');
  $: description = toMetaText(category?.meta_description || category?.description || 'Explore this Goldfinch safari style and matching tours.', 170);
  $: heroVariants = variantsOf(category, 'image_url');
  $: heroPreloadType = heroVariants?.avif ? 'image/avif' : heroVariants ? 'image/webp' : undefined;
  $: heroPreloadSrcset = heroVariants ? srcsetFor(heroVariants, heroVariants.avif ? 'avif' : 'webp') : '';
  $: heroPreloadHref =
    variantSrc(heroVariants, 1800, heroVariants?.avif ? 'avif' : 'webp') || imgUrl(category?.image_url, 1600, 72);

  // Almost no style carries a short_description, so the hero standfirst falls
  // back to the opening paragraph of the description rather than leaving the
  // headline stranded — never to invented copy.
  $: standfirst =
    category?.short_description?.trim() || toMetaText(toPlainText(category?.description).split('\n\n')[0] ?? '', 210);

  const FITNESS_LABELS: Record<string, string> = {
    easy: 'Easy',
    moderate: 'Moderate',
    active: 'Active',
    challenging: 'Challenging',
    strenuous: 'Strenuous'
  };
  // Structured level first; the legacy free text keeps working until each
  // category is re-saved with the new form.
  $: fitnessText = (category?.fitness_level && FITNESS_LABELS[category.fitness_level]) || category?.fitness || '';

  // Highlights are authored in the rich-text editor, so they are flattened for
  // the hero pills (a pill cannot hold a paragraph) but kept as markup in the
  // list further down.
  $: highlights = (category?.highlights ?? []).filter((item) => toPlainText(item).trim());
  $: heroPills = highlights.map((item) => toPlainText(item).replace(/\s+/g, ' ').trim()).slice(0, 4);

  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /**
   * Selected months collapse into seasons the way a travel guide writes them:
   * Jun, Jul, Aug, Sep reads "Jun – Sep", and a run crossing the year end
   * merges, so Nov, Dec, Jan is one season rather than three loose months.
   */
  $: bestMonthsLabel = (() => {
    const months = [...new Set((category?.best_months ?? []).map(Number).filter((month) => month >= 1 && month <= 12))].sort(
      (a, b) => a - b
    );
    if (!months.length) return '';
    if (months.length === 12) return 'All year round';

    const runs: Array<[number, number]> = [];
    for (const month of months) {
      const last = runs[runs.length - 1];
      if (last && month === last[1] + 1) last[1] = month;
      else runs.push([month, month]);
    }
    if (runs.length > 1 && runs[0][0] === 1 && runs[runs.length - 1][1] === 12) {
      const wrap = runs.pop() as [number, number];
      runs[0][0] = wrap[0];
    }
    return runs
      .map(([from, to]) => (from === to ? MONTH_SHORT[from - 1] : `${MONTH_SHORT[from - 1]} – ${MONTH_SHORT[to - 1]}`))
      .join(' · ');
  })();

  const dayCount = (value: number) => `${value} day${value === 1 ? '' : 's'}`;
  $: tripLengthLabel = (() => {
    const min = Number(category?.min_days ?? 0);
    const max = Number(category?.max_days ?? 0);
    if (min > 0 && max > 0) return min === max ? dayCount(min) : `${min}–${max} days`;
    if (min > 0) return `From ${dayCount(min)}`;
    if (max > 0) return `Up to ${dayCount(max)}`;
    return '';
  })();

  // Nothing on a category records which parks it visits, so the list is read
  // off the published tours themselves — it can only ever name places this
  // style genuinely goes.
  $: styleDestinations = [
    ...new Map(tours.flatMap((tour) => getTourDestinations(tour)).map((destination) => [destination.slug, destination.name])).values()
  ];
  $: destinationsLabel = styleDestinations.length
    ? styleDestinations.slice(0, 6).join(' · ') +
      (styleDestinations.length > 6 ? ` +${styleDestinations.length - 6} more` : '')
    : '';

  // Each fact drops out on its own; only one style of fourteen has any of the
  // first three, so the whole row has to survive being empty.
  // Authored per style in the Categories admin. Absent keys drop out below, so a
  // style nobody has written notes for shows the facts it does have rather than
  // an empty heading.
  // Authored as one block with a line per audience, so it reads as a list and
  // is rendered as one. A single-line value still works: one bullet.
  $: whoItsForItems = String(category?.who_its_for ?? '')
    .split(/\r?\n|·|;/)
    .map((line) => line.replace(/^[-•*\s]+/, '').trim())
    .filter(Boolean);

  $: planningNotes = ((category as Record<string, any> | null)?.planning_notes ?? {}) as { costs?: string | null; route?: string | null };

  /**
   * Two different kinds of answer, so two different treatments.
   *
   * Best months and fitness are two words; costs and route are paragraphs.
   * Putting them in one row of equal cards stretched the short ones to the
   * height of the long ones and left most of the section empty.
   */
  $: quickFacts = [
    { icon: CalendarRange, label: 'Best months', value: bestMonthsLabel },
    { icon: Clock, label: 'Trip length', value: tripLengthLabel },
    { icon: Gauge, label: 'Fitness', value: fitnessText }
  ].filter((fact) => fact.value);

  // Parks sits with the prose, not the facts: it is a list of six names, and in
  // a strip beside "Easy" it set the height of the whole row.
  $: planningNotesBlocks = [
    // A list of names reads as a list, not as one sentence held together by
    // interpuncts — which is what six parks looked like in a card.
    { icon: MapPinned, label: 'Parks and destinations', accent: 'forest' as const, kind: 'list' as const, items: styleDestinations, value: destinationsLabel },
    { icon: Wallet, label: 'Travel costs', accent: 'clay' as const, kind: 'rich' as const, items: [], value: (planningNotes.costs ?? '').trim() },
    { icon: Route, label: 'Route planning', accent: 'gold' as const, kind: 'rich' as const, items: [], value: (planningNotes.route ?? '').trim() }
  ].filter((block) => block.value);

  $: planningFacts = [...quickFacts, ...planningNotesBlocks];

  /**
   * The four steps, from the homepage CMS rather than this category.
   *
   * The process is the same whichever style you are reading, so it is authored
   * once as a homepage section — retyping it per style would only let fourteen
   * copies drift apart.
   */
  $: processSection = homeSections.find((section) => section.section_key === 'planning_process');
  $: processSteps = Array.isArray(processSection?.extra_data?.steps)
    ? (processSection.extra_data.steps as Array<Record<string, unknown>>)
        .map((step) => ({ title: String(step?.title ?? '').trim(), body: String(step?.body ?? '').trim() }))
        .filter((step) => step.title)
    : [];

  /**
   * Tour filters: number of days, comfort level, price. Every option is built
   * from the tours actually loaded, so a bucket with nothing behind it never
   * appears. Selections stage in the selects and commit on "Filter", mirroring
   * an explicit apply/reset flow.
   */
  const DAY_BUCKETS = [
    { key: '1-3', label: '1–3 days', test: (d: number) => d >= 1 && d <= 3 },
    { key: '4-6', label: '4–6 days', test: (d: number) => d >= 4 && d <= 6 },
    { key: '7-9', label: '7–9 days', test: (d: number) => d >= 7 && d <= 9 },
    { key: '10+', label: '10+ days', test: (d: number) => d >= 10 }
  ];
  // price_from is the site's USD base price; the buckets follow it.
  const PRICE_BUCKETS = [
    { key: 'lt1500', label: 'Under $1,500', test: (p: number) => p < 1500 },
    { key: '1500-3000', label: '$1,500 – $3,000', test: (p: number) => p >= 1500 && p < 3000 },
    { key: '3000-5000', label: '$3,000 – $5,000', test: (p: number) => p >= 3000 && p < 5000 },
    { key: '5000+', label: '$5,000+', test: (p: number) => p >= 5000 }
  ];
  const TIER_LABELS: Record<string, string> = {
    budget: 'Budget',
    mid_range: 'Mid-range',
    'mid-range': 'Mid-range',
    comfort: 'Comfort',
    luxury: 'Luxury',
    premium_luxury: 'Premium luxury'
  };

  $: dayOptions = DAY_BUCKETS.filter((bucket) => tours.some((tour) => tour.duration_days && bucket.test(tour.duration_days)));
  $: tierOptions = [...new Set(tours.map((tour) => String(tour.budget_tier ?? '')).filter(Boolean))];
  $: priceOptions = PRICE_BUCKETS.filter((bucket) => tours.some((tour) => tour.price_from && bucket.test(tour.price_from)));
  // One select with one real option filters nothing — only facets with a
  // genuine choice earn a control.
  $: filterFacets = [dayOptions.length > 1, tierOptions.length > 1, priceOptions.length > 1];
  $: showFilters = tours.length > 1 && filterFacets.some(Boolean);

  let pendingDays = 'all';
  let pendingTier = 'all';
  let pendingPrice = 'all';
  let activeDays = 'all';
  let activeTier = 'all';
  let activePrice = 'all';
  const applyFilters = () => {
    activeDays = pendingDays;
    activeTier = pendingTier;
    activePrice = pendingPrice;
  };
  const resetFilters = () => {
    pendingDays = pendingTier = pendingPrice = 'all';
    applyFilters();
  };

  $: filteredTours = tours.filter((tour) => {
    const daysOk = activeDays === 'all' || (tour.duration_days != null && DAY_BUCKETS.find((b) => b.key === activeDays)?.test(tour.duration_days));
    const tierOk = activeTier === 'all' || String(tour.budget_tier ?? '') === activeTier;
    const priceOk = activePrice === 'all' || (tour.price_from != null && PRICE_BUCKETS.find((b) => b.key === activePrice)?.test(tour.price_from));
    return daysOk && tierOk && priceOk;
  });
  $: filtersActive = activeDays !== 'all' || activeTier !== 'all' || activePrice !== 'all';

  $: waDigits = (settingText($publicSettings, 'whatsapp_number') || settingText($publicSettings, 'contact_phone')).replace(/[^0-9]/g, '');
  $: waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hello ${brand.name}, I would like help choosing a ${category?.name ?? 'safari'} trip for my dates.`)}`
    : '';
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if category?.image_url}
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

{#if category}
  <JsonLd
    data={breadcrumbLd(origin, [
      { name: 'Home', path: '/' },
      { name: 'Safari Styles', path: '/safari-styles' },
      { name: category.name, path: `/safari-styles/${category.slug}` }
    ])}
  />

  <!-- 1. Hero ------------------------------------------------------------- -->
  <section class="relative grid min-h-[calc(100svh-var(--header-h,72px))] items-end overflow-hidden bg-deep-green text-white">
    {#if category.image_url}
      <Img
        record={category}
        fields={['image_url']}
        alt=""
        width={1800}
        sizes="100vw"
        eager
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/55 to-deep-green/20"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-deep-green/75 via-deep-green/25 to-transparent"></div>
    {:else}
      <div class="absolute inset-0 bg-deep-green"></div>
      <div class="pointer-events-none absolute inset-0 opacity-[0.08]" style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.6px); background-size: 28px 28px;"></div>
    {/if}

    <div class="container-shell relative py-14 md:py-20">
      <nav class="mb-7 flex items-center gap-2 text-sm font-medium text-white/70">
        <a class="transition hover:text-white" href="/">Home</a>
        <span class="text-white/35">/</span>
        <a class="transition hover:text-white" href="/safari-styles">Safari Styles</a>
        <span class="text-white/35">/</span>
        <span class="text-white">{category.name}</span>
      </nav>

      <p class="inline-flex items-center gap-2 rounded-[8px] border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold backdrop-blur">
        <Compass size={13} />
        Safari Style
      </p>
      <h1 class="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-[1.05] tracking-normal md:text-[54px]" use:revealHeading>
        {category.name}
      </h1>
      {#if standfirst}
        <p class="mt-5 max-w-2xl text-base font-medium leading-8 text-white/84 md:text-lg">{standfirst}</p>
      {/if}

      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 text-sm font-bold text-heading shadow-lg shadow-black/10 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          type="button"
          on:click={() => (enquiryOpen = true)}
        >
          <Sparkles size={17} />
          Plan this trip
        </button>
        <a class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/35 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20" href="#trip-ideas">
          See trip ideas <ArrowRight size={17} />
        </a>
      </div>
    </div>

    <!-- Pills sit on the hero's own footing so they read as part of it; they
         are the style's highlights verbatim, so no highlights means no rail. -->
    {#if heroPills.length}
      <div class="relative bg-black/25 backdrop-blur">
        <!--
          No chrome on the items themselves. A pill inside a band is two
          containers doing one job, and the outlines were competing with the
          photograph directly above them — the tick already marks each one.
        -->
        <div class="container-shell flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
          {#each heroPills as pill}
            <span class="inline-flex items-center gap-2 text-[13px] font-semibold leading-5 text-white/85">
              <Check size={14} strokeWidth={3} class="shrink-0 text-goldfinch-gold" />
              {pill}
            </span>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <!-- 2. Intro ------------------------------------------------------------ -->
  {#if toPlainText(category.description).trim()}
    <section class="bg-canvas py-14 md:py-20">
      <div class="container-shell grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
        <div use:fadeUpOnScroll={{ y: 14 }}>
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">The style</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight text-heading md:text-[38px]">About {category.name}</h2>
          <RichText value={category.description} className="mt-5 text-[15px] leading-relaxed text-ink/70 md:text-[16px]" />
        </div>

        {#if category.image_url}
          <div class="overflow-hidden rounded-[14px] border border-ink/10 shadow-[0_16px_44px_rgba(57,61,50,0.10)]" use:fadeUpOnScroll={{ y: 18 }}>
            <Img
              record={category}
              fields={['image_url']}
              alt={category.name}
              width={1000}
              sizes="(max-width: 1024px) 92vw, 46vw"
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- 3. Planner band — three short steps, inline. ----------------------- -->
  <StylePlannerBand
    title={enquiryConfig.title}
    description={enquiryConfig.description ?? ''}
    startPoints={data.startPoints ?? []}
    interests={[{ name: category.name, slug: category.slug }, ...otherStyles.map((style) => ({ name: style.name, slug: style.slug }))]}
    categoryName={category.name}
    categorySlug={category.slug}
  />

  <!-- 4. Trip ideas ------------------------------------------------------- -->
  <section id="trip-ideas" class="scroll-mt-24 border-t border-ink/[0.06] bg-canvas py-14 md:py-20">
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-2xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Trip ideas</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight text-heading md:text-[38px]">{category.name} trips</h2>
        </div>
        <a class="inline-flex h-11 items-center gap-2 rounded-[8px] border border-ink/10 bg-surface px-5 text-sm font-bold text-forest shadow-sm transition hover:border-forest/25 hover:text-heading" href={`/tours?category=${category.slug}`}>
          View all tours <ArrowRight size={15} />
        </a>
      </div>

      {#if showFilters}
        <div class="mt-8 rounded-[12px] border border-ink/10 bg-surface p-4 shadow-[0_10px_30px_rgba(57,61,50,0.05)] md:p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end">
            <p class="shrink-0 pb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45 lg:pb-3.5">Filter by:</p>
            <div class="grid flex-1 gap-3 sm:grid-cols-3">
              {#if filterFacets[0]}
                <label class="grid gap-1.5">
                  <span class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Number of days</span>
                  <select bind:value={pendingDays} class="h-11 rounded-[8px] border border-ink/15 bg-surface px-3 text-sm font-semibold text-heading outline-none transition focus:border-goldfinch-gold">
                    <option value="all">All durations</option>
                    {#each dayOptions as bucket}<option value={bucket.key}>{bucket.label}</option>{/each}
                  </select>
                </label>
              {/if}
              {#if filterFacets[1]}
                <label class="grid gap-1.5">
                  <span class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Comfort level</span>
                  <select bind:value={pendingTier} class="h-11 rounded-[8px] border border-ink/15 bg-surface px-3 text-sm font-semibold text-heading outline-none transition focus:border-goldfinch-gold">
                    <option value="all">All comfort levels</option>
                    {#each tierOptions as tier}<option value={tier}>{TIER_LABELS[tier] ?? tier}</option>{/each}
                  </select>
                </label>
              {/if}
              {#if filterFacets[2]}
                <label class="grid gap-1.5">
                  <span class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Price</span>
                  <select bind:value={pendingPrice} class="h-11 rounded-[8px] border border-ink/15 bg-surface px-3 text-sm font-semibold text-heading outline-none transition focus:border-goldfinch-gold">
                    <option value="all">All prices</option>
                    {#each priceOptions as bucket}<option value={bucket.key}>{bucket.label}</option>{/each}
                  </select>
                </label>
              {/if}
            </div>
            <div class="flex shrink-0 gap-2">
              <button class="inline-flex h-11 items-center justify-center rounded-[8px] bg-deep-green px-6 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-forest" type="button" on:click={applyFilters}>Filter</button>
              <button class="inline-flex h-11 items-center justify-center rounded-[8px] border border-ink/15 bg-surface px-6 text-xs font-bold uppercase tracking-[0.14em] text-heading transition hover:border-ink/30" type="button" on:click={resetFilters}>Reset</button>
            </div>
          </div>
        </div>
      {/if}

      {#if filteredTours.length}
        <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.05 }}>
          {#each filteredTours as tour (tour.slug)}
            <TourCardRich {tour} />
          {/each}
        </div>
      {:else if filtersActive}
        <div class="mt-8 flex flex-col items-start gap-4 border border-ink/10 bg-surface px-6 py-12 text-center sm:items-center">
          <p class="w-full font-serif text-2xl text-heading">No tours match those filters.</p>
          <button class="mx-auto font-bold text-clay underline-offset-4 hover:underline" type="button" on:click={resetFilters}>Show all {category.name.toLowerCase()} tours</button>
        </div>
      {:else}
        <div class="mt-8">
          <EmptyState title="No published tours for this style yet" message="A local advisor can still shape this type of trip around your dates and budget." />
        </div>
      {/if}

      <!--
        The way out for someone who has read every card and still is not sure.
        Opens the same form the hero CTA does, so there is one place a request
        can come from rather than a second half-form written here.
      -->
      <p class="mt-8 text-center text-[15px] text-ink/65">
        Not sure which one fits?
        <button
          class="ml-1 inline-flex items-center gap-1 font-bold text-clay underline decoration-clay/35 underline-offset-4 transition hover:decoration-clay"
          type="button"
          on:click={() => (enquiryOpen = true)}
        >Request a custom recommendation <ArrowRight size={15} /></button>
      </p>
    </div>
  </section>

  <!-- 5. Planning facts --------------------------------------------------- -->
  {#if planningFacts.length}
    <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <div class="max-w-2xl" use:fadeUpOnScroll={{ y: 14 }}>
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Planning</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight text-heading md:text-[38px]">Planning facts</h2>
        </div>
        {#if quickFacts.length}
          <dl class="mt-8 grid gap-px overflow-hidden rounded-[12px] border border-ink/10 bg-ink/10 shadow-[0_10px_28px_rgba(57,61,50,0.05)] sm:grid-cols-3">
            {#each quickFacts as fact}
              <div class="flex items-center gap-3 bg-surface px-5 py-4">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-goldfinch-gold/15 text-goldfinch-gold">
                  <svelte:component this={fact.icon} size={16} strokeWidth={2.2} />
                </span>
                <span class="min-w-0">
                  <dt class="text-[10.5px] font-bold uppercase tracking-[0.14em] text-clay">{fact.label}</dt>
                  <dd class="mt-0.5 text-[15px] font-bold leading-6 text-heading">{fact.value}</dd>
                </span>
              </div>
            {/each}
          </dl>
        {/if}

        {#if planningNotesBlocks.length}
          <div class="mt-5 grid gap-5 sm:grid-cols-2 {planningNotesBlocks.length === 3 ? 'lg:grid-cols-3' : ''}" use:staggeredCardReveal={{ y: 14, stagger: 0.05 }}>
            {#each planningNotesBlocks as block}
              <div
                class="overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-[0_10px_28px_rgba(57,61,50,0.05)] transition hover:shadow-[0_16px_38px_rgba(57,61,50,0.09)]"
              >
                <!-- A rule in the block's own accent, so three cards read as
                     three subjects rather than three identical boxes. -->
                <span
                  class="block h-1 w-full {block.accent === 'forest' ? 'bg-forest' : block.accent === 'clay' ? 'bg-clay' : 'bg-goldfinch-gold'}"
                  aria-hidden="true"
                ></span>
                <div class="p-6">
                <p class="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-clay">
                  <span
                    class="grid h-8 w-8 place-items-center rounded-lg {block.accent === 'forest'
                      ? 'bg-forest/10 text-forest'
                      : block.accent === 'clay'
                        ? 'bg-clay/10 text-clay'
                        : 'bg-goldfinch-gold/20 text-goldfinch-gold'}"
                  >
                    <svelte:component this={block.icon} size={15} strokeWidth={2.2} />
                  </span>
                  {block.label}
                </p>
                {#if block.kind === 'list'}
                  <ul class="mt-3 grid gap-1.5">
                    {#each block.items.slice(0, 8) as item}
                      <li class="flex items-start gap-2 text-[15px] leading-6 text-ink/70">
                        <span class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold" aria-hidden="true"></span>
                        {item}
                      </li>
                    {/each}
                  </ul>
                  {#if block.items.length > 8}
                    <p class="mt-2 text-[13px] text-ink/45">and {block.items.length - 8} more</p>
                  {/if}
                {:else}
                  <div class="planning-rich mt-2.5 text-[15px] leading-7 text-ink/70">
                    <RichText value={block.value} />
                  </div>
                {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}

    <!-- 5b. How planning works — one homepage section, shown on every style. -->
    {#if processSteps.length}
      <section class="border-t border-ink/[0.06] bg-canvas py-14 md:py-20">
        <div class="container-shell">
          <div class="max-w-2xl" use:fadeUpOnScroll={{ y: 14 }}>
            {#if processSection?.extra_data?.eyebrow}
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{processSection.extra_data.eyebrow}</p>
            {/if}
            <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight text-heading md:text-[38px]" use:revealHeading>
              {processSection?.title || 'How planning works'}
            </h2>
            {#if processSection?.subtitle}
              <p class="mt-3 text-[15px] leading-7 text-ink/65">{processSection.subtitle}</p>
            {/if}
          </div>
          <ol class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" use:staggeredCardReveal={{ y: 14, stagger: 0.05 }}>
            {#each processSteps as step, index}
              <li class="border-t-2 border-goldfinch-gold/45 pt-4">
                <p class="font-serif text-2xl font-semibold text-goldfinch-gold">{String(index + 1).padStart(2, '0')}</p>
                <p class="mt-2 font-bold text-heading">{step.title}</p>
                {#if step.body}<p class="mt-1.5 text-sm leading-6 text-ink/65">{step.body}</p>{/if}
              </li>
            {/each}
          </ol>
        </div>
      </section>
    {/if}

  <!-- 6. What we help you get right ---------------------------------------- -->
  <!-- The advisor's-note treatment from the homepage: one tinted card, two
       bulleted columns. Same shell, so the two read as the same voice rather
       than two designs. -->
  {#if category.who_its_for || highlights.length}
    <section class="bg-canvas py-14 md:py-20">
      <div class="container-shell">
        <div
          class="relative overflow-hidden rounded-[12px] border border-ink/20 bg-sand px-7 py-8 sm:px-10 sm:py-10 md:px-14 md:py-14 lg:px-[72px] lg:py-[64px]"
          style="box-shadow: 0 18px 45px rgba(57,61,50,0.06)"
          use:fadeUpOnScroll={{ y: 16 }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 200 200"
            class="pointer-events-none absolute right-6 top-6 z-0 h-[110px] w-[110px] text-clay opacity-[0.09] sm:right-8 sm:top-8 md:h-[160px] md:w-[160px] lg:h-[200px] lg:w-[200px]"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
          >
            <circle cx="100" cy="100" r="80" />
            <circle cx="100" cy="100" r="55" />
            <path d="M100 20 L110 100 L100 180 L90 100 Z" fill="currentColor" opacity="0.5" />
            <path d="M20 100 L100 90 L180 100 L100 110 Z" fill="currentColor" opacity="0.3" />
          </svg>

          <div class="relative max-w-[1180px]">
            <div class="inline-flex items-center gap-2">
              <span class="h-px w-6 bg-clay" aria-hidden="true"></span>
              <span class="text-xs font-semibold uppercase tracking-[0.15em] text-clay">Why this style</span>
            </div>
            <h2 class="mt-4 font-serif text-3xl leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[42px]" use:revealHeading>
              What we help you get right
            </h2>
          </div>

          <div class="relative mt-10 grid gap-10 md:mt-14 md:grid-cols-2 md:gap-14">
            {#if whoItsForItems.length}
              <div>
                <h3 class="font-serif text-xl text-heading md:text-2xl">Who it's for</h3>
                <div class="mt-3 h-[2px] w-10 bg-goldfinch-gold" aria-hidden="true"></div>
                <ul class="mt-6 space-y-[15px]">
                  {#each whoItsForItems as item}
                    <li class="flex items-start gap-3.5 text-[15px] leading-relaxed text-heading">
                      <span aria-hidden="true" class="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold"></span>
                      <span>{item}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if highlights.length}
              <div>
                <h3 class="font-serif text-xl text-heading md:text-2xl">What you get</h3>
                <div class="mt-3 h-[2px] w-10 bg-goldfinch-gold" aria-hidden="true"></div>
                <ul class="mt-6 space-y-[15px]">
                  {#each highlights as highlight}
                    <li class="flex items-start gap-3.5 text-[15px] leading-relaxed text-heading">
                      <span aria-hidden="true" class="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold"></span>
                      <RichText value={highlight} className="min-w-0" />
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- 7. Traveller stories — real approved reviews only; no reviews, no section. -->
  {#if reviews.length}
    <HomeTravellerStories {reviews} summary={reviewSummary} />
  {/if}

  <!-- 8. FAQs — real CMS records; hidden entirely when none exist. -->
  {#if faqs.length}
    <JsonLd data={faqLd(faqs.map((faq) => ({ q: faq.question, a: faq.answer })))} />
    <section class="relative overflow-hidden border-t border-ink/10 bg-sand/25 py-14 md:py-20">
      <div class="container-shell grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Good to know</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight text-heading md:text-[38px]">Questions travellers ask</h2>
          <p class="mt-3 text-[15px] leading-7 text-ink/65">Honest answers from the team that plans these trips.</p>
          {#if waHref}
            <a class="mt-6 inline-flex h-12 items-center gap-2 rounded-[8px] bg-[#25D366] px-6 font-bold text-white shadow-sm transition hover:brightness-105" href={waHref} target="_blank" rel="noopener noreferrer" on:click={() => trackEvent('whatsapp_click', { cta_location: 'safari_style_faq', category_id: category.id })}>
              <MessageCircle size={18} /> Ask us on WhatsApp
            </a>
          {/if}
        </div>
        <FAQAccordion {faqs} />
      </div>
    </section>
  {/if}

  <!-- 9. Other safari styles — real published categories; captions only where a
       short description exists. -->
  {#if otherStyles.length}
    <section class="border-t border-ink/[0.06] bg-canvas py-14 md:py-20">
      <div class="container-shell">
        <div class="max-w-2xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Choose your safari style</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight text-heading md:text-[38px]">Explore other safari styles</h2>
          <p class="mt-3 text-[15px] leading-7 text-ink/65">Different starting points, pace and purpose — pick the direction that matches your trip.</p>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each otherStyles.slice(0, 6) as style (style.slug)}
            <a
              href={`/safari-styles/${style.slug}`}
              class="group relative block overflow-hidden rounded-[10px] border border-ink/10 bg-deep-green shadow-[0_12px_34px_rgba(57,61,50,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(57,61,50,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
            >
              <div class="relative h-[320px] overflow-hidden md:h-[360px]">
                {#if style.image_url}
                  <Img
                    record={style}
                    fields={['image_url']}
                    alt=""
                    width={800}
                    sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                {:else}
                  <div class="h-full w-full bg-gradient-to-br from-deep-green to-forest"></div>
                {/if}
                <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
                <div class="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold">
                    <Compass size={12} /> Safari style
                  </p>
                  <h3 class="mt-1 font-serif text-xl font-semibold leading-tight">{style.name}</h3>
                  {#if style.short_description}
                    <p class="mt-1 line-clamp-2 text-[13px] leading-snug text-white/85">{style.short_description}</p>
                  {/if}
                </div>
              </div>
            </a>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- 10. Final CTA -------------------------------------------------------- -->
  <section class="relative overflow-hidden bg-deep-green py-14 text-white md:py-20">
    <div class="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-white/10"></div>
    <div class="pointer-events-none absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-goldfinch-gold/[0.07] blur-3xl"></div>
    <div class="container-shell relative flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
      <div class="max-w-2xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Start planning</p>
        <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight md:text-[40px]">Request a custom {category.name.toLowerCase()} plan</h2>
        <p class="mt-4 max-w-xl text-[15px] leading-7 text-white/68">Tell us your travel dates, starting point and travel style, and our local team will shape a route that fits your time, budget and pace.</p>
      </div>
      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <button class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 text-sm font-bold text-heading transition hover:brightness-105" type="button" on:click={() => (enquiryOpen = true)}>
          <Sparkles size={17} /> Start planning
        </button>
        {#if waHref}
          <a href={waHref} target="_blank" rel="noopener noreferrer" class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/25 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/15" on:click={() => trackEvent('whatsapp_click', { cta_location: 'travel_style_footer', category_id: category.id })}>
            <MessageCircle size={17} /> WhatsApp
          </a>
        {/if}
      </div>
    </div>
  </section>

  <!--
    BookingForm is built as an inline panel, so it is wrapped rather than
    rewritten. Escape and a backdrop click close it; the panel itself stops the
    click so a stray tap inside does not discard a half-filled form.
  -->
  {#if enquiryOpen}
    <div
      class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      transition:fade={{ duration: 140 }}
      on:click={() => (enquiryOpen = false)}
      on:keydown={(event) => event.key === 'Escape' && (enquiryOpen = false)}
    >
      <div class="w-full max-w-[420px]" role="dialog" aria-modal="true" tabindex="-1" aria-label={enquiryConfig.title} on:click|stopPropagation on:keydown|stopPropagation>
        <BookingForm
          source="category_enquiry"
          leadContext={{ safari_style: category.name, safari_style_slug: category.slug }}
        />
        <button
          class="mx-auto mt-3 flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white/70 transition hover:text-white"
          type="button"
          on:click={() => (enquiryOpen = false)}
        >Close</button>
      </div>
    </div>
  {/if}
{:else}
  <section class="container-shell py-20 text-center">
    <h1 class="text-2xl font-bold text-heading">Safari style not found</h1>
    <a class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-heading" href="/safari-styles">All safari styles <ArrowRight size={16} /></a>
  </section>
{/if}

<style>
  /* The notes are authored rich text, so lists need marking up here — the
     public prose styles elsewhere are scoped to their own components. */
  .planning-rich :global(ul) {
    margin-top: 0.5rem;
    display: grid;
    gap: 0.4rem;
    padding-left: 1.05rem;
    list-style: disc;
  }
  .planning-rich :global(li)::marker {
    color: rgb(var(--c-goldfinch-gold));
  }
  .planning-rich :global(p + p) {
    margin-top: 0.6rem;
  }
</style>
