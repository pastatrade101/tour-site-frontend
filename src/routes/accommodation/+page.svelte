<script lang="ts">
  /**
   * The stays index — deliberately an editorial index, not a card grid.
   *
   * The lodge data has no prices, no ratings and no featured flags, and two of
   * the ten have no photograph. What it does have is strong prose and a clean
   * taxonomy, so the page is built to be read: hairline-separated rows, large
   * serif names, and a thumbnail only where one genuinely exists.
  */
  import { ArrowRight, BedDouble, Gem, MapPin, Search, ShieldCheck, Sparkles, Tent, X } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import { imgUrl, sourceFor, srcsetFor, variantSrc, variantsOf } from '$lib/img';
  import Img from '$lib/components/public/Img.svelte';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import { toMetaText } from '$lib/richText';
  import type { Lodge } from '$lib/types';
  import type { PageData } from './$types';
  import { enumLabel } from '$lib/accommodationEnums';

  export let data: PageData;

  $: lodges = (data.lodges ?? []) as Lodge[];

  const LEVEL: Record<string, string> = {
    BUDGET:'Budget', MID_RANGE:'Mid-range', LUXURY:'Luxury', PREMIUM_LUXURY:'Premium luxury',
    budget: 'Budget',
    mid_range: 'Mid-range',
    luxury: 'Luxury',
    ultra_luxury: 'Ultra luxury'
  };
  const TYPE: Record<string, string> = {
    HOTEL:'Hotel', SAFARI_LODGE:'Safari lodge', TENTED_CAMP:'Tented camp', MOBILE_CAMP:'Mobile camp', BEACH_RESORT:'Beach resort', VILLA:'Villa', GUEST_HOUSE:'Guest house', ECO_LODGE:'Eco lodge', BOUTIQUE_HOTEL:'Boutique hotel',
    tented_camp: 'Tented camp',
    mobile_camp: 'Mobile camp',
    lodge: 'Lodge',
    hotel: 'Hotel',
    treehouse: 'Treehouse'
  };

  const levelLabel = (l: Lodge) => LEVEL[String(l.accommodation_level)] ?? '';
  const typeLabel = (l: Lodge) => TYPE[String(l.lodge_type)] ?? '';
  const placeOf = (l: Lodge) => l.destinations?.name ?? '';
  const blurbOf = (l: Lodge) => toMetaText(l.why_we_recommend || l.description || '', 190);
  const settingOf = (l: Lodge) => l.settings?.slice(0, 2).map(enumLabel).join(' · ') ?? '';

  // Filters are built from the data, so an option never appears with nothing
  // behind it and every count is real.
  type Filter = { key: string; label: string; test: (l: Lodge) => boolean };

  $: filters = [
    { key: 'all', label: 'All stays', test: () => true },
    ...[...new Set(lodges.map((l) => String(l.lodge_type)).filter(Boolean))].sort().map((type) => ({
      key: `type:${type}`,
      label: TYPE[type] ?? type,
      test: (l: Lodge) => String(l.lodge_type) === type
    })),
    ...[...new Set(lodges.map((l) => String(l.accommodation_level)).filter(Boolean))].sort().map((level) => ({
      key: `level:${level}`,
      label: LEVEL[level] ?? level,
      test: (l: Lodge) => String(l.accommodation_level) === level
    }))
  ] as Filter[];

  let active = 'all';
  let activeDestination = 'all';
  let search = '';
  let sortBy = 'recommended';
  $: activeFilter = filters.find((f) => f.key === active) ?? filters[0];
  $: destinations = [...new Set(lodges.map(placeOf).filter(Boolean))].sort();
  $: shown = lodges
    .filter((l) => activeFilter?.test(l) ?? true)
    .filter((l) => activeDestination === 'all' || placeOf(l) === activeDestination)
    .filter((l) => {
      const query = search.trim().toLowerCase();
      return !query || `${l.name} ${placeOf(l)} ${typeLabel(l)} ${levelLabel(l)} ${l.best_for?.join(' ') ?? ''}`.toLowerCase().includes(query);
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'destination') return placeOf(a).localeCompare(placeOf(b)) || a.name.localeCompare(b.name);
      return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) || a.name.localeCompare(b.name);
    });
  $: featuredLodge = active === 'all' && activeDestination === 'all' && !search.trim()
    ? shown.find((l) => l.is_featured && (l.hero_image_url || l.image_url)) ?? shown.find((l) => l.hero_image_url || l.image_url)
    : undefined;
  $: gridLodges = featuredLodge ? shown.filter((l) => l.id !== featuredLodge?.id) : shown;
  const countFor = (filter: Filter) => lodges.filter(filter.test).length;
  const resetFilters = () => { active = 'all'; activeDestination = 'all'; search = ''; sortBy = 'recommended'; };
  const selectFilter = (key: string) => {
    active = key;
    requestAnimationFrame(() => {
      const results = document.getElementById('accommodation-results');
      if (!results) return;
      const stickyOffset = window.innerWidth >= 768 ? 150 : 134;
      window.scrollTo({ top: window.scrollY + results.getBoundingClientRect().top - stickyOffset, behavior: 'smooth' });
    });
  };

  // Backdrop borrowed from the first stay that actually has a photograph; falls
  // back to a deep-green field, since two of the ten have no image at all.
  $: heroLodge = lodges.find((l) => l.hero_image_url || l.image_url);
  $: heroImage = sourceFor(
    heroLodge,
    1920,
    'hero_image_url',
    'image_url'
  );
  $: heroVariants = variantsOf(heroLodge, 'hero_image_url', 'image_url');
  $: heroPreloadType = heroVariants?.avif ? 'image/avif' : heroVariants ? 'image/webp' : undefined;
  $: heroPreloadSrcset = heroVariants ? srcsetFor(heroVariants, heroVariants.avif ? 'avif' : 'webp') : '';
  $: heroPreloadHref =
    variantSrc(heroVariants, 1920, heroVariants?.avif ? 'avif' : 'webp') || imgUrl(heroImage, 1920, 72);

  // Hero stats, every one counted from the records on this page — no rounding up
  // and nothing shown when the count is zero.
  $: destinationCount = new Set(lodges.map((l) => l.destinations?.name).filter(Boolean)).size;
  $: luxuryCount = lodges.filter((l) => l.accommodation_level === 'LUXURY' || l.accommodation_level === 'PREMIUM_LUXURY').length;
  $: campCount = lodges.filter((l) => l.lodge_type === 'TENTED_CAMP' || l.lodge_type === 'MOBILE_CAMP').length;
  $: heroStats = [
    { icon: BedDouble, value: lodges.length, label: lodges.length === 1 ? 'place to stay' : 'places to stay' },
    { icon: MapPin, value: destinationCount, label: destinationCount === 1 ? 'destination' : 'destinations' },
    { icon: Gem, value: luxuryCount, label: 'luxury stays' },
    { icon: Tent, value: campCount, label: campCount === 1 ? 'tented camp' : 'tented camps' }
  ].filter((stat) => stat.value > 0);

  // A different photograph from the hero so the page does not repeat itself.
  $: ctaLodge = lodges.filter((l) => l.hero_image_url || l.image_url).at(-1);
  $: ctaImage = sourceFor(
    ctaLodge,
    1600,
    'hero_image_url',
    'image_url'
  );

  const title = 'Where to stay — camps, lodges and hotels';
  const description =
    'The camps, lodges and hotels we book across Tanzania — chosen for where they sit, how they are run and who they suit.';
</script>

<svelte:head>
  <title>{title} | Goldfinch Adventures</title>
  <meta name="description" content={description} />
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

<!-- ── cinematic hero ───────────────────────────────────────────────────── -->
<section data-hero class="relative flex min-h-[62vh] items-end overflow-hidden bg-deep-green text-white md:min-h-[74vh]">
  {#if heroImage}
    <Img
      record={heroLodge}
      fields={['hero_image_url', 'image_url']}
      alt=""
      width={1920}
      sizes="100vw"
      eager
      className="absolute inset-0 h-full w-full object-cover"
    />
    <span class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" aria-hidden="true"></span>
  {:else}
    <span class="absolute inset-0 bg-gradient-to-br from-deep-green via-forest to-deep-green" aria-hidden="true"></span>
  {/if}
  <span class="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(0,0,0,0.55)]" aria-hidden="true"></span>

  <div class="container-shell relative z-10 pb-14 pt-28 md:pb-20">
    <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 16 }}>
      <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-goldfinch-gold">Accommodation</p>
      <h1 class="mt-4 font-serif text-4xl font-semibold leading-[1.05] md:text-[62px]">
        Where you sleep shapes the whole trip
      </h1>
      <p class="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
        {description}
      </p>
      {#if heroStats.length}
        <dl class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-white/15 pt-4 md:mt-6 md:gap-x-7 md:pt-5">
          {#each heroStats as stat}
            <div class="flex items-center gap-2">
              <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/20 text-goldfinch-gold ring-1 ring-white/15 md:h-8 md:w-8" aria-hidden="true">
                <svelte:component this={stat.icon} size={13} />
              </span>
              <div>
                <dt class="sr-only">{stat.label}</dt>
                <dd>
                  <span class="block font-serif text-lg font-semibold leading-none text-white md:text-xl">{stat.value}</span>
                  <span class="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.11em] text-white/60 md:text-[10px]">{stat.label}</span>
                </dd>
              </div>
            </div>
          {/each}
        </dl>
      {/if}
    </div>
  </div>
</section>

{#if lodges.length}
  <section class="border-b border-ink/10 bg-sand/35">
    <div class="container-shell flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-5 text-xs font-semibold text-ink/65">
      {#each ['Chosen for the route', 'Local specialist guidance', 'Every stay arranged for you', 'Private tailor-made safaris'] as point}
        <span class="inline-flex items-center gap-2"><ShieldCheck size={14} class="text-forest" />{point}</span>
      {/each}
    </div>
  </section>

  <section id="browse" class="scroll-mt-24 bg-canvas">
    <div class="container-shell py-5 md:py-6">
      <div class="flex flex-col gap-3 lg:flex-row">
        <label class="relative flex-1">
          <Search size={16} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
          <input bind:value={search} type="search" placeholder="Search stays or destinations…" class="h-12 w-full border-0 border-b border-ink/20 bg-transparent pl-10 pr-4 text-sm outline-none transition placeholder:text-ink/40 focus:border-goldfinch-gold" />
        </label>
        <div class="grid grid-cols-2 gap-2 sm:flex">
          <select bind:value={activeDestination} class="h-12 min-w-0 border-0 border-b border-ink/20 bg-transparent px-2 text-sm font-semibold text-heading outline-none focus:border-goldfinch-gold">
            <option value="all">All destinations</option>
            {#each destinations as destination}<option value={destination}>{destination}</option>{/each}
          </select>
          <select bind:value={sortBy} class="h-12 min-w-0 border-0 border-b border-ink/20 bg-transparent px-2 text-sm font-semibold text-heading outline-none focus:border-goldfinch-gold">
            <option value="recommended">Recommended</option><option value="destination">By destination</option><option value="name">Name A–Z</option>
          </select>
        </div>
      </div>
    </div>
  </section>

  <nav class="sticky top-[70px] z-30 border-y border-ink/10 bg-canvas/95 shadow-[0_8px_24px_rgba(57,61,50,0.06)] backdrop-blur-md" aria-label="Accommodation filters">
    <div class="container-shell">
      <div class="flex min-h-14 gap-7 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:min-h-16">
        {#each filters as filter (filter.key)}
          <button type="button" class={`flex min-h-14 shrink-0 items-center border-b-[3px] px-0.5 text-[13px] font-bold transition md:min-h-16 md:text-sm ${active === filter.key ? 'border-goldfinch-gold text-heading' : 'border-transparent text-ink/50 hover:text-heading'}`} on:click={() => selectFilter(filter.key)}>{filter.label} <span class="ml-1.5 text-xs text-ink/35">{countFor(filter)}</span></button>
        {/each}
        {#if active !== 'all' || activeDestination !== 'all' || search.trim()}
          <button type="button" class="inline-flex min-h-14 shrink-0 items-center gap-1 text-xs font-bold text-clay md:min-h-16" on:click={resetFilters}>Clear <X size={13}/></button>
        {/if}
      </div>
    </div>
  </nav>

  <section id="accommodation-results" class="bg-canvas py-14 md:py-20">
    <div class="container-shell">
      <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div class="max-w-2xl"><p class="text-[11px] font-bold uppercase tracking-[0.18em] text-clay">Stays selected for the journey</p><h2 class="mt-3 font-serif text-3xl font-semibold leading-tight text-heading md:text-[42px]">Choose the safari first. We fit the right stay into it.</h2><p class="mt-3 text-sm leading-7 text-ink/65 md:text-base">Browse for inspiration, then open the safaris that use each property or ask us to shape a private route around it.</p></div>
        <a class="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 bg-deep-green px-6 text-sm font-bold text-white transition hover:bg-forest md:w-auto" href="/tours">Explore safari itineraries <ArrowRight size={16}/></a>
      </div>

      {#if featuredLodge}
        <div class="mb-8 mt-10" use:fadeUpOnScroll={{ y: 14 }}><div class="mb-4 flex items-center gap-3"><span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-clay"><Sparkles size={13}/> Goldfinch pick</span><span class="h-px flex-1 bg-ink/10"></span></div><LodgeCard lodge={featuredLodge} feature /></div>
      {/if}

      {#if gridLodges.length}
        <p class="mb-5 mt-9 text-sm text-ink/50">{shown.length} {shown.length === 1 ? 'property' : 'properties'} selected</p>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
          {#each gridLodges as lodge (lodge.id)}<LodgeCard {lodge} />{/each}
        </div>
      {:else}
        <div class="mt-10 border border-ink/10 bg-surface px-6 py-14 text-center"><p class="font-serif text-2xl text-heading">No stays match those filters.</p><button class="mt-4 font-bold text-clay underline-offset-4 hover:underline" type="button" on:click={resetFilters}>Show all stays</button></div>
      {/if}
    </div>
  </section>

  <!-- ── closing band ──────────────────────────────────────────────────── -->
  <section class="relative overflow-hidden bg-deep-green text-white">
    {#if ctaImage}
      <Img
        record={ctaLodge}
        fields={['hero_image_url', 'image_url']}
        alt=""
        width={1600}
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover opacity-25"
      />
    {/if}
    <span class="absolute inset-0 bg-gradient-to-br from-deep-green/95 via-deep-green/85 to-forest/90" aria-hidden="true"></span>
    <span class="pointer-events-none absolute inset-0 shadow-[inset_0_0_160px_50px_rgba(0,0,0,0.45)]" aria-hidden="true"></span>

    <div class="container-shell relative z-10 py-20 md:py-28">
      <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 16 }}>
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-goldfinch-gold">Planning together</p>
        <h2 class="mt-5 font-serif text-3xl font-semibold leading-[1.12] md:text-[46px]">
          We match the stay to the route,<br class="hidden sm:block" /> not the other way round.
        </h2>
        <p class="mt-5 max-w-xl text-base leading-8 text-white/70">
          Tell us how you want to travel and we will put the right camps and lodges in the right order — with the
          driving, flying and pacing already worked out.
        </p>

        <div class="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            class="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-goldfinch-gold px-8 py-3.5 text-sm font-extrabold text-heading transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green"
            href="/plan-my-trip"
          >
            Plan my trip <ArrowRight size={16} />
          </a>
          <a
            class="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-8 py-3.5 text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
            href="/contact"
          >
            Talk to a specialist
          </a>
        </div>

        {#if heroStats.length}
          <dl class="mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 border-t border-white/15 pt-8 sm:grid-cols-4">
            {#each heroStats as stat}
              <div>
                <dt class="sr-only">{stat.label}</dt>
                <dd>
                  <span class="block font-serif text-3xl font-semibold leading-none text-white">{stat.value}</span>
                  <span class="mt-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">{stat.label}</span>
                </dd>
              </div>
            {/each}
          </dl>
        {/if}
      </div>
    </div>
  </section>
{:else}
  <!-- Every lodge is currently a draft in the CMS, so this is the live state. -->
  <section class="bg-canvas pb-24 pt-4">
    <div class="container-shell">
      <div class="max-w-xl border-t border-ink/10 pt-10">
        <p class="font-serif text-2xl leading-snug text-heading">We are still adding our stays here.</p>
        <p class="mt-3 text-sm leading-7 text-ink/60">
          In the meantime, tell us how you want to travel and we will suggest the camps and lodges that fit your route.
        </p>
        <a
          class="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-goldfinch-gold px-7 text-sm font-extrabold text-heading transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold"
          href="/plan-my-trip"
        >
          Plan my trip <ArrowRight size={16} />
        </a>
      </div>
    </div>
  </section>
{/if}
