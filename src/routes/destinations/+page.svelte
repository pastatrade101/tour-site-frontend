<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { ArrowRight, Compass, Grid3X3, MapPin, Search, Sparkles } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import { prefersReducedMotion } from '$lib/animations/motion';
  import { getDestinationScores } from '$lib/data/destination-scores';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ScoreBars from '$lib/components/public/ScoreBars.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { imgUrl, thumbUrl } from '$lib/img';
  import { breadcrumbLd } from '$lib/seo';
  import type { Destination, Tour } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  let destinations: Destination[] = data.destinations ?? [];
  let activeCountry = 'All';
  let relatedTours: Tour[] = [];
  let lastDestId = '';

  const reduce = prefersReducedMotion();
  const ms = (n: number) => (reduce ? 0 : n);
  const imageOf = (destination: Destination | null | undefined) =>
    thumbUrl(destination, 'banner_image_url', 'main_image_url', 'image_url');
  const compactText = (value: string | null | undefined, fallback = '') =>
    (value || fallback).replace(/\s+/g, ' ').trim();

  $: requested = $page.url.searchParams.get('d') ?? '';
  $: origin = $page.url.origin;
  $: selected = requested ? destinations.find((d) => d.slug === requested) ?? null : null;
  $: countries = ['All', ...new Set(destinations.map((d) => d.country).filter((country): country is string => Boolean(country)))];
  $: if (!countries.includes(activeCountry)) activeCountry = 'All';
  $: filtered = activeCountry === 'All' ? destinations : destinations.filter((d) => d.country === activeCountry);
  $: heroTiles = destinations.filter((d) => imageOf(d)).slice(0, 4);
  $: heroImage = selected ? imageOf(selected) : '';
  $: selectedScores = selected ? getDestinationScores(selected.slug) : undefined;
  $: destinationCountLabel = `${filtered.length} ${filtered.length === 1 ? 'destination' : 'destinations'}`;
  $: title = selected ? `${selected.name} Destination Guide` : 'All Safari Destinations';
  $: description = selected
    ? compactText(selected.meta_description || selected.short_description || selected.description, `Explore ${selected.name} with Goldfinch Adventures.`)
    : 'Browse all published Goldfinch Adventures destinations and compare the places available in the CMS.';
  $: destinationListSchema = {
    '@type': 'ItemList',
    name: activeCountry === 'All' ? 'Goldfinch Adventures destinations' : `${activeCountry} destinations`,
    itemListElement: filtered.map((destination, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: destination.name,
      url: `${origin}/destinations/${destination.slug}`
    }))
  };

  const selectAll = () => {
    activeCountry = 'All';
    relatedTours = [];
    lastDestId = '';
    void goto('/destinations', { replaceState: true, noScroll: true, keepFocus: true });
  };

  const selectDestination = (slug: string) =>
    goto(`/destinations?d=${slug}`, { replaceState: true, noScroll: true, keepFocus: true });

  const selectCountry = (country: string) => {
    activeCountry = country;
    if (requested) {
      relatedTours = [];
      lastDestId = '';
      void goto('/destinations', { replaceState: true, noScroll: true, keepFocus: true });
    }
  };

  $: if (browser) {
    if (selected && selected.id !== lastDestId) {
      lastDestId = selected.id;
      relatedTours = [];
      void api.tours
        .list({ destination_id: selected.id, status: 'published', limit: 3 })
        .then((r) => (relatedTours = r.data.items ?? []))
        .catch(() => (relatedTours = []));
    } else if (!selected && lastDestId) {
      lastDestId = '';
      relatedTours = [];
    }
  }
</script>

<svelte:head>
  <title>{title} | Goldfinch Adventures</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={selected ? `${origin}/destinations?d=${selected.slug}` : `${origin}/destinations`} />
  {#if heroImage}
    <link rel="preload" as="image" href={imgUrl(heroImage, 1800, 72)} fetchpriority="high" />
  {/if}
</svelte:head>

<JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Destinations', path: '/destinations' }])} />
{#if filtered.length}
  <JsonLd data={destinationListSchema} />
{/if}

{#if destinations.length}
  <section class="relative overflow-hidden bg-deep-green text-white">
    {#if selected && heroImage}
      {#key selected.slug}
        <img
          class="absolute inset-0 h-full w-full object-cover"
          src={imgUrl(heroImage, 2000, 72)}
          alt=""
          fetchpriority="high"
          decoding="async"
          transition:fade={{ duration: ms(420) }}
        />
      {/key}
      <div class="absolute inset-0 bg-gradient-to-r from-deep-green via-deep-green/80 to-deep-green/25"></div>
    {:else}
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(231,172,45,0.22),transparent_34%),linear-gradient(135deg,#27311f,#35452f_58%,#22281c)]"></div>
    {/if}
    <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-transparent to-black/20"></div>

    <div class="container-shell relative grid min-h-[520px] gap-10 py-16 md:min-h-[600px] md:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.72fr)] md:items-end md:py-20">
      <div class="min-w-0 pt-12 md:pt-16" use:fadeUpOnScroll={{ y: 14 }}>
        <nav class="mb-8 flex flex-wrap items-center gap-2 text-sm font-medium text-white/65">
          <a class="transition hover:text-white" href="/">Home</a>
          <span class="text-white/35">/</span>
          <span class="text-white">Destinations</span>
        </nav>
        <p class="inline-flex items-center gap-2 rounded-[8px] border border-white/16 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold backdrop-blur">
          <MapPin size={13} strokeWidth={2.5} />
          {selected ? selected.country || 'Destination guide' : 'All destinations'}
        </p>
        <h1 class="mt-5 max-w-4xl text-4xl font-extrabold leading-[1.03] tracking-normal md:text-6xl">
          {selected ? selected.name : 'Explore all destinations'}
        </h1>
        <p class="mt-5 max-w-2xl text-base font-medium leading-8 text-white/82 md:text-lg">
          {#if selected}
            {compactText(selected.short_description || selected.description, `Explore ${selected.name} with Goldfinch Adventures.`)}
          {:else}
            Browse every published destination from the CMS, then open the full guide when a place fits your trip.
          {/if}
        </p>
        <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-6 text-sm font-bold text-heading shadow-lg shadow-black/10 transition hover:brightness-105 sm:w-auto" href="/plan-my-trip">
            <Sparkles size={17} /> Plan my trip
          </a>
          {#if selected}
            <a class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-white/30 bg-white/8 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 sm:w-auto" href={`/destinations/${selected.slug}`}>
              Full guide <ArrowRight size={17} />
            </a>
          {:else}
            <a class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-white/30 bg-white/8 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 sm:w-auto" href="#destination-grid">
              Browse destinations <ArrowRight size={17} />
            </a>
          {/if}
        </div>
      </div>

      {#if !selected && heroTiles.length}
        <div class="hidden pb-2 md:grid md:grid-cols-2 md:gap-3" aria-label="Destination preview images">
          {#each heroTiles as tile, index (tile.slug)}
            <a
              class={`group relative overflow-hidden rounded-[8px] border border-white/12 bg-white/10 shadow-[0_22px_70px_rgba(0,0,0,0.24)] ${index === 0 ? 'md:row-span-2' : ''}`}
              href={`/destinations/${tile.slug}`}
            >
              <img
                class={`w-full object-cover transition duration-700 group-hover:scale-[1.06] ${index === 0 ? 'aspect-[4/5] h-full' : 'aspect-[5/3]'}`}
                src={imgUrl(imageOf(tile), index === 0 ? 900 : 620, 72)}
                alt={tile.name}
                loading="lazy"
                decoding="async"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-transparent"></div>
              <div class="absolute inset-x-0 bottom-0 p-4">
                <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold">{tile.country || 'Destination'}</p>
                <p class="mt-1 text-lg font-extrabold leading-tight text-white">{tile.name}</p>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <section class="border-b border-ink/[0.06] bg-surface">
    <div class="container-shell py-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Destination index</p>
          <p class="mt-1 text-sm font-semibold text-ink/62">
            {selected ? `Viewing ${selected.name}` : `${destinationCountLabel} shown`}
          </p>
        </div>

        <div class="hide-scroll flex gap-2 overflow-x-auto">
          {#each countries as country}
            <button
              type="button"
              class={`shrink-0 rounded-[8px] border px-4 py-2 text-sm font-bold transition ${
                activeCountry === country ? 'border-forest bg-forest text-white' : 'border-ink/12 bg-canvas text-ink/68 hover:border-forest/30 hover:text-heading'
              }`}
              aria-pressed={activeCountry === country}
              on:click={() => selectCountry(country)}
            >
              {country}
            </button>
          {/each}
        </div>
      </div>

      <div class="hide-scroll mt-4 flex gap-2 overflow-x-auto">
        <button
          type="button"
          class={`inline-flex shrink-0 items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-bold transition ${
            !selected ? 'bg-deep-green text-white shadow-sm' : 'bg-sand/60 text-ink/65 hover:bg-sand hover:text-heading'
          }`}
          aria-current={!selected ? 'true' : undefined}
          on:click={selectAll}
        >
          <Grid3X3 size={15} strokeWidth={2.4} /> All
        </button>
        {#each filtered as d (d.slug)}
          <button
            type="button"
            class={`shrink-0 rounded-[8px] px-4 py-2 text-sm font-bold transition ${
              selected?.slug === d.slug ? 'bg-deep-green text-white shadow-sm' : 'bg-sand/60 text-ink/65 hover:bg-sand hover:text-heading'
            }`}
            aria-current={selected?.slug === d.slug ? 'true' : undefined}
            on:click={() => selectDestination(d.slug)}
          >
            {d.name}
          </button>
        {/each}
      </div>
    </div>
  </section>

  {#if !selected}
    <section id="destination-grid" class="bg-canvas py-14 md:py-20">
      <div class="container-shell">
        <div class="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">All destinations</p>
            <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[42px]">
              {activeCountry === 'All' ? 'Choose where your trip starts' : `${activeCountry} destinations`}
            </h2>
          </div>
          <div class="grid gap-3 rounded-[8px] border border-ink/10 bg-surface p-4 shadow-card sm:grid-cols-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-clay">Shown</p>
              <p class="mt-1 text-2xl font-extrabold text-heading">{filtered.length}</p>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-clay">Countries</p>
              <p class="mt-1 text-2xl font-extrabold text-heading">{Math.max(countries.length - 1, 0)}</p>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-clay">Source</p>
              <p class="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-forest"><Search size={14} /> CMS content</p>
            </div>
          </div>
        </div>

        {#if filtered.length}
          <div class="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
            {#each filtered as destination (destination.id)}
              <DestinationCard {destination} />
            {/each}
          </div>
        {:else}
          <div class="mt-9 rounded-[8px] border border-ink/10 bg-surface p-8 text-center shadow-card">
            <Compass class="mx-auto text-forest/45" size={34} />
            <h2 class="mt-4 text-2xl font-bold text-heading">No destinations in this filter</h2>
            <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/62">Choose All to view every published destination currently available.</p>
            <button class="mt-5 inline-flex h-11 items-center gap-2 rounded-[8px] bg-deep-green px-5 text-sm font-bold text-white" type="button" on:click={selectAll}>
              Show all destinations <ArrowRight size={15} />
            </button>
          </div>
        {/if}
      </div>
    </section>
  {:else}
    <section class="container-shell bg-canvas py-12 md:py-16">
      {#key selected.slug}
        <div in:fly={{ y: 16, duration: ms(400) }}>
          <div class="grid gap-10 lg:grid-cols-[1fr_0.78fr] lg:items-start">
            <div>
              {#if selected.country}<p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">{selected.country}</p>{/if}
              <h2 class="mt-3 text-3xl font-bold leading-tight text-heading md:text-[42px]">{selected.name}</h2>
              {#if selected.description}
                <p class="mt-4 whitespace-pre-line text-base leading-8 text-ink/70">{selected.description}</p>
              {/if}
              <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a class="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-deep-green px-5 text-sm font-bold text-white transition hover:bg-forest" href={`/destinations/${selected.slug}`}>
                  Explore {selected.name} in full <ArrowRight size={16} />
                </a>
                <a class="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-ink/15 bg-surface px-5 text-sm font-bold text-ink transition hover:bg-sand/60" href={`/plan-my-trip?destination=${selected.slug}`}>
                  Plan My Trip
                </a>
              </div>
            </div>
            <div class="grid gap-4">
              <div class="aspect-[4/3] overflow-hidden rounded-[8px] bg-skywash shadow-soft">
                {#if imageOf(selected)}
                  <img class="h-full w-full object-cover" src={imgUrl(imageOf(selected), 900, 72)} alt={selected.name} loading="lazy" decoding="async" />
                {/if}
              </div>
              {#if selectedScores}
                <div class="rounded-[8px] border border-ink/10 bg-surface p-5 shadow-card">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">How {selected.name} scores</p>
                    <a class="text-xs font-semibold text-forest transition hover:text-heading" href="/destination-scores">Compare all</a>
                  </div>
                  <div class="mt-3"><ScoreBars scores={selectedScores} /></div>
                </div>
              {/if}
            </div>
          </div>

          {#if relatedTours.length}
            <div class="mt-12">
              <div class="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.18em] text-clay">Available trips</p>
                  <h3 class="mt-2 text-2xl font-bold text-heading md:text-3xl">Trips in {selected.name}</h3>
                </div>
                <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href={`/tours?destination=${selected.slug}`}>
                  Browse matching tours <ArrowRight size={16} />
                </a>
              </div>
              <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
                {#each relatedTours as tour (tour.id)}
                  <TourCard {tour} />
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/key}
    </section>
  {/if}
{:else}
  <section class="container-shell py-24 text-center">
    <h1 class="text-3xl font-semibold text-heading md:text-4xl">Destinations coming soon</h1>
    <p class="mx-auto mt-3 max-w-md text-[15px] leading-7 text-ink/65">We’re curating our East Africa destinations. In the meantime, tell us where you’d love to go and a local expert will help you plan.</p>
    <a href="/plan-my-trip" class="mt-7 inline-flex h-12 items-center gap-2 rounded-[8px] bg-goldfinch-gold px-7 font-bold text-heading shadow-sm transition hover:brightness-105">Plan my trip <ArrowRight size={18} /></a>
  </section>
{/if}

<style>
  .hide-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .hide-scroll::-webkit-scrollbar {
    display: none;
  }
</style>
