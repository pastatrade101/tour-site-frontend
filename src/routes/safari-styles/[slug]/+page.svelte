<script lang="ts">
  import { ArrowRight, Binoculars, Check, Compass, Gauge, MapPinned, MessageCircle, PlaneTakeoff, Sparkles, Users } from '@lucide/svelte';
  import { page } from '$app/stores';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import HomeAdvisorNote from '$lib/components/public/home/HomeAdvisorNote.svelte';
  import HomeTravellerStories from '$lib/components/public/home/HomeTravellerStories.svelte';
  import EnquiryForm from '$lib/components/public/enquiry/EnquiryForm.svelte';
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
  import { toMetaText } from '$lib/richText';
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

  // Site-wide editorial sections (advisor's note) come from the homepage CMS
  // record — same source, same admin control, same fallback copy as the
  // homepage itself.
  $: sections = Object.fromEntries(
    ((data.homeSections ?? []) as Record<string, unknown>[]).map((section) => [String(section.section_key ?? ''), section])
  ) as Record<string, Record<string, unknown> | undefined>;
  $: advisorSection = sections.advisor_note;
  $: advisorExtra = (advisorSection?.extra_data ?? {}) as Record<string, unknown>;
  $: advisorColumns = Array.isArray(advisorExtra.columns) ? (advisorExtra.columns as { title: string; items: string[] }[]) : [];
  const sectionText = (section: Record<string, unknown> | undefined, field: string, fallback: string) => {
    const value = section?.[field];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };

  // The planning CTA opens the same category enquiry the experiences page
  // uses, pre-scoped to this style.
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

  $: benefits = (category?.highlights ?? []).filter((item) => String(item).trim()).slice(0, 4);

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
  const benefitIcons = [PlaneTakeoff, Gauge, Users, Sparkles];

  // The flow is shown only when a published matching tour supplies every fact.
  // This prevents generic marketing copy from being presented as itinerary data.
  $: flowTour = tours.find((tour) => {
    const destinations = getTourDestinations(tour).map((item) => item.name).filter(Boolean);
    return Boolean(tour.start_location && tour.end_location && destinations.length);
  });
  $: flowDestinations = flowTour
    ? [...new Set(getTourDestinations(flowTour).map((item) => item.name).filter(Boolean))].join(' + ')
    : '';
  $: journeySteps = flowTour && flowDestinations
    ? [
        { label: 'Start', value: flowTour.start_location as string, icon: PlaneTakeoff },
        { label: 'Safari experience', value: flowDestinations, icon: Binoculars },
        { label: 'Finish', value: flowTour.end_location as string, icon: MapPinned }
      ]
    : [];

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

  <section class="relative overflow-hidden bg-deep-green text-white">
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
      <div class="absolute inset-0 bg-gradient-to-r from-deep-green via-deep-green/80 to-deep-green/30"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-transparent to-deep-green/20"></div>
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

      <div class="grid items-end gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <p class="inline-flex items-center gap-2 rounded-[8px] border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold backdrop-blur">
            <Compass size={13} />
            Safari Style
          </p>
          <h1 class="mt-5 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-normal md:text-6xl" use:revealHeading>
            {category.name}
          </h1>
          {#if category.description}
            <RichText value={category.description} className="rich-on-dark mt-5 max-w-2xl text-base font-medium leading-8 text-white/84 md:text-lg" />
          {/if}
          <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 text-sm font-bold text-heading shadow-lg shadow-black/10 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" type="button" on:click={() => (enquiryOpen = true)}>
              <Sparkles size={17} />
              Plan this style
            </button>
            <a class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/35 bg-white/8 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15" href={`/tours?category=${category.slug}`}>
              See matching tours <ArrowRight size={17} />
            </a>
          </div>
        </div>

        <div class="rounded-[8px] border border-white/15 bg-white/10 p-5 backdrop-blur" use:fadeUpOnScroll={{ y: 16 }}>
          <p class="text-sm font-bold text-white">Style snapshot</p>
          <div class="mt-4 grid gap-3">
            {#if category.who_its_for}
              <div class="flex gap-3 rounded-[8px] bg-white/10 p-3">
                <Users size={18} class="mt-0.5 shrink-0 text-goldfinch-gold" />
                <p class="whitespace-pre-line text-sm leading-6 text-white/78">{category.who_its_for}</p>
              </div>
            {/if}
            {#if fitnessText}
              <div class="flex items-center gap-3 rounded-[8px] bg-white/10 p-3">
                <Gauge size={18} class="shrink-0 text-goldfinch-gold" />
                <p class="text-sm font-semibold text-white">{fitnessText}</p>
              </div>
            {/if}
            {#if category.highlights?.length}
              <div class="grid gap-2 rounded-[8px] bg-white/10 p-3">
                {#each category.highlights.slice(0, 4) as highlight}
                  <div class="flex items-start gap-2 text-sm leading-6 text-white/78">
                    <Check size={14} strokeWidth={2.8} class="mt-1 shrink-0 text-goldfinch-gold" />
                    <RichText value={highlight} className="min-w-0 text-sm leading-6 text-white/78" />
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </section>

  {#if benefits.length}
    <section class="border-b border-ink/[0.07] bg-[#fbfaf6] py-12 md:py-16">
      <div class="container-shell">
        <div class="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
          <div class="max-w-md" use:fadeUpOnScroll={{ y: 14 }}>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Why this style</p>
            <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight text-heading md:text-[38px]">Why choose {category.name}?</h2>
            {#if category.who_its_for}
              <p class="mt-4 whitespace-pre-line text-[15px] leading-7 text-ink/65">{category.who_its_for}</p>
            {/if}
          </div>

          <div class="grid gap-3 sm:grid-cols-2" use:staggeredCardReveal={{ y: 14, stagger: 0.05 }}>
            {#each benefits as benefit, index}
              <article class="group flex min-w-0 gap-4 rounded-[12px] border border-ink/[0.09] bg-white p-5 shadow-[0_10px_28px_rgba(57,61,50,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-goldfinch-gold/40 hover:shadow-[0_16px_36px_rgba(57,61,50,0.1)]">
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-deep-green text-goldfinch-gold">
                  <svelte:component this={benefitIcons[index]} size={18} strokeWidth={2.2} />
                </span>
                <RichText value={benefit} className="min-w-0 pt-1 text-[14.5px] font-semibold leading-6 text-heading" />
              </article>
            {/each}
          </div>
        </div>
      </div>
    </section>
  {/if}

  {#if journeySteps.length}
    <section class="relative flex min-h-[330px] items-center overflow-hidden bg-[linear-gradient(180deg,#f5f1e9_0%,#fbfaf6_48%,#f5f1e9_100%)] py-16 md:min-h-[390px] md:py-20">
      <div class="pointer-events-none absolute left-[8%] top-1/2 h-52 w-52 -translate-y-1/2 rounded-full bg-goldfinch-gold/[0.08] blur-3xl" aria-hidden="true"></div>
      <div class="container-shell relative">
        <div class="mx-auto max-w-6xl overflow-hidden rounded-[16px] border border-goldfinch-gold/30 bg-deep-green text-white shadow-[0_24px_70px_rgba(31,77,58,0.22)] ring-1 ring-white/5" use:fadeUpOnScroll={{ y: 16 }}>
          <div class="border-b border-white/10 px-5 py-4 md:px-7">
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">How it works</p>
            <p class="mt-1 text-sm text-white/65">A published route from {flowTour?.title}</p>
          </div>
          <div class="grid md:grid-cols-3">
            {#each journeySteps as step, index}
              <div class="relative flex min-w-0 items-center gap-4 border-white/10 px-5 py-5 max-md:border-b last:max-md:border-b-0 md:border-r md:px-7 md:py-6 md:last:border-r-0">
                <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-goldfinch-gold">
                  <svelte:component this={step.icon} size={19} strokeWidth={2.2} />
                </span>
                <div class="min-w-0">
                  <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{step.label}</p>
                  <p class="mt-1 text-[15px] font-bold leading-snug text-white">{step.value}</p>
                </div>
                {#if index < journeySteps.length - 1}
                  <ArrowRight size={17} class="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 text-goldfinch-gold md:block" />
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>
  {/if}

  <section class="relative overflow-hidden bg-canvas py-14 md:py-20">
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-goldfinch-gold/30 to-transparent" aria-hidden="true"></div>
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-2xl">
          <p class="text-sm font-bold uppercase tracking-[0.14em] text-goldfinch-gold">Matching tours</p>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[38px]">{category.name} trips</h2>
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
    </div>
  </section>

  <!-- Advisor's note — the site-wide editorial planning copy, managed on the
       homepage CMS record and reused here so it never forks. -->
  {#if advisorSection?.is_active !== false}
    <HomeAdvisorNote
      eyebrow={typeof advisorExtra.eyebrow === 'string' && advisorExtra.eyebrow.trim() ? advisorExtra.eyebrow : "An Advisor's Note"}
      title={sectionText(advisorSection, 'title', 'The Trip Is Won or Lost in the Planning Details')}
      body={sectionText(advisorSection, 'subtitle', 'Most travel mistakes happen before arrival. The wrong route, too many one-night stops, poor lodge locations or badly timed transfers can make even a beautiful trip feel tiring.')}
      {...advisorColumns.length ? { columns: advisorColumns } : {}}
      {...typeof advisorExtra.footnote === 'string' && advisorExtra.footnote ? { footnote: advisorExtra.footnote } : {}}
    />
  {/if}

  <!-- Traveller stories — real approved reviews only; no reviews, no section. -->
  {#if reviews.length}
    <HomeTravellerStories {reviews} summary={reviewSummary} />
  {/if}

  <!-- FAQs — real CMS records; hidden entirely when none exist. -->
  {#if faqs.length}
    <JsonLd data={faqLd(faqs.map((faq) => ({ q: faq.question, a: faq.answer })))} />
    <section class="relative overflow-hidden bg-surface py-14 md:py-20">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-forest/20 to-transparent" aria-hidden="true"></div>
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

  <!-- Other safari styles — real published categories; captions only where a
       short description exists. -->
  {#if otherStyles.length}
    <section class="bg-canvas py-14 md:py-20">
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

  <EnquiryForm open={enquiryOpen} config={enquiryConfig} context={enquiryContext} on:close={() => (enquiryOpen = false)} />
{:else}
  <section class="container-shell py-20 text-center">
    <h1 class="text-2xl font-bold text-heading">Safari style not found</h1>
    <a class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-heading" href="/safari-styles">All safari styles <ArrowRight size={16} /></a>
  </section>
{/if}
