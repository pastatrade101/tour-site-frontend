<script lang="ts">
  import { ArrowRight, Binoculars, Check, Compass, Gauge, MapPinned, MessageCircle, PlaneTakeoff, Sparkles, Users } from '@lucide/svelte';
  import { page } from '$app/stores';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import { brand } from '$lib/brand';
  import { trackEvent } from '$lib/analytics';
  import { publicSettings, settingText } from '$lib/settings';
  import { getTourDestinations } from '$lib/tourDestinations';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal } from '$lib/animations';
  import { imgUrl, srcsetFor, variantSrc, variantsOf } from '$lib/img';
  import { toMetaText } from '$lib/richText';
  import { breadcrumbLd } from '$lib/seo';
  import Img from '$lib/components/public/Img.svelte';
  import type { Tour, TourCategory } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: category = data.category as TourCategory | null;
  $: tours = (data.tours ?? []) as Tour[];
  $: origin = $page.url.origin;
  $: title = category?.meta_title || (category ? `${category.name} Safari Style` : 'Safari Style');
  $: description = toMetaText(category?.meta_description || category?.description || 'Explore this Goldfinch safari style and matching tours.', 170);
  $: heroVariants = variantsOf(category, 'image_url');
  $: heroPreloadType = heroVariants?.avif ? 'image/avif' : heroVariants ? 'image/webp' : undefined;
  $: heroPreloadSrcset = heroVariants ? srcsetFor(heroVariants, heroVariants.avif ? 'avif' : 'webp') : '';
  $: heroPreloadHref =
    variantSrc(heroVariants, 1800, heroVariants?.avif ? 'avif' : 'webp') || imgUrl(category?.image_url, 1600, 72);

  $: planningHref = category
    ? `/plan-my-trip?topic=${encodeURIComponent(`${category.name} safari style`)}`
    : '/plan-my-trip';
  $: benefits = (category?.highlights ?? []).filter((item) => String(item).trim()).slice(0, 4);
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
  <title>{title} | Goldfinch Adventures</title>
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
            <a class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 text-sm font-bold text-heading shadow-lg shadow-black/10 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href={planningHref}>
              <Sparkles size={17} />
              Plan this style
            </a>
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
            {#if category.fitness}
              <div class="flex items-center gap-3 rounded-[8px] bg-white/10 p-3">
                <Gauge size={18} class="shrink-0 text-goldfinch-gold" />
                <p class="text-sm font-semibold text-white">{category.fitness}</p>
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

      {#if tours.length}
        <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.05 }}>
          {#each tours as tour (tour.slug)}
            <TourCard {tour} />
          {/each}
        </div>
      {:else}
        <div class="mt-8">
          <EmptyState title="No published tours for this style yet" message="A local advisor can still shape this type of trip around your dates and budget." />
        </div>
      {/if}
    </div>
  </section>

  <section class="relative overflow-hidden bg-deep-green py-14 text-white md:py-20">
    <div class="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-white/10"></div>
    <div class="pointer-events-none absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-goldfinch-gold/[0.07] blur-3xl"></div>
    <div class="container-shell relative flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
      <div class="max-w-2xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Local planning support</p>
        <h2 class="mt-3 font-serif text-3xl font-semibold leading-tight md:text-[40px]">Not sure which {category.name.toLowerCase()} fits your dates?</h2>
        <p class="mt-4 max-w-xl text-[15px] leading-7 text-white/68">Share your travel dates and group details, and our team will help you compare the published options.</p>
      </div>
      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <a class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 text-sm font-bold text-heading transition hover:brightness-105" href={planningHref}>
          <Sparkles size={17} /> Plan My Trip
        </a>
        {#if waHref}
          <a href={waHref} target="_blank" rel="noopener noreferrer" class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/25 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/15" on:click={() => trackEvent('whatsapp_click', { cta_location: 'travel_style_footer', category_id: category.id })}>
            <MessageCircle size={17} /> WhatsApp
          </a>
        {/if}
      </div>
    </div>
  </section>
{:else}
  <section class="container-shell py-20 text-center">
    <h1 class="text-2xl font-bold text-heading">Safari style not found</h1>
    <a class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-heading" href="/safari-styles">All safari styles <ArrowRight size={16} /></a>
  </section>
{/if}
